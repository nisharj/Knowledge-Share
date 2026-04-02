import { isDatabaseConnected } from "../config/db.js";
import { getStaticKnowledgeBase } from "../data/chatbotKnowledge.js";
import Resource from "../models/Resource.js";
import { sendChatbotSubmissionEmail } from "./emailService.js";

const CHAT_API_URL = `${
  process.env.GROQ_BASE_URL ||
  process.env.OPENAI_BASE_URL ||
  "https://api.groq.com/openai/v1"
}/chat/completions`;

const DEFAULT_CHATBOT_MODEL =
  process.env.CHATBOT_MODEL ||
  process.env.GROQ_MODEL ||
  process.env.OPENAI_MODEL ||
  "llama-3.3-70b-versatile";

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "how",
  "i",
  "in",
  "is",
  "it",
  "me",
  "my",
  "of",
  "on",
  "or",
  "our",
  "that",
  "the",
  "this",
  "to",
  "we",
  "what",
  "where",
  "which",
  "who",
  "with",
  "you",
  "your",
]);

const GENERIC_SUBMISSION_TRIGGERS = [
  "i want to share feedback",
  "i want to share knowledge",
  "i want to give feedback",
  "i want to send feedback",
  "i have feedback",
  "i have some feedback",
  "i want to report an issue",
  "i want to suggest something",
];

const FEEDBACK_HINTS = [
  "feedback",
  "issue",
  "problem",
  "bug",
  "slow",
  "slower",
  "loading",
  "load",
  "fix",
  "improve",
  "suggest",
  "suggestion",
  "request",
  "knowledge",
  "resource",
  "broken",
  "error",
];

const emptyFeedbackDraft = Object.freeze({
  name: "",
  topic: "",
  message: "",
  link: "",
  email: "",
});

const normalizeText = (value) => String(value || "").trim();

const lowerText = (value) => normalizeText(value).toLowerCase();

const sanitizeMessages = (messages) =>
  Array.isArray(messages)
    ? messages
        .filter(
          (message) =>
            message &&
            ["user", "assistant"].includes(message.role) &&
            normalizeText(message.content),
        )
        .slice(-10)
        .map((message) => ({
          role: message.role,
          content: normalizeText(message.content).slice(0, 4000),
        }))
    : [];

const tokenize = (value) =>
  normalizeText(value)
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));

const scoreTextMatch = (query, text) => {
  const haystack = normalizeText(text).toLowerCase();

  if (!haystack) {
    return 0;
  }

  return tokenize(query).reduce((score, token) => {
    if (!haystack.includes(token)) {
      return score;
    }

    const wholeWord = new RegExp(`\\b${token}\\b`, "i");
    return score + (wholeWord.test(haystack) ? 4 : 2);
  }, 0);
};

const scoreResource = (resource, query) => {
  const combinedText = [
    resource.title,
    resource.description,
    resource.type,
    resource.category,
    ...(resource.tags || []),
  ].join(" ");

  let score = scoreTextMatch(query, combinedText);

  if (
    normalizeText(resource.title).toLowerCase().includes(normalizeText(query).toLowerCase())
  ) {
    score += 8;
  }

  return score;
};

const scoreDocument = (document, query) => {
  const combinedText = [document.title, document.content].join(" ");
  return scoreTextMatch(query, combinedText);
};

const inferTopicFromText = (value) => {
  const cleaned = normalizeText(value)
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/g, "");

  if (!cleaned) {
    return "Website feedback";
  }

  const words = cleaned.split(" ").slice(0, 8).join(" ");
  return words.length > 60 ? `${words.slice(0, 57).trim()}...` : words;
};

const looksLikeGenericSubmissionTrigger = (value) =>
  GENERIC_SUBMISSION_TRIGGERS.includes(lowerText(value));

const looksLikeSubstantiveSubmission = (value) => {
  const normalized = lowerText(value);

  if (!normalized || looksLikeGenericSubmissionTrigger(normalized)) {
    return false;
  }

  if (normalized.length >= 40) {
    return true;
  }

  return FEEDBACK_HINTS.some((hint) => normalized.includes(hint));
};

const normalizeFeedbackDraft = (draft, visitor) => ({
  name: normalizeText(draft?.name || visitor?.name || ""),
  topic: normalizeText(draft?.topic),
  message: normalizeText(draft?.message),
  link: normalizeText(draft?.link),
  email: normalizeText(draft?.email || visitor?.email || ""),
});

const getMissingFeedbackFields = (draft) =>
  ["name", "topic", "message"].filter((field) => !normalizeText(draft[field]));

const normalizeSources = (sourceIds, sourceMap) => {
  const uniqueIds = [...new Set(Array.isArray(sourceIds) ? sourceIds : [])];

  return uniqueIds
    .map((sourceId) => sourceMap.get(sourceId))
    .filter(Boolean)
    .slice(0, 4);
};

const extractJsonObject = (value) => {
  const text = normalizeText(value);

  if (!text) {
    throw new Error("AI provider returned an empty chatbot response.");
  }

  const directParse = () => JSON.parse(text);

  try {
    return directParse();
  } catch (_error) {
    const fencedMatch = text.match(/```json\s*([\s\S]*?)```/i);

    if (fencedMatch) {
      return JSON.parse(fencedMatch[1]);
    }

    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");

    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(text.slice(firstBrace, lastBrace + 1));
    }

    throw new Error("Unable to parse chatbot JSON output.");
  }
};

const buildKnowledgePayload = (documents) =>
  documents.map((document) => ({
    id: document.id,
    title: document.title,
    url: document.url,
    content: document.content,
  }));

const buildSystemPrompt = () => `
You are Knowledge Hub's website chatbot.

Rules:
- Answer only from the WEBSITE KNOWLEDGE provided in this request.
- The website catalog is for free learning resources only. Never recommend paid or premium-only resources.
- If the answer is not supported by the provided knowledge, say so clearly and offer to collect feedback or a resource request.
- If the user wants to report an issue, share knowledge, request a new resource, or leave feedback, use collect_feedback mode.
- Extract or update the feedbackDraft with any name, topic, message, reference link, and email details the user provides.
- When collecting a knowledge submission or feedback, mention that the user can also provide a link (optional) and email address (optional).
- If all feedback fields are available and the user is clearly trying to submit information, set shouldEmailAdmin to true.
- Keep replies concise, clear, and helpful.
- Never invent features, URLs, or resource details.

Return JSON only using this exact shape:
{
  "mode": "answer" | "collect_feedback" | "clarify" | "fallback",
  "reply": "assistant reply for the user",
  "feedbackDraft": {
    "name": "string",
    "topic": "string",
    "message": "string",
    "link": "string",
    "email": "string"
  },
  "shouldEmailAdmin": true | false,
  "sourceIds": ["source_id"]
}
`.trim();

const requestModelDecision = async ({
  messages,
  feedbackDraft,
  visitor,
  knowledgeDocuments,
}) => {
  const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "No AI API key is configured for the chatbot. Add GROQ_API_KEY or OPENAI_API_KEY.",
    );
  }

  const response = await fetch(CHAT_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEFAULT_CHATBOT_MODEL,
      temperature: 0.2,
      max_tokens: 900,
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(),
        },
        {
          role: "system",
          content: `WEBSITE KNOWLEDGE:\n${JSON.stringify(buildKnowledgePayload(knowledgeDocuments), null, 2)}`,
        },
        {
          role: "system",
          content: `VISITOR CONTEXT:\n${JSON.stringify(
            {
              isAuthenticated: Boolean(visitor?.isAuthenticated),
              name: normalizeText(visitor?.name),
              email: normalizeText(visitor?.email),
              currentPath: normalizeText(visitor?.currentPath),
            },
            null,
            2,
          )}`,
        },
        {
          role: "system",
          content: `CURRENT FEEDBACK DRAFT:\n${JSON.stringify(
            feedbackDraft,
            null,
            2,
          )}`,
        },
        ...messages,
      ],
    }),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(
      payload?.error?.message || "Chatbot request failed unexpectedly.",
    );
  }

  const content = String(payload?.choices?.[0]?.message?.content || "").trim();
  return extractJsonObject(content);
};

const buildFallbackResponse = ({
  latestUserMessage,
  feedbackDraft,
  knowledgeDocuments,
}) => {
  const sourceMap = new Map(
    knowledgeDocuments.map((document) => [document.id, document]),
  );
  const matchingSources = knowledgeDocuments
    .filter(
      (document) =>
        scoreDocument(document, latestUserMessage) > 0 ||
        scoreTextMatch(latestUserMessage, document.title) > 0,
    )
    .slice(0, 3);

  if (matchingSources.length > 0) {
    const sourceList = matchingSources.map((document) => document.title).join(
      ", ",
    );

    return {
      mode: "answer",
      reply: `I found relevant website information in ${sourceList}. Open the linked resources or ask me a more specific follow-up and I can narrow it down further.`,
      feedbackDraft,
      shouldEmailAdmin: false,
      sources: normalizeSources(
        matchingSources.map((document) => document.id),
        sourceMap,
      ),
    };
  }

  return {
    mode: "fallback",
    reply:
      "I could not find that in the current website content. If you want, you can share the details here and I will collect your name, topic, and message for the admin. You can also include a link and email address if you want.",
    feedbackDraft,
    shouldEmailAdmin: false,
    sources: [],
  };
};

const getRelevantStaticDocuments = (query) =>
  getStaticKnowledgeBase()
    .map((document) => ({
      ...document,
      score: scoreDocument(document, query),
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 4)
    .map(({ score, ...document }) => document);

const getRelevantResources = async (query) => {
  if (!isDatabaseConnected()) {
    return [];
  }

  const resources = await Resource.find({})
    .sort({ views: -1, createdAt: -1 })
    .limit(80)
    .lean();

  return resources
    .map((resource) => ({
      ...resource,
      score: scoreResource(resource, query),
    }))
    .filter((resource) => resource.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 6)
    .map(({ _id, title, description, link, type, category, tags }) => ({
      id: `resource_${_id}`,
      title,
      url: link,
      content: `Type: ${type}. Category: ${category}. Tags: ${(tags || []).join(", ") || "none"}. Description: ${description}`,
    }));
};

const mergeFeedbackDraft = (baseDraft, nextDraft) => ({
  name: normalizeText(nextDraft?.name || baseDraft.name),
  topic: normalizeText(nextDraft?.topic || baseDraft.topic),
  message: normalizeText(nextDraft?.message || baseDraft.message),
  link: normalizeText(nextDraft?.link || baseDraft.link),
  email: normalizeText(nextDraft?.email || baseDraft.email),
});

const buildSubmissionDraft = ({ draft, latestUserMessage, visitor }) => ({
  name: normalizeText(draft.name || visitor?.name || "Website visitor"),
  topic: normalizeText(draft.topic || inferTopicFromText(latestUserMessage)),
  message: normalizeText(draft.message || latestUserMessage),
  link: normalizeText(draft.link),
  email: normalizeText(draft.email || visitor?.email),
});

export const getChatbotResponse = async ({
  messages,
  feedbackDraft,
  visitor,
}) => {
  const sanitizedMessages = sanitizeMessages(messages);
  const latestUserMessage = [...sanitizedMessages]
    .reverse()
    .find((message) => message.role === "user")?.content;

  if (!latestUserMessage) {
    throw new Error("A user message is required.");
  }

  const normalizedDraft = normalizeFeedbackDraft(feedbackDraft, visitor);
  const relevantStaticDocuments = getRelevantStaticDocuments(latestUserMessage);
  const relevantResources = await getRelevantResources(latestUserMessage);
  const knowledgeDocuments = [...relevantStaticDocuments, ...relevantResources];
  const sourceMap = new Map(
    knowledgeDocuments.map((document) => [document.id, document]),
  );

  try {
    const modelDecision = await requestModelDecision({
      messages: sanitizedMessages,
      feedbackDraft: normalizedDraft,
      visitor,
      knowledgeDocuments,
    });

    const mergedDraft = mergeFeedbackDraft(
      normalizedDraft,
      modelDecision.feedbackDraft,
    );
    const missingFields = getMissingFeedbackFields(mergedDraft);
    const autoSubmissionDraft = buildSubmissionDraft({
      draft: mergedDraft,
      latestUserMessage,
      visitor,
    });
    const shouldAutoSubmit =
      modelDecision.mode === "collect_feedback" &&
      looksLikeSubstantiveSubmission(
        autoSubmissionDraft.message || latestUserMessage,
      );
    const shouldEmailAdmin =
      (Boolean(modelDecision.shouldEmailAdmin) && missingFields.length === 0) ||
      shouldAutoSubmit;
    const sources = normalizeSources(modelDecision.sourceIds, sourceMap);

    if (shouldEmailAdmin) {
      const submissionDraft = shouldAutoSubmit ? autoSubmissionDraft : mergedDraft;
      const submitted = await sendChatbotSubmissionEmail({
        ...submissionDraft,
        email: normalizeText(submissionDraft.email || visitor?.email),
        currentPath: normalizeText(visitor?.currentPath),
      });

      if (submitted) {
        return {
          mode: "collect_feedback",
          reply:
            normalizeText(modelDecision.reply) ||
            "Thanks. I collected your information and sent it to the admin email.",
          feedbackDraft: { ...emptyFeedbackDraft },
          feedbackSubmitted: true,
          sources,
          model: DEFAULT_CHATBOT_MODEL,
        };
      }

      return {
        mode: "collect_feedback",
        reply:
          "I collected your details, but the email could not be sent right now. Please try again in a moment.",
        feedbackDraft: shouldAutoSubmit ? autoSubmissionDraft : mergedDraft,
        feedbackSubmitted: false,
        sources,
        model: DEFAULT_CHATBOT_MODEL,
      };
    }

    return {
      mode: ["answer", "collect_feedback", "clarify", "fallback"].includes(
        modelDecision.mode,
      )
        ? modelDecision.mode
        : "fallback",
      reply:
        normalizeText(modelDecision.reply) ||
        "I'm here to help with this website. Ask me about resources, bookmarks, accounts, or share feedback for the admin.",
      feedbackDraft: mergedDraft,
      feedbackSubmitted: false,
      sources,
      missingFeedbackFields: missingFields,
      model: DEFAULT_CHATBOT_MODEL,
    };
  } catch (_error) {
    const fallback = buildFallbackResponse({
      latestUserMessage,
      feedbackDraft: normalizedDraft,
      knowledgeDocuments,
    });

    return {
      ...fallback,
      feedbackSubmitted: false,
      missingFeedbackFields: getMissingFeedbackFields(normalizedDraft),
      model: DEFAULT_CHATBOT_MODEL,
    };
  }
};

import { isDatabaseConnected } from "../config/db.js";
import { getStaticKnowledgeBase } from "../data/chatbotKnowledge.js";
import Resource from "../models/Resource.js";
import { sendChatbotSubmissionEmail } from "./emailService.js";

const buildClientUrl = (path = "/") => {
  const baseUrl = String(
    process.env.CLIENT_URL || "http://localhost:5173",
  ).replace(/\/$/, "");

  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
};

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

const MAX_RESOURCE_INDEX_ITEMS = 120;
const MAX_MATCHED_RESOURCES = 8;
const MAX_RECENT_RESOURCES = 6;
const RESOURCE_INDEX_CHUNK_SIZE = 24;

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

const RECENCY_HINTS = [
  "latest",
  "newest",
  "recent",
  "recently",
  "newly",
  "just added",
  "added",
];

const RESOURCE_DISCOVERY_HINTS = [
  "resource",
  "resources",
  "course",
  "courses",
  "tutorial",
  "tutorials",
  "guide",
  "guides",
  "website",
  "websites",
  "tool",
  "tools",
];

const COUNT_HINTS = ["how many", "number of", "count", "total"];
const CATEGORY_HINTS = ["category", "categories"];

const emptyFeedbackDraft = Object.freeze({
  name: "",
  topic: "",
  message: "",
  link: "",
  email: "",
});

const normalizeText = (value) => String(value || "").trim();

const lowerText = (value) => normalizeText(value).toLowerCase();

const formatDateLabel = (value) => {
  if (!value) {
    return "unknown";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "unknown";
  }

  return date.toISOString().slice(0, 10);
};

const summarizeText = (value, maxLength = 180) => {
  const normalized = normalizeText(value).replace(/\s+/g, " ");

  if (!normalized) {
    return "";
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3).trim()}...`;
};

const countBy = (items, getKey) =>
  items.reduce((result, item) => {
    const key = normalizeText(getKey(item) || "unknown").toLowerCase();

    if (!key) {
      return result;
    }

    result.set(key, (result.get(key) || 0) + 1);
    return result;
  }, new Map());

const formatCountMap = (map, limit = 12) =>
  [...map.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([key, count]) => `${key} (${count})`)
    .join(", ") || "none";

const chunkArray = (items, size) => {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

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

const looksLikeRecentResourceQuery = (value) => {
  const normalized = lowerText(value);

  if (!normalized) {
    return false;
  }

  const mentionsRecency = RECENCY_HINTS.some((hint) =>
    normalized.includes(hint),
  );
  const mentionsResources = RESOURCE_DISCOVERY_HINTS.some((hint) =>
    normalized.includes(hint),
  );

  return mentionsRecency && mentionsResources;
};

const looksLikeResourceCountQuery = (value) => {
  const normalized = lowerText(value);

  if (!normalized) {
    return false;
  }

  return (
    COUNT_HINTS.some((hint) => normalized.includes(hint)) &&
    RESOURCE_DISCOVERY_HINTS.some((hint) => normalized.includes(hint))
  );
};

const looksLikeCategoryQuestion = (value) => {
  const normalized = lowerText(value);

  if (!normalized) {
    return false;
  }

  return CATEGORY_HINTS.some((hint) => normalized.includes(hint));
};

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
- The WEBSITE KNOWLEDGE may include static website pages, a live resource catalog summary, chunked catalog indexes, and exact resource entries from the current database.
- The website catalog is for free learning resources only. Never recommend paid or premium-only resources.
- For questions about counts, categories, latest resources, tags, or what exists on the site, prefer exact details from the live catalog knowledge.
- When the user asks about recently added or newest resources, use the "Added on" dates from the provided knowledge.
- For resource questions, mention exact resource titles when the knowledge supports them instead of answering vaguely.
- If several resources match, keep the list short and focused on the best matches from the provided knowledge.
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
  resourceCatalog,
}) => {
  if (looksLikeRecentResourceQuery(latestUserMessage)) {
    const latestResources = (resourceCatalog?.resources || []).slice(0, 3);

    if (latestResources.length > 0) {
      return {
        mode: "answer",
        reply: `The newest resources I can see are ${latestResources
          .map(
            (resource) =>
              `${resource.title} (${formatDateLabel(resource.createdAt)})`,
          )
          .join(", ")}.`,
        feedbackDraft,
        shouldEmailAdmin: false,
        sources: latestResources.map((resource) => ({
          id: `resource_${resource._id}`,
          title: resource.title,
          url: resource.link,
          content: summarizeText(resource.description),
        })),
      };
    }
  }

  if (looksLikeResourceCountQuery(latestUserMessage)) {
    const total = resourceCatalog?.resources?.length || 0;

    if (total > 0) {
      return {
        mode: "answer",
        reply: `I can see ${total} resources in the current website catalog.`,
        feedbackDraft,
        shouldEmailAdmin: false,
        sources: [],
      };
    }
  }

  if (looksLikeCategoryQuestion(latestUserMessage)) {
    const categories = [...(resourceCatalog?.categoryCounts?.keys() || [])].sort();

    if (categories.length > 0) {
      return {
        mode: "answer",
        reply: `The current catalog categories include ${categories.join(", ")}.`,
        feedbackDraft,
        shouldEmailAdmin: false,
        sources: [],
      };
    }
  }

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

const getStaticKnowledgeDocuments = () => getStaticKnowledgeBase();

const buildResourceDocument = ({
  _id,
  title,
  description,
  link,
  type,
  category,
  tags,
  createdAt,
  views,
}) => ({
  id: `resource_${_id}`,
  title,
  url: link,
  content: `Title: ${title}. Type: ${type}. Category: ${category}. Added on: ${formatDateLabel(
    createdAt,
  )}. Views: ${Number(views || 0)}. Tags: ${(tags || []).join(", ") || "none"}. Description: ${summarizeText(
    description,
    260,
  )}`,
});

const buildCatalogKnowledgeDocuments = (resources) => {
  if (resources.length === 0) {
    return {
      catalogDocuments: [],
      categoryCounts: new Map(),
    };
  }

  const categoryCounts = countBy(resources, (resource) => resource.category);
  const typeCounts = countBy(resources, (resource) => resource.type);
  const tagCounts = countBy(
    resources.flatMap((resource) => resource.tags || []),
    (tag) => tag,
  );
  const latestResources = resources.slice(0, 10);
  const popularResources = [...resources]
    .sort(
      (left, right) =>
        Number(right.views || 0) - Number(left.views || 0) ||
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    )
    .slice(0, 5);

  const summaryDocument = {
    id: "live_resource_catalog_summary",
    title: "Live resource catalog summary",
    url: buildClientUrl("/#browse"),
    content: `This summary is generated from the current resource database. Total resources: ${
      resources.length
    }. Categories: ${formatCountMap(categoryCounts)}. Types: ${formatCountMap(
      typeCounts,
    )}. Top tags: ${formatCountMap(tagCounts)}. Latest resources: ${latestResources
      .map(
        (resource, index) =>
          `${index + 1}. ${resource.title} | ${resource.type} | ${
            resource.category
          } | added ${formatDateLabel(resource.createdAt)}`,
      )
      .join(" || ")}. Most viewed resources: ${popularResources
      .map(
        (resource, index) =>
          `${index + 1}. ${resource.title} (${Number(resource.views || 0)} views)`,
      )
      .join(" || ")}.`,
  };

  const indexedResources = resources.slice(0, MAX_RESOURCE_INDEX_ITEMS);

  const indexDocuments = chunkArray(
    indexedResources,
    RESOURCE_INDEX_CHUNK_SIZE,
  ).map((chunk, chunkIndex) => ({
      id: `live_resource_catalog_index_${chunkIndex + 1}`,
      title: `Live resource catalog index ${chunkIndex + 1}`,
      url: buildClientUrl("/#browse"),
      content: chunk
        .map(
          (resource, resourceIndex) =>
            `${chunkIndex * RESOURCE_INDEX_CHUNK_SIZE + resourceIndex + 1}. ${
              resource.title
            } | ${resource.type} | ${resource.category} | added ${formatDateLabel(
              resource.createdAt,
            )} | views ${Number(resource.views || 0)} | tags: ${
              (resource.tags || []).join(", ") || "none"
            }`,
        )
        .join(" || "),
    }),
  );

  summaryDocument.content = `${summaryDocument.content.slice(
    0,
    -1,
  )} Indexed resource rows included below: ${indexedResources.length}.`;

  return {
    catalogDocuments: [summaryDocument, ...indexDocuments],
    categoryCounts,
  };
};

const getResourceKnowledge = async (query) => {
  if (!isDatabaseConnected()) {
    return {
      resources: [],
      categoryCounts: new Map(),
      catalogDocuments: [],
      relevantResourceDocuments: [],
    };
  }

  const isRecentResourceQuery = looksLikeRecentResourceQuery(query);
  const resources = await Resource.find({})
    .sort({ createdAt: -1, views: -1 })
    .lean();

  const matchedResources = resources
    .map((resource) => ({
      ...resource,
      score: scoreResource(resource, query),
    }))
    .filter((resource) => resource.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, MAX_MATCHED_RESOURCES);

  const fallbackRecentResources =
    isRecentResourceQuery || matchedResources.length < 3
      ? resources.slice(0, MAX_RECENT_RESOURCES)
      : [];

  const relevantResourceDocuments = [...matchedResources, ...fallbackRecentResources]
    .filter(
      (resource, index, collection) =>
        collection.findIndex(
          (candidate) => String(candidate._id) === String(resource._id),
        ) === index,
    )
    .slice(0, MAX_MATCHED_RESOURCES)
    .map(buildResourceDocument);

  const { catalogDocuments, categoryCounts } =
    buildCatalogKnowledgeDocuments(resources);

  return {
    resources,
    categoryCounts,
    catalogDocuments,
    relevantResourceDocuments,
  };
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
  const staticKnowledgeDocuments = getStaticKnowledgeDocuments();
  const resourceCatalog = await getResourceKnowledge(latestUserMessage);
  const knowledgeDocuments = [
    ...staticKnowledgeDocuments,
    ...resourceCatalog.catalogDocuments,
    ...resourceCatalog.relevantResourceDocuments,
  ];
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
      resourceCatalog,
    });

    return {
      ...fallback,
      feedbackSubmitted: false,
      missingFeedbackFields: getMissingFeedbackFields(normalizedDraft),
      model: DEFAULT_CHATBOT_MODEL,
    };
  }
};

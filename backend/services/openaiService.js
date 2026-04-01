const AI_API_URL = `${
  process.env.GROQ_BASE_URL ||
  process.env.OPENAI_BASE_URL ||
  "https://api.groq.com/openai/v1"
}/chat/completions`;

const DEFAULT_AI_MODEL =
  process.env.GROQ_MODEL ||
  process.env.OPENAI_MODEL ||
  "llama-3.3-70b-versatile";

const buildRewriteInput = ({
  title,
  description,
  type,
  category,
  tags = [],
}) => `Rewrite the following learning resource description.

Title: ${title || "Untitled"}
Type: ${type || "general"}
Category: ${category || "general"}
Tags: ${tags.length > 0 ? tags.join(", ") : "none"}
Current description:
${description}`;

export const rewriteResourceDescription = async ({
  title,
  description,
  type,
  category,
  tags,
}) => {
  const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured on the server.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(AI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: DEFAULT_AI_MODEL,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You rewrite learning resource descriptions for a public resource website. Keep the meaning accurate, improve clarity, readability, and polish, and keep the tone professional and concise. Return only the rewritten description in plain text. Limit the result to 2 or 3 sentences.",
          },
          {
            role: "user",
            content: buildRewriteInput({
              title,
              description,
              type,
              category,
              tags,
            }),
          },
        ],
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(
        payload?.error?.message || "AI provider request failed unexpectedly.",
      );
    }

    const optimizedDescription = String(
      payload?.choices?.[0]?.message?.content || "",
    ).trim();

    if (!optimizedDescription) {
      throw new Error("AI provider returned an empty optimized description.");
    }

    return {
      description: optimizedDescription,
      model: DEFAULT_AI_MODEL,
    };
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("AI rewrite request timed out. Please try again.");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

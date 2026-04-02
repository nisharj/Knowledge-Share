import { getChatbotResponse } from "../services/chatbotService.js";

const normalizeVisitor = (visitor) => ({
  isAuthenticated: Boolean(visitor?.isAuthenticated),
  name: String(visitor?.name || "").trim(),
  email: String(visitor?.email || "").trim(),
  currentPath: String(visitor?.currentPath || "").trim(),
});

export const sendChatMessage = async (req, res) => {
  try {
    const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];

    if (messages.length === 0) {
      return res.status(400).json({
        message: "At least one chat message is required.",
      });
    }

    const response = await getChatbotResponse({
      messages,
      feedbackDraft: req.body?.feedbackDraft || {},
      visitor: normalizeVisitor(req.body?.visitor),
    });

    return res.status(200).json(response);
  } catch (error) {
    console.error("Chatbot error:", error.message);
    return res.status(400).json({
      message: error.message || "Failed to process chatbot message.",
    });
  }
};

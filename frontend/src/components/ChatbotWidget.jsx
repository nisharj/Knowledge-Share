import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { sendChatMessage } from "../services/chatApi";

const welcomeMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Ask me about this website, free learning resources, bookmarks, accounts, or share feedback for the admin.",
  sources: [],
};

const starterPrompts = [
  "Show me free coding resources",
  "How do bookmarks work?",
  "I want to share feedback",
];

const createMessage = (role, content, extra = {}) => ({
  id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  role,
  content,
  ...extra,
});

const ChatbotWidget = () => {
  const { isAuthenticated, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([welcomeMessage]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [feedbackDraft, setFeedbackDraft] = useState({
    name: user?.name || "",
    topic: "",
    message: "",
    link: "",
    email: user?.email || "",
  });
  const viewportRef = useRef(null);

  const scrollToBottom = () => {
    window.requestAnimationFrame(() => {
      viewportRef.current?.scrollTo({
        top: viewportRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  };

  useEffect(() => {
    setFeedbackDraft((current) => ({
      ...current,
      name: current.name || user?.name || "",
      email: current.email || user?.email || "",
    }));
  }, [user?.email, user?.name]);

  useEffect(() => {
    scrollToBottom();
  }, [isOpen, messages, pending]);

  const conversationPayload = useMemo(
    () => messages.map(({ role, content }) => ({ role, content })),
    [messages],
  );
  const hasConversation = useMemo(
    () => messages.some((message) => message.role === "user"),
    [messages],
  );

  const submitMessage = async (rawMessage) => {
    const content = String(rawMessage || "").trim();

    if (!content || pending) {
      return;
    }

    const userMessage = createMessage("user", content);
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setPending(true);
    setError("");

    try {
      const response = await sendChatMessage({
        messages: [...conversationPayload, { role: "user", content }],
        feedbackDraft,
        visitor: {
          isAuthenticated,
          name: user?.name || "",
          email: user?.email || "",
          currentPath: window.location.pathname,
        },
      });

      setMessages((current) => [
        ...current,
        createMessage("assistant", response.reply, {
          sources: response.sources || [],
          mode: response.mode,
        }),
      ]);

      setFeedbackDraft(
        response.feedbackSubmitted
          ? {
              name: user?.name || "",
              topic: "",
              message: "",
              link: "",
              email: user?.email || "",
            }
          : {
              name: response.feedbackDraft?.name || user?.name || "",
              topic: response.feedbackDraft?.topic || "",
              message: response.feedbackDraft?.message || "",
              link: response.feedbackDraft?.link || "",
              email: response.feedbackDraft?.email || user?.email || "",
            },
      );
    } catch (requestError) {
      console.error("Chatbot request failed:", requestError);
      setError(
        requestError.response?.data?.message ||
          "The chatbot is unavailable right now. Please try again shortly.",
      );
      setMessages((current) => [
        ...current,
        createMessage(
          "assistant",
          "I'm having trouble responding right now. Please try again in a moment.",
        ),
      ]);
    } finally {
      setPending(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await submitMessage(input);
  };

  return (
    <div className={`chatbot-shell ${isOpen ? "open" : ""}`}>
      {!isOpen ? (
        <button
          type="button"
          className="chatbot-toggle"
          onClick={() => setIsOpen(true)}
          aria-expanded={false}
          aria-controls="chatbot-panel"
        >
          Chat with assistant
        </button>
      ) : null}

      {isOpen ? (
        <section className="chatbot-panel" id="chatbot-panel" aria-live="polite">
          <div className="chatbot-header">
            <div className="chatbot-header-top">
              <div>
                <p className="chatbot-kicker">Knowledge Hub</p>
                <h2>Website Assistant</h2>
              </div>
              <button
                type="button"
                className="chatbot-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close assistant"
              >
                Close
              </button>
            </div>
            <p className="chatbot-subtitle">
              Answers website questions and can send feedback to admin.
            </p>
          </div>

          <div className="chatbot-body">
            {!hasConversation ? (
              <div className="chatbot-starters">
                {starterPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="chatbot-starter"
                    onClick={() => submitMessage(prompt)}
                    disabled={pending}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="chatbot-messages" ref={viewportRef}>
              {messages.map((message) => (
                <article
                  key={message.id}
                  className={`chatbot-message chatbot-message-${message.role}`}
                >
                  <p>{message.content}</p>
                  {message.sources?.length ? (
                    <div className="chatbot-sources">
                      {message.sources.map((source) => (
                        <a
                          key={`${message.id}-${source.url}`}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="chatbot-source"
                        >
                          {source.title}
                        </a>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}

              {pending ? (
                <article className="chatbot-message chatbot-message-assistant">
                  <p>Thinking through your question...</p>
                </article>
              ) : null}
            </div>
          </div>

          <div className="chatbot-footer">
            {error ? <div className="alert alert-error">{error}</div> : null}

            <form className="chatbot-form" onSubmit={handleSubmit}>
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about free resources, website features, or share feedback..."
                maxLength={1500}
              />
              <button
                type="submit"
                className="btn chatbot-send"
                disabled={pending || !input.trim()}
              >
                {pending ? "Sending..." : "Send"}
              </button>
            </form>
          </div>
        </section>
      ) : null}
    </div>
  );
};

export default ChatbotWidget;

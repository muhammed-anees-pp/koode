import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { fetchChatbotMessages, sendChatbotMessage } from "../../../api/chatbot.api";

const ACTION_MESSAGE_PREFIX = "CHATBOT_ACTION::";

const quickPrompts = [
  "Book consultation",
  "Show booking steps",
  "Manage consultation",
  "What does a clinical psychologist do?",
];

const botIntro = {
  id: "intro",
  role: "BOT",
  content:
    "Hi, I am Koode Assistant. I can help with booking, consultations, departments, payments, and wellness guidance.",
  quick_replies: quickPrompts,
};

const BotIcon = ({ className = "h-5 w-5" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="5" y="8" width="14" height="10" rx="3" />
    <path d="M12 4v4" />
    <path d="M8 13h.01" />
    <path d="M16 13h.01" />
    <path d="M9 18v2" />
    <path d="M15 18v2" />
  </svg>
);

const SendIcon = () => (
  <svg
    className="h-5 w-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.3"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M22 2 11 13" />
    <path d="m22 2-7 20-4-9-9-4 20-7Z" />
  </svg>
);

const CloseIcon = () => (
  <svg
    className="h-5 w-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

const MessageIcon = () => (
  <svg
    className="h-6 w-6"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const MessageBubble = ({ message, onQuickReply, onAction, disabled, showQuickReplies }) => {
  const isUser = message.role === "USER";
  const action = !isUser && message.content?.startsWith(ACTION_MESSAGE_PREFIX)
    ? message.content.slice(ACTION_MESSAGE_PREFIX.length)
    : "";
  const quickReplies =
    showQuickReplies && !isUser && !action && Array.isArray(message.quick_replies)
      ? message.quick_replies
      : [];

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`flex max-w-[86%] flex-col gap-2 ${isUser ? "items-end" : "items-start"}`}>
        {action === "find_psychologist" ? (
          <button
            type="button"
            onClick={() => onAction(action)}
            className="rounded-[18px] rounded-bl-md border border-patient-primary/30 bg-[#e8fbf8] px-4 py-3 text-left text-sm font-extrabold leading-5 text-patient-primary shadow-sm transition hover:border-patient-primary hover:bg-patient-primary hover:text-white"
          >
            Find Psychologist
          </button>
        ) : (
          <div
            className={`whitespace-pre-line rounded-[18px] px-4 py-3 text-sm leading-5 shadow-sm ${
              isUser
                ? "rounded-br-md bg-patient-primary text-white"
                : "rounded-bl-md bg-[#f1f5f9] text-[#1f2937]"
            }`}
          >
            {message.content}
          </div>
        )}
        {quickReplies.length > 0 && (
          <div className="flex flex-wrap justify-end gap-2">
            {quickReplies.map((reply) => (
              <button
                key={`${message.id}-${reply}`}
                type="button"
                onClick={() => onQuickReply(reply)}
                className="rounded-full border border-patient-primary/70 bg-white px-3.5 py-2 text-left text-xs font-bold text-patient-primary transition hover:bg-patient-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                disabled={disabled}
              >
                {reply}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default function PatientChatbotWidget({ defaultOpen = false }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [message, setMessage] = useState("");
  const endRef = useRef(null);
  const draftIdRef = useRef(0);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["chatbot-messages"],
    queryFn: fetchChatbotMessages,
    enabled: isOpen,
  });

  const visibleMessages = useMemo(() => {
    const storedMessages = data?.messages || [];
    return storedMessages.length > 0 ? storedMessages : [botIntro];
  }, [data?.messages]);

  const latestBotMessageId = useMemo(() => {
    return [...visibleMessages].reverse().find((item) => item.role === "BOT")?.id;
  }, [visibleMessages]);

  const appendMessage = (newMessage) => {
    queryClient.setQueryData(["chatbot-messages"], (current) => ({
      conversation_id: current?.conversation_id,
      messages: [...(current?.messages || []), newMessage],
    }));
  };

  const appendMessages = (newMessages) => {
    queryClient.setQueryData(["chatbot-messages"], (current) => ({
      conversation_id: current?.conversation_id,
      messages: [...(current?.messages || []), ...newMessages],
    }));
  };

  const mutation = useMutation({
    mutationFn: sendChatbotMessage,
    onSuccess: (payload) => {
      const botReplies =
        Array.isArray(payload.replies) && payload.replies.length > 0
          ? payload.replies
          : [payload.reply].filter(Boolean);
      appendMessages(botReplies);
    },
    onError: () => {
      appendMessage({
        id: `error-${(draftIdRef.current += 1)}`,
        role: "BOT",
        content: "I could not send that message right now. Please try again in a moment.",
      });
    },
  });

  useEffect(() => {
    const openChatbot = () => setIsOpen(true);
    window.addEventListener("open-patient-chatbot", openChatbot);
    return () => window.removeEventListener("open-patient-chatbot", openChatbot);
  }, []);

  useEffect(() => {
    if (isOpen) {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [isOpen, visibleMessages, mutation.isPending]);

  const submitMessage = (text = message) => {
    const cleanText = text.trim();
    if (!cleanText || mutation.isPending) return;

    appendMessage({
      id: `draft-${(draftIdRef.current += 1)}`,
      role: "USER",
      content: cleanText,
    });
    setMessage("");
    mutation.mutate(cleanText);
  };

  const handleAction = (action) => {
    if (action === "find_psychologist") {
      setIsOpen(false);
      navigate("/patient/find-psychologist");
    }
  };

  return (
    <>
      {isOpen && (
        <section className="fixed inset-x-3 bottom-4 top-[5.25rem] z-[950] flex flex-col overflow-hidden rounded-[18px] border border-[#dbe5eb] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.24)] sm:left-auto sm:right-6 sm:top-[6.5rem] sm:h-[min(700px,calc(100vh-8rem))] sm:w-[390px]">
          <header className="flex items-center justify-between gap-3 bg-[#e8fbf8] px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-patient-primary text-white shadow-[0_10px_24px_rgba(26,190,170,0.28)]">
                <BotIcon />
              </span>
              <div className="min-w-0">
                <h2 className="truncate font-outfit text-base font-extrabold text-[#0f172a]">
                  Koode Assistant
                </h2>
                <p className="truncate text-xs font-semibold text-[#64748b]">Usually replies instantly</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#475569] transition hover:bg-white hover:text-[#0f172a]"
              aria-label="Close assistant"
            >
              <CloseIcon />
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-white px-5 py-4">
            {isLoading && <p className="text-sm font-semibold text-[#64748b]">Loading conversation...</p>}
            {isError && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                Could not load chat history.
              </div>
            )}

            <div className="mb-1 text-center text-xs font-semibold text-[#94a3b8]">Today</div>

            {visibleMessages.map((item) => (
              <MessageBubble
                key={item.id}
                message={item}
                onQuickReply={submitMessage}
                onAction={handleAction}
                disabled={mutation.isPending}
                showQuickReplies={item.id === latestBotMessageId}
              />
            ))}

            {mutation.isPending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-[18px] rounded-bl-md bg-[#f1f5f9] px-4 py-3">
                  {[0, 1, 2].map((index) => (
                    <span
                      key={index}
                      className="h-2 w-2 rounded-full bg-patient-primary"
                      style={{ animation: `typingDot 1s ease-in-out ${index * 0.15}s infinite` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              submitMessage();
            }}
            className="border-t border-[#e2e8f0] bg-white px-5 py-4"
          >
            <div className="flex items-center gap-2 rounded-full border-2 border-patient-primary bg-white px-3 py-2 focus-within:ring-4 focus-within:ring-patient-primary/10">
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    submitMessage();
                  }
                }}
                rows={1}
                placeholder="Type a message"
                className="max-h-24 min-h-[38px] flex-1 resize-none bg-transparent px-2 py-2 text-sm font-medium text-[#0f172a] outline-none placeholder:text-[#94a3b8]"
              />
              <button
                type="submit"
                disabled={mutation.isPending || !message.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-patient-primary text-white transition hover:bg-patient-hover disabled:cursor-not-allowed disabled:bg-[#a7d8d1]"
                aria-label="Send message"
              >
                <SendIcon />
              </button>
            </div>
          </form>
        </section>
      )}

      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-7 right-7 z-[940] flex h-16 w-16 items-center justify-center rounded-full bg-patient-primary text-white shadow-[0_20px_50px_rgba(26,190,170,0.35)] transition hover:-translate-y-1 hover:bg-patient-hover"
          aria-label="Open Koode Assistant"
        >
          <MessageIcon />
        </button>
      )}
    </>
  );
}

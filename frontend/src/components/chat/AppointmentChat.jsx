import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAppointmentMessages } from "../../api/chat.api";
import { formatIndiaDate } from "../../utils/indiaDateTime";
import { useAuthStore } from "../../store/auth.store";

const getChatSocketBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_WS_BASE_URL;
  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }

  if (import.meta.env.DEV) {
    return `ws://${window.location.hostname}:8000`;
  }

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.host}`;
};

const buildChatWebSocketUrl = (appointmentId, token) =>
  `${getChatSocketBaseUrl()}/ws/chat/${appointmentId}/?token=${encodeURIComponent(token)}`;

const formatMessageTime = (value) =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));

const formatMessageDate = (value) => {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

const dedupeMessages = (messages) => {
  const seen = new Set();
  return messages.filter((message) => {
    if (seen.has(message.id)) {
      return false;
    }

    seen.add(message.id);
    return true;
  });
};

const sortRooms = (rooms) =>
  [...rooms].sort((first, second) => {
    const firstTime = first.last_message_at || first.updated_at || "";
    const secondTime = second.last_message_at || second.updated_at || "";
    return secondTime.localeCompare(firstTime);
  });

const Avatar = ({ name, color }) => (
  <div
    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
    style={{ backgroundColor: color }}
  >
    {name?.charAt(0)?.toUpperCase() || "?"}
  </div>
);

const MessageTicks = ({ isMine, isRead }) => {
  if (!isMine) {
    return null;
  }

  return (
    <svg
      width="15"
      height="11"
      viewBox="0 0 15 11"
      fill="none"
      style={{
        color: isRead ? "#ffffff" : "currentColor",
        opacity: isRead ? "1" : "0.55",
        display: "inline",
        verticalAlign: "middle",
        marginLeft: "2px",
      }}
    >
      <path d="M1 5.5L4 8.5L9 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 5.5L8 8.5L13 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const EmptyMessages = () => (
  <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-40">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
    <p className="text-sm">No messages yet. Start the conversation.</p>
  </div>
);

const TypingIndicator = () => (
  <div className="flex justify-start">
    <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-3 shadow-sm">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400"
          style={{
            animation: "typingDot 1.2s ease-in-out infinite",
            animationDelay: `${index * 0.2}s`,
          }}
        />
      ))}
    </div>
  </div>
);

const AppointmentChat = ({ booking, roleVariant = "patient", onClose, embedded = false }) => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const socketRef = useRef(null);
  const scrollRef = useRef(null);
  const typingTimerRef = useRef(null);
  const [draft, setDraft] = useState("");
  const [connectionState, setConnectionState] = useState(
    booking?.chat_enabled &&
      !["COMPLETED", "CANCELLED"].includes(booking.status) &&
      accessToken &&
      booking?.id
      ? "connecting"
      : "closed"
  );
  const [typingUser, setTypingUser] = useState("");
  const isPatient = roleVariant === "patient";
  const accentColor = isPatient ? "#1ABEAA" : "#1188D8";
  const peerName = isPatient ? booking.psychologist_name : booking.patient_name;

  const chatQuery = useQuery({
    queryKey: ["appointment-chat", booking.id],
    queryFn: () => fetchAppointmentMessages(booking.id),
    enabled: Boolean(booking?.id),
    refetchInterval: 4000,
    refetchOnWindowFocus: true,
  });

  const canChat =
    booking?.chat_enabled && !["COMPLETED", "CANCELLED"].includes(booking.status);
  const { refetch: refetchMessages } = chatQuery;
  const messages = useMemo(
    () => dedupeMessages(chatQuery.data?.results ?? []),
    [chatQuery.data?.results]
  );
  const isOnline = canChat && connectionState === "connected";

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUser]);

  const updateRoomPreview = useCallback(
    (message) => {
      queryClient.setQueryData(["chat-rooms", roleVariant], (currentRooms = []) =>
        sortRooms(
          currentRooms.map((room) =>
            String(room.appointment_id) === String(booking.id)
              ? {
                  ...room,
                  last_message: message.content,
                  last_message_at: message.created_at,
                  unread_count: 0,
                  updated_at: message.created_at,
                }
              : room
          )
        )
      );
    },
    [booking.id, queryClient, roleVariant]
  );

  useEffect(() => {
    if (!canChat || !accessToken || !booking?.id) {
      return undefined;
    }

    const socket = new WebSocket(buildChatWebSocketUrl(booking.id, accessToken));
    socketRef.current = socket;

    socket.onopen = () => setConnectionState("connected");
    socket.onclose = () => setConnectionState("closed");
    socket.onerror = () => {
      setConnectionState("error");
      socket.close();
    };
    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        if (payload.type === "message" && payload.message) {
          const nextMessage = payload.message;
          const isMine = String(nextMessage.sender) === String(user?.id);

          queryClient.setQueryData(["appointment-chat", booking.id], (current) => ({
            ...(current ?? {}),
            room: current?.room ?? null,
            results: dedupeMessages([...(current?.results ?? []), nextMessage]),
          }));
          updateRoomPreview(nextMessage);
          queryClient.invalidateQueries({ queryKey: ["chat-rooms", roleVariant] });

          if (!isMine) {
            refetchMessages();
          }
        }

        if (payload.type === "typing") {
          setTypingUser(payload.is_typing ? payload.user_name : "");
          if (payload.is_typing) {
            window.clearTimeout(typingTimerRef.current);
            typingTimerRef.current = window.setTimeout(() => setTypingUser(""), 1800);
          }
        }
      } catch {
        return;
      }
    };

    return () => {
      window.clearTimeout(typingTimerRef.current);
      socket.close();
    };
  }, [accessToken, booking?.id, canChat, queryClient, refetchMessages, roleVariant, updateRoomPreview, user?.id]);

  const sendTypingState = (isTyping) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "typing", is_typing: isTyping }));
    }
  };

  const handleDraftChange = (event) => {
    setDraft(event.target.value);
    sendTypingState(Boolean(event.target.value.trim()));
  };

  const sendMessage = () => {
    const content = draft.trim();
    if (!content || socketRef.current?.readyState !== WebSocket.OPEN) {
      return;
    }

    socketRef.current.send(JSON.stringify({ type: "message", content }));
    setDraft("");
    sendTypingState(false);
  };

  const panel = (
    <div
      className={`flex flex-col overflow-hidden bg-white ${
        embedded ? "h-full" : "h-[min(720px,90vh)] max-w-3xl rounded-3xl shadow-2xl"
      }`}
    >
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar name={peerName} color={accentColor} />
            <span
              className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                isOnline ? "bg-emerald-500" : "bg-slate-300"
              }`}
            />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">{peerName}</h2>
            <p className="text-xs text-slate-400">
              {isPatient ? "Clinical Psychologist" : formatIndiaDate(booking.date)}
            </p>
          </div>
        </div>

        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        ) : null}
      </div>

      <div className={`flex-1 overflow-y-auto px-5 py-5 ${isPatient ? "bg-white" : "bg-[#f7f9fc]"}`}>
        {chatQuery.isLoading ? (
          <p className="text-center text-sm text-slate-400">Loading messages...</p>
        ) : null}

        {!chatQuery.isLoading && messages.length === 0 ? <EmptyMessages /> : null}

        <div className="space-y-4">
          {messages.map((message, index) => {
            const isMine = String(message.sender) === String(user?.id);
            const previousMessage = messages[index - 1];
            const showDate =
              !previousMessage ||
              formatMessageDate(previousMessage.created_at) !==
                formatMessageDate(message.created_at);

            return (
              <div key={message.id}>
                {showDate ? (
                  <div className="my-4 flex justify-center">
                    <span className={`px-4 py-1 text-[11px] font-semibold text-slate-500 ${isPatient ? "rounded-full bg-slate-100" : "rounded-full bg-white shadow-sm ring-1 ring-slate-200"}`}>
                      {formatMessageDate(message.created_at)}
                    </span>
                  </div>
                ) : null}

                <div className={`flex items-end ${isMine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[68%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                      isMine
                        ? `rounded-br-sm text-white ${isPatient ? "bg-[#1ABEAA]" : "bg-[#1188D8]"}`
                        : "rounded-bl-sm border border-slate-200 bg-white text-slate-800"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words leading-relaxed">
                      {message.content}
                    </p>
                    <div
                      className={`mt-1 flex items-center gap-0.5 text-[10px] ${
                        isMine ? "justify-end text-white/70" : "text-slate-400"
                      }`}
                    >
                      <span>{formatMessageTime(message.created_at)}</span>
                      <MessageTicks isMine={isMine} isRead={message.is_read} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {typingUser ? <TypingIndicator /> : null}
        </div>
        <div ref={scrollRef} />
      </div>

      <div className="border-t border-slate-200 bg-white">
        {!canChat ? (
          <div className="px-5 py-4 text-center text-sm text-slate-400">
            Chat is closed for this appointment.
          </div>
        ) : (
          <div className="px-5 py-3">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={draft}
                onChange={handleDraftChange}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Type a message..."
                className={`flex-1 rounded-full border border-slate-200 px-4 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-300 ${
                  isPatient ? "bg-white" : "bg-slate-50 focus:bg-white"
                }`}
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={!draft.trim() || connectionState !== "connected"}
                className={`flex ${isPatient ? "h-9 w-9" : "h-10 w-10"} flex-shrink-0 items-center justify-center rounded-full text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  isPatient
                    ? "bg-[#1ABEAA] hover:bg-[#18a896]"
                    : "bg-[#1188D8] hover:bg-[#0e76c0]"
                }`}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (embedded) {
    return panel;
  }

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-slate-950/50 px-4 py-6">
      {panel}
    </div>
  );
};

export default AppointmentChat;

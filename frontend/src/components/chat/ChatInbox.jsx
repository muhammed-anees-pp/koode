import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { fetchChatRooms } from "../../api/chat.api";
import { formatIndiaTime } from "../../utils/indiaDateTime";
import AppointmentChat from "./AppointmentChat";

const formatLastSeen = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const now = new Date();
  const minutesAgo = Math.floor((now - date) / 60_000);
  const hoursAgo = Math.floor(minutesAgo / 60);

  if (minutesAgo < 1) {
    return "now";
  }

  if (hoursAgo < 24) {
    return formatIndiaTime(value);
  }

  if (hoursAgo < 48) {
    return "Yesterday";
  }

  return date.toLocaleDateString("en-IN", { weekday: "short" });
};

const Avatar = ({ name, size = "md", color }) => {
  const sizeClass = size === "lg" ? "h-12 w-12 text-sm" : "h-10 w-10 text-xs";

  return (
    <div
      className={`flex flex-shrink-0 items-center justify-center rounded-full font-bold text-white ${sizeClass}`}
      style={{ backgroundColor: color }}
    >
      {name?.charAt(0)?.toUpperCase() || "?"}
    </div>
  );
};

const EmptyState = ({ compact = false }) => (
  <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
    <svg
      width={compact ? "44" : "48"}
      height={compact ? "44" : "48"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="opacity-40"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
    <p className={compact ? "text-xs" : "text-sm"}>
      Select a conversation to start chatting
    </p>
  </div>
);

const ChatInbox = ({ variant = "patient" }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchValue, setSearchValue] = useState("");
  const isPatient = variant === "patient";
  const selectedAppointmentId = searchParams.get("appointment");
  const roomsQuery = useQuery({
    queryKey: ["chat-rooms", variant],
    queryFn: fetchChatRooms,
    refetchInterval: 4000,
    refetchOnWindowFocus: true,
  });

  const rooms = useMemo(() => roomsQuery.data ?? [], [roomsQuery.data]);
  const filteredRooms = useMemo(() => {
    if (!searchValue.trim()) {
      return rooms;
    }

    const query = searchValue.trim().toLowerCase();
    return rooms.filter((room) => {
      const title = isPatient ? room.psychologist_name : room.patient_name;
      return (
        title?.toLowerCase().includes(query) ||
        room.last_message?.toLowerCase().includes(query)
      );
    });
  }, [isPatient, rooms, searchValue]);

  const selectedRoom = useMemo(() => {
    if (!filteredRooms.length) {
      return null;
    }

    return (
      filteredRooms.find(
        (room) => String(room.appointment_id) === String(selectedAppointmentId)
      ) || filteredRooms[0]
    );
  }, [filteredRooms, selectedAppointmentId]);

  useEffect(() => {
    if (!rooms.length) {
      return;
    }

    const hasMatchingRoom = rooms.some(
      (room) => String(room.appointment_id) === String(selectedAppointmentId)
    );

    if (!selectedAppointmentId || !hasMatchingRoom) {
      setSearchParams({ appointment: rooms[0].appointment_id }, { replace: true });
    }
  }, [rooms, selectedAppointmentId, setSearchParams]);

  const selectedBooking = selectedRoom
    ? {
        room_id: selectedRoom.id,
        id: selectedRoom.appointment_id,
        status: selectedRoom.appointment_status,
        date: selectedRoom.appointment_date,
        start_time: selectedRoom.appointment_start_time,
        end_time: selectedRoom.appointment_end_time,
        chat_enabled: selectedRoom.is_active,
        patient_name: selectedRoom.patient_name,
        psychologist_name: selectedRoom.psychologist_name,
      }
    : null;

  const sidebarWidth = isPatient ? "w-[265px]" : "w-[340px]";
  const searchPlaceholder = isPatient
    ? "Search conversations..."
    : "Search patients...";
  const title = isPatient ? "Messages" : "Messaging Center";
  const emptyText = isPatient ? "No conversations yet." : "No active chats yet.";
  const accent = isPatient ? "#1ABEAA" : "#1188D8";
  const mainBackground = isPatient ? "bg-white" : "bg-[#f7f9fc]";

  return (
    <div className={`flex flex-1 overflow-hidden ${isPatient ? "bg-white" : "h-[calc(100vh-64px)] bg-white"}`}>
      <aside className={`flex ${sidebarWidth} flex-shrink-0 flex-col border-r border-slate-200 bg-white`}>
        <div className="border-b border-slate-100 px-5 py-5">
          <h1 className={`${isPatient ? "text-base" : "text-lg"} font-bold text-slate-900`}>
            {title}
          </h1>
        </div>

        <div className="px-4 py-3">
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              width={isPatient ? "14" : "15"}
              height={isPatient ? "14" : "15"}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder={searchPlaceholder}
              className={`w-full rounded-full border border-slate-200 bg-slate-50 pr-4 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:bg-white ${
                isPatient ? "py-2 pl-9 text-xs" : "py-2.5 pl-10 text-sm"
              }`}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {roomsQuery.isLoading ? (
            <p className={`px-5 py-4 text-slate-400 ${isPatient ? "text-xs" : "text-sm"}`}>
              Loading...
            </p>
          ) : null}

          {!roomsQuery.isLoading && rooms.length === 0 ? (
            <p className={`px-5 py-4 text-slate-400 ${isPatient ? "text-xs" : "text-sm"}`}>
              {emptyText}
            </p>
          ) : null}

          {!roomsQuery.isLoading && rooms.length > 0 && filteredRooms.length === 0 ? (
            <p className={`px-5 py-4 text-slate-400 ${isPatient ? "text-xs" : "text-sm"}`}>
              No matches found.
            </p>
          ) : null}

          {filteredRooms.map((room) => {
            const active = selectedRoom?.id === room.id;
            const name = isPatient ? room.psychologist_name : room.patient_name;
            const activeChat =
              room.is_active &&
              !["COMPLETED", "CANCELLED"].includes(room.appointment_status);
            const preview =
              room.last_message ||
              `Appointment · ${formatIndiaTime(room.appointment_start_time)}`;
            const timeLabel = formatLastSeen(
              room.last_message_at || room.appointment_start_time
            );

            return (
              <button
                key={room.id}
                type="button"
                onClick={() => setSearchParams({ appointment: room.appointment_id })}
                className={`flex w-full items-center gap-3 border-b border-slate-100 text-left transition ${
                  isPatient
                    ? active
                      ? "bg-[rgba(26,190,170,0.07)]"
                      : "hover:bg-slate-50"
                    : active
                      ? "border-l-[3px] border-l-[#1188D8] bg-blue-50"
                      : "border-l-[3px] border-l-transparent hover:bg-slate-50"
                } ${isPatient ? "px-4 py-3" : "px-4 py-3.5"}`}
              >
                <div className="relative flex-shrink-0">
                  <Avatar name={name} size={isPatient ? "md" : "lg"} color={accent} />
                  {activeChat ? (
                    <span
                      className={`absolute bottom-0 right-0 rounded-full border-2 border-white ${
                        isPatient
                          ? "h-2.5 w-2.5 bg-[#1ABEAA]"
                          : "h-3 w-3 bg-emerald-500"
                      }`}
                    />
                  ) : !isPatient ? (
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-slate-300" />
                  ) : null}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className={`truncate font-semibold text-slate-900 ${isPatient ? "text-xs" : "text-sm"}`}>
                      {name}
                    </span>
                    <span className={`ml-2 flex-shrink-0 text-slate-400 ${isPatient ? "text-[10px]" : "text-[11px]"}`}>
                      {timeLabel}
                    </span>
                  </div>
                  <div className={`mt-0.5 ${isPatient ? "" : "flex items-center justify-between gap-2"}`}>
                    <p
                      className={`line-clamp-1 ${
                        room.unread_count > 0
                          ? "font-semibold text-slate-700"
                          : isPatient
                            ? "text-slate-400"
                            : "text-slate-500"
                      } ${isPatient ? "text-[11px]" : "text-xs"}`}
                    >
                      {preview}
                    </p>
                    {room.unread_count > 0 ? (
                      isPatient ? (
                        <span className="h-2 w-2 flex-shrink-0 rounded-full bg-[#1ABEAA]" />
                      ) : (
                        <span className="flex-shrink-0 rounded-full bg-[#1188D8] px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {room.unread_count}
                        </span>
                      )
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <div className={`flex flex-1 flex-col overflow-hidden ${mainBackground}`}>
        {selectedBooking ? (
          <AppointmentChat
            key={selectedBooking.id}
            booking={selectedBooking}
            roleVariant={variant}
            embedded
          />
        ) : (
          <EmptyState compact={isPatient} />
        )}
      </div>
    </div>
  );
};

export default ChatInbox;

import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "../../api/notifications.api";
import { useNotificationsStore } from "../../store/notifications.store";

const formatNotificationTime = (value) =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
    hour12: true,
  }).format(new Date(value));

const STYLES = {
  patient: {
    button:
      "relative w-10 h-10 bg-ui-100 rounded-full border-none cursor-pointer flex items-center justify-center text-ui-600 transition-all duration-200 hover:bg-[rgba(26,190,170,0.1)] hover:text-patient-primary",
    badge:
      "absolute -top-[3px] -right-[3px] min-w-[18px] h-[18px] px-1 bg-[#ef4444] text-white text-[10px] font-bold rounded-full flex items-center justify-center",
    panel:
      "absolute right-0 top-[calc(100%+12px)] w-[340px] bg-white border border-ui-200 rounded-[16px] shadow-[0_16px_40px_rgba(0,0,0,0.12)] z-50 overflow-hidden",
    headerAccent: "text-patient-primary",
    itemUnread: "bg-[rgba(26,190,170,0.06)]",
    itemRead: "bg-white",
    action: "text-patient-primary",
    dot: "bg-patient-primary",
  },
  psychologist: {
    button:
      "relative p-1 text-gray-500 bg-transparent border-none cursor-pointer hover:text-gray-700 transition-all",
    badge:
      "absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center",
    panel:
      "absolute right-0 top-[calc(100%+8px)] w-[340px] bg-white border border-gray-200 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.10)] overflow-hidden z-50",
    headerAccent: "text-psycho-primary",
    itemUnread: "bg-sky-50",
    itemRead: "bg-white",
    action: "text-psycho-primary",
    dot: "bg-psycho-primary",
  },
  admin: {
    button:
      "relative bg-transparent border-none text-slate-400 cursor-pointer flex items-center justify-center hover:text-slate-200 transition-colors p-1",
    badge:
      "absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-admin-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center",
    panel:
      "absolute right-0 top-[calc(100%+8px)] w-[340px] bg-[#161b2e] border border-slate-700/60 rounded-[12px] shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden z-10",
    headerAccent: "text-admin-primary",
    itemUnread: "bg-slate-800/70",
    itemRead: "bg-[#161b2e]",
    action: "text-admin-primary",
    dot: "bg-admin-primary",
    bodyText: "text-slate-200",
    metaText: "text-slate-400",
  },
};

const FILTERS = ["Unread", "Read", "All"];

const NotificationBell = ({ variant = "patient" }) => {
  const styles = STYLES[variant];
  const ref = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("Unread");
  const items = useNotificationsStore((state) => state.items);
  const unreadCount = useNotificationsStore((state) => state.unreadCount);
  const isConnected = useNotificationsStore((state) => state.isConnected);
  const markAsRead = useNotificationsStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationsStore((state) => state.markAllAsRead);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: (notification) => {
      markAsRead(notification.id);
    },
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      markAllAsRead();
    },
  });

  const filteredItems = items.filter((notification) => {
    if (activeFilter === "Unread") {
      return !notification.is_read;
    }
    if (activeFilter === "Read") {
      return notification.is_read;
    }
    return true;
  });

  return (
    <div className="relative" ref={ref}>
      <button
        className={styles.button}
        aria-label="Notifications"
        type="button"
        onClick={() => setIsOpen((open) => !open)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 ? (
          <span className={styles.badge}>{unreadCount > 99 ? "99+" : unreadCount}</span>
        ) : (
          <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full border-2 border-white ${styles.dot} ${isConnected ? "opacity-100" : "opacity-30"}`} />
        )}
      </button>

      {isOpen ? (
        <div className={styles.panel}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-black/5">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${styles.headerAccent}`}>
                Notifications
              </p>
            </div>
            <button
              type="button"
              onClick={() => markAllMutation.mutate()}
              disabled={!items.length || unreadCount === 0 || markAllMutation.isPending}
              className={`text-xs font-semibold disabled:opacity-50 ${styles.action}`}
            >
              Mark all read
            </button>
          </div>

          <div className="flex gap-2 px-4 py-3 border-b border-black/5">
            {FILTERS.map((filter) => {
              const isActive = activeFilter === filter;
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    isActive
                      ? `${styles.action} bg-black/5`
                      : "text-slate-500 hover:bg-black/5"
                  }`}
                >
                  {filter}
                </button>
              );
            })}
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {filteredItems.length === 0 ? (
              <div className="px-4 py-8 text-sm text-slate-500">
                No {activeFilter.toLowerCase()} notifications.
              </div>
            ) : (
              filteredItems.map((notification) => (
                <div
                  key={notification.id}
                  className={`block w-full border-none px-4 py-3 text-left transition hover:bg-black/5 ${notification.is_read ? styles.itemRead : styles.itemUnread}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className={`text-sm ${styles.bodyText || "text-slate-700"}`}>{notification.message}</p>
                    {!notification.is_read ? (
                      <span className={`mt-1 h-2.5 w-2.5 rounded-full flex-shrink-0 ${styles.dot}`} />
                    ) : null}
                  </div>
                  <p className={`mt-2 text-xs ${styles.metaText || "text-slate-500"}`}>
                    {formatNotificationTime(notification.created_at)}
                  </p>
                  {!notification.is_read ? (
                    <button
                      type="button"
                      onClick={() => markReadMutation.mutate(notification.id)}
                      className={`mt-3 text-xs font-semibold ${styles.action}`}
                    >
                      Mark as read
                    </button>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default NotificationBell;

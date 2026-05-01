import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { markNotificationRead } from "../../api/notifications.api";
import { useAuthStore } from "../../store/auth.store";
import { useNotificationsStore } from "../../store/notifications.store";
import { getNotificationTarget, getRoleKey } from "../../utils/notificationNavigation";

const TOAST_DURATION = 5000;

const STYLES = {
  patient: {
    wrapper:
      "border border-patient-primary/20 bg-white text-slate-900 shadow-[0_18px_45px_rgba(26,190,170,0.20)]",
    accent: "left-0 top-0 h-full w-1.5 bg-patient-primary",
    content: "gap-3 px-4 py-3.5",
    icon: "h-10 w-10 rounded-full bg-patient-light text-patient-primary",
    title: "text-slate-900",
    message: "text-slate-600",
    action:
      "text-slate-400 hover:bg-patient-light hover:text-patient-primary",
    titleText: "New notification",
  },
  psychologist: {
    wrapper:
      "border border-sky-100 bg-gradient-to-r from-white to-sky-50 text-slate-900 shadow-[0_18px_45px_rgba(17,136,216,0.18)]",
    accent: "left-4 right-4 top-0 h-1 bg-psycho-primary rounded-b-full",
    content: "gap-3 px-4 py-4",
    icon: "h-9 w-9 rounded-[10px] bg-psycho-primary text-white",
    title: "text-psycho-primary",
    message: "text-slate-700",
    action: "text-slate-400 hover:bg-sky-100 hover:text-psycho-primary",
    titleText: "Session update",
  },
  admin: {
    wrapper:
      "border border-slate-700/70 bg-[#161b2e] text-slate-100 shadow-[0_18px_45px_rgba(0,0,0,0.40)]",
    accent: "bottom-0 left-0 top-0 w-1 bg-admin-primary",
    content: "gap-3 px-4 py-3.5",
    icon: "h-9 w-9 rounded-[8px] bg-admin-primary/15 text-admin-primary",
    title: "text-slate-100",
    message: "text-slate-300",
    action: "text-slate-400 hover:bg-slate-800 hover:text-admin-primary",
    titleText: "Admin alert",
  },
};

const BellIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const CloseIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

const NotificationToast = ({ notification, styles, onDismiss, onOpen }) => {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(notification.id), TOAST_DURATION);
    return () => window.clearTimeout(timer);
  }, [notification.id, onDismiss]);

  return (
    <div
      className={`relative flex w-full max-w-[calc(100vw-32px)] overflow-hidden rounded-[12px] animate-toast-slide-up sm:w-[360px] ${styles.wrapper}`}
      role="button"
      aria-live="polite"
      tabIndex={0}
      onClick={() => onOpen(notification)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(notification);
        }
      }}
    >
      <span className={`absolute ${styles.accent}`} />
      <div className={`flex min-w-0 flex-1 text-left ${styles.content}`}>
        <div className={`mt-0.5 flex flex-shrink-0 items-center justify-center ${styles.icon}`}>
          <BellIcon />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold leading-5 ${styles.title}`}>
            {styles.titleText}
          </p>
          <p className={`mt-1 line-clamp-3 text-sm leading-5 ${styles.message}`}>
            {notification.message}
          </p>
        </div>
        <button
          type="button"
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition ${styles.action}`}
          aria-label="Dismiss notification"
          onClick={(event) => {
            event.stopPropagation();
            onDismiss(notification.id);
          }}
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  );
};

const NotificationToasts = () => {
  const navigate = useNavigate();
  const role = useAuthStore((state) => state.role);
  const toasts = useNotificationsStore((state) => state.toasts);
  const markAsRead = useNotificationsStore((state) => state.markAsRead);
  const dismissToast = useNotificationsStore((state) => state.dismissToast);
  const styles = STYLES[getRoleKey(role)];

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
  });

  const handleOpen = (notification) => {
    dismissToast(notification.id);
    if (!notification.is_read) {
      markAsRead(notification.id);
      markReadMutation.mutate(notification.id);
    }
    navigate(getNotificationTarget(notification, role));
  };

  if (!toasts.length) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-5 right-4 z-[500] flex w-auto flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {toasts.map((notification) => (
        <div className="pointer-events-auto" key={notification.id}>
          <NotificationToast
            notification={notification}
            styles={styles}
            onDismiss={dismissToast}
            onOpen={handleOpen}
          />
        </div>
      ))}
    </div>
  );
};

export default NotificationToasts;

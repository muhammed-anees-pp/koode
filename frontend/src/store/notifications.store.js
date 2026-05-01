import { create } from "zustand";

const dedupeNotifications = (notifications) => {
  const seen = new Set();
  return notifications.filter((notification) => {
    if (seen.has(notification.id)) {
      return false;
    }
    seen.add(notification.id);
    return true;
  });
};

export const useNotificationsStore = create((set) => ({
  items: [],
  toasts: [],
  unreadCount: 0,
  isConnected: false,
  hasLoaded: false,

  setNotifications: (items, unreadCount) =>
    set({
      items: dedupeNotifications(items),
      unreadCount,
      hasLoaded: true,
    }),

  mergeNotifications: (items, unreadCount) =>
    set((state) => ({
      items: dedupeNotifications([...items, ...state.items]),
      unreadCount: Math.max(unreadCount, state.unreadCount),
      hasLoaded: true,
    })),

  prependNotification: (notification) =>
    set((state) => {
      const exists = state.items.some((item) => item.id === notification.id);
      return {
        items: dedupeNotifications([notification, ...state.items]),
        unreadCount:
          state.unreadCount +
          (exists || notification.is_read ? 0 : 1),
      };
    }),

  pushToast: (notification) =>
    set((state) => {
      const exists = state.toasts.some((toast) => toast.id === notification.id);
      if (exists) {
        return state;
      }

      return {
        toasts: [notification, ...state.toasts].slice(0, 3),
      };
    }),

  dismissToast: (notificationId) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== notificationId),
    })),

  markAsRead: (notificationId) =>
    set((state) => ({
      items: state.items.map((notification) =>
        notification.id === notificationId
          ? { ...notification, is_read: true }
          : notification
      ),
      unreadCount: Math.max(
        0,
        state.items.some(
          (notification) =>
            notification.id === notificationId && !notification.is_read
        )
          ? state.unreadCount - 1
          : state.unreadCount
      ),
    })),

  markAllAsRead: () =>
    set((state) => ({
      items: state.items.map((notification) => ({
        ...notification,
        is_read: true,
      })),
      unreadCount: 0,
    })),

  setConnected: (isConnected) => set({ isConnected }),

  reset: () =>
    set({
      items: [],
      toasts: [],
      unreadCount: 0,
      isConnected: false,
      hasLoaded: false,
    }),
}));

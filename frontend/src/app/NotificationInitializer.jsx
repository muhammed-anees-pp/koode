import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchNotifications } from "../api/notifications.api";
import { useAuthStore } from "../store/auth.store";
import { useNotificationsStore } from "../store/notifications.store";

const getNotificationSocketBaseUrl = () => {
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

const buildNotificationWebSocketUrl = (token) => {
  return `${getNotificationSocketBaseUrl()}/ws/notifications/?token=${encodeURIComponent(token)}`;
};

const NotificationInitializer = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const accessToken = useAuthStore((state) => state.accessToken);
  const mergeNotifications = useNotificationsStore((state) => state.mergeNotifications);
  const prependNotification = useNotificationsStore((state) => state.prependNotification);
  const setConnected = useNotificationsStore((state) => state.setConnected);
  const resetNotifications = useNotificationsStore((state) => state.reset);

  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (notificationsQuery.data) {
      mergeNotifications(
        notificationsQuery.data.results ?? [],
        notificationsQuery.data.unread_count ?? 0
      );
    }
  }, [mergeNotifications, notificationsQuery.data]);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      resetNotifications();
      return undefined;
    }

    let socket;
    let reconnectTimer;
    let shouldReconnect = true;
    let reconnectAttempts = 0;

    const connect = () => {
      socket = new WebSocket(buildNotificationWebSocketUrl(accessToken));

      socket.onopen = () => {
        reconnectAttempts = 0;
        setConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "notification" && payload.notification) {
            prependNotification(payload.notification);
          }
        } catch {
          // Ignore malformed websocket messages.
        }
      };

      socket.onclose = (event) => {
        setConnected(false);
        if (!shouldReconnect) {
          return;
        }

        if (event.code === 4401 || event.code === 1008) {
          return;
        }

        reconnectAttempts += 1;
        if (reconnectAttempts > 5) {
          return;
        }

        reconnectTimer = window.setTimeout(connect, 3000);
      };

      socket.onerror = () => {
        socket?.close();
      };
    };

    connect();

    return () => {
      shouldReconnect = false;
      setConnected(false);
      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer);
      }
      socket?.close();
    };
  }, [
    accessToken,
    isAuthenticated,
    prependNotification,
    resetNotifications,
    setConnected,
  ]);

  return null;
};

export default NotificationInitializer;

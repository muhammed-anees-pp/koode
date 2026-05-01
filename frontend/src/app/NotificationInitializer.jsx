import { useEffect, useRef } from "react";
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

const getUserIdFromToken = (token) => {
  if (!token) {
    return null;
  }

  try {
    const base64Payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64Payload));
    return payload.user_id || null;
  } catch {
    return null;
  }
};

const NotificationInitializer = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const currentUserId = user?.id || getUserIdFromToken(accessToken);
  const setNotifications = useNotificationsStore((state) => state.setNotifications);
  const prependNotification = useNotificationsStore((state) => state.prependNotification);
  const pushToast = useNotificationsStore((state) => state.pushToast);
  const setConnected = useNotificationsStore((state) => state.setConnected);
  const resetNotifications = useNotificationsStore((state) => state.reset);
  const previousUserIdRef = useRef(currentUserId);
  const latestAccessTokenRef = useRef(accessToken);
  const hasAccessToken = Boolean(accessToken);

  useEffect(() => {
    latestAccessTokenRef.current = accessToken;
  }, [accessToken]);

  const notificationsQuery = useQuery({
    queryKey: ["notifications", currentUserId],
    queryFn: fetchNotifications,
    enabled: isAuthenticated && Boolean(accessToken),
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (previousUserIdRef.current !== currentUserId) {
      resetNotifications();
      previousUserIdRef.current = currentUserId;
    }
  }, [currentUserId, resetNotifications]);

  useEffect(() => {
    if (notificationsQuery.data) {
      setNotifications(
        notificationsQuery.data.results ?? [],
        notificationsQuery.data.unread_count ?? 0
      );
    }
  }, [setNotifications, notificationsQuery.data]);

  useEffect(() => {
    if (!isAuthenticated || !hasAccessToken) {
      resetNotifications();
      return undefined;
    }

    let socket;
    let reconnectTimer;
    let shouldReconnect = true;
    let reconnectAttempts = 0;

    const connect = () => {
      const token = latestAccessTokenRef.current;
      if (!token) {
        return;
      }

      socket = new WebSocket(buildNotificationWebSocketUrl(token));

      socket.onopen = () => {
        reconnectAttempts = 0;
        setConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "notification" && payload.notification) {
            if (
              payload.notification.recipient &&
              currentUserId &&
              String(payload.notification.recipient) !== String(currentUserId)
            ) {
              return;
            }
            prependNotification(payload.notification);
            pushToast(payload.notification);
          }
        } catch (error) {
          console.error("Error parsing notification payload:", error);
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
    currentUserId,
    hasAccessToken,
    isAuthenticated,
    prependNotification,
    pushToast,
    resetNotifications,
    setConnected,
  ]);

  return null;
};

export default NotificationInitializer;

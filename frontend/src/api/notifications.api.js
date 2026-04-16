import axiosInstance from "./axios";

export const fetchNotifications = async () => {
  const response = await axiosInstance.get("notifications/");
  return response.data;
};

export const markNotificationRead = async (notificationId) => {
  const response = await axiosInstance.post(`notifications/${notificationId}/read/`);
  return response.data;
};

export const markAllNotificationsRead = async () => {
  const response = await axiosInstance.post("notifications/mark-all-read/");
  return response.data;
};


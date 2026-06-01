import axiosInstance from "./axios";


export const fetchAppointmentChat = async (appointmentId) => {
  const response = await axiosInstance.get(`chat/appointments/${appointmentId}/`);
  return response.data;
};

export const fetchChatRooms = async () => {
  const response = await axiosInstance.get("chat/rooms/");
  return response.data;
};

export const fetchAppointmentMessages = async (appointmentId) => {
  const response = await axiosInstance.get(`chat/appointments/${appointmentId}/messages/`);
  return response.data;
};

export const uploadAppointmentChatFile = async ({ appointmentId, file }) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await axiosInstance.post(
    `chat/appointments/${appointmentId}/messages/files/`,
    formData
  );
  return response.data;
};

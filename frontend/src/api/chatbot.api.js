import axiosInstance from "./axios";


export const fetchChatbotMessages = async () => {
  const response = await axiosInstance.get("chatbot/messages/");
  return response.data;
};


export const sendChatbotMessage = async (message) => {
  const response = await axiosInstance.post("chatbot/messages/", { message });
  return response.data;
};

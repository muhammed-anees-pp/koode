import axiosInstance from "./axios";

export const psychologistSignup = async (data) => {
  const response = await axiosInstance.post("psychologist/signup/", data);
  return response.data;
};

export const psychologistLogin = async (data) => {
  const response = await axiosInstance.post("psychologist/login/", data);
  return response.data;
};

export const psychologistVerifyEmail = async (token) => {
  const response = await axiosInstance.post("psychologist/verify-email/", { token });
  return response.data;
};

export const psychologistLogout = async () => {
  const response = await axiosInstance.post("psychologist/logout/");
  return response.data;
};

export const psychologistForgotPassword = async (email) => {
  const response = await axiosInstance.post("/psychologist/forgot-password/", { email });
  return response.data;
};

export const psychologistResetPassword = async (data) => {
  return axiosInstance.post("/psychologist/reset-password/", data);
};

export const psychologistGoogleAuth = async (data) => {
  const response = await axiosInstance.post("psychologist/google-auth/", data);
  return response.data;
};

export const getApplicationStatus = async () => {
  const response = await axiosInstance.get("application/status/");
  return response.data;
};

export const getMyApplication = async () => {
  const response = await axiosInstance.get("application/my/");
  return response.data;
};

export const submitApplication = async (formData) => {
  const response = await axiosInstance.post("application/submit/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const getSpecializations = async () => {
  const response = await axiosInstance.get("psychologist/specializations/");
  return response.data;
};

export const getMyInterview = async () => {
  const response = await axiosInstance.get("interviews/my/");
  return response.data;
};

export const getInterviewToken = async (interviewId) => {
  const response = await axiosInstance.get(`interviews/${interviewId}/token/`);
  return response.data;
};

export const requestJoin = async (interviewId) => {
  const response = await axiosInstance.post(`interviews/${interviewId}/join-request/`);
  return response.data;
};

export const getJoinStatus = async (interviewId) => {
  const response = await axiosInstance.get(`interviews/${interviewId}/join-status/`);
  return response.data;
};

export const getChatMessages = async (interviewId, since = null) => {
  const params = since ? `?since=${encodeURIComponent(since)}` : "";
  const response = await axiosInstance.get(`interviews/${interviewId}/chat/${params}`);
  return response.data;
};

export const sendChatMessage = async (interviewId, text) => {
  const response = await axiosInstance.post(`interviews/${interviewId}/chat/send/`, { text });
  return response.data;
};

export const fetchPsychologistProfile = async () => {
  const response = await axiosInstance.get("psychologist/profile/");
  return response.data;
};

export const updatePsychologistProfile = async (data) => {
  const response = await axiosInstance.put("psychologist/profile/", data, {
    headers: data instanceof FormData ? { "Content-Type": "multipart/form-data" } : {},
  });
  return response.data;
};


export const createAvailability = async (data) => {
  const response = await axiosInstance.post(
    "appointments/availability/create/",
    data
  );
  return response.data;
};

export const revokeAvailabilitySlot = async (slotId) => {
  const response = await axiosInstance.post(
    "appointments/availability/revoke-slot/",
    { slot_id: slotId }
  );
  return response.data;
};

export const getMyAvailability = async () => {
  const response = await axiosInstance.get(
    "appointments/availability/me/"
  );
  return response.data;
};

export const getPsychologistBookings = async () => {
  const response = await axiosInstance.get("appointments/bookings/");
  return response.data;
};

export const cancelPsychologistBooking = async (bookingId, note) => {
  const response = await axiosInstance.post(`appointments/bookings/${bookingId}/cancel/`, {
    note,
  });
  return response.data;
};

export const reschedulePsychologistBooking = async (bookingId, data) => {
  const response = await axiosInstance.post(`appointments/bookings/${bookingId}/reschedule/`, data);
  return response.data;
};

export const completePsychologistBooking = async (bookingId) => {
  const response = await axiosInstance.post(`appointments/bookings/${bookingId}/complete/`);
  return response.data;
};

export const getPsychologistWallet = async () => {
  const response = await axiosInstance.get("finance/wallet/");
  return response.data;
};

export const getConsultationDetail = async (bookingId) => {
  const response = await axiosInstance.get(`consultations/bookings/${bookingId}/`);
  return response.data;
};

export const getConsultationToken = async (bookingId) => {
  const response = await axiosInstance.get(`consultations/bookings/${bookingId}/token/`);
  return response.data;
};

export const psychologistEnterConsultation = async (bookingId) => {
  const response = await axiosInstance.post(`consultations/bookings/${bookingId}/psychologist-enter/`);
  return response.data;
};

export const approveConsultationJoin = async (bookingId) => {
  const response = await axiosInstance.post(`consultations/bookings/${bookingId}/approve-join/`);
  return response.data;
};

export const exitConsultation = async (bookingId) => {
  const response = await axiosInstance.post(`consultations/bookings/${bookingId}/exit/`);
  return response.data;
};

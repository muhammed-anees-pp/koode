import axiosInstance from "./axios";

export const patientSignup = async (data) => {
  const response = await axiosInstance.post("patient/signup/", data);
  return response.data;
};

export const patientLogin = async (data) => {
  const response = await axiosInstance.post("patient/login/", data);
  return response.data;
};

export const patientVerifyEmail = async (token) => {
  const response = await axiosInstance.post("patient/verify-email/", { token });
  return response.data;
};

export const fetchPatientHome = async () => {
  const response = await axiosInstance.get("home/");
  return response.data;
};

export const patientLogout = async () => {
  const response = await axiosInstance.post("patient/logout/");
  return response.data;
};

export const patientForgotPassword = async (email) => {
  const response = await axiosInstance.post("/patient/forgot-password/", { email });
  return response.data;
};

export const patientResetPassword = async (data) => {
  return axiosInstance.post("/patient/reset-password/", data);
};

export const patientGoogleAuth = async (data) => {
  const response = await axiosInstance.post("patient/google-auth/", data);
  return response.data;
};

export const fetchPatientProfile = async () => {
  const response = await axiosInstance.get("patient/profile/");
  return response.data;
};

export const updatePatientProfile = async (data) => {
  const response = await axiosInstance.put("patient/profile/", data, {
    headers: data instanceof FormData ? { "Content-Type": "multipart/form-data" } : {},
  });
  return response.data;
};

export const fetchPatientPsychologists = async () => {
  const response = await axiosInstance.get("patient/psychologists/");
  return response.data;
};

export const fetchPatientPsychologistDetail = async (id) => {
  const response = await axiosInstance.get(`patient/psychologists/${id}/`);
  return response.data;
};

export const fetchSpecializations = async () => {
  const response = await axiosInstance.get("psychologist/specializations/");
  return response.data;
};

export const fetchPsychologistFinderQuestions = async () => {
  const response = await axiosInstance.get("psychologist-finder/questions/");
  return response.data;
};

export const submitPsychologistFinderAnswers = async ({ answers, concernText = "" }) => {
  const response = await axiosInstance.post("psychologist-finder/recommend/", {
    answers,
    concern_text: concernText,
  });
  return response.data;
};


export const getPsychologistSlots = async (psychologistId, date) => {
  const response = await axiosInstance.get(
    `appointments/slots/${psychologistId}/?date=${date}`
  );
  return response.data;
};

export const bookSlot = async ({ slotId, walletAmount = 0 }) => {
  const response = await axiosInstance.post("appointments/book/", {
    slot_id: slotId,
    wallet_amount: walletAmount,
  });
  return response.data;
};

export const getMyBookings = async () => {
  const response = await axiosInstance.get("appointments/bookings/");
  return response.data;
};

export const cancelPatientBooking = async (bookingId, note) => {
  const response = await axiosInstance.post(`appointments/bookings/${bookingId}/cancel/`, {
    note,
  });
  return response.data;
};

export const submitBookingReview = async ({ bookingId, rating, review }) => {
  const response = await axiosInstance.post(`reviews/bookings/${bookingId}/`, {
    rating,
    review,
  });
  return response.data;
};

export const getWallet = async () => {
  const response = await axiosInstance.get("finance/wallet/");
  return response.data;
};

export const createWalletTopUpOrder = async (amount) => {
  const response = await axiosInstance.post("finance/wallet/top-up/order/", { amount });
  return response.data;
};

export const verifyWalletTopUp = async (data) => {
  const response = await axiosInstance.post("finance/wallet/top-up/verify/", data);
  return response.data;
};

export const verifyAppointmentPayment = async (data) => {
  const response = await axiosInstance.post("finance/payments/appointment/verify/", data);
  return response.data;
};

export const cancelRazorpayOrder = async (razorpayOrderId) => {
  const response = await axiosInstance.post("finance/payments/razorpay/cancel/", {
    razorpay_order_id: razorpayOrderId,
  });
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

export const requestConsultationJoin = async (bookingId) => {
  const response = await axiosInstance.post(`consultations/bookings/${bookingId}/request-join/`);
  return response.data;
};

export const exitConsultation = async (bookingId) => {
  const response = await axiosInstance.post(`consultations/bookings/${bookingId}/exit/`);
  return response.data;
};

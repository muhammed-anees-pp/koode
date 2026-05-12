import axiosInstance from "./axios";

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

export const requestConsultationJoin = async (bookingId) => {
  const response = await axiosInstance.post(`consultations/bookings/${bookingId}/request-join/`);
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

export const fetchConsultationMessages = async (bookingId) => {
  const response = await axiosInstance.get(`consultations/bookings/${bookingId}/messages/`);
  return response.data;
};

export const sendConsultationMessage = async ({ bookingId, text }) => {
  const response = await axiosInstance.post(`consultations/bookings/${bookingId}/messages/`, { text });
  return response.data;
};

export const saveConsultationNotes = async ({ bookingId, patientNote, psychologistNote }) => {
  const response = await axiosInstance.patch(`consultations/bookings/${bookingId}/notes/`, {
    patient_note: patientNote,
    psychologist_note: psychologistNote,
  });
  return response.data;
};

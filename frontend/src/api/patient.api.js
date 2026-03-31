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

export const fetchPatientTherapists = async () => {
  const response = await axiosInstance.get("patient/therapists/");
  return response.data;
};

export const fetchPatientTherapistDetail = async (id) => {
  const response = await axiosInstance.get(`patient/therapists/${id}/`);
  return response.data;
};

export const fetchSpecializations = async () => {
  const response = await axiosInstance.get("psychologist/specializations/");
  return response.data;
};
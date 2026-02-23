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
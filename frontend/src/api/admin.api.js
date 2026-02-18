import axiosInstance from "./axios";

export const adminLogin = async (data) => {
  const response = await axiosInstance.post("admin/auth/login/", data);
  return response.data;
};

export const fetchDashboard = async () => {
  const response = await axiosInstance.get("admin/dashboard/");
  return response.data;
};

export const refreshAccessToken = async () => {
  const response = await axiosInstance.post("admin/auth/refresh/");
  return response.data;
};


export const adminLogout = async () => {
  const response = await axiosInstance.post("admin/auth/logout/");
  return response.data;
};

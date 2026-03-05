import axiosInstance from "./axios";

export const adminLogin = async (data) => {
  const response = await axiosInstance.post("admin/auth/login/", data);
  return response.data;
};

export const fetchDashboard = async () => {
  const response = await axiosInstance.get("admin/dashboard/");
  return response.data;
};

export const adminLogout = async () => {
  const response = await axiosInstance.post("admin/auth/logout/");
  return response.data;
};

export const adminForgotPassword = async (email) => {
  const response = await axiosInstance.post("/admin/auth/forgot-password/", { email });
  return response.data;
};

export const adminResetPassword = async (data) => {
  return axiosInstance.post("/admin/auth/reset-password/", data);
};

export const fetchAdminPatients = async ({ page = 1, pageSize = 10, search = "", sortBy = "joined_date", sortDir = "desc", filterStatus = "all" } = {}) => {
  const params = new URLSearchParams({ page, page_size: pageSize, sort_by: sortBy, sort_dir: sortDir, filter_status: filterStatus });
  if (search) params.append("search", search);
  const response = await axiosInstance.get(`admin/patients/?${params}`);
  return response.data;
};

export const togglePatientSuspension = async (patientId) => {
  const response = await axiosInstance.post(`admin/patients/${patientId}/suspend/`);
  return response.data;
};

export const fetchAdminApplications = async ({ search = "", filterStatus = "all", sortBy = "date", sortDir = "desc" } = {}) => {
  const params = new URLSearchParams({ sort_by: sortBy, sort_dir: sortDir });
  if (search) params.append("search", search);
  if (filterStatus !== "all") params.append("status", filterStatus);
  const response = await axiosInstance.get(`application/admin/application-list/?${params}`);
  return response.data;
};
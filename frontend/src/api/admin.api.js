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

export const fetchAdminPatientDetail = async (patientId) => {
  const response = await axiosInstance.get(`admin/patients/${patientId}/`);
  return response.data;
};

export const fetchAdminPsychologists = async ({ page = 1, pageSize = 10, search = "", sortBy = "joined_date", sortDir = "desc", filterStatus = "all" } = {}) => {
  const params = new URLSearchParams({ page, page_size: pageSize, sort_by: sortBy, sort_dir: sortDir, filter_status: filterStatus });
  if (search) params.append("search", search);
  const response = await axiosInstance.get(`admin/psychologist/?${params}`);
  return response.data;
};

export const fetchAdminPsychologistDetail = async (id) => {
  const response = await axiosInstance.get(`admin/psychologist/${id}/`);
  return response.data;
};

export const togglePsychologistSuspension = async (psychologistId) => {
  const response = await axiosInstance.post(`admin/psychologist/${psychologistId}/suspend/`);
  return response.data;
};

export const fetchAdminReviews = async ({
  page = 1,
  pageSize = 10,
  search = "",
  rating = "all",
} = {}) => {
  const params = new URLSearchParams({ page, page_size: pageSize });
  if (search) params.append("search", search);
  if (rating !== "all") params.append("rating", rating);
  const response = await axiosInstance.get(`reviews/admin/?${params}`);
  return response.data;
};

export const fetchAdminApplications = async ({ search = "", filterStatus = "all", sortBy = "date", sortDir = "desc" } = {}) => {
  const params = new URLSearchParams({ sort_by: sortBy, sort_dir: sortDir });
  if (search) params.append("search", search);
  if (filterStatus !== "all") params.append("status", filterStatus);
  const response = await axiosInstance.get(`application/admin/application-list/?${params}`);
  return response.data;
};

export const fetchApplicationDetail = async (id) => {
  const response = await axiosInstance.get(`application/admin/application/${id}/`);
  return response.data;
};

export const updateApplication = async ({ id, data }) => {
  const response = await axiosInstance.patch(`application/admin/application/${id}/update/`, data);
  return response.data;
};

export const scheduleInterview = async ({ id, interview_date, admin_notes }) => {
  const response = await axiosInstance.post(`application/admin/application/${id}/schedule-interview/`, { interview_date, admin_notes });
  return response.data;
};

export const getAdminInterviewToken = async (interviewId) => {
  const response = await axiosInstance.get(`interviews/${interviewId}/admin-token/`);
  return response.data;
};

export const approveJoin = async (interviewId) => {
  const response = await axiosInstance.post(`interviews/${interviewId}/approve-join/`);
  return response.data;
};

export const getPendingJoin = async (interviewId) => {
  const response = await axiosInstance.get(`interviews/${interviewId}/pending-join/`);
  return response.data;
};

export const endInterview = async (interviewId, data) => {
  const response = await axiosInstance.post(`interviews/${interviewId}/end/`, data);
  return response.data;
};

export const updateInterviewStatus = async (interviewId, newStatus) => {
  const response = await axiosInstance.patch(`interviews/${interviewId}/status/`, { status: newStatus });
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

export const getAdminFinance = async () => {
  const response = await axiosInstance.get("finance/wallet/");
  return response.data;
};

export const getAdminWallet = getAdminFinance;

export const fetchCommissionRates = async () => {
  const response = await axiosInstance.get("finance/commission-rates/");
  return response.data;
};

export const createCommissionRate = async (data) => {
  const response = await axiosInstance.post("finance/commission-rates/", data);
  return response.data;
};

export const fetchConsultationRecordings = async () => {
  const response = await axiosInstance.get("consultations/recordings/");
  return response.data;
};

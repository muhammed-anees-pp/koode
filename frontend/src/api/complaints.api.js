import axiosInstance from "./axios";

export const fetchPatientComplaints = async ({ search = "", status = "ALL" } = {}) => {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  if (status && status !== "ALL") params.append("status", status);
  const query = params.toString();
  const response = await axiosInstance.get(`complaints/${query ? `?${query}` : ""}`);
  return response.data;
};

export const fetchEligibleComplaintBookings = async () => {
  const response = await axiosInstance.get("complaints/eligible-bookings/");
  return response.data;
};

export const submitComplaint = async ({ bookingId, category, severity = "MEDIUM", subject, description, evidence = [] }) => {
  const formData = new FormData();
  formData.append("category", category);
  formData.append("severity", severity);
  formData.append("subject", subject);
  formData.append("description", description);
  evidence.forEach((file) => formData.append("evidence", file));

  const response = await axiosInstance.post(`complaints/bookings/${bookingId}/`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const fetchAdminComplaints = async ({
  page = 1,
  pageSize = 10,
  search = "",
  status = "ALL",
  category = "ALL",
  severity = "ALL",
  date = "",
} = {}) => {
  const params = new URLSearchParams({ page, page_size: pageSize });
  if (search) params.append("search", search);
  if (status && status !== "ALL") params.append("status", status);
  if (category && category !== "ALL") params.append("category", category);
  if (severity && severity !== "ALL") params.append("severity", severity);
  if (date) params.append("date", date);
  const response = await axiosInstance.get(`complaints/admin/?${params}`);
  return response.data;
};

export const fetchAdminComplaintDetail = async (complaintId) => {
  const response = await axiosInstance.get(`complaints/admin/${complaintId}/`);
  return response.data;
};

export const updateAdminComplaint = async ({ complaintId, action, message, internalAdminNote, severity }) => {
  const payload = { action };
  if (message !== undefined) payload.message = message;
  if (internalAdminNote !== undefined) payload.internal_admin_note = internalAdminNote;
  if (severity !== undefined) payload.severity = severity;
  const response = await axiosInstance.patch(`complaints/admin/${complaintId}/`, payload);
  return response.data;
};

export const fetchPsychologistComplaints = async ({ search = "" } = {}) => {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  const query = params.toString();
  const response = await axiosInstance.get(`complaints/psychologist/${query ? `?${query}` : ""}`);
  return response.data;
};

export const fetchPsychologistComplaintDetail = async (complaintId) => {
  const response = await axiosInstance.get(`complaints/psychologist/${complaintId}/`);
  return response.data;
};

export const submitPsychologistComplaintResponse = async ({ complaintId, response, evidence = [] }) => {
  const formData = new FormData();
  formData.append("response", response);
  evidence.forEach((file) => formData.append("evidence", file));
  const result = await axiosInstance.post(`complaints/psychologist/${complaintId}/`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return result.data;
};

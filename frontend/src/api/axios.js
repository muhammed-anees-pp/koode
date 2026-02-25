import axios from "axios";
import { useAuthStore } from "../store/auth.store";

const axiosInstance = axios.create({
  baseURL: "http://localhost:8000/api/",
  withCredentials: true,
});

axiosInstance.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — detect suspension mid-session
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error?.response?.data;
    const status = error?.response?.status;

    if (status === 401 && data?.code === "suspended") {
      // Clear auth state
      useAuthStore.getState().logout();
      // Redirect to patient login with reason
      if (typeof window !== "undefined") {
        window.location.href = "/patient/login?reason=suspended";
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
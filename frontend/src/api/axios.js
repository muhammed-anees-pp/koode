import axios from "axios";
import { useAuthStore } from "../store/auth.store";

const axiosInstance = axios.create({
  baseURL: "/api/",
  withCredentials: true,
});

axiosInstance.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error?.response?.data;
    const status = error?.response?.status;

    if (status === 401 && data?.code === "suspended") {
      const role = useAuthStore.getState().role;
      useAuthStore.getState().logout();
      localStorage.removeItem("koode-auth-storage");
      if (role === "PSYCHOLOGIST") {
        window.location.href = "/psychologist/login";
      } else {
        window.location.href = "/patient/login";
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
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

export default axiosInstance;
import api from "./axios";

export const getStatus =() => api.get("status/")
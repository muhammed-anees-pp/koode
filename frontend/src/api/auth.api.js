import axiosInstance from "./axios";

let refreshPromise = null;

export const refreshAccessToken = async () => {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = axiosInstance
    .post("auth/refresh/")
    .then((response) => response.data)
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};
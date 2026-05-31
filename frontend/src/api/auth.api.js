import axiosInstance from "./axios";

const refreshPromises = new Map();

export const refreshAccessToken = async (role) => {
  const key = role || "default";
  if (refreshPromises.has(key)) {
    return refreshPromises.get(key);
  }

  const refreshPromise = axiosInstance
    .post("auth/refresh/", role ? { role } : {})
    .then((response) => response.data)
    .finally(() => {
      refreshPromises.delete(key);
    });

  refreshPromises.set(key, refreshPromise);
  return refreshPromise;
};

import axiosInstance from "./axios";

export const fetchCurrentCommissionRate = async () => {
  const response = await axiosInstance.get("finance/commission-rates/current/");
  return response.data;
};

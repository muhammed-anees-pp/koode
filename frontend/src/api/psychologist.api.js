import axiosInstance from "./axios";

export const psychologistSignup = async (data) => {
    const response = await axiosInstance.post("psychologist/signup/", data);
    return response.data;
};

export const psychologistLogin = async (data) => {
    const response = await axiosInstance.post("psychologist/login/", data);
    return response.data;
};

export const psychologistVerifyEmail = async (token) => {
    const response = await axiosInstance.post("psychologist/verify-email/", { token });
    return response.data;
};

export const psychologistLogout = async () => {
    const response = await axiosInstance.post("psychologist/logout/");
    return response.data;
};

export const psychologistApplication = async () => {
    const response = await axiosInstance.post("psychologist/application/");
    return response.data;
};
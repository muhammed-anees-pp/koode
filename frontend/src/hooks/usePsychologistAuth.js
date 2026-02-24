import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { psychologistSignup, psychologistLogin } from "../api/psychologist.api";
import { useAuthStore } from "../store/auth.store";

export const usePsychologistSignupMutation = (setFormError, setLocalError) => {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data) => psychologistSignup(data),
    onSuccess: (data, variables) => {
      navigate("/psychologist/verification-sent", {
        state: { emailSent: true, email: variables.email },
      });
    },
    onError: (error) => {
      const responseData = error.response?.data;

      if (responseData?.email) {
        setFormError("email", {
          type: "manual",
          message: Array.isArray(responseData.email) ? responseData.email[0] : responseData.email,
        });
      } 
      else if (responseData?.password) {
        const passwordError = Array.isArray(responseData.password) 
          ? responseData.password[0] 
          : responseData.password;
        setFormError("password", { type: "manual", message: passwordError });
      } 
      else if (responseData?.full_name) {
        setFormError("full_name", {
          type: "manual",
          message: Array.isArray(responseData.full_name) ? responseData.full_name[0] : responseData.full_name,
        });
      } 
      else if (responseData?.confirm_password) {
        setFormError("confirm_password", {
          type: "manual",
          message: Array.isArray(responseData.confirm_password) ? responseData.confirm_password[0] : responseData.confirm_password,
        });
      } 
      else if (responseData?.message) {
        setLocalError(responseData.message);
      } 
      else if (responseData?.detail) {
        setLocalError(responseData.detail);
      } 
      else {
        setLocalError("Signup failed. Please try again.");
      }
    },
  });
};

export const usePsychologistLoginMutation = (setFormError, setLocalError) => {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  return useMutation({
    mutationFn: (data) => psychologistLogin(data),
    onSuccess: (data) => {
      if (data?.access && data?.user) {
        login(data, data.user.role);
        navigate("/psychologist/home");
      } else {
        setLocalError("Invalid response from server");
      }
    },
    onError: (error) => {
      const responseData = error.response?.data;

      if (responseData?.email) {
        setFormError("email", {
          type: "manual",
          message: Array.isArray(responseData.email) ? responseData.email[0] : responseData.email,
        });
      } 
      else if (responseData?.password) {
        setFormError("password", {
          type: "manual",
          message: Array.isArray(responseData.password) ? responseData.password[0] : responseData.password,
        });
      } 
      else if (responseData?.detail || responseData?.message) {
        setLocalError(responseData.detail || responseData.message);
      } 
      else if (typeof responseData === "string") {
        setLocalError(responseData);
      } 
      else {
        setLocalError("Invalid email or password");
      }
    },
  });
};
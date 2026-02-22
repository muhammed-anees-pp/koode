import { useMutation } from "@tanstack/react-query";
import { patientSignup, patientLogin } from "../api/patient.api";
import { useAuthStore } from "../store/auth.store";
import { useNavigate } from "react-router-dom";

export const usePatientSignupMutation = (setError, setLocalError) => {
    const navigate = useNavigate();

    return useMutation({
        mutationFn: patientSignup,
        onSuccess: (_, variables) => {
            navigate("/patient/verification-sent", {
                state: { email: variables.email, emailSent: true },
            });
        },
        onError: (err) => {
            const errorData = err.response?.data;

            if (errorData) {
                let mappedAny = false;
                const allowedFields = ['full_name', 'email', 'password', 'confirm_password', 'agreeToTerms'];

                Object.keys(errorData).forEach((key) => {
                    if (allowedFields.includes(key)) {
                        if (Array.isArray(errorData[key])) {
                            setError(key, { type: "backend", message: errorData[key][0] });
                            mappedAny = true;
                        } else if (typeof errorData[key] === "string") {
                            setError(key, { type: "backend", message: errorData[key] });
                            mappedAny = true;
                        }
                    }
                });

                if (errorData.error) {
                    setLocalError(errorData.error);
                } else if (errorData.non_field_errors) {
                    setLocalError(errorData.non_field_errors[0]);
                } else if (errorData.detail) {
                    setLocalError(errorData.detail);
                } else if (!mappedAny) {
                    const firstErrorKey = Object.keys(errorData)[0];
                    setLocalError(
                        Array.isArray(errorData[firstErrorKey])
                            ? errorData[firstErrorKey][0]
                            : "Signup failed. Please try again."
                    );
                }
            } else {
                setLocalError("Signup failed. Please try again.");
            }
        },
    });
};

export const usePatientLoginMutation = (setError, setLocalError) => {
    const navigate = useNavigate();
    const login = useAuthStore((s) => s.login);

    return useMutation({
        mutationFn: patientLogin,
        onSuccess: (data) => {
            const access = data.access;
            login({ access }, "PATIENT");
            navigate("/patient/home");
        },
        onError: (err) => {
            const errorData = err.response?.data;

            if (errorData) {
                let mappedAny = false;
                const allowedFields = ['email', 'password'];

                Object.keys(errorData).forEach((key) => {
                    if (Array.isArray(errorData[key]) && allowedFields.includes(key)) {
                        setError(key, { type: "backend", message: errorData[key][0] });
                        mappedAny = true;
                    }
                });

                if (errorData.detail) {
                    setLocalError(errorData.detail);
                } else if (errorData.non_field_errors) {
                    setLocalError(errorData.non_field_errors[0]);
                } else if (!mappedAny) {
                    const firstErrorKey = Object.keys(errorData)[0];
                    setLocalError(
                        Array.isArray(errorData[firstErrorKey])
                            ? errorData[firstErrorKey][0]
                            : "Login failed"
                    );
                }
            } else {
                setLocalError("Login failed");
            }
        },
    });
};

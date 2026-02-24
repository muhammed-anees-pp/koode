import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { psychologistForgotPassword } from "../../../api/psychologist.api";
import { Link } from "react-router-dom";
import logo from "../../../assets/psychologist-logo.png";
import "../../../styles/psychologist/PsychologistForgotPassword.css";

const forgotPasswordSchema = z.object({
  email: z.string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
});

const PsychologistForgotPassword = () => {
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [backendError, setBackendError] = useState(null);
  const [backendSuccess, setBackendSuccess] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: ""
    }
  });

  const emailValue = watch("email");

  const mutation = useMutation({
    mutationFn: (email) => psychologistForgotPassword(email),
    onSuccess: (data) => {
      setShowSuccessMessage(true);
      setBackendSuccess(data?.message || "Reset link sent successfully!");
      setBackendError(null);
    },
    onError: (error) => {
      console.error("Forgot password error:", error);
      setBackendError(error?.response?.data?.message || "Failed to send reset link. Please try again.");
      setShowSuccessMessage(false);
    }
  });

  const onSubmit = (data) => {
    setShowSuccessMessage(false);
    setBackendError(null);
    setBackendSuccess(null);
    mutation.mutate(data.email);
  };

  const handleBackToLogin = () => {
    reset();
  };

  return (
    <div className="psychologist-fp-page">
      {/* Logo*/}
      <div className="psychologist-fp-logo">
        <img src={logo} alt="Koode Psychologist" className="psychologist-fp-logo-image" />
      </div>

      {/* Card */}
      <div className="psychologist-fp-card-wrapper">
        <div className="psychologist-fp-card-bar" />
        <div className="psychologist-fp-card">
          {/* Lock Icon */}
          <div className="psychologist-fp-icon-circle">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect
                x="5"
                y="11"
                width="14"
                height="10"
                rx="2"
                stroke="#1188d8ce"
                strokeWidth="2"
              />
              <path
                d="M8 11V7a4 4 0 018 0v4"
                stroke="#1188d8ce"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>

          {backendError && !showSuccessMessage && (
            <div className="psychologist-fp-error-message">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="9" stroke="#ef4444" strokeWidth="2" />
                <path d="M10 6v5M10 14v1" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span>{backendError}</span>
            </div>
          )}

          {showSuccessMessage ? (
            <div className="psychologist-fp-success">
              <div className="psychologist-fp-success-icon">✓</div>
              <h2 className="psychologist-fp-title">Check your email</h2>
              <p className="psychologist-fp-subtitle">
                {backendSuccess && showSuccessMessage && (
                  <div className="psychologist-fp-success-message">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="10" r="9" stroke="#10b981" strokeWidth="2" />
                      <path d="M6 10L9 13L14 7" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <span>{backendSuccess} <strong>{emailValue}</strong></span>
                  </div>
                )}
              </p>
            </div>
          ) : (
            <>
              <h2 className="psychologist-fp-title">Forgot your password?</h2>
              <p className="psychologist-fp-subtitle">
                No worries, we'll help you reset it. Enter your email below to
                receive a recovery link.
              </p>

              <form onSubmit={handleSubmit(onSubmit)} className="psychologist-fp-form" noValidate>
                <div className="psychologist-fp-field">
                  <label className="psychologist-fp-label" htmlFor="email">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    className={`psychologist-fp-input ${errors.email ? "error" : ""}`}
                    placeholder="doctor@example.com"
                    {...register("email")}
                    disabled={mutation.isPending}
                  />
                  {errors.email && (
                    <div className="psychologist-fp-field-error">
                      {errors.email.message}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="psychologist-fp-btn"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? "Sending..." : "Send Reset Link"}
                  {!mutation.isPending && <span className="psychologist-fp-btn-arrow">→</span>}
                </button>
              </form>
            </>
          )}

          <div className="psychologist-fp-back">
            <Link to="/psychologist/login" className="psychologist-fp-back-link" onClick={handleBackToLogin}>
              <span className="psychologist-fp-back-arrow">←</span>Back to log in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PsychologistForgotPassword;
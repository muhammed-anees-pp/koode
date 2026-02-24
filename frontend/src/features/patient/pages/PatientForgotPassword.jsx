import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { patientForgotPassword } from "../../../api/patient.api";
import { Link } from "react-router-dom";
import logo from "../../../assets/patient-logo.png";
import "../../../styles/patient/PatientForgotPassword.css";

const forgotPasswordSchema = z.object({
  email: z.string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
});

const PatientForgotPassword = () => {
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
    mutationFn: (email) => patientForgotPassword(email),
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
    <div className="patient-fp-page">
      {/* Logo*/}
      <div className="patient-fp-logo">
        <img src={logo} alt="koode.in" className="patient-fp-logo-image" />
      </div>

      {/* Card */}
      <div className="patient-fp-card-wrapper">
        <div className="patient-fp-card-bar" />
        <div className="patient-fp-card">
          {/* Lock Icon */}
          <div className="patient-fp-icon-circle">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect
                x="5"
                y="11"
                width="14"
                height="10"
                rx="2"
                stroke="#2bbfa4"
                strokeWidth="2"
              />
              <path
                d="M8 11V7a4 4 0 018 0v4"
                stroke="#2bbfa4"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>

          {backendError && !showSuccessMessage && (
            <div className="patient-fp-error-message">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="9" stroke="#ef4444" strokeWidth="2" />
                <path d="M10 6v5M10 14v1" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span>{backendError}</span>
            </div>
          )}

          {showSuccessMessage ? (
            <div className="patient-fp-success">
              <div className="patient-fp-success-icon">✓</div>
              <h2 className="patient-fp-title">Check your email</h2>
              <p className="patient-fp-subtitle">
                {backendSuccess && showSuccessMessage && (
                  <div className="patient-fp-success-message">
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
              <h2 className="patient-fp-title">Forgot your password?</h2>
              <p className="patient-fp-subtitle">
                No worries, we'll help you reset it. Enter your email below to
                receive a recovery link.
              </p>

              <form onSubmit={handleSubmit(onSubmit)} className="patient-fp-form" noValidate>
                <div className="patient-fp-field">
                  <label className="patient-fp-label" htmlFor="email">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    className={`patient-fp-input ${errors.email ? "error" : ""}`}
                    placeholder="you@example.com"
                    {...register("email")}
                    disabled={mutation.isPending}
                  />
                  {errors.email && (
                    <div className="patient-fp-field-error">
                      {errors.email.message}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="patient-fp-btn"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? "Sending..." : "Send Reset Link"}
                  {!mutation.isPending && <span className="patient-fp-btn-arrow">→</span>}
                </button>
              </form>
            </>
          )}

          <div className="patient-fp-back">
            <Link to="/patient/login" className="patient-fp-back-link" onClick={handleBackToLogin}>
              <span className="patient-fp-back-arrow">←</span>Back to log in
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="patient-fp-footer">
        <Link to="/privacy" className="patient-fp-privacy">
          Privacy Policy
        </Link>
      </div>
    </div>
  );
};

export default PatientForgotPassword;
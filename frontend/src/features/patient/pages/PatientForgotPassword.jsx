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
    <div className="fp-page">
      {/* Logo*/}
      <div className="fp-logo">
        <img src={logo} alt="koode.in" className="fp-logo-image" />
      </div>

      {/* Card */}
      <div className="fp-card-wrapper">
        <div className="fp-card-bar" />
        <div className="fp-card">
          {/* Lock Icon */}
          <div className="fp-icon-circle">
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
            <div className="fp-error-message">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="9" stroke="#ef4444" strokeWidth="2" />
                <path d="M10 6v5M10 14v1" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span>{backendError}</span>
            </div>
          )}

          {showSuccessMessage ? (
            <div className="fp-success">
              <div className="fp-success-icon">✓</div>
              <h2 className="fp-title">Check your email</h2>
              <p className="fp-subtitle">
                {backendSuccess && showSuccessMessage && (
                <div className="fp-success-message">
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
              <h2 className="fp-title">Forgot your password?</h2>
              <p className="fp-subtitle">
                No worries, we'll help you reset it. Enter your email below to
                receive a recovery link.
              </p>

              <form onSubmit={handleSubmit(onSubmit)} className="fp-form" noValidate>
                <div className="fp-field">
                  <label className="fp-label" htmlFor="email">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    className={`fp-input ${errors.email ? "error" : ""}`}
                    placeholder="you@example.com"
                    {...register("email")}
                    disabled={mutation.isPending}
                  />
                  {errors.email && (
                    <div className="fp-field-error">
                      {errors.email.message}
                    </div>
                  )}
                </div>

                <button 
                  type="submit" 
                  className="fp-btn" 
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? "Sending..." : "Send Reset Link"}
                  {!mutation.isPending && <span className="fp-btn-arrow">→</span>}
                </button>
              </form>
            </>
          )}

          <div className="fp-back">
            <Link to="/patient/login" className="fp-back-link" onClick={handleBackToLogin}>
              <span className="fp-back-arrow">←</span>Back to log in
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="fp-footer">
        <Link to="/privacy" className="fp-privacy">
          Privacy Policy
        </Link>
      </div>
    </div>
  );
};

export default PatientForgotPassword;
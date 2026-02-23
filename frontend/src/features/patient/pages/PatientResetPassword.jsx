import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { patientResetPassword } from "../../../api/patient.api";
import logo from "../../../assets/patient-logo.png";
import { useState, useEffect } from "react";
import "../../../styles/patient/PatientResetPassword.css";

const getErrorMessage = (error) => {
  if (error.response?.data) {
    const data = error.response.data;
    if (data.non_field_errors && data.non_field_errors.length > 0) return data.non_field_errors[0];
    if (typeof data === "object") {
      if (data.token && data.token.length > 0) return data.token[0];
      if (data.detail) return data.detail;
      if (data.message) return data.message;
    }
    if (typeof data === "string") return data;
  }
  const status = error.response?.status;
  if (status === 400) return "Invalid or expired reset link. Please request a new one";
  if (status === 401) return "Unauthorized access. Please request a new reset link";
  if (status === 403) return "This reset link has already been used or is invalid";
  if (status === 404) return "Reset link not found. Please request a new one";
  if (status >= 500) return "Server error. Please try again later";
  return "Failed to reset password. Please try again";
};

const resetPasswordSchema = z.object({
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const EyeIcon = ({ open }) => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
    {open ? (
      <path
        d="M2.5 2.5L17.5 17.5M9.41 9.41C9.23 9.59 9.11 9.82 9.08 10.08C9.03 10.56 9.22 11.04 9.59 11.41C9.96 11.78 10.44 11.97 10.92 11.92C11.18 11.89 11.41 11.77 11.59 11.59M12.7 8.3C12.3 7.9 11.76 7.64 11.17 7.58C10.14 7.46 9.15 8.06 8.7 9M17.5 10C17.5 10 14.5 15 10 15C9.11 15 8.28 14.8 7.5 14.45M6.27 13.23C4.23 11.91 2.5 10 2.5 10C2.5 10 5.5 5 10 5C10.8 5 11.55 5.15 12.25 5.4"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      />
    ) : (
      <>
        <path d="M2.5 10C2.5 10 5.5 5 10 5C14.5 5 17.5 10 17.5 10C17.5 10 14.5 15 10 15C5.5 15 2.5 10 2.5 10Z"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 12.5C11.3807 12.5 12.5 11.3807 12.5 10C12.5 8.61929 11.3807 7.5 10 7.5C8.61929 7.5 7.5 8.61929 7.5 10C7.5 11.3807 8.61929 12.5 10 12.5Z"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </>
    )}
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="7" stroke="#2bbfa4" strokeWidth="1.5" />
    <path d="M5 8L7 10.5L11 6" stroke="#2bbfa4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CircleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="7" stroke="#b0bec5" strokeWidth="1.5" />
  </svg>
);

const PatientResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState("");

  const { register, handleSubmit, formState: { errors }, watch, reset } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const newPassword = watch("newPassword");
  const confirmPassword = watch("confirmPassword");

  const mutation = useMutation({
    mutationFn: (passwordData) => patientResetPassword(passwordData),
    onSuccess: () => { setTokenError(""); reset(); },
    onError: (error) => {
      const errorMessage = getErrorMessage(error);
      if (error.response?.status === 400 || error.response?.status === 403) {
        setIsTokenValid(false);
        setTokenError(errorMessage);
      }
    },
  });

  useEffect(() => {
    if (mutation.isSuccess) {
      const timer = setTimeout(() => navigate("/patient/login"), 3000);
      return () => clearTimeout(timer);
    }
  }, [mutation.isSuccess, navigate]);

  useEffect(() => {
    if (!token) {
      setTokenError("Invalid or missing reset link. Please request a new password reset");
      setIsTokenValid(false);
      setIsValidating(false);
      return;
    }
    const tokenRegex = /^[A-Za-z0-9_\-]+$/;
    if (!tokenRegex.test(token)) {
      setTokenError("Invalid reset token format. Please request a new password reset");
      setIsTokenValid(false);
      setIsValidating(false);
      return;
    }
    setIsTokenValid(true);
    setIsValidating(false);
  }, [token]);

  const onSubmit = (data) => {
    setTokenError("");
    mutation.mutate({ token, new_password: data.newPassword, confirm_password: data.confirmPassword });
  };

  const getPasswordStrength = () => {
    if (!newPassword) return null;
    const checks = [
      /[A-Z]/.test(newPassword),
      /[a-z]/.test(newPassword),
      /[0-9]/.test(newPassword),
      /[^A-Za-z0-9]/.test(newPassword),
      newPassword.length >= 8,
    ];
    const strength = checks.filter(Boolean).length;
    if (strength <= 2) return { text: "Weak", color: "#ef4444", level: 2 };
    if (strength <= 4) return { text: "Medium", color: "#f59e0b", level: 4 };
    return { text: "Strong", color: "#2bbfa4", level: 5 };
  };

  const passwordStrength = getPasswordStrength();

  const requirements = [
    { text: "At least 8 characters", met: newPassword?.length >= 8 },
    { text: "One uppercase letter", met: /[A-Z]/.test(newPassword) },
    { text: "One special character", met: /[^A-Za-z0-9]/.test(newPassword) },
    { text: "Passwords match", met: newPassword && confirmPassword && newPassword === confirmPassword },
  ];

  // Validating state
  if (isValidating) {
    return (
      <div className="rp-page">
        <div className="rp-topbar">
          <img src={logo} alt="koode.in" className="rp-logo" />
        </div>
        <div className="rp-card-wrapper">
          <div className="rp-card-bar" />
          <div className="rp-card rp-center">
            <div className="rp-spinner" />
            <p className="rp-loading-text">Validating reset link...</p>
          </div>
        </div>
      </div>
    );
  }

  // Invalid token state 
  if (!isTokenValid) {
    return (
      <div className="rp-page">
        <div className="rp-topbar">
          <img src={logo} alt="koode.in" className="rp-logo" />
          <Link to="/patient/login" className="rp-return-link">Return to Login <span>→</span></Link>
        </div>
        <div className="rp-card-wrapper">
          <div className="rp-card-bar" />
          <div className="rp-card rp-center">
            <div className="rp-icon-circle rp-icon-error">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2" />
                <path d="M12 8V12M12 16H12.01" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <h2 className="rp-title">Invalid Reset Link</h2>
            <div className="rp-error-banner" style={{ marginBottom: "24px" }}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="9" stroke="#ef4444" strokeWidth="2" />
                <path d="M10 6v5M10 14v1" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span>This password reset link is invalid or has expired</span>
            </div>
            <Link to="/patient/forgot-password" className="rp-btn" style={{ textDecoration: "none" }}>
              Request New Link <span className="rp-btn-arrow">→</span>
            </Link>
            <div className="rp-back">
              <Link to="/patient/login" className="rp-back-link">
                <span className="rp-back-arrow">←</span> Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state 
  if (mutation.isSuccess) {
    return (
      <div className="rp-page">
        <div className="rp-topbar">
          <img src={logo} alt="koode.in" className="rp-logo" />
          <Link to="/patient/login" className="rp-return-link">Return to Login <span>→</span></Link>
        </div>
        <div className="rp-card-wrapper">
          <div className="rp-card-bar" />
          <div className="rp-card rp-center">
            <div className="rp-icon-circle rp-icon-success">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#2bbfa4" strokeWidth="2" />
                <path d="M8 12L11 15L16 9" stroke="#2bbfa4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="rp-title">Password Reset!</h2>
            <p className="rp-subtitle">Your password has been reset successfully.</p>
            <div className="rp-redirect-pill">
              <div className="rp-spinner rp-spinner-sm" />
              <span>Redirecting to login...</span>
            </div>
          </div>
        </div>
        <div className="rp-footer">
          Need help? <Link to="/contact" className="rp-support-link">Contact Support</Link>
        </div>
      </div>
    );
  }

  // Main form
  return (
    <div className="rp-page">
      {/* Top bar */}
      <div className="rp-topbar">
        <img src={logo} alt="koode.in" className="rp-logo" />
        <Link to="/patient/login" className="rp-return-link">Return to Login <span>→</span></Link>
      </div>

      {/* Card */}
      <div className="rp-card-wrapper">
        <div className="rp-card-bar" />
        <div className="rp-card">
          {/* Icon */}
          <div className="rp-icon-circle">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"
                stroke="#2bbfa4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 3v5h5" stroke="#2bbfa4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <h2 className="rp-title">Reset Password</h2>
          <p className="rp-subtitle">
            Create a strong password for your account to ensure your data stays secure.
          </p>

          {mutation.isError && !mutation.isSuccess && (
            <div className="rp-error-banner">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="9" stroke="#ef4444" strokeWidth="2" />
                <path d="M10 6v5M10 14v1" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span>{getErrorMessage(mutation.error)}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="rp-form" noValidate>
            <div className="rp-field">
              <label className="rp-label" htmlFor="newPassword">New Password</label>
              <div className="rp-input-wrap">
                <input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  className={`rp-input${errors.newPassword ? " error" : ""}`}
                  disabled={mutation.isPending}
                  {...register("newPassword")}
                />
                <button type="button" className="rp-eye" onClick={() => setShowNewPassword(!showNewPassword)} aria-label="Toggle password visibility">
                  <EyeIcon open={showNewPassword} />
                </button>
              </div>
              {errors.newPassword && <span className="rp-field-error">{errors.newPassword.message}</span>}

              {/* Strength bar */}
              {newPassword && (
                <div className="rp-strength">
                  <div className="rp-strength-bars">
                    {[1, 2, 3, 4, 5].map((l) => (
                      <div key={l} className="rp-strength-bar"
                        style={{ backgroundColor: passwordStrength && l <= passwordStrength.level ? passwordStrength.color : "#e2e8f0" }}
                      />
                    ))}
                  </div>
                  {passwordStrength && (
                    <span className="rp-strength-label" style={{ color: passwordStrength.color }}>
                      {passwordStrength.text}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="rp-field">
              <label className="rp-label" htmlFor="confirmPassword">Confirm New Password</label>
              <div className="rp-input-wrap">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  className={`rp-input${errors.confirmPassword ? " error" : ""}`}
                  disabled={mutation.isPending}
                  {...register("confirmPassword")}
                />
                <button type="button" className="rp-eye" onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label="Toggle password visibility">
                  <EyeIcon open={showConfirmPassword} />
                </button>
              </div>
              {errors.confirmPassword && <span className="rp-field-error">{errors.confirmPassword.message}</span>}
            </div>

            <div className="rp-requirements">
              <p className="rp-req-title">Password Requirements</p>
              <ul className="rp-req-list">
                {requirements.map((req, i) => (
                  <li key={i} className={`rp-req-item${req.met ? " met" : ""}`}>
                    {req.met ? <CheckIcon /> : <CircleIcon />}
                    <span>{req.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button type="submit" className="rp-btn" disabled={mutation.isPending}>
              {mutation.isPending ? "Resetting Password..." : "Reset Password"}
              {!mutation.isPending && <span className="rp-btn-arrow">→</span>}
            </button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <div className="rp-footer">
        Need help? <Link to="/contact" className="rp-support-link">Contact Support</Link>
      </div>
    </div>
  );
};

export default PatientResetPassword;
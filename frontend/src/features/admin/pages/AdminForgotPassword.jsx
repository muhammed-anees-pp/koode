import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { adminForgotPassword } from "../../../api/admin.api";
import { Link } from "react-router-dom";
import logo from "../../../assets/admin-logo.png";
import "../../../styles/admin/AuthShared.css";
import { useState } from "react";

const forgotPasswordSchema = z.object({
  email: z.string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
});

const AdminForgotPassword = () => {
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

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
    mutationFn: (email) => adminForgotPassword(email),
    onSuccess: () => {
      setShowSuccessMessage(true);
    },
    onError: (error) => {
      console.error("Forgot password error:", error);
    }
  });

  const onSubmit = (data) => {
    setShowSuccessMessage(false);
    mutation.mutate(data.email);
  };

  const handleBackToLogin = () => {
    reset();
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <img src={logo} alt="koode.in" className="auth-logo" />
          <h1 className="auth-title">Reset Access</h1>
          <p className="auth-subtitle">
            Enter your email to receive recovery instructions
          </p>
        </div>

        {!showSuccessMessage ? (
          <form onSubmit={handleSubmit(onSubmit)} className="auth-form" noValidate>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-wrapper">
                <svg
                  className="input-icon"
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M3.33333 5.83333L10 10.8333L16.6667 5.83333M3.33333 14.1667H16.6667C17.5871 14.1667 18.3333 13.4205 18.3333 12.5V5.83333C18.3333 4.91286 17.5871 4.16667 16.6667 4.16667H3.33333C2.41286 4.16667 1.66667 4.91286 1.66667 5.83333V12.5C1.66667 13.4205 2.41286 14.1667 3.33333 14.1667Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <input
                  type="text"
                  id="email"
                  placeholder="admin@platform.com"
                  {...register("email")}
                  className={errors.email ? "error" : ""}
                  disabled={mutation.isPending}
                />
              </div>
              {errors.email && (
                <div className="auth-error" style={{ marginTop: "4px", padding: "8px 12px" }}>
                  {errors.email.message}
                </div>
              )}
            </div>

            <button 
              type="submit" 
              disabled={mutation.isPending} 
              className="auth-btn"
            >
              {mutation.isPending ? "Sending..." : "Send Reset Link"}
              {!mutation.isPending && (
                <svg
                  className="btn-icon"
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M7.5 15L12.5 10L7.5 5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          </form>
        ) : (
          <div className="auth-success" style={{ marginTop: "24px" }}>
            <svg
              className="success-icon"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path
                d="M8 12L11 15L16 9"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div>
              <h3>Reset link sent!</h3>
              <p style={{ color: "#94a3b8", fontSize: "13px" }}>
                If an account exists for{" "}
                <span className="email-highlight" style={{ color: "#e2e8f0", fontWeight: "500" }}>
                  {emailValue}
                </span>, you will receive a password reset link
              </p>
            </div>
          </div>
        )}

        <div className="auth-options" style={{ justifyContent: "center", marginTop: "20px" }}>
          <Link to="/admin/login" className="auth-link" onClick={handleBackToLogin}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12.5 5L7.5 10L12.5 15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Back to Login
          </Link>
        </div>

        <div className="auth-footer">
          <div className="footer-content">
            <div className="footer-shield">
              <svg
                width="18"
                height="18"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M8 1.33334L3.33334 3.33334V7.33334C3.33334 10.6667 5.66668 13.7333 8 14.6667C10.3333 13.7333 12.6667 10.6667 12.6667 7.33334V3.33334L8 1.33334Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="footer-text">
              <h4>Authorized Personnel Only</h4>
              <p>
                Access to this system is monitored and logged.
                <br />
                Unauthorized access is prohibited.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminForgotPassword;
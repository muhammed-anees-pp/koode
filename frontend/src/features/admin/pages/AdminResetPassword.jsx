import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { adminResetPassword } from "../../../api/admin.api";
import logo from "../../../assets/admin-logo.png";
import "../../../styles/admin/AuthShared.css";
import { useState, useEffect } from "react";


const getErrorMessage = (error) => {
  if (error.response?.data) {
    const data = error.response.data;
    
    if (data.non_field_errors && data.non_field_errors.length > 0) {
      return data.non_field_errors[0];
    }

    if (typeof data === 'object') {
      if (data.token && data.token.length > 0) {
        return data.token[0];
      }
      if (data.detail) {
        return data.detail;
      }
      if (data.message) {
        return data.message;
      }
    }

    if (typeof data === 'string') {
      return data;
    }
  }

  const status = error.response?.status;
  
  if (status === 400) {
    return "Invalid or expired reset link. Please request a new one";
  }
  if (status === 401) {
    return "Unauthorized access. Please request a new reset link";
  }
  if (status === 403) {
    return "This reset link has already been used or is invalid";
  }
  if (status === 404) {
    return "Reset link not found. Please request a new one";
  }
  if (status >= 500) {
    return "Server error. Please try again later";
  }
  
  return "Failed to reset password. Please try again";
};

const resetPasswordSchema = z.object({
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  confirmPassword: z.string()
    .min(1, "Please confirm your password")
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const AdminResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: ""
    }
  });

  const newPassword = watch("newPassword");

  const mutation = useMutation({
    mutationFn: (passwordData) => adminResetPassword(passwordData),
    onSuccess: () => {
      setTokenError("");
      reset();
    },
    onError: (error) => {
      console.error("Reset password error:", error);
      const errorMessage = getErrorMessage(error);
      
      if (error.response?.status === 400 || error.response?.status === 403) {
        setIsTokenValid(false);
        setTokenError(errorMessage);
      }
    }
  });


  useEffect(() => {
    if (mutation.isSuccess) {
      const timer = setTimeout(() => {
        navigate("/admin/login");
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [mutation.isSuccess, navigate]);

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setTokenError("Invalid or missing reset link. Please request a new password reset.");
        setIsTokenValid(false);
        setIsValidating(false);
        return;
      }

      const tokenRegex = /^[A-Za-z0-9_\-]+$/;
      if (!tokenRegex.test(token)) {
        setTokenError("Invalid reset token format. Please request a new password reset.");
        setIsTokenValid(false);
        setIsValidating(false);
        return;
      }

      setIsTokenValid(true);
      setIsValidating(false);
    };

    validateToken();
  }, [token]);

  const onSubmit = (data) => {
    setTokenError("");
    mutation.mutate({
      token,
      new_password: data.newPassword,
      confirm_password: data.confirmPassword,
    });
  };

  const getPasswordStrength = () => {
    if (!newPassword) return null;
    
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /[0-9]/.test(newPassword);
    const hasSpecialChar = /[^A-Za-z0-9]/.test(newPassword);
    const isLongEnough = newPassword.length >= 8;
    
    const strength = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar, isLongEnough]
      .filter(Boolean).length;
    
    if (strength <= 2) return { text: "Weak", color: "#ef4444" };
    if (strength <= 4) return { text: "Medium", color: "#f59e0b" };
    return { text: "Strong", color: "#10b981" };
  };

  const passwordStrength = getPasswordStrength();

  // When validating
  if (isValidating) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-header">
            <img src={logo} alt="koode.in" className="auth-logo" />
            <h1 className="auth-title">Reset Password</h1>
          </div>
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ 
              width: "40px", 
              height: "40px", 
              border: "3px solid #334155",
              borderTopColor: "#6366f1",
              borderRadius: "50%",
              margin: "0 auto 20px",
              animation: "spin 1s linear infinite"
            }} />
            <p style={{ color: "#94a3b8" }}>Validating reset link...</p>
          </div>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // When token is invalid
  if (!isTokenValid) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-header">
            <img src={logo} alt="koode.in" className="auth-logo" />
            <h1 className="auth-title">Invalid Reset Link</h1>
            <p className="auth-subtitle">
              The password reset link is invalid or has expired
            </p>
          </div>

          <div className="auth-error" style={{ 
            marginTop: "24px", 
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ 
                marginBottom: "16px", 
                color: "#ef4444",
                display: "block"
              }}
            >
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path
                d="M12 8V12M12 16H12.01"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <h3 style={{ color: "#f87171", marginBottom: "8px" }}>Link Expired or Invalid</h3>
          </div>

          <div style={{ textAlign: "center", marginTop: "24px" }}>
            <Link 
              to="/admin/forgot-password" 
              className="auth-btn" 
              style={{ textDecoration: "none", display: "inline-block", width: "auto", padding: "12px 24px" }}
            >
              Request New Link
            </Link>
          </div>

          <div className="auth-options" style={{ justifyContent: "center", marginTop: "20px" }}>
            <Link to="/admin/login" className="auth-link">
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
  }

// When reset successful
if (mutation.isSuccess) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <img src={logo} alt="koode.in" className="auth-logo" />
          <h1 className="auth-title">Reset Password</h1>
        </div>

        <div className="auth-success" style={{ 
          marginTop: "24px", 
          padding: "32px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          background: "rgba(16, 185, 129, 0.1)",
          border: "1px solid rgba(16, 185, 129, 0.3)",
          borderRadius: "16px",
          backdropFilter: "blur(4px)"
        }}>
          <div style={{
            width: "80px",
            height: "80px",
            background: "rgba(16, 185, 129, 0.2)",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "20px"
          }}>
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ color: "#10b981" }}
            >
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path
                d="M8 12L11 15L16 9"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          
          <h3 style={{ 
            color: "#e2e8f0", 
            fontSize: "20px",
            fontWeight: "600",
            marginBottom: "8px" 
          }}>
            Password Reset Successful!
          </h3>
          
          <p style={{ 
            color: "#94a3b8", 
            fontSize: "14px",
            lineHeight: "1.6",
            marginBottom: "16px",
            maxWidth: "280px"
          }}>
            Your password has been reset successfully.
          </p>
          
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            background: "rgba(16, 185, 129, 0.15)",
            borderRadius: "30px",
            border: "1px solid rgba(16, 185, 129, 0.2)"
          }}>
            <div style={{
              width: "20px",
              height: "20px",
              border: "2px solid #10b981",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 1s linear infinite"
            }} />
            <span style={{ color: "#10b981", fontSize: "13px", fontWeight: "500" }}>
              Redirecting to login...
            </span>
          </div>
        </div>

        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
    );
  }

  // Reset password form
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <img src={logo} alt="koode.in" className="auth-logo" />
          <h1 className="auth-title">Reset Password</h1>
          <p className="auth-subtitle">
            Enter your new password below
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="auth-form" noValidate>
          {mutation.isError && !mutation.isSuccess && (
            <div className="auth-error" style={{ marginBottom: "16px" }}>
              {getErrorMessage(mutation.error)}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
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
                  d="M5 8.33333V5.83333C5 4.72826 5.43899 3.66845 6.22039 2.88705C7.00179 2.10565 8.0616 1.66667 9.16667 1.66667C10.2717 1.66667 11.3315 2.10565 12.1129 2.88705C12.8943 3.66845 13.3333 4.72826 13.3333 5.83333V8.33333M5.83333 18.3333H12.5C13.8807 18.3333 15 17.214 15 15.8333V10.8333C15 9.45262 13.8807 8.33333 12.5 8.33333H5.83333C4.45262 8.33333 3.33333 9.45262 3.33333 10.8333V15.8333C3.33333 17.214 4.45262 18.3333 5.83333 18.3333Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <input
                type={showNewPassword ? "text" : "password"}
                id="newPassword"
                placeholder="Enter new password"
                {...register("newPassword")}
                className={errors.newPassword ? "error" : ""}
                disabled={mutation.isPending}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowNewPassword(!showNewPassword)}
                aria-label="Toggle password visibility"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {showNewPassword ? (
                    <path
                      d="M2.5 2.5L17.5 17.5M9.41 9.41C9.23 9.59 9.11 9.82 9.08 10.08C9.03 10.56 9.22 11.04 9.59 11.41C9.96 11.78 10.44 11.97 10.92 11.92C11.18 11.89 11.41 11.77 11.59 11.59M12.7 8.3C12.3 7.9 11.76 7.64 11.17 7.58C10.14 7.46 9.15 8.06 8.7 9M17.5 10C17.5 10 14.5 15 10 15C9.11 15 8.28 14.8 7.5 14.45M6.27 13.23C4.23 11.91 2.5 10 2.5 10C2.5 10 5.5 5 10 5C10.8 5 11.55 5.15 12.25 5.4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ) : (
                    <path
                      d="M2.5 10C2.5 10 5.5 5 10 5C14.5 5 17.5 10 17.5 10C17.5 10 14.5 15 10 15C5.5 15 2.5 10 2.5 10Z M10 12.5C11.3807 12.5 12.5 11.3807 12.5 10C12.5 8.61929 11.3807 7.5 10 7.5C8.61929 7.5 8.61929 7.5 10C7.5 11.3807 8.61929 12.5 10 12.5Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                </svg>
              </button>
            </div>
            {errors.newPassword && (
              <div className="auth-error" style={{ marginTop: "4px", padding: "8px 12px" }}>
                {errors.newPassword.message}
              </div>
            )}
            
            {newPassword && !errors.newPassword && (
              <div style={{ marginTop: "8px" }}>
                <div style={{ 
                  display: "flex", 
                  gap: "4px", 
                  marginBottom: "4px" 
                }}>
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      style={{
                        height: "4px",
                        flex: 1,
                        borderRadius: "2px",
                        backgroundColor: passwordStrength && level <= 
                          (passwordStrength.text === "Weak" ? 2 : 
                           passwordStrength.text === "Medium" ? 4 : 5) 
                          ? passwordStrength.color : "#334155",
                        transition: "background-color 0.3s"
                      }}
                    />
                  ))}
                </div>
                {passwordStrength && (
                  <p style={{ 
                    color: passwordStrength.color, 
                    fontSize: "12px",
                    marginTop: "4px" 
                  }}>
                    Password strength: {passwordStrength.text}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
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
                  d="M5 8.33333V5.83333C5 4.72826 5.43899 3.66845 6.22039 2.88705C7.00179 2.10565 8.0616 1.66667 9.16667 1.66667C10.2717 1.66667 11.3315 2.10565 12.1129 2.88705C12.8943 3.66845 13.3333 4.72826 13.3333 5.83333V8.33333M5.83333 18.3333H12.5C13.8807 18.3333 15 17.214 15 15.8333V10.8333C15 9.45262 13.8807 8.33333 12.5 8.33333H5.83333C4.45262 8.33333 3.33333 9.45262 3.33333 10.8333V15.8333C3.33333 17.214 4.45262 18.3333 5.83333 18.3333Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                placeholder="Confirm new password"
                {...register("confirmPassword")}
                className={errors.confirmPassword ? "error" : ""}
                disabled={mutation.isPending}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label="Toggle password visibility"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {showConfirmPassword ? (
                    <path
                      d="M2.5 2.5L17.5 17.5M9.41 9.41C9.23 9.59 9.11 9.82 9.08 10.08C9.03 10.56 9.22 11.04 9.59 11.41C9.96 11.78 10.44 11.97 10.92 11.92C11.18 11.89 11.41 11.77 11.59 11.59M12.7 8.3C12.3 7.9 11.76 7.64 11.17 7.58C10.14 7.46 9.15 8.06 8.7 9M17.5 10C17.5 10 14.5 15 10 15C9.11 15 8.28 14.8 7.5 14.45M6.27 13.23C4.23 11.91 2.5 10 2.5 10C2.5 10 5.5 5 10 5C10.8 5 11.55 5.15 12.25 5.4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ) : (
                    <path
                      d="M2.5 10C2.5 10 5.5 5 10 5C14.5 5 17.5 10 17.5 10C17.5 10 14.5 15 10 15C5.5 15 2.5 10 2.5 10Z M10 12.5C11.3807 12.5 12.5 11.3807 12.5 10C12.5 8.61929 11.3807 7.5 10 7.5C8.61929 7.5 8.61929 7.5 10C7.5 11.3807 8.61929 12.5 10 12.5Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                </svg>
              </button>
            </div>
            {errors.confirmPassword && (
              <div className="auth-error" style={{ marginTop: "4px", padding: "8px 12px" }}>
                {errors.confirmPassword.message}
              </div>
            )}
          </div>

          <div style={{ 
            backgroundColor: "#1e293b", 
            padding: "16px", 
            borderRadius: "12px",
            marginBottom: "16px",
            fontSize: "12px",
            border: "1px solid #334155"
          }}>
            <p style={{ marginBottom: "12px", fontWeight: "600", color: "#e2e8f0" }}>
              Password Requirements:
            </p>
            <ul style={{ 
              listStyle: "none", 
              padding: 0, 
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: "8px"
            }}>
              {[
                { text: "At least 8 characters long", test: newPassword?.length >= 8 },
                { text: "Contains uppercase letter (A-Z)", test: /[A-Z]/.test(newPassword) },
                { text: "Contains lowercase letter (a-z)", test: /[a-z]/.test(newPassword) },
                { text: "Contains number (0-9)", test: /[0-9]/.test(newPassword) },
                { text: "Contains special character (!@#$%)", test: /[^A-Za-z0-9]/.test(newPassword) }
              ].map((req, index) => (
                <li key={index} style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "8px",
                  color: req.test ? "#10b981" : "#94a3b8"
                }}>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {req.test ? (
                      <path
                        d="M13.3334 4L6.00002 11.3333L2.66669 8"
                        stroke="#10b981"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ) : (
                      <circle cx="8" cy="8" r="6" stroke="#94a3b8" strokeWidth="1.5" />
                    )}
                  </svg>
                  {req.text}
                </li>
              ))}
            </ul>
          </div>

          <button 
            type="submit" 
            disabled={mutation.isPending} 
            className="auth-btn"
          >
            {mutation.isPending ? "Resetting Password..." : "Reset Password"}
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

        <div className="auth-options" style={{ justifyContent: "center", marginTop: "20px" }}>
          <Link to="/admin/login" className="auth-link">
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

export default AdminResetPassword;
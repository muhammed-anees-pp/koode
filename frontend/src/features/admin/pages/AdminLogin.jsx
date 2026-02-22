import { useMutation } from "@tanstack/react-query";
import { adminLogin } from "../../../api/admin.api";
import { useAuthStore } from "../../../store/auth.store";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useState } from "react";
import { Link } from "react-router-dom";
import logo from "../../../assets/admin-logo.png";
import "../../../styles/admin/AuthShared.css";



const schema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email format"),

  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters"),
});


const AdminLogin = () => {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const getErrorMessage = (error) => {
    if (error.response?.data) {
      const data = error.response.data;

      if (data.non_field_errors && data.non_field_errors.length > 0) {
        return data.non_field_errors[0];
      }

      if (typeof data === 'object') {
        if (data.email && data.email.length > 0) {
          return data.email[0];
        }
        if (data.password && data.password.length > 0) {
          return data.password[0];
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

    if (status === 401) {
      return "Invalid email or password";
    }
    if (status === 403) {
      return "You don't have permission to access this resource";
    }
    if (status === 404) {
      return "Login service unavailable. Please try again later";
    }
    if (status === 429) {
      return "Too many failed attempts. Please try again after some time";
    }
    if (status >= 500) {
      return "Server error. Please try again later";
    }

    return "Login failed. Please try again.";
  };

  const mutation = useMutation({
    mutationFn: adminLogin,
    onSuccess: (data) => {
      login(data, "ADMIN");

      if (rememberMe) {
        localStorage.setItem("adminTokens", JSON.stringify(data));
        localStorage.setItem("rememberAdmin", "true");
        localStorage.setItem("rememberedAdminEmail", formData.email);
      } else {
        sessionStorage.setItem("adminTokens", JSON.stringify(data));
        localStorage.removeItem("adminTokens");
        localStorage.removeItem("rememberAdmin");
        localStorage.removeItem("rememberedAdminEmail");
      }

      navigate("/admin/dashboard", { replace: true });
    },
    onError: (error) => {
      console.log("Login error:", error.response?.data);

      const errorMessage = getErrorMessage(error);
      setValidationErrors({
        form: errorMessage
      });
    },
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });

    if (validationErrors[e.target.name]) {
      setValidationErrors({ ...validationErrors, [e.target.name]: null });
    }
    if (validationErrors.form) {
      setValidationErrors({ ...validationErrors, form: null });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const result = schema.safeParse(formData);
    if (!result.success) {
      const errors = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0];
        if (!errors[field]) {
          errors[field] = issue.message;
        }
      });

      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});
    mutation.mutate(formData);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <img src={logo} alt="koode.in" className="auth-logo" />
          <h2 className="auth-title">Admin Login</h2>
          <p className="auth-subtitle">Super Admin Secure Access</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-group">
            <label>Email Address</label>
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
                  d="M2.5 6.66667L10 11.6667L17.5 6.66667M2.5 6.66667V13.3333C2.5 14.2538 3.24619 15 4.16667 15H15.8333C16.7538 15 17.5 14.2538 17.5 13.3333V6.66667M2.5 6.66667C2.5 5.74619 3.24619 5 4.16667 5H15.8333C16.7538 5 17.5 5.74619 17.5 6.66667"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <input
                type="email"
                name="email"
                placeholder="admin@platform.com"
                value={formData.email}
                onChange={handleChange}
                className={validationErrors.email ? "error" : ""}
              />
            </div>
            {validationErrors.email && (
              <div className="auth-error" style={{ marginTop: "4px", padding: "8px 12px" }}>
                {validationErrors.email}
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Password</label>
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
                  d="M5.83333 9.16667V6.66667C5.83333 4.36548 7.69881 2.5 10 2.5C12.3012 2.5 14.1667 4.36548 14.1667 6.66667V9.16667M6.66667 17.5H13.3333C14.2538 17.5 15 16.7538 15 15.8333V10.8333C15 9.91286 14.2538 9.16667 13.3333 9.16667H6.66667C5.74619 9.16667 5 9.91286 5 10.8333V15.8333C5 16.7538 5.74619 17.5 6.66667 17.5Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                className={validationErrors.password ? "error" : ""}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {showPassword ? (
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
            {validationErrors.password && (
              <div className="auth-error" style={{ marginTop: "4px", padding: "8px 12px" }}>
                {validationErrors.password}
              </div>
            )}
          </div>

          {validationErrors.form && (
            <div className="auth-error">
              {validationErrors.form}
            </div>
          )}

          <div className="auth-options">
            <label className="remember-checkbox">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span className="checkmark"></span>
              <span className="label-text">Remember me</span>
            </label>
            <Link to="/admin/forgot-password" className="auth-link">
              Forgot password?
            </Link>
          </div>

          <button type="submit" className="auth-btn" disabled={mutation.isPending}>
            {mutation.isPending ? "Signing in..." : "Sign In"}
            {!mutation.isPending && (
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="btn-icon"
              >
                <path
                  d="M4.16667 10H15.8333M15.8333 10L10.8333 5M15.8333 10L10.8333 15"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        </form>

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
                Unauthorized access is prohibited and will be prosecuted.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
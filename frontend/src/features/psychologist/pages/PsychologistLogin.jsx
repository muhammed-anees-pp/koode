import { useState } from "react";
import { Link } from "react-router-dom";
import { usePsychologistLoginMutation } from "../../../hooks/usePsychologistAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import psychologistLogo from "../../../assets/psychologist-logo.png";
import "../../../styles/psychologist/PsychologistAuth.css";



const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

const PsychologistLogin = () => {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState("");

  const mutation = usePsychologistLoginMutation(setError, setLocalError);

  const onSubmit = (data) => {
    setLocalError("");
    mutation.mutate(data);
  };

  return (
    <div className="psychologist-auth-layout">
      {/* Main Content */}
      <main className="main-content">
        <div className="signup-card">
          {/* Logo */}
          <div className="card-logo">
            <img src={psychologistLogo} alt="Koode Psychologist" style={{ height: "80px" }} />
          </div>

          {/* Title */}
          <h1 className="card-title">Welcome Back, Psychologist</h1>
          <p className="card-subtitle">
            Access your workspace and patient consultations.
          </p>

          {/* Form */}
          <form className="signup-form" onSubmit={handleSubmit(onSubmit)}>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                placeholder="doctor@example.com"
                {...register("email")}
              />
              {errors.email && (
                <p style={{ color: "#ef4444", fontSize: "14px", marginTop: "4px", marginBottom: "0px" }}>
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="form-group">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <label htmlFor="password">Password</label>
                <Link
                  to="/psychologist/forgot-password"
                  style={{
                    fontSize: "13px",
                    color: "#1188D8",
                    textDecoration: "none",
                    fontWeight: 500,
                  }}
                >
                  Forgot password?
                </Link>
              </div>

              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  placeholder="Enter your password"
                  {...register("password")}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    {showPassword ? (
                      <>
                        <path
                          d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <line
                          x1="1"
                          y1="1"
                          x2="23"
                          y2="23"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </>
                    ) : (
                      <>
                        <path
                          d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <circle
                          cx="12"
                          cy="12"
                          r="3"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </>
                    )}
                  </svg>
                </button>
              </div>
              {errors.password && (
                <p style={{ color: "#ef4444", fontSize: "14px", marginTop: "4px", marginBottom: "0px" }}>
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Global Error Message */}
            {localError && (
              <p style={{ color: "#ef4444", fontSize: "14px", marginTop: "10px" }}>
                {localError}
              </p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="submit-btn"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Logging In..." : "Log In"}
            </button>
          </form>

          {/* Signup Link */}
          <p className="login-text">
            Don't have an account?{" "}
            <Link to="/psychologist/signup" className="login-link">
              Sign up
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
};

export default PsychologistLogin;
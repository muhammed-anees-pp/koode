import { useState } from "react";
import { Link } from "react-router-dom";
import { usePsychologistSignupMutation } from "../../../hooks/usePsychologistAuth";
import { useGooglePsychologistAuthMutation } from "../../../hooks/usePsychologistAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import psychologistLogo from "../../../assets/psychologist-logo.png";
import "../../../styles/psychologist/PsychologistAuth.css";

const signupSchema = z
  .object({
    full_name: z
      .string()
      .min(3, "Full name must be at least 3 characters")
      .regex(/^[a-zA-Z\s]*$/, "Full name can only contain English letters and spaces"),
    email: z.string().email("Invalid email format"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[a-zA-Z]/, "Password must contain at least one letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirm_password: z.string(),
    agreeToTerms: z.boolean().refine((val) => val === true, {
      message: "You must agree to the Terms & Conditions",
    }),
  })
  .refine((data) => data.password === data.confirm_password, {
    path: ["confirm_password"],
    message: "Passwords do not match",
  });

const PsychologistSignup = () => {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      confirm_password: "",
      agreeToTerms: false,
    },
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState("");

  const mutation = usePsychologistSignupMutation(setError, setLocalError);
  const googleAuthMutation = useGooglePsychologistAuthMutation();

  const onSubmit = (data) => {
    setLocalError("");
    mutation.mutate(data);
  };

  // GOOGLE SIGNUP
  const handleGoogleSignUp = () => {
    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: async (response) => {
        try {
          await googleAuthMutation.mutateAsync({
            token: response.credential,
            mode: "signup",
          });
        } catch (err) {
          setLocalError("Google signup failed");
        }
      },
    });

    window.google.accounts.id.prompt();
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
          <h1 className="card-title">Join Our Clinical Network</h1>
          <p className="card-subtitle">
            Create your professional profile to start conducting secure video consultations.
          </p>

          {/* Form */}
          <form className="signup-form" onSubmit={handleSubmit(onSubmit)}>
            <div className="form-group">
              <label htmlFor="full_name">Full Name</label>
              <input
                type="text"
                id="full_name"
                placeholder="Dr. John Doe"
                {...register("full_name")}
              />
              {errors.full_name && (
                <p style={{ color: "#ef4444", fontSize: "14px", marginTop: "4px", marginBottom: "0px" }}>
                  {errors.full_name.message}
                </p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="text"
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
              <label htmlFor="password">Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  placeholder="Create a password"
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

            <div className="form-group">
              <label htmlFor="confirm_password">Confirm Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirm_password"
                  placeholder="Confirm your password"
                  {...register("confirm_password")}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label="Toggle password visibility"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    {showConfirmPassword ? (
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
              {errors.confirm_password && (
                <p style={{ color: "#ef4444", fontSize: "14px", marginTop: "4px", marginBottom: "0px" }}>
                  {errors.confirm_password.message}
                </p>
              )}
            </div>

            {/* Terms Checkbox */}
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input type="checkbox" {...register("agreeToTerms")} />
                <span className="checkbox-custom"></span>
                <span className="checkbox-text">
                  I agree to the{" "}
                  <a href="#terms" className="terms-link">
                    Terms & conditions
                  </a>{" "}
                  and{" "}
                  <a href="#privacy" className="terms-link">
                    Privacy Policy
                  </a>
                </span>
              </label>
              {errors.agreeToTerms && (
                <p style={{ color: "#ef4444", fontSize: "14px", marginTop: "4px", marginBottom: "0px" }}>
                  {errors.agreeToTerms.message}
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
              {mutation.isPending ? "Creating Account..." : "Create Account"}
            </button>

            {/* Divider */}
            <div className="divider">
              <span>OR</span>
            </div>

            {/* Google Sign Up */}
            <button
              type="button"
              className="google-btn"
              onClick={handleGoogleSignUp}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign up with Google
            </button>
          </form>

          {/* Login Link */}
          <p className="login-text">
            Already have an account?{" "}
            <Link to="/psychologist/login" className="login-link">
              Login
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
};

export default PsychologistSignup;
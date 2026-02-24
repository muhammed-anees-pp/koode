import { useState } from "react";
import { Link } from "react-router-dom";
import { usePsychologistSignupMutation } from "../../../hooks/usePsychologistAuth";
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
                placeholder="John Doe"
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
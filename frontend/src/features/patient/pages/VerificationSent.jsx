import { useEffect, useState } from "react";
import { useSearchParams, Link, useLocation, useNavigate } from "react-router-dom";
import { patientVerifyEmail } from "../../../api/patient.api";
import "../../../styles/patient/PatientAuth.css";
import PatientAuthNavbar from "../../../components/patient/AuthNavbar/PatientAuthNavbar";
import PatientAuthFooter from "../../../components/patient/AuthFooter/PatientAuthFooter";

const VerificationSent = () => {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("Verifying your email...");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    if (location.state?.email) {
      setUserEmail(location.state.email);
    }

    const token = params.get("token");

    if (token) {
      verifyEmail(token);
    } 
    else if (location.state?.emailSent) {
      setStatus("check-email");
      setUserEmail(location.state.email);
    } 
    else if (location.pathname.includes("verify-success")) {
      setStatus("success");
    } 
    else if (location.pathname.includes("verify-error")) {
      setStatus("error");
      setMessage("Token is invalid or expired.");
    } 
    else if (location.pathname.includes("verification-sent")) {
      setStatus("check-email");
    }
    else {
      navigate("/patient/signup");
    }
  }, [params, location.state, location.pathname, navigate]);

  const verifyEmail = async (token) => {
    try {
      setStatus("verifying");
      await patientVerifyEmail(token);
      setStatus("success");
    } catch (err) {
      console.error("Verification error:", err);
      setStatus("error");
      setMessage(err.response?.data?.error || "Verification failed. The link may be invalid or expired.");
    }
  };

  return (
    <div className="patient-auth-layout">
      <PatientAuthNavbar />
      <main className="main-content">
        <div className="verify-card">
          <div className="card-top-border"></div>

          <div className="email-icon-wrapper">
            <div className="email-icon-bg">
              {status === "success" ? (
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M22 4L12 14.01l-3-3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : status === "error" ? (
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              ) : (
                <>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#1ABEAA" strokeWidth="1.5">
                    <rect x="3" y="5" width="18" height="14" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M3 7l9 6 9-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {status === "check-email" && (
                    <div className="heart-badge">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="#EF4444">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {status === "check-email" && (
            <>
              <h1 className="verify-title">Verify your email</h1>
              <p className="verify-description">
                We've sent a verification link to
              </p>
              <p className="user-email">{userEmail || "your email address"}</p>
              <p className="verify-instruction">
                Please check your inbox and click the link to activate your<br />
                account and start your journey.
              </p>
              <Link to="/patient/login" style={{ textDecoration: 'none' }}>
                <button className="resend-btn">
                  Back to Login
                </button>
              </Link>
            </>
          )}

          {status === "verifying" && (
            <>
              <h1 className="verify-title">Verifying...</h1>
              <p className="verify-instruction">
                Please wait while we verify your email address.
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <h1 className="verify-title">Email Verified!</h1>
              <p className="verify-instruction">
                Your email has been successfully verified.<br />
                You can now access your secure space.
              </p>
              <Link to="/patient/login" style={{ textDecoration: 'none' }}>
                <button className="resend-btn">
                  Continue to Login
                </button>
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <h1 className="verify-title">Verification Failed</h1>
              <p className="verify-instruction">
                {message}
              </p>
              <Link to="/patient/signup" style={{ textDecoration: 'none' }}>
                <button className="resend-btn">
                  Back to Signup
                </button>
              </Link>
            </>
          )}
        </div>
      </main>
      <PatientAuthFooter />
    </div>
  );
};

export default VerificationSent;
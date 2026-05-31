import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useSearchParams, Link, useLocation } from "react-router-dom";
import { psychologistVerifyEmail } from "../../../api/psychologist.api";
import logo from "../../../assets/psychologist-logo.png";

const VerificationAction = ({ to, children }) => (
  <Link to={to} className="no-underline">
    <button className="cursor-pointer rounded-lg border-none bg-psycho-primary px-7 py-3 text-sm font-semibold text-white transition-all hover:bg-psycho-hover">
      {children}
    </button>
  </Link>
);

const renderCardIcon = (status) => {
  if (status === "success") {
    return (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
        <path d="M22 4L12 14.01l-3-3" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (status === "error") {
    return (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2" />
        <line x1="12" y1="8" x2="12" y2="12" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
        <line x1="12" y1="16" x2="12.01" y2="16" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#1188d8" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="14" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 7l9 6 9-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const PsychologistVerification = () => {
  const [params] = useSearchParams();
  const location = useLocation();
  const token = params.get("token");
  const [status, setStatus] = useState(token ? "verifying" : "check-email");
  const [message, setMessage] = useState("Verifying your email...");
  const userEmail = useMemo(
    () => location.state?.email || "",
    [location.state]
  );
  const derivedView = useMemo(() => {
    if (location.state?.emailSent || location.pathname.includes("verification-sent")) {
      return { status: "check-email", message: "Check your inbox." };
    }

    if (location.pathname.includes("verify-success")) {
      return { status: "success", message: "" };
    }

    if (location.pathname.includes("verify-error")) {
      return {
        status: "error",
        message: "Token is invalid or expired.",
      };
    }

    return null;
  }, [location.pathname, location.state]);

  const verifyEmail = useCallback(async (token) => {
    try {
      setStatus("verifying");
      await psychologistVerifyEmail(token);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setMessage(err.response?.data?.error || "Verification failed. The link may be invalid or expired.");
    }
  }, []);

  useEffect(() => {
    if (token) {
      const timerId = window.setTimeout(() => {
        verifyEmail(token);
      }, 0);
      return () => window.clearTimeout(timerId);
    }
    return undefined;
  }, [token, verifyEmail]);

  const displayStatus = token ? status : derivedView?.status;
  const displayMessage = token ? message : derivedView?.message || message;

  if (!token && !derivedView) {
    return <Navigate to="/psychologist/signup" replace />;
  }

  const iconWrapperCls = {
    success: "bg-emerald-50 border-emerald-200",
    error: "bg-red-50 border-red-200",
    verifying: "bg-blue-50 border-blue-200",
    "check-email": "bg-blue-50 border-blue-200",
  };

  return (
    <div className="min-h-screen bg-[#eef0f5] flex items-center justify-center p-5">
      <div className="bg-white rounded-2xl p-10 w-full max-w-[460px] shadow-[0_4px_24px_rgba(0,0,0,0.10)] animate-fade-in">
        <div className="flex justify-center mb-6">
          <img src={logo} alt="Koode" className="h-12 w-auto block mx-auto scale-[1.6] origin-center" />
        </div>

        <div className="flex justify-center mb-6">
          <div className={`w-20 h-20 ${iconWrapperCls[displayStatus] || iconWrapperCls.verifying} border rounded-2xl flex items-center justify-center`}>
            <div className="relative">
              {renderCardIcon(displayStatus)}
              {displayStatus === "check-email" ? (
                <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500">
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="#fff"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="text-center">
          {displayStatus === "check-email" && (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">Verify your email</h1>
              <p className="text-gray-500 text-sm mb-1">We've sent a verification link to</p>
              <p className="text-psycho-primary font-semibold text-base mb-3">{userEmail || "your email address"}</p>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">Please check your inbox and click the link to activate your psychologist account and start your professional journey.</p>
              <VerificationAction to="/psychologist/login">Back to Login</VerificationAction>
            </>
          )}

          {displayStatus === "verifying" && (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">Verifying...</h1>
              <p className="text-gray-500 text-sm">Please wait while we verify your email address.</p>
              <div className="w-8 h-8 border-[3px] border-gray-200 border-t-psycho-primary rounded-full mx-auto mt-6 animate-spin" />
            </>
          )}

          {displayStatus === "success" && (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">Email Verified!</h1>
              <p className="text-gray-500 text-sm leading-relaxed mb-7">Your email has been successfully verified.<br />You can now access your professional dashboard.</p>
              <VerificationAction to="/psychologist/login">Continue to Login</VerificationAction>
            </>
          )}

          {displayStatus === "error" && (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">Verification Failed</h1>
              <p className="text-gray-500 text-sm mb-7">{displayMessage}</p>
              <VerificationAction to="/psychologist/signup">Back to Signup</VerificationAction>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PsychologistVerification;

import { useEffect, useState } from "react";
import { useSearchParams, Link, useLocation, useNavigate } from "react-router-dom";
import { patientVerifyEmail } from "../../../api/patient.api";
import PatientNavbar from "../../../components/patient/Navbar/PatientNavbar";
import PatientAuthFooter from "../../../components/patient/AuthFooter/PatientAuthFooter";

const VerificationSent = () => {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("Verifying your email...");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    if (location.state?.email) setUserEmail(location.state.email);
    const token = params.get("token");
    if (token) { verifyEmail(token); }
    else if (location.state?.emailSent) { setStatus("check-email"); setUserEmail(location.state.email); }
    else if (location.pathname.includes("verify-success")) { setStatus("success"); }
    else if (location.pathname.includes("verify-error")) { setStatus("error"); setMessage("Token is invalid or expired."); }
    else if (location.pathname.includes("verification-sent")) { setStatus("check-email"); }
    else { navigate("/patient/signup"); }
  }, [params, location.state, location.pathname, navigate]);

  const verifyEmail = async (token) => {
    try {
      setStatus("verifying");
      await patientVerifyEmail(token);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setMessage(err.response?.data?.error || "Verification failed. The link may be invalid or expired.");
    }
  };

  const resendBtnCls = "w-[calc(100%-4rem)] mx-8 py-[0.938rem] px-6 text-base font-semibold font-['DM_Sans',sans-serif] text-white bg-patient-primary border-none rounded-md2 cursor-pointer transition-all duration-300 flex items-center justify-center gap-[0.625rem] shadow-patient-sm hover:bg-patient-hover hover:shadow-patient-md hover:-translate-y-px active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed";

  return (
    <div className="font-['DM_Sans',sans-serif] bg-ui-50 text-ui-900 leading-relaxed min-h-screen flex flex-col pt-[66px]">
      <PatientNavbar />
      <main className="flex-1 flex items-center justify-center px-6 py-12 animate-fade-in">
        <div className="bg-white rounded-lg2 shadow-card w-full max-w-[560px] relative overflow-hidden transition-all duration-300 text-center pb-16 hover:shadow-card-hover">
          
          <div className="h-[6px] bg-gradient-to-r from-patient-primary to-[#20d4bc] animate-shimmer" />

          
          <div className="flex justify-center px-8 pt-12 pb-6 animate-icon-bounce">
            <div className="w-[120px] h-[120px] bg-gradient-to-br from-[rgba(26,190,170,0.1)] to-[rgba(32,212,188,0.15)] rounded-full flex items-center justify-center relative transition-all duration-300">
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
                    <div className="absolute bottom-2 right-2 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.15)] animate-heart-pulse">
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
              <h1 className="font-outfit text-[1.875rem] font-bold text-ui-900 text-center mb-4 tracking-tight px-8">Verify your email</h1>
              <p className="text-[0.938rem] text-ui-500 text-center mb-2 px-8">We've sent a verification link to</p>
              <p className="text-base font-semibold text-ui-900 text-center mb-5 px-8">{userEmail || "your email address"}</p>
              <p className="text-sm text-ui-500 text-center leading-relaxed mb-8 px-8">
                Please check your inbox and click the link to activate your<br />account and start your journey.
              </p>
              <Link to="/patient/login" style={{ textDecoration: 'none' }}>
                <button className={resendBtnCls}>Back to Login</button>
              </Link>
            </>
          )}

          {status === "verifying" && (
            <>
              <h1 className="font-outfit text-[1.875rem] font-bold text-ui-900 text-center mb-4 tracking-tight px-8">Verifying...</h1>
              <p className="text-sm text-ui-500 text-center leading-relaxed mb-8 px-8">Please wait while we verify your email address.</p>
            </>
          )}

          {status === "success" && (
            <>
              <h1 className="font-outfit text-[1.875rem] font-bold text-ui-900 text-center mb-4 tracking-tight px-8">Email Verified!</h1>
              <p className="text-sm text-ui-500 text-center leading-relaxed mb-8 px-8">
                Your email has been successfully verified.<br />You can now access your secure space.
              </p>
              <Link to="/patient/login" style={{ textDecoration: 'none' }}>
                <button className={resendBtnCls}>Continue to Login</button>
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <h1 className="font-outfit text-[1.875rem] font-bold text-ui-900 text-center mb-4 tracking-tight px-8">Verification Failed</h1>
              <p className="text-sm text-ui-500 text-center leading-relaxed mb-8 px-8">{message}</p>
              <Link to="/patient/signup" style={{ textDecoration: 'none' }}>
                <button className={resendBtnCls}>Back to Signup</button>
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
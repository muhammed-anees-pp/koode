import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { patientResetPassword } from "../../../api/patient.api";
import logo from "../../../assets/patient-logo.png";
import { useState, useEffect } from "react";

const getErrorMessage = (error) => {
  if (error.response?.data) {
    const data = error.response.data;
    if (data.non_field_errors?.length > 0) return data.non_field_errors[0];
    if (typeof data === "object") {
      if (data.token?.length > 0) return data.token[0];
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
  newPassword: z.string().min(8, "Password must be at least 8 characters").regex(/[A-Z]/, "Password must contain at least one uppercase letter").regex(/[a-z]/, "Password must contain at least one lowercase letter").regex(/[0-9]/, "Password must contain at least one number").regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] });

const EyeIcon = ({ open }) => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
    {open ? (
      <path d="M2.5 2.5L17.5 17.5M9.41 9.41C9.23 9.59 9.11 9.82 9.08 10.08C9.03 10.56 9.22 11.04 9.59 11.41C9.96 11.78 10.44 11.97 10.92 11.92C11.18 11.89 11.41 11.77 11.59 11.59M12.7 8.3C12.3 7.9 11.76 7.64 11.17 7.58C10.14 7.46 9.15 8.06 8.7 9M17.5 10C17.5 10 14.5 15 10 15C9.11 15 8.28 14.8 7.5 14.45M6.27 13.23C4.23 11.91 2.5 10 2.5 10C2.5 10 5.5 5 10 5C10.8 5 11.55 5.15 12.25 5.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ) : (
      <>
        <path d="M2.5 10C2.5 10 5.5 5 10 5C14.5 5 17.5 10 17.5 10C17.5 10 14.5 15 10 15C5.5 15 2.5 10 2.5 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 12.5C11.3807 12.5 12.5 11.3807 12.5 10C12.5 8.61929 11.3807 7.5 10 7.5C8.61929 7.5 7.5 8.61929 7.5 10C7.5 11.3807 8.61929 12.5 10 12.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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


const pageCls = "min-h-screen flex flex-col items-center bg-[#f0f2f0] font-['DM_Sans',sans-serif] pb-10";
const topbarCls = "w-full py-[22px] px-8 flex items-center justify-between";
const logoCls = "h-9 w-auto object-contain scale-[2] origin-left ml-4";
const returnLinkCls = "text-sm font-medium text-[#1a2233] no-underline inline-flex items-center gap-1 transition-colors duration-200 hover:text-[#2bbfa4]";
const cardWrapperCls = "w-full max-w-[480px] mx-auto flex flex-col px-4 animate-fade-in";
const cardBarCls = "h-[5px] bg-gradient-to-r from-[#2bbfa4] to-[#48d8be] rounded-t-lg";
const cardCls = "bg-white rounded-b-2xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] px-[48px] py-10 flex flex-col items-center text-center";
const iconCircleCls = "w-[62px] h-[62px] rounded-full bg-[#e6f7f4] flex items-center justify-center mb-[22px] flex-shrink-0";
const titleCls = "text-[22px] font-bold text-[#1a2233] mb-[10px] tracking-tight";
const subtitleCls = "text-sm text-[#8a93a0] leading-[1.65] max-w-[340px] mb-6";
const errorBannerCls = "w-full flex items-start gap-[10px] bg-[#fef2f2] border border-[#fecaca] rounded-[10px] px-[14px] py-3 mb-[18px] text-left animate-fade-in";
const inputCls = (hasErr) => `w-full pl-4 pr-11 py-[13px] border-[1.5px] rounded-[10px] text-sm font-['DM_Sans',sans-serif] text-[#1a2233] bg-white outline-none transition-all duration-200 placeholder:text-[#8a93a0] focus:border-[#2bbfa4] focus:shadow-[0_0_0_3px_rgba(43,191,164,0.12)] disabled:bg-[#f8fafb] disabled:cursor-not-allowed disabled:opacity-70 ${hasErr ? "border-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.1)]" : "border-[#e2e8f0]"}`;
const eyeBtnCls = "absolute right-[13px] top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-[#8a93a0] flex items-center justify-center p-0.5 transition-colors duration-200 hover:text-[#1a2233]";
const fieldErrorCls = "text-xs text-red-500 font-medium text-left w-full";
const submitBtnCls = "w-full py-[14px] px-5 bg-[#2bbfa4] text-white text-[15px] font-semibold font-['DM_Sans',sans-serif] border-none rounded-[10px] cursor-pointer flex items-center justify-center gap-[10px] transition-all duration-200 hover:bg-[#24a88f] hover:shadow-[0_4px_16px_rgba(43,191,164,0.35)] hover:-translate-y-px active:translate-y-0 disabled:opacity-55 disabled:cursor-not-allowed disabled:bg-[#94a3b8]";
const footerCls = "mt-7 text-[13px] text-[#8a93a0]";
const supportLinkCls = "text-[#2bbfa4] no-underline font-semibold transition-colors duration-200 hover:text-[#24a88f]";

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
    if (!token) { setTokenError("Invalid or missing reset link. Please request a new password reset"); setIsTokenValid(false); setIsValidating(false); return; }
    const tokenRegex = /^[A-Za-z0-9_\-]+$/;
    if (!tokenRegex.test(token)) { setTokenError("Invalid reset token format. Please request a new password reset"); setIsTokenValid(false); setIsValidating(false); return; }
    setIsTokenValid(true);
    setIsValidating(false);
  }, [token]);

  const onSubmit = (data) => {
    setTokenError("");
    mutation.mutate({ token, new_password: data.newPassword, confirm_password: data.confirmPassword });
  };

  const getPasswordStrength = () => {
    if (!newPassword) return null;
    const checks = [/[A-Z]/.test(newPassword), /[a-z]/.test(newPassword), /[0-9]/.test(newPassword), /[^A-Za-z0-9]/.test(newPassword), newPassword.length >= 8];
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

  if (isValidating) {
    return (
      <div className={pageCls}>
        <div className={topbarCls}><img src={logo} alt="koode.in" className={logoCls} /></div>
        <div className={cardWrapperCls}>
          <div className={cardBarCls} />
          <div className={cardCls}>
            <div className="w-9 h-9 border-[3px] border-[#e2e8f0] border-t-[#2bbfa4] rounded-full animate-rp-spin mx-auto mb-4" />
            <p className="text-sm text-[#8a93a0]">Validating reset link...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isTokenValid) {
    return (
      <div className={pageCls}>
        <div className={topbarCls}>
          <img src={logo} alt="koode.in" className={logoCls} />
          <Link to="/patient/login" className={returnLinkCls}>Return to Login <span>→</span></Link>
        </div>
        <div className={cardWrapperCls}>
          <div className={cardBarCls} />
          <div className={cardCls}>
            <div className={`${iconCircleCls} !bg-[#fef2f2]`}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2" /><path d="M12 8V12M12 16H12.01" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" /></svg>
            </div>
            <h2 className={titleCls}>Invalid Reset Link</h2>
            <div className={`${errorBannerCls} !mb-6`}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="flex-shrink-0 mt-px"><circle cx="10" cy="10" r="9" stroke="#ef4444" strokeWidth="2" /><path d="M10 6v5M10 14v1" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" /></svg>
              <span className="text-[13px] text-red-600 font-medium leading-[1.5]">This password reset link is invalid or has expired</span>
            </div>
            <Link to="/patient/forgot-password" className={`${submitBtnCls} no-underline`} style={{ textDecoration: "none" }}>Request New Link <span className="text-[17px] leading-none flex items-center mb-1">→</span></Link>
            <div className="mt-6"><Link to="/patient/login" className="text-sm text-[#8a93a0] no-underline inline-flex items-center gap-1.5 font-medium transition-colors duration-200 hover:text-[#1a2233]"><span className="text-[15px] leading-none flex items-center mb-1">←</span> Back to Login</Link></div>
          </div>
        </div>
      </div>
    );
  }

  if (mutation.isSuccess) {
    return (
      <div className={pageCls}>
        <div className={topbarCls}>
          <img src={logo} alt="koode.in" className={logoCls} />
          <Link to="/patient/login" className={returnLinkCls}>Return to Login <span>→</span></Link>
        </div>
        <div className={cardWrapperCls}>
          <div className={cardBarCls} />
          <div className={cardCls}>
            <div className={iconCircleCls}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#2bbfa4" strokeWidth="2" /><path d="M8 12L11 15L16 9" stroke="#2bbfa4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <h2 className={titleCls}>Password Reset!</h2>
            <p className={subtitleCls}>Your password has been reset successfully.</p>
            <div className="inline-flex items-center gap-2 px-[18px] py-2 bg-[#e6f7f4] border border-[rgba(43,191,164,0.3)] rounded-[30px] text-[13px] text-[#24a88f] font-medium mt-2">
              <div className="w-4 h-4 border-2 border-[#e2e8f0] border-t-[#2bbfa4] rounded-full animate-rp-spin" />
              <span>Redirecting to login...</span>
            </div>
          </div>
        </div>
        <div className={footerCls}>Need help? <Link to="/contact" className={supportLinkCls}>Contact Support</Link></div>
      </div>
    );
  }

  return (
    <div className={pageCls}>
      <div className={topbarCls}>
        <img src={logo} alt="koode.in" className={logoCls} />
        <Link to="/patient/login" className={returnLinkCls}>Return to Login <span>→</span></Link>
      </div>
      <div className={cardWrapperCls}>
        <div className={cardBarCls} />
        <div className={cardCls}>
          <div className={iconCircleCls}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" stroke="#2bbfa4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 3v5h5" stroke="#2bbfa4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className={titleCls}>Reset Password</h2>
          <p className={subtitleCls}>Create a strong password for your account to ensure your data stays secure.</p>

          {mutation.isError && !mutation.isSuccess && (
            <div className={errorBannerCls}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="flex-shrink-0 mt-px"><circle cx="10" cy="10" r="9" stroke="#ef4444" strokeWidth="2" /><path d="M10 6v5M10 14v1" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" /></svg>
              <span className="text-[13px] text-red-600 font-medium leading-[1.5]">{getErrorMessage(mutation.error)}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="w-full flex flex-col gap-[18px]" noValidate>
            <div className="flex flex-col items-start gap-1.5 w-full">
              <label className="text-[13px] font-semibold text-[#1a2233]" htmlFor="newPassword">New Password</label>
              <div className="relative w-full">
                <input id="newPassword" type={showNewPassword ? "text" : "password"} placeholder="Enter new password" className={inputCls(!!errors.newPassword)} disabled={mutation.isPending} {...register("newPassword")} />
                <button type="button" className={eyeBtnCls} onClick={() => setShowNewPassword(!showNewPassword)} aria-label="Toggle password visibility"><EyeIcon open={showNewPassword} /></button>
              </div>
              {errors.newPassword && <span className={fieldErrorCls}>{errors.newPassword.message}</span>}

              {newPassword && (
                <div className="w-full flex items-center gap-[10px] mt-0.5">
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3, 4, 5].map((l) => (
                      <div key={l} className="h-1 flex-1 rounded-sm transition-colors duration-300" style={{ backgroundColor: passwordStrength && l <= passwordStrength.level ? passwordStrength.color : "#e2e8f0" }} />
                    ))}
                  </div>
                  {passwordStrength && <span className="text-xs font-semibold whitespace-nowrap" style={{ color: passwordStrength.color }}>{passwordStrength.text}</span>}
                </div>
              )}
            </div>

            <div className="flex flex-col items-start gap-1.5 w-full">
              <label className="text-[13px] font-semibold text-[#1a2233]" htmlFor="confirmPassword">Confirm New Password</label>
              <div className="relative w-full">
                <input id="confirmPassword" type={showConfirmPassword ? "text" : "password"} placeholder="Confirm new password" className={inputCls(!!errors.confirmPassword)} disabled={mutation.isPending} {...register("confirmPassword")} />
                <button type="button" className={eyeBtnCls} onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label="Toggle password visibility"><EyeIcon open={showConfirmPassword} /></button>
              </div>
              {errors.confirmPassword && <span className={fieldErrorCls}>{errors.confirmPassword.message}</span>}
            </div>

            <div className="w-full bg-[#f8fafb] border border-[#e2e8f0] rounded-[12px] px-[18px] py-4 text-left">
              <p className="text-[13px] font-bold text-[#1a2233] mb-3">Password Requirements</p>
              <ul className="list-none flex flex-col gap-[9px] p-0 m-0">
                {requirements.map((req, i) => (
                  <li key={i} className={`flex items-center gap-[9px] text-[13px] transition-colors duration-[0.25s] ${req.met ? "text-[#2bbfa4]" : "text-[#8a93a0]"}`}>
                    {req.met ? <CheckIcon /> : <CircleIcon />}
                    <span>{req.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button type="submit" className={submitBtnCls} disabled={mutation.isPending}>
              {mutation.isPending ? "Resetting Password..." : "Reset Password"}
              {!mutation.isPending && <span className="text-[17px] leading-none flex items-center mb-1">→</span>}
            </button>
          </form>
        </div>
      </div>
      <div className={footerCls}>Need help? <Link to="/contact" className={supportLinkCls}>Contact Support</Link></div>
    </div>
  );
};

export default PatientResetPassword;
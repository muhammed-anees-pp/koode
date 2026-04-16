import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { psychologistResetPassword } from "../../../api/psychologist.api";
import logo from "../../../assets/psychologist-logo.png";
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
  const s = error.response?.status;
  if (s === 400) return "Invalid or expired reset link. Please request a new one";
  if (s === 401) return "Unauthorized access. Please request a new reset link";
  if (s === 403) return "This reset link has already been used or is invalid";
  if (s === 404) return "Reset link not found. Please request a new one";
  if (s >= 500) return "Server error. Please try again later";
  return "Failed to reset password. Please try again";
};

const resetPasswordSchema = z.object({
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((d) => d.newPassword === d.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] });


const pageCls = "min-h-screen bg-[#eef0f5] flex flex-col items-center justify-center p-5";
const cardCls = "bg-white rounded-2xl p-8 shadow-[0_4px_24px_rgba(0,0,0,0.10)] animate-fade-in";
const labelCls = "block text-sm font-medium text-gray-700 mb-1.5";
const inputCls = (hasErr) =>
  `w-full bg-white border ${hasErr ? "border-red-400" : "border-gray-200"} text-gray-900 text-[0.938rem] rounded-lg px-4 py-3 pr-12 outline-none transition-all duration-200 placeholder:text-gray-400 focus:border-psycho-primary focus:shadow-[0_0_0_3px_rgba(17,136,216,0.12)] disabled:opacity-50`;
const errBannerCls = "flex items-center gap-2 text-red-500 text-[13px] bg-red-50 border border-red-200 px-3 py-2.5 rounded-xl mb-4";
const fieldErrCls = "text-red-500 text-[13px] mt-1";
const submitBtnCls = "w-full flex items-center justify-center gap-2 py-3.5 bg-psycho-primary text-white text-[0.938rem] font-semibold rounded-lg border-none cursor-pointer transition-all duration-200 hover:bg-psycho-hover disabled:opacity-60 disabled:cursor-not-allowed";

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

const ErrIcon = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" stroke="#ef4444" strokeWidth="2" /><path d="M10 6v5M10 14v1" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" /></svg>
);

const LogoBar = () => (
  <div className="flex justify-center mb-6">
    <img src={logo} alt="Koode" className="h-12 w-auto block mx-auto scale-[1.6] origin-center" />
  </div>
);

const PsychologistResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState("");

  const { register, handleSubmit, formState: { errors }, watch, reset } = useForm({
    resolver: zodResolver(resetPasswordSchema), defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const newPassword = watch("newPassword");
  const confirmPassword = watch("confirmPassword");

  const mutation = useMutation({
    mutationFn: (passwordData) => psychologistResetPassword(passwordData),
    onSuccess: () => { setTokenError(""); reset(); },
    onError: (error) => {
      const errorMessage = getErrorMessage(error);
      if (error.response?.status === 400 || error.response?.status === 403) { setIsTokenValid(false); setTokenError(errorMessage); }
    },
  });

  useEffect(() => {
    if (mutation.isSuccess) { const t = setTimeout(() => navigate("/psychologist/login"), 3000); return () => clearTimeout(t); }
  }, [mutation.isSuccess, navigate]);

  useEffect(() => {
    if (!token) { setTokenError("Invalid or missing reset link. Please request a new password reset"); setIsTokenValid(false); setIsValidating(false); return; }
    const tokenRegex = /^[A-Za-z0-9_\-]+$/;
    if (!tokenRegex.test(token)) { setTokenError("Invalid reset token format. Please request a new password reset"); setIsTokenValid(false); setIsValidating(false); return; }
    setIsTokenValid(true); setIsValidating(false);
  }, [token]);

  const onSubmit = (data) => { setTokenError(""); mutation.mutate({ token, new_password: data.newPassword, confirm_password: data.confirmPassword }); };

  const getPasswordStrength = () => {
    if (!newPassword) return null;
    const s = [/[A-Z]/.test(newPassword), /[a-z]/.test(newPassword), /[0-9]/.test(newPassword), /[^A-Za-z0-9]/.test(newPassword), newPassword.length >= 8].filter(Boolean).length;
    if (s <= 2) return { text: "Weak", color: "#ef4444", level: 2 };
    if (s <= 4) return { text: "Medium", color: "#f59e0b", level: 4 };
    return { text: "Strong", color: "#10b981", level: 5 };
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
        <div className="w-full max-w-[420px]">
          <div className={`${cardCls} text-center py-14`}>
            <LogoBar />
            <div className="w-10 h-10 border-[3px] border-gray-200 border-t-psycho-primary rounded-full mx-auto mb-4 animate-spin" />
            <p className="text-gray-500 text-sm">Validating reset link...</p>
          </div>
        </div>
      </div>
    );
  }

  
  if (!isTokenValid) {
    return (
      <div className={pageCls}>
        <div className="w-full max-w-[420px]">
          <div className={`${cardCls} text-center`}>
            <LogoBar />
            <div className="w-14 h-14 bg-red-50 border border-red-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2" /><path d="M12 8V12M12 16H12.01" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" /></svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid Reset Link</h2>
            <div className={`${errBannerCls} justify-center my-5`}><ErrIcon /><span>This password reset link is invalid or has expired</span></div>
            <Link to="/psychologist/forgot-password" className="inline-flex items-center gap-2 py-3 px-6 bg-psycho-primary text-white font-semibold text-sm rounded-lg no-underline hover:bg-psycho-hover transition-all">
              Request New Link →
            </Link>
            <div className="mt-4 flex justify-center">
              <Link to="/psychologist/login" className="flex items-center gap-1.5 text-psycho-primary text-sm no-underline hover:text-psycho-hover">← Back to Login</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  
  if (mutation.isSuccess) {
    return (
      <div className={pageCls}>
        <div className="w-full max-w-[420px]">
          <div className={`${cardCls} text-center`}>
            <LogoBar />
            <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#10b981" strokeWidth="2" /><path d="M8 12L11 15L16 9" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Password Reset!</h2>
            <p className="text-gray-500 text-sm mb-5">Your password has been reset successfully.</p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-full">
              <div className="w-4 h-4 border-2 border-psycho-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-psycho-primary text-[13px] font-medium">Redirecting to login...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  
  return (
    <div className={pageCls}>
      <div className="w-full max-w-[420px]">
        <div className={cardCls}>
          <LogoBar />
          <div className="w-12 h-12 bg-blue-50 border border-blue-200 rounded-full flex items-center justify-center mx-auto mb-5 text-psycho-primary">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="5" y="11" width="14" height="10" rx="2" stroke="#1188d8" strokeWidth="2" />
              <path d="M8 11V7a4 4 0 018 0v4" stroke="#1188d8" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 text-center mb-1">Reset Password</h2>
          <p className="text-gray-500 text-sm text-center mb-6">Create a strong password for your account to ensure your data stays secure.</p>

          {mutation.isError && !mutation.isSuccess && (
            <div className={errBannerCls}><ErrIcon /><span>{getErrorMessage(mutation.error)}</span></div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <div>
              <label htmlFor="newPassword" className={labelCls}>New Password</label>
              <div className="relative">
                <input id="newPassword" type={showNewPassword ? "text" : "password"} placeholder="Enter new password" className={inputCls(!!errors.newPassword)} disabled={mutation.isPending} {...register("newPassword")} />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 bg-transparent border-none cursor-pointer hover:text-gray-600" onClick={() => setShowNewPassword(!showNewPassword)} aria-label="Toggle"><EyeIcon open={showNewPassword} /></button>
              </div>
              {errors.newPassword && <span className={fieldErrCls}>{errors.newPassword.message}</span>}
              {newPassword && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map((l) => (
                      <div key={l} className="h-1 flex-1 rounded-sm transition-colors" style={{ backgroundColor: passwordStrength && l <= passwordStrength.level ? passwordStrength.color : "#e5e7eb" }} />
                    ))}
                  </div>
                  {passwordStrength && <span className="text-[12px]" style={{ color: passwordStrength.color }}>{passwordStrength.text}</span>}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className={labelCls}>Confirm New Password</label>
              <div className="relative">
                <input id="confirmPassword" type={showConfirmPassword ? "text" : "password"} placeholder="Confirm new password" className={inputCls(!!errors.confirmPassword)} disabled={mutation.isPending} {...register("confirmPassword")} />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 bg-transparent border-none cursor-pointer hover:text-gray-600" onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label="Toggle"><EyeIcon open={showConfirmPassword} /></button>
              </div>
              {errors.confirmPassword && <span className={fieldErrCls}>{errors.confirmPassword.message}</span>}
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs">
              <p className="text-gray-700 font-semibold mb-2">Password Requirements</p>
              <ul className="flex flex-col gap-1.5 list-none p-0 m-0">
                {requirements.map(({ text, met }) => (
                  <li key={text} className="flex items-center gap-2" style={{ color: met ? "#10b981" : "#6b7280" }}>
                    {met ? (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="#10b981" strokeWidth="1.5" /><path d="M5 8L7 10.5L11 6" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="#d1d5db" strokeWidth="1.5" /></svg>
                    )}
                    {text}
                  </li>
                ))}
              </ul>
            </div>

            <button type="submit" className={submitBtnCls} disabled={mutation.isPending}>
              {mutation.isPending ? "Resetting Password..." : "Reset Password"}
              {!mutation.isPending && <span>→</span>}
            </button>
          </form>

          <div className="flex justify-center mt-4">
            <Link to="/psychologist/login" className="flex items-center gap-1.5 text-psycho-primary text-sm no-underline hover:text-psycho-hover">← Return to Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PsychologistResetPassword;
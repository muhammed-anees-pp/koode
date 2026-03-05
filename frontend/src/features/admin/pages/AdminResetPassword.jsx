import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { adminResetPassword } from "../../../api/admin.api";
import logo from "../../../assets/admin-logo.png";
import { useState, useEffect } from "react";

const getErrorMessage = (error) => {
  if (error.response?.data) {
    const data = error.response.data;
    if (data.non_field_errors?.length > 0) return data.non_field_errors[0];
    if (typeof data === 'object') {
      if (data.token?.length > 0) return data.token[0];
      if (data.detail) return data.detail;
      if (data.message) return data.message;
    }
    if (typeof data === 'string') return data;
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
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Shared style tokens
const cardCls = "bg-[rgba(13,17,30,0.92)] border border-slate-800/60 rounded-2xl p-8 w-full max-w-[440px] shadow-[0_24px_80px_rgba(0,0,0,0.5)] animate-fade-in backdrop-blur-sm";
const labelCls = "block text-xs font-semibold text-slate-500 uppercase tracking-[0.07em] mb-2";
const inputCls = (hasErr) => `w-full bg-[#0d1117] border ${hasErr ? "border-red-500" : "border-slate-700/60"} text-slate-100 text-[0.938rem] rounded-xl pl-11 pr-11 py-[14px] outline-none transition-colors duration-200 placeholder:text-slate-600 focus:border-admin-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] disabled:opacity-50 disabled:cursor-not-allowed`;
const errorCls = "flex items-center gap-2 text-red-400 text-[13px] bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg mt-2";
const submitBtnCls = "w-full flex items-center justify-center gap-2 py-[14px] px-6 bg-admin-primary text-white font-semibold text-[0.938rem] border-none rounded-xl cursor-pointer transition-all duration-300 shadow-admin-btn hover:bg-admin-hover hover:shadow-admin-btn-hover hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed";

const CardHeader = ({ title, subtitle }) => (
  <div className="text-center mb-8">
    <div className="flex justify-center mb-8">
      <img src={logo} alt="koode.in" className="w-40 sm:w-52 md:w-60 h-auto scale-125 sm:scale-150" />
    </div>
    <h1 className="font-outfit text-[1.75rem] font-bold text-slate-100 tracking-tight mb-1">{title}</h1>
    {subtitle && <p className="text-slate-500 text-sm">{subtitle}</p>}
  </div>
);

const PageFooter = () => (
  <div className="mt-6 flex flex-col items-center gap-1.5">
    <div className="flex items-center gap-2 text-slate-500 text-sm">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1.33334L3.33334 3.33334V7.33334C3.33334 10.6667 5.66668 13.7333 8 14.6667C10.3333 13.7333 12.6667 10.6667 12.6667 7.33334V3.33334L8 1.33334Z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
      <span className="font-medium">Authorized Personnel Only</span>
    </div>
    <p className="text-slate-600 text-xs text-center leading-relaxed">
      Access to this system is monitored and logged.<br />Unauthorized access is prohibited.
    </p>
  </div>
);

const EyeToggle = ({ show, onToggle }) => (
  <button type="button" className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-transparent border-none text-slate-500 cursor-pointer flex items-center hover:text-slate-300 transition-colors" onClick={onToggle} aria-label="Toggle password visibility">
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      {show ? (
        <path d="M2.5 2.5L17.5 17.5M9.41 9.41C9.23 9.59 9.11 9.82 9.08 10.08C9.03 10.56 9.22 11.04 9.59 11.41C9.96 11.78 10.44 11.97 10.92 11.92C11.18 11.89 11.41 11.77 11.59 11.59M12.7 8.3C12.3 7.9 11.76 7.64 11.17 7.58C10.14 7.46 9.15 8.06 8.7 9M17.5 10C17.5 10 14.5 15 10 15C9.11 15 8.28 14.8 7.5 14.45M6.27 13.23C4.23 11.91 2.5 10 2.5 10C2.5 10 5.5 5 10 5C10.8 5 11.55 5.15 12.25 5.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M2.5 10C2.5 10 5.5 5 10 5C14.5 5 17.5 10 17.5 10C17.5 10 14.5 15 10 15C5.5 15 2.5 10 2.5 10Z M10 12.5C11.3807 12.5 12.5 11.3807 12.5 10C12.5 8.61929 11.3807 7.5 10 7.5C8.61929 7.5 7.5 8.61929 7.5 10C7.5 11.3807 8.61929 12.5 10 12.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  </button>
);

const LockIcon = () => (
  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none" width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M5 8.33333V5.83333C5 4.72826 5.43899 3.66845 6.22039 2.88705C7.00179 2.10565 8.0616 1.66667 9.16667 1.66667C10.2717 1.66667 11.3315 2.10565 12.1129 2.88705C12.8943 3.66845 13.3333 4.72826 13.3333 5.83333V8.33333M5.83333 18.3333H12.5C13.8807 18.3333 15 17.214 15 15.8333V10.8333C15 9.45262 13.8807 8.33333 12.5 8.33333H5.83333C4.45262 8.33333 3.33333 9.45262 3.33333 10.8333V15.8333C3.33333 17.214 4.45262 18.3333 5.83333 18.3333Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const AdminResetPassword = () => {
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

  const mutation = useMutation({
    mutationFn: (passwordData) => adminResetPassword(passwordData),
    onSuccess: () => { setTokenError(""); reset(); },
    onError: (error) => {
      const errorMessage = getErrorMessage(error);
      if (error.response?.status === 400 || error.response?.status === 403) { setIsTokenValid(false); setTokenError(errorMessage); }
    },
  });

  useEffect(() => {
    if (mutation.isSuccess) { const t = setTimeout(() => navigate("/admin/login"), 3000); return () => clearTimeout(t); }
  }, [mutation.isSuccess, navigate]);

  useEffect(() => {
    if (!token) { setTokenError("Invalid or missing reset link. Please request a new password reset."); setIsTokenValid(false); setIsValidating(false); return; }
    const tokenRegex = /^[A-Za-z0-9_\-]+$/;
    if (!tokenRegex.test(token)) { setTokenError("Invalid reset token format. Please request a new password reset."); setIsTokenValid(false); setIsValidating(false); return; }
    setIsTokenValid(true); setIsValidating(false);
  }, [token]);

  const onSubmit = (data) => { setTokenError(""); mutation.mutate({ token, new_password: data.newPassword, confirm_password: data.confirmPassword }); };

  const getPasswordStrength = () => {
    if (!newPassword) return null;
    const strength = [/[A-Z]/.test(newPassword), /[a-z]/.test(newPassword), /[0-9]/.test(newPassword), /[^A-Za-z0-9]/.test(newPassword), newPassword.length >= 8].filter(Boolean).length;
    if (strength <= 2) return { text: "Weak", color: "#ef4444", bars: 2 };
    if (strength <= 4) return { text: "Medium", color: "#f59e0b", bars: 4 };
    return { text: "Strong", color: "#10b981", bars: 5 };
  };

  const passwordStrength = getPasswordStrength();

  const requirements = [
    { text: "At least 8 characters long", test: newPassword?.length >= 8 },
    { text: "Contains uppercase letter (A-Z)", test: /[A-Z]/.test(newPassword) },
    { text: "Contains lowercase letter (a-z)", test: /[a-z]/.test(newPassword) },
    { text: "Contains number (0-9)", test: /[0-9]/.test(newPassword) },
    { text: "Contains special character (!@#$%)", test: /[^A-Za-z0-9]/.test(newPassword) },
  ];

  if (isValidating) {
    return (
      <div className="bg-admin-gradient min-h-screen flex flex-col items-center justify-center p-5 font-['DM_Sans',sans-serif]">
        <div className={cardCls}>
          <CardHeader title="Reset Password" />
          <div className="text-center py-10">
            <div className="w-10 h-10 border-[3px] border-slate-700 border-t-admin-primary rounded-full mx-auto mb-5 animate-spin" />
            <p className="text-slate-400">Validating reset link...</p>
          </div>
        </div>
        <PageFooter />
      </div>
    );
  }

  if (!isTokenValid) {
    return (
      <div className="bg-admin-gradient min-h-screen flex flex-col items-center justify-center p-5 font-['DM_Sans',sans-serif]">
        <div className={cardCls}>
          <CardHeader title="Invalid Reset Link" subtitle="The password reset link is invalid or has expired" />
          <div className="flex flex-col items-center bg-red-500/10 border border-red-500/20 rounded-xl p-7 mt-4 text-center">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="mb-4 text-red-500"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" /><path d="M12 8V12M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            <h3 className="text-red-400 font-semibold text-base mb-2">Link Expired or Invalid</h3>
            {tokenError && <p className="text-slate-500 text-sm">{tokenError}</p>}
          </div>
          <div className="text-center mt-5">
            <Link to="/admin/forgot-password" className="inline-flex items-center gap-2 py-3 px-6 bg-admin-primary text-white font-semibold rounded-xl no-underline hover:bg-admin-hover transition-all duration-200">Request New Link</Link>
          </div>
          <div className="flex justify-center mt-6">
            <Link to="/admin/login" className="flex items-center gap-1.5 text-slate-400 text-sm font-medium no-underline transition-colors duration-200 hover:text-slate-200">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M12.5 5L7.5 10L12.5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Back to Login
            </Link>
          </div>
        </div>
        <PageFooter />
      </div>
    );
  }

  if (mutation.isSuccess) {
    return (
      <div className="bg-admin-gradient min-h-screen flex flex-col items-center justify-center p-5 font-['DM_Sans',sans-serif]">
        <div className={cardCls}>
          <CardHeader title="Reset Password" />
          <div className="flex flex-col items-center bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-8 text-center animate-fade-in">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-5 text-emerald-400">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" /><path d="M8 12L11 15L16 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <h3 className="text-slate-200 text-xl font-semibold mb-2">Password Reset Successful!</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">Your password has been reset successfully.</p>
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/15 rounded-[30px] border border-emerald-500/20">
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-emerald-400 text-[13px] font-medium">Redirecting to login...</span>
            </div>
          </div>
        </div>
        <PageFooter />
      </div>
    );
  }

  return (
    <div className="bg-admin-gradient min-h-screen flex flex-col items-center justify-center p-5 font-['DM_Sans',sans-serif]">
      <div className={cardCls}>
        <CardHeader title="Reset Password" subtitle="Enter your new password below" />

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
          {mutation.isError && !mutation.isSuccess && <div className={errorCls}>{getErrorMessage(mutation.error)}</div>}

          <div>
            <label htmlFor="newPassword" className={labelCls}>New Password</label>
            <div className="relative">
              <LockIcon />
              <input type={showNewPassword ? "text" : "password"} id="newPassword" placeholder="Enter new password" {...register("newPassword")} className={inputCls(!!errors.newPassword)} disabled={mutation.isPending} />
              <EyeToggle show={showNewPassword} onToggle={() => setShowNewPassword(!showNewPassword)} />
            </div>
            {errors.newPassword && <div className={errorCls}>{errors.newPassword.message}</div>}
            {newPassword && !errors.newPassword && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div key={level} className="h-1 flex-1 rounded-sm transition-colors duration-300" style={{ backgroundColor: passwordStrength && level <= passwordStrength.bars ? passwordStrength.color : "#334155" }} />
                  ))}
                </div>
                {passwordStrength && <p className="text-[12px] mt-1" style={{ color: passwordStrength.color }}>Password strength: {passwordStrength.text}</p>}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className={labelCls}>Confirm Password</label>
            <div className="relative">
              <LockIcon />
              <input type={showConfirmPassword ? "text" : "password"} id="confirmPassword" placeholder="Confirm new password" {...register("confirmPassword")} className={inputCls(!!errors.confirmPassword)} disabled={mutation.isPending} />
              <EyeToggle show={showConfirmPassword} onToggle={() => setShowConfirmPassword(!showConfirmPassword)} />
            </div>
            {errors.confirmPassword && <div className={errorCls}>{errors.confirmPassword.message}</div>}
          </div>

          <div className="bg-[#0d1117] border border-slate-700/60 rounded-xl p-4 text-xs">
            <p className="text-slate-300 font-semibold mb-3">Password Requirements:</p>
            <ul className="flex flex-col gap-2 list-none p-0 m-0">
              {requirements.map(({ text, test }) => (
                <li key={text} className="flex items-center gap-2" style={{ color: test ? "#10b981" : "#94a3b8" }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    {test ? <path d="M13.3334 4L6.00002 11.3333L2.66669 8" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /> : <circle cx="8" cy="8" r="6" stroke="#94a3b8" strokeWidth="1.5" />}
                  </svg>
                  {text}
                </li>
              ))}
            </ul>
          </div>

          <button type="submit" disabled={mutation.isPending} className={submitBtnCls}>
            {mutation.isPending ? "Resetting Password..." : "Reset Password"}
            {!mutation.isPending && <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          </button>
        </form>

        <div className="flex justify-center mt-6">
          <Link to="/admin/login" className="flex items-center gap-1.5 text-slate-400 text-sm font-medium no-underline transition-colors duration-200 hover:text-slate-200">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M12.5 5L7.5 10L12.5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Back to Login
          </Link>
        </div>
      </div>

      <PageFooter />
    </div>
  );
};

export default AdminResetPassword;
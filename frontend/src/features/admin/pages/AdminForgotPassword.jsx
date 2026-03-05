import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { adminForgotPassword } from "../../../api/admin.api";
import { Link } from "react-router-dom";
import logo from "../../../assets/admin-logo.png";
import { useState } from "react";

const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
});

const inputCls = (hasErr) => `w-full bg-[#0d1117] border ${hasErr ? "border-red-500" : "border-slate-700/60"} text-slate-100 text-[0.938rem] rounded-xl pl-11 pr-4 py-[14px] outline-none transition-colors duration-200 placeholder:text-slate-600 focus:border-admin-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] disabled:opacity-50 disabled:cursor-not-allowed`;
const errorCls = "flex items-center gap-2 text-red-400 text-[13px] bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg mt-2";
const submitBtnCls = "w-full flex items-center justify-center gap-2 py-[14px] px-6 bg-admin-primary text-white font-semibold text-[0.938rem] border-none rounded-xl cursor-pointer transition-all duration-300 shadow-admin-btn hover:bg-admin-hover hover:shadow-admin-btn-hover hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed";

const AdminForgotPassword = () => {
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const { register, handleSubmit, formState: { errors }, watch, reset } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const emailValue = watch("email");

  const mutation = useMutation({
    mutationFn: (email) => adminForgotPassword(email),
    onSuccess: () => setShowSuccessMessage(true),
    onError: (error) => console.error("Forgot password error:", error),
  });

  const onSubmit = (data) => { setShowSuccessMessage(false); mutation.mutate(data.email); };

  return (
    <div className="bg-admin-gradient min-h-screen flex flex-col items-center justify-center p-5 font-['DM_Sans',sans-serif]">
      {/* Card */}
      <div className="bg-[rgba(13,17,30,0.92)] border border-slate-800/60 rounded-2xl p-8 w-full max-w-[440px] shadow-[0_24px_80px_rgba(0,0,0,0.5)] animate-fade-in backdrop-blur-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-8">
            <img src={logo} alt="koode.in" className="w-40 sm:w-52 md:w-60 h-auto scale-125 sm:scale-150" />
          </div>
          <h1 className="font-outfit text-[1.75rem] font-bold text-slate-100 tracking-tight mb-1">Reset Access</h1>
          <p className="text-slate-500 text-sm">Enter your email to receive recovery instructions</p>
        </div>

        {!showSuccessMessage ? (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-500 uppercase tracking-[0.07em] mb-2">Email Address</label>
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none" width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M3.33333 5.83333L10 10.8333L16.6667 5.83333M3.33333 14.1667H16.6667C17.5871 14.1667 18.3333 13.4205 18.3333 12.5V5.83333C18.3333 4.91286 17.5871 4.16667 16.6667 4.16667H3.33333C2.41286 4.16667 1.66667 4.91286 1.66667 5.83333V12.5C1.66667 13.4205 2.41286 14.1667 3.33333 14.1667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <input type="text" id="email" placeholder="admin@platform.com" {...register("email")} className={inputCls(!!errors.email)} disabled={mutation.isPending} />
              </div>
              {errors.email && <div className={errorCls}>{errors.email.message}</div>}
            </div>

            <button type="submit" disabled={mutation.isPending} className={submitBtnCls}>
              {mutation.isPending ? "Sending..." : "Send Reset Link"}
              {!mutation.isPending && <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            </button>
          </form>
        ) : (
          <div className="flex items-start gap-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl animate-fade-in">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0 text-emerald-400">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" /><path d="M8 12L11 15L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <div>
              <h3 className="text-emerald-400 font-semibold text-sm mb-1">Reset link sent!</h3>
              <p className="text-slate-400 text-[13px] leading-relaxed">
                We've sent a password reset link to{" "}
                <span className="text-slate-200 font-semibold">{emailValue}</span>
                . Please check your inbox.
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-center mt-6">
          <Link
            to="/admin/login"
            className="flex items-center gap-1.5 text-slate-400 text-sm font-medium no-underline transition-colors duration-200 hover:text-slate-200"
            onClick={reset}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M12.5 5L7.5 10L12.5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Back to Login
          </Link>
        </div>
      </div>

      {/* Footer — outside card */}
      <div className="mt-6 flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1.33334L3.33334 3.33334V7.33334C3.33334 10.6667 5.66668 13.7333 8 14.6667C10.3333 13.7333 12.6667 10.6667 12.6667 7.33334V3.33334L8 1.33334Z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span className="font-medium">Authorized Personnel Only</span>
        </div>
        <p className="text-slate-600 text-xs text-center leading-relaxed">
          Access to this system is monitored and logged.<br />Unauthorized access is prohibited.
        </p>
      </div>
    </div>
  );
};

export default AdminForgotPassword;
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { patientForgotPassword } from "../../../api/patient.api";
import { Link } from "react-router-dom";
import logo from "../../../assets/patient-logo.png";

const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
});

const inputCls = (hasError) =>
  `w-full px-4 py-4 text-[0.938rem] font-['DM_Sans',sans-serif] text-[#1a2233] bg-white border-[1.5px] rounded-[10px] transition-all duration-300 outline-none placeholder:text-[#9ca3af] focus:border-[#2bbfa4] focus:shadow-[0_0_0_3px_rgba(26,190,170,0.1)] hover:border-[#d1d5db] disabled:bg-[#f8fafb] disabled:cursor-not-allowed disabled:opacity-70 ${hasError ? "border-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.1)]" : "border-[#e2e8f0]"}`;

const PatientForgotPassword = () => {
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [backendError, setBackendError] = useState(null);
  const [backendSuccess, setBackendSuccess] = useState(null);

  const { register, handleSubmit, formState: { errors }, watch, reset } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const emailValue = watch("email");

  const mutation = useMutation({
    mutationFn: (email) => patientForgotPassword(email),
    onSuccess: (data) => {
      setShowSuccessMessage(true);
      setBackendSuccess(data?.message || "Reset link sent successfully!");
      setBackendError(null);
    },
    onError: (error) => {
      setBackendError(error?.response?.data?.message || "Failed to send reset link. Please try again.");
      setShowSuccessMessage(false);
    },
  });

  const onSubmit = (data) => {
    setShowSuccessMessage(false);
    setBackendError(null);
    setBackendSuccess(null);
    mutation.mutate(data.email);
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-[#f0f2f0] font-['DM_Sans',sans-serif] pb-10">
      <div className="w-full px-8 py-6 flex items-center">
        <img src={logo} alt="koode.in" className="h-9 w-auto object-contain scale-[2] origin-left ml-4" />
      </div>

      <div className="w-full max-w-[460px] mx-auto flex flex-col px-4 animate-fade-in">
        <div className="h-[5px] bg-gradient-to-r from-[#2bbfa4] to-[#48d8be] rounded-t-lg" />
        <div className="bg-white rounded-b-2xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] px-12 py-11 flex flex-col items-center text-center">
          <div className="w-[60px] h-[60px] rounded-full bg-[#e6f7f4] flex items-center justify-center mb-6 flex-shrink-0">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="5" y="11" width="14" height="10" rx="2" stroke="#2bbfa4" strokeWidth="2" />
              <path d="M8 11V7a4 4 0 018 0v4" stroke="#2bbfa4" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>

          {backendError && !showSuccessMessage && (
            <div className="w-full flex items-start gap-[10px] bg-[#fef2f2] border border-[#fecaca] rounded-[10px] px-[14px] py-3 mb-4 text-left animate-fade-in">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="flex-shrink-0 mt-px">
                <circle cx="10" cy="10" r="9" stroke="#ef4444" strokeWidth="2" />
                <path d="M10 6v5M10 14v1" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="text-[13px] text-red-600 font-medium leading-[1.5]">{backendError}</span>
            </div>
          )}

          {showSuccessMessage ? (
            <div className="flex flex-col items-center gap-[10px] animate-fade-in">
              <div className="w-12 h-12 bg-[#2bbfa4] text-white rounded-full flex items-center justify-center text-[22px] font-bold mb-2">✓</div>
              <h2 className="text-[22px] font-bold text-[#1a2233] mb-3 tracking-tight">Check your email</h2>
              {backendSuccess && (
                <div className="w-full flex items-start gap-[10px] bg-[#f0fdf4] border border-[#bbf7d0] rounded-[10px] px-[14px] py-3 text-left animate-fade-in">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="flex-shrink-0 mt-px">
                    <circle cx="10" cy="10" r="9" stroke="#10b981" strokeWidth="2" />
                    <path d="M6 10L9 13L14 7" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <span className="text-[13px] text-[#16a34a] font-medium leading-[1.5]">{backendSuccess} <strong>{emailValue}</strong></span>
                </div>
              )}
            </div>
          ) : (
            <>
              <h2 className="text-[22px] font-bold text-[#1a2233] mb-3 tracking-tight">Forgot your password?</h2>
              <p className="text-sm text-[#8a93a0] leading-[1.6] max-w-[320px] mb-7">
                No worries, we'll help you reset it. Enter your email below to receive a recovery link.
              </p>
              <form onSubmit={handleSubmit(onSubmit)} className="w-full flex flex-col gap-4" noValidate>
                <div className="flex flex-col items-start gap-1.5 w-full">
                  <label className="text-sm font-medium text-[#1a2233]" htmlFor="email">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    className={inputCls(!!errors.email)}
                    placeholder="you@example.com"
                    {...register("email")}
                    disabled={mutation.isPending}
                  />
                  {errors.email && <div className="text-xs text-red-500 font-medium text-left w-full">{errors.email.message}</div>}
                </div>
                <button
                  type="submit"
                  className="w-full py-[14px] px-5 bg-[#2bbfa4] text-white text-[15px] font-semibold font-['DM_Sans',sans-serif] border-none rounded-[10px] cursor-pointer flex items-center justify-center gap-[10px] transition-all duration-200 hover:bg-[#24a88f] hover:shadow-[0_4px_16px_rgba(43,191,164,0.35)] hover:-translate-y-px active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? "Sending..." : "Send Reset Link"}
                  {!mutation.isPending && <span className="text-[17px] leading-none">→</span>}
                </button>
              </form>
            </>
          )}

          <div className="mt-7">
            <Link to="/patient/login" className="text-sm text-[#8a93a0] no-underline inline-flex items-center gap-1.5 font-medium transition-colors duration-200 hover:text-[#1a2233]" onClick={reset}>
              <span className="text-[15px] leading-none flex items-center mb-1">←</span>
              Back to log in
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-7">
        <Link to="/privacy" className="text-[13px] text-[#8a93a0] no-underline transition-colors duration-200 hover:text-[#1a2233]">Privacy Policy</Link>
      </div>
    </div>
  );
};

export default PatientForgotPassword;
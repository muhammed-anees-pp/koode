import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { psychologistForgotPassword } from "../../../api/psychologist.api";
import { Link } from "react-router-dom";
import logo from "../../../assets/psychologist-logo.png";

const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
});

const PsychologistForgotPassword = () => {
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [backendError, setBackendError] = useState(null);
  const [backendSuccess, setBackendSuccess] = useState(null);

  const { register, handleSubmit, formState: { errors }, watch, reset } = useForm({
    resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: "" },
  });
  const emailValue = watch("email");

  const mutation = useMutation({
    mutationFn: (email) => psychologistForgotPassword(email),
    onSuccess: (data) => { setShowSuccessMessage(true); setBackendSuccess(data?.message || "Reset link sent successfully!"); setBackendError(null); },
    onError: (error) => { setBackendError(error?.response?.data?.message || "Failed to send reset link. Please try again."); setShowSuccessMessage(false); },
  });

  const onSubmit = (data) => { setShowSuccessMessage(false); setBackendError(null); setBackendSuccess(null); mutation.mutate(data.email); };

  return (
    <div className="min-h-screen bg-[#eef0f5] flex flex-col items-center justify-center p-5">
      {/* Card */}
      <div className="w-full max-w-[400px]">
        <div className="bg-white rounded-2xl p-8 shadow-[0_4px_24px_rgba(0,0,0,0.10)] animate-fade-in">
          {/* Logo */}
          <div className="text-center mb-6">
            <img src={logo} alt="Koode" className="h-12 w-auto block mx-auto scale-[1.6] origin-center mb-5" />
            {!showSuccessMessage && (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Recover Your Access</h2>
                <p className="text-gray-500 text-sm">Enter your registered email to receive a<br />password reset link.</p>
              </>
            )}
          </div>

          {backendError && !showSuccessMessage && (
            <div className="flex items-center gap-2 text-red-500 text-[13px] bg-red-50 border border-red-200 px-3 py-2 rounded-lg mb-4">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" stroke="#ef4444" strokeWidth="2" /><path d="M10 6v5M10 14v1" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" /></svg>
              <span>{backendError}</span>
            </div>
          )}

          {showSuccessMessage ? (
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="#10b981" strokeWidth="2" strokeLinecap="round" /><path d="M22 4L12 14.01l-3-3" stroke="#10b981" strokeWidth="2" strokeLinecap="round" /></svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">Check your email</h2>
              {backendSuccess && (
                <div className="flex items-center gap-2 justify-center text-emerald-600 text-sm bg-emerald-50 border border-emerald-200 px-4 py-3 rounded-xl">
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" stroke="#10b981" strokeWidth="2" /><path d="M6 10L9 13L14 7" stroke="#10b981" strokeWidth="2" strokeLinecap="round" /></svg>
                  <span>{backendSuccess} <strong className="text-gray-700">{emailValue}</strong></span>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  className={`w-full bg-white border ${errors.email ? "border-red-400" : "border-gray-200"} text-gray-900 text-[0.938rem] rounded-lg px-4 py-3 outline-none transition-all duration-200 placeholder:text-gray-400 focus:border-psycho-primary focus:shadow-[0_0_0_3px_rgba(17,136,216,0.12)] disabled:opacity-50`}
                  placeholder="doctor@clinic.com"
                  {...register("email")}
                  disabled={mutation.isPending}
                />
                {errors.email && <div className="text-red-500 text-[13px] mt-1">{errors.email.message}</div>}
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-psycho-primary text-white text-[0.938rem] font-semibold rounded-lg border-none cursor-pointer transition-all duration-200 hover:bg-psycho-hover disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          )}

          <div className="flex justify-center mt-6">
            <Link
              to="/psychologist/login"
              className="flex items-center gap-1.5 text-psycho-primary text-sm font-medium no-underline hover:text-psycho-hover transition-colors"
              onClick={reset}
            >
              <span>←</span> Return to Login
            </Link>
          </div>
        </div>
      </div>

      {/* Security badge */}
      <div className="mt-5 flex items-center gap-1.5 text-gray-400 text-xs">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        Secure Professional Portal
      </div>
    </div>
  );
};

export default PsychologistForgotPassword;
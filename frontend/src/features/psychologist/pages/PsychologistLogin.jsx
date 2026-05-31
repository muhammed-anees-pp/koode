import { useState } from "react";
import { Link } from "react-router-dom";
import { usePsychologistLoginMutation } from "../../../hooks/usePsychologistAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import psychologistLogo from "../../../assets/psychologist-logo.png";
import GoogleAuthButton from "../../../components/auth/GoogleAuthButton";

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

const pageCls = "min-h-screen bg-[#eef0f5] flex items-center justify-center p-5";
const cardCls = "bg-white rounded-2xl p-9 w-full max-w-[440px] shadow-[0_4px_24px_rgba(0,0,0,0.10)] animate-fade-in";
const labelCls = "block text-sm font-medium text-gray-700 mb-1.5";
const inputCls = (hasErr) =>
  `w-full bg-white border ${hasErr ? "border-red-400" : "border-gray-200"} text-gray-900 text-[0.938rem] rounded-lg px-4 py-3 outline-none transition-all duration-200 placeholder:text-gray-400 focus:border-psycho-primary focus:shadow-[0_0_0_3px_rgba(17,136,216,0.12)]`;
const inputWithEyeCls = (hasErr) =>
  `w-full bg-white border ${hasErr ? "border-red-400" : "border-gray-200"} text-gray-900 text-[0.938rem] rounded-lg px-4 py-3 pr-12 outline-none transition-all duration-200 placeholder:text-gray-400 focus:border-psycho-primary focus:shadow-[0_0_0_3px_rgba(17,136,216,0.12)]`;
const errorMsgCls = "text-red-500 text-[13px] mt-1";
const submitBtnCls = "w-full py-3.5 bg-psycho-primary text-white text-[0.938rem] font-semibold rounded-lg cursor-pointer border-none transition-all duration-200 hover:bg-psycho-hover disabled:opacity-60 disabled:cursor-not-allowed";

const EyeToggle = ({ show, onToggle }) => (
  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 bg-transparent border-none cursor-pointer hover:text-gray-600" onClick={onToggle} aria-label="Toggle">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      {show ? (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="1" y1="1" x2="23" y2="23" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </svg>
  </button>
);

const PsychologistLogin = () => {
  const { register, handleSubmit, setError, formState: { errors } } = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState("");
  const mutation = usePsychologistLoginMutation(setError, setLocalError);

  const onSubmit = (data) => { setLocalError(""); mutation.mutate(data); };

  return (
    <div className={pageCls}>
      <div className={cardCls}>
        <div className="text-center mb-7">
          <img src={psychologistLogo} alt="Koode" className="h-14 w-auto block mx-auto scale-[1.6] origin-center mb-5" />
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back, Counselor</h1>
          <p className="text-gray-500 text-sm">Access your workspace and patient consultations.</p>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label htmlFor="email" className={labelCls}>Email Address</label>
            <input type="email" id="email" placeholder="psychologist@clinic.com" {...register("email")} className={inputCls(!!errors.email)} />
            {errors.email && <p className={errorMsgCls}>{errors.email.message}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className={labelCls} style={{ marginBottom: 0 }}>Password</label>
              <Link to="/psychologist/forgot-password" className="text-[13px] text-psycho-primary no-underline font-medium hover:text-psycho-hover">Forgot Password?</Link>
            </div>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} id="password" placeholder="••••••••" {...register("password")} className={inputWithEyeCls(!!errors.password)} />
              <EyeToggle show={showPassword} onToggle={() => setShowPassword(!showPassword)} />
            </div>
            {errors.password && <p className={errorMsgCls}>{errors.password.message}</p>}
          </div>

          {localError && <p className={errorMsgCls}>{localError}</p>}

          <button type="submit" className={submitBtnCls} disabled={mutation.isPending}>
            {mutation.isPending ? "Logging In..." : "Secure Log In"}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">Or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <GoogleAuthButton
            mode="login"
            role="PSYCHOLOGIST"
          />
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Not registered yet?{" "}
          <Link to="/psychologist/signup" className="text-psycho-primary no-underline font-medium hover:text-psycho-hover">Join as a Psychologist</Link>
        </p>
      </div>
    </div>
  );
};

export default PsychologistLogin;

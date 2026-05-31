import { useState } from "react";
import { Link } from "react-router-dom";
import { usePatientLoginMutation } from "../../../hooks/usePatientAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import patientLogo from "../../../assets/patient-logo.png";
import PatientNavbar from "../../../components/patient/Navbar/PatientNavbar";
import PatientAuthFooter from "../../../components/patient/AuthFooter/PatientAuthFooter";
import GoogleAuthButton from "../../../components/auth/GoogleAuthButton";

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

const inputCls = "w-full px-4 py-4 text-[0.938rem] font-['DM_Sans',sans-serif] text-ui-900 bg-white border-[1.5px] border-ui-200 rounded-md2 transition-all duration-300 outline-none placeholder:text-ui-400 focus:border-patient-primary focus:shadow-[0_0_0_3px_rgba(26,190,170,0.1)] hover:border-ui-300";
const eyeBtnCls = "absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-ui-400 cursor-pointer p-2 flex items-center justify-center transition-all duration-300 rounded-sm2 hover:text-ui-500 hover:bg-ui-50";

const PatientLogin = () => {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState("");

  const mutation = usePatientLoginMutation(setError, setLocalError);

  const onSubmit = (data) => {
    setLocalError("");
    mutation.mutate(data);
  };

  return (
    <div className="font-['DM_Sans',sans-serif] bg-ui-50 text-ui-900 leading-relaxed min-h-screen flex flex-col box-border pt-[66px]">
      <PatientNavbar authLink={{ text: 'Sign Up', to: '/patient/signup' }} />

      <main className="flex-1 flex items-center justify-center px-6 py-12 animate-fade-in">
        <div className="bg-white rounded-lg2 shadow-card w-full max-w-[460px] px-10 py-7 transition-all duration-300 hover:shadow-card-hover">
          <div className="flex items-center justify-center scale-[1.3]">
            <img src={patientLogo} alt="Koode" style={{ height: "80px" }} />
          </div>

          <h1 className="font-outfit text-2xl font-bold text-ui-900 text-center mb-2 mt-0 tracking-tight">Welcome Back</h1>
          <p className="text-[0.938rem] text-ui-500 text-center mb-8">
            Please enter your details to access your secure space.
          </p>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-[0.625rem]">
              <label htmlFor="email" className="text-sm font-medium text-ui-900">Email Address</label>
              <input type="email" id="email" placeholder="you@example.com" className={inputCls} {...register("email")} />
              {errors.email && <p className="text-red-500 text-sm mt-1 mb-0">{errors.email.message}</p>}
            </div>

            <div className="flex flex-col gap-[0.625rem]">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="text-sm font-medium text-ui-900">Password</label>
                <Link to="/patient/forgot-password" className="text-[13px] text-patient-primary no-underline font-medium">Forgot password?</Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  placeholder="Enter your password"
                  className={`${inputCls} pr-12`}
                  {...register("password")}
                />
                <button type="button" className={eyeBtnCls} onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password visibility">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    {showPassword ? (
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
              </div>
              {errors.password && <p className="text-red-500 text-sm mt-1 mb-0">{errors.password.message}</p>}
            </div>

            {localError && <p className="text-red-500 text-sm mt-2">{localError}</p>}

            <button
              type="submit"
              className="w-full px-6 py-4 text-base font-semibold font-['DM_Sans',sans-serif] text-white bg-patient-primary border-none rounded-md2 cursor-pointer transition-all duration-300 mt-4 shadow-patient-sm hover:bg-patient-hover hover:shadow-patient-md hover:-translate-y-px active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Logging In..." : "Log In"}
            </button>

            <div className="flex items-center text-center my-4 text-ui-400 text-[0.813rem] font-medium before:content-[''] before:flex-1 before:border-b before:border-ui-200 after:content-[''] after:flex-1 after:border-b after:border-ui-200">
              <span className="px-4">OR</span>
            </div>

            <GoogleAuthButton
              mode="login"
              role="PATIENT"
            />
          </form>

          <p className="text-center text-sm text-ui-500 mt-6">
            Don't have an account?{" "}
            <Link to="/patient/signup" className="text-patient-primary no-underline font-semibold hover:text-patient-dark hover:underline transition-all duration-300">Sign up</Link>
          </p>
        </div>
      </main>

      <PatientAuthFooter />
    </div>
  );
};

export default PatientLogin;

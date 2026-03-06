import { useState } from "react";
import { Link } from "react-router-dom";
import { usePatientSignupMutation } from "../../../hooks/usePatientAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import patientLogo from "../../../assets/patient-logo.png";
import PatientNavbar from "../../../components/patient/Navbar/PatientNavbar";
import PatientAuthFooter from "../../../components/patient/AuthFooter/PatientAuthFooter";
import { useGooglePatientAuthMutation } from "../../../hooks/usePatientAuth";

const signupSchema = z
  .object({
    full_name: z.string().min(3, "Full name must be at least 3 characters").regex(/^[a-zA-Z\s]*$/, "Full name can only contain English letters and spaces"),
    email: z.string().email("Invalid email format"),
    password: z.string().min(8, "Password must be at least 8 characters").regex(/[a-zA-Z]/, "Password must contain at least one letter").regex(/[0-9]/, "Password must contain at least one number"),
    confirm_password: z.string(),
    agreeToTerms: z.boolean().refine((val) => val === true, { message: "You must agree to the Terms & Conditions" }),
  })
  .refine((data) => data.password === data.confirm_password, { path: ["confirm_password"], message: "Passwords do not match" });

const inputCls = "w-full px-4 py-4 text-[0.938rem] font-['DM_Sans',sans-serif] text-ui-900 bg-white border-[1.5px] border-ui-200 rounded-md2 transition-all duration-300 outline-none placeholder:text-ui-400 focus:border-patient-primary focus:shadow-[0_0_0_3px_rgba(26,190,170,0.1)] hover:border-ui-300";
const eyeBtnCls = "absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-ui-400 cursor-pointer p-2 flex items-center justify-center transition-all duration-300 rounded-sm2 hover:text-ui-500 hover:bg-ui-50";

const PatientSignup = () => {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: { full_name: "", email: "", password: "", confirm_password: "", agreeToTerms: false },
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState("");

  const mutation = usePatientSignupMutation(setError, setLocalError);
  const googleAuthMutation = useGooglePatientAuthMutation();

  const onSubmit = (data) => { setLocalError(""); mutation.mutate(data); };

  const handleGoogleSignUp = () => {
    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: async (response) => {
        try { await googleAuthMutation.mutateAsync({ token: response.credential, mode: "signup" }); }
        catch (err) { setLocalError("Google signup failed"); }
      },
    });
    window.google.accounts.id.prompt();
  };

  const EyeIcon = ({ show }) => (
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
  );

  return (
    <div className="font-['DM_Sans',sans-serif] bg-ui-50 text-ui-900 leading-relaxed min-h-screen flex flex-col box-border pt-[66px]">
      <PatientNavbar authLink={{ text: 'Login', to: '/patient/login' }} />

      <main className="flex-1 flex items-center justify-center px-6 py-12 animate-fade-in">
        <div className="bg-white rounded-lg2 shadow-card w-full max-w-[460px] px-10 py-7 transition-all duration-300 hover:shadow-card-hover">
          <div className="flex items-center justify-center scale-[1.3]">
            <img src={patientLogo} alt="Koode" style={{ height: "80px" }} />
          </div>

          <h1 className="font-outfit text-2xl font-bold text-ui-900 text-center mb-2 mt-0 tracking-tight">Create Account</h1>
          <p className="text-[0.938rem] text-ui-500 text-center mb-8">Join with koode to start your wellness journey.</p>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-[0.625rem]">
              <label htmlFor="full_name" className="text-sm font-medium text-ui-900">Full Name</label>
              <input type="text" id="full_name" placeholder="John Doe" className={inputCls} {...register("full_name")} />
              {errors.full_name && <p className="text-red-500 text-sm mt-1 mb-0">{errors.full_name.message}</p>}
            </div>

            <div className="flex flex-col gap-[0.625rem]">
              <label htmlFor="email" className="text-sm font-medium text-ui-900">Email Address</label>
              <input type="text" id="email" placeholder="you@example.com" className={inputCls} {...register("email")} />
              {errors.email && <p className="text-red-500 text-sm mt-1 mb-0">{errors.email.message}</p>}
            </div>

            <div className="flex flex-col gap-[0.625rem]">
              <label htmlFor="password" className="text-sm font-medium text-ui-900">Password</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} id="password" placeholder="Create a password" className={`${inputCls} pr-12`} {...register("password")} />
                <button type="button" className={eyeBtnCls} onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password visibility">
                  <EyeIcon show={showPassword} />
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-sm mt-1 mb-0">{errors.password.message}</p>}
            </div>

            <div className="flex flex-col gap-[0.625rem]">
              <label htmlFor="confirm_password" className="text-sm font-medium text-ui-900">Confirm Password</label>
              <div className="relative">
                <input type={showConfirmPassword ? "text" : "password"} id="confirm_password" placeholder="Confirm your password" className={`${inputCls} pr-12`} {...register("confirm_password")} />
                <button type="button" className={eyeBtnCls} onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label="Toggle password visibility">
                  <EyeIcon show={showConfirmPassword} />
                </button>
              </div>
              {errors.confirm_password && <p className="text-red-500 text-sm mt-1 mb-0">{errors.confirm_password.message}</p>}
            </div>

            <div className="mt-1">
              <label className="flex items-center gap-[0.625rem] cursor-pointer text-sm text-ui-500 select-none">
                <span className="relative flex-shrink-0">
                  <input type="checkbox" className="peer sr-only" {...register("agreeToTerms")} />
                  <span className="flex w-[18px] h-[18px] border-[1.5px] border-ui-200 rounded items-center justify-center transition-all duration-300 bg-white peer-checked:bg-patient-primary peer-checked:border-patient-primary">
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="1,4 3.5,6.5 9,1" />
                    </svg>
                  </span>
                </span>
                <span className="leading-[1.4]">
                  I agree to the{" "}
                  <a href="#terms" className="text-patient-primary no-underline font-medium hover:text-patient-dark hover:underline transition-all duration-300">Terms & conditions</a>
                </span>
              </label>
              {errors.agreeToTerms && <p className="text-red-500 text-sm mt-1 mb-0">{errors.agreeToTerms.message}</p>}
            </div>

            {localError && <p className="text-red-500 text-sm mt-2">{localError}</p>}

            <button
              type="submit"
              className="w-full px-6 py-4 text-base font-semibold font-['DM_Sans',sans-serif] text-white bg-patient-primary border-none rounded-md2 cursor-pointer transition-all duration-300 mt-4 shadow-patient-sm hover:bg-patient-hover hover:shadow-patient-md hover:-translate-y-px active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Signing Up..." : "Sign Up"}
            </button>

            <div className="flex items-center text-center my-4 text-ui-400 text-[0.813rem] font-medium before:content-[''] before:flex-1 before:border-b before:border-ui-200 after:content-[''] after:flex-1 after:border-b after:border-ui-200">
              <span className="px-4">OR</span>
            </div>

            <button
              type="button"
              className="w-full py-[0.875rem] px-6 text-[0.938rem] font-medium font-['DM_Sans',sans-serif] text-ui-900 bg-white border-[1.5px] border-ui-200 rounded-md2 cursor-pointer flex items-center justify-center gap-3 transition-all duration-300 hover:bg-ui-50 hover:border-ui-300 active:scale-[0.98]"
              onClick={handleGoogleSignUp}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Sign up with Google
            </button>
          </form>

          <p className="text-center text-sm text-ui-500 mt-6">
            Already have an account?{" "}
            <Link to="/patient/login" className="text-patient-primary no-underline font-semibold hover:text-patient-dark hover:underline transition-all duration-300">Login</Link>
          </p>
        </div>
      </main>

      <PatientAuthFooter />
    </div>
  );
};

export default PatientSignup;
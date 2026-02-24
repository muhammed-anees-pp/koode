import { Routes, Route, Navigate } from "react-router-dom";
import PatientSignup from "./pages/PatientSignup";
import PatientLogin from "./pages/PatientLogin";
import PatientHome from "./pages/PatientHome";
import PatientForgotPassword from "./pages/PatientForgotPassword";
import PatientResetPassword from "./pages/PatientResetPassword";
import VerificationSent from "./pages/VerificationSent";
import { useAuthStore } from "../../store/auth.store";


const PatientRoutes = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.role);

  return (
    <Routes>
      <Route
        path="signup"
        element={isAuthenticated && role === "PATIENT" ? <Navigate to="/patient/home" replace /> : <PatientSignup />}
      />
      <Route path="verification-sent" element={<VerificationSent />} />
      <Route path="verify-email" element={<VerificationSent />} />
      <Route path="verify-success" element={<VerificationSent />} />
      <Route path="verify-error" element={<VerificationSent />} />
      <Route
        path="login"
        element={isAuthenticated && role === "PATIENT" ? <Navigate to="/patient/home" replace /> : <PatientLogin />}
      />
      <Route 
        path="forgot-password"
        element={isAuthenticated && role === "PATIENT" ? <Navigate to="/patient/home" replace/> : <PatientForgotPassword />
        }
      />
      <Route
        path="reset-password"
        element={isAuthenticated && role === "PATIENT" ? <Navigate to="/patient/home" replace /> : <PatientResetPassword />}
      />
      <Route path="home" element={<PatientHome />} />
      <Route path="*" element={<Navigate to="login" />} />
    </Routes>
  );
};

export default PatientRoutes;
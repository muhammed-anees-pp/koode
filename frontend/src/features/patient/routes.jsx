import { Routes, Route, Navigate } from "react-router-dom";
import PatientSignup from "./pages/PatientSignup";
import PatientLogin from "./pages/PatientLogin";
import PatientHome from "./pages/PatientHome";
import VerificationSent from "./pages/VerificationSent";
import { useAuthStore } from "../../store/auth.store";

const PatientRoutes = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.role);

  return (
    <Routes>
      <Route path="signup" element={<PatientSignup />} />
      <Route path="verification-sent" element={<VerificationSent />} />
      <Route path="login" element={<PatientLogin />} />
      <Route path="verify-email" element={<VerificationSent />} />
      <Route path="verify-success" element={<VerificationSent />} />
      <Route path="verify-error" element={<VerificationSent />} />

      <Route
        path="home"
        element={
          isAuthenticated && role === "PATIENT"
            ? <PatientHome />
            : <Navigate to="/patient/login" />
        }
      />

      <Route path="*" element={<Navigate to="login" />} />
    </Routes>
  );
};

export default PatientRoutes;
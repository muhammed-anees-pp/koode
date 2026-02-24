import { Routes, Route, Navigate } from "react-router-dom";
import PsychologistSignup from "./pages/PsychologistSignup";
import PsychologistLogin from "./pages/PsychologistLogin";
import PsychologistHome from "./pages/PsychologistHome";
import PsychologistVerification from "./pages/PsychologistVerification";
import { useAuthStore } from "../../store/auth.store";

const PsychologistRoutes = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.role);

  return (
    <Routes>
      <Route
        path="signup"
        element={isAuthenticated && role === "PSYCHOLOGIST" ? (<Navigate to="/psychologist/home" replace />) : (<PsychologistSignup />)}
      />
      <Route path="verification-sent" element={<PsychologistVerification />} />
      <Route path="verify-email" element={<PsychologistVerification />} />
      <Route path="verify-success" element={<PsychologistVerification />} />
      <Route path="verify-error" element={<PsychologistVerification />} />
      <Route
        path="login"
        element={isAuthenticated && role === "PSYCHOLOGIST" ? (<Navigate to="/psychologist/home" replace />) : (<PsychologistLogin />)}
      />
      <Route
        path="home"
        element={
          isAuthenticated && role === "PSYCHOLOGIST" ? (<PsychologistHome />) : (<Navigate to="/psychologist/login" replace />)}
      />
      <Route path="*" element={<Navigate to="login" />} />
    </Routes>
  );
};

export default PsychologistRoutes;
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import PatientSignup from "./pages/PatientSignup";
import PatientLogin from "./pages/PatientLogin";
import PatientHome from "./pages/PatientHome";
import PatientForgotPassword from "./pages/PatientForgotPassword";
import PatientResetPassword from "./pages/PatientResetPassword";
import VerificationSent from "./pages/VerificationSent";
import PatientProfile from "./pages/PatientProfile";
import PatientPsychologistList from "./pages/PatientPsychologistList";
import PatientPsychologistDetail from "./pages/PatientPsychologistDetail";
import PatientPsychologistFinder from "./pages/PatientPsychologistFinder";
import PatientBooking from "./pages/PatientBooking";
import PatientAppointments from "./pages/PatientAppointments";
import PatientAppointmentDetail from "./pages/PatientAppointmentDetail";
import PatientMessages from "./pages/PatientMessages";
import PatientWallet from "./pages/PatientWallet";
import PatientPaymentConfirmed from "./pages/PatientPaymentConfirmed";
import PatientPaymentCancelled from "./pages/PatientPaymentCancelled";
import PatientChatbot from "./pages/PatientChatbot";
import PatientComplaints from "./pages/PatientComplaints";
import { useAuthStore } from "../../store/auth.store";
import ConsultationRoom from "../../components/consultation/ConsultationRoom";
import PatientChatbotWidget from "../../components/patient/Chatbot/PatientChatbotWidget";
import OAuthCallback from "../../components/auth/OAuthCallback";


const PatientRoutes = () => {
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.role);
  const isPatient = isAuthenticated && role === "PATIENT";
  const hideChatbotWidget =
    /^\/patient\/consultation\/[^/]+\/?$/.test(location.pathname) ||
    /^\/patient\/messages\/?$/.test(location.pathname);

  return (
    <>
      <Routes>
        <Route
          path="signup"
          element={isPatient ? <Navigate to="/patient/home" replace /> : <PatientSignup />}
        />
        <Route path="verification-sent" element={<VerificationSent />} />
        <Route path="oauth/callback" element={<OAuthCallback role="PATIENT" />} />
        <Route path="verify-email" element={<VerificationSent />} />
        <Route path="verify-success" element={<VerificationSent />} />
        <Route path="verify-error" element={<VerificationSent />} />
        <Route
          path="login"
          element={isPatient ? <Navigate to="/patient/home" replace /> : <PatientLogin />}
        />
        <Route
          path="forgot-password"
          element={isPatient ? <Navigate to="/patient/home" replace /> : <PatientForgotPassword />
          }
        />
        <Route
          path="reset-password"
          element={isPatient ? <Navigate to="/patient/home" replace /> : <PatientResetPassword />}
        />
        <Route path="home" element={<PatientHome />} />
        <Route
          path="profile"
          element={isPatient ? <PatientProfile /> : <Navigate to="/patient/login" replace />}
        />
        <Route path="psychologists" element={<PatientPsychologistList />} />
        <Route path="find-psychologist" element={<PatientPsychologistFinder />} />
        <Route path="services/:specialization" element={<PatientPsychologistList />} />
        <Route path="psychologists/:id" element={<PatientPsychologistDetail />} />
        <Route
          path="psychologists/:id/book"
          element={isPatient ? <PatientBooking /> : <Navigate to="/patient/login" replace />}
        />
        <Route
          path="appointments"
          element={isPatient ? <PatientAppointments /> : <Navigate to="/patient/login" replace />}
        />
        <Route
          path="appointments/:bookingId"
          element={isPatient ? <PatientAppointmentDetail /> : <Navigate to="/patient/login" replace />}
        />
        <Route
          path="consultation/:bookingId"
          element={isPatient ? <ConsultationRoom role="patient" /> : <Navigate to="/patient/login" replace />}
        />
        <Route
          path="messages"
          element={isPatient ? <PatientMessages /> : <Navigate to="/patient/login" replace />}
        />
        <Route
          path="chatbot"
          element={isPatient ? <PatientChatbot /> : <Navigate to="/patient/login" replace />}
        />
        <Route
          path="wallet"
          element={isPatient ? <PatientWallet /> : <Navigate to="/patient/login" replace />}
        />
        <Route
          path="complaints"
          element={isPatient ? <PatientComplaints /> : <Navigate to="/patient/login" replace />}
        />
        <Route
          path="payment-confirmed"
          element={isPatient ? <PatientPaymentConfirmed /> : <Navigate to="/patient/login" replace />}
        />
        <Route
          path="payment-cancelled"
          element={isPatient ? <PatientPaymentCancelled /> : <Navigate to="/patient/login" replace />}
        />
        <Route path="*" element={<Navigate to="home" />} />
      </Routes>
      {isPatient && !hideChatbotWidget && <PatientChatbotWidget />}
    </>
  );
};

export default PatientRoutes;

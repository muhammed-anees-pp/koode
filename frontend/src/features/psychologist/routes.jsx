import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import PsychologistSignup from "./pages/PsychologistSignup";
import PsychologistLogin from "./pages/PsychologistLogin";
import PsychologistHome from "./pages/PsychologistHome";
import PsychologistVerification from "./pages/PsychologistVerification";
import PsychologistForgotPassword from "./pages/PsychologistForgotPassword";
import PsychologistResetPassword from "./pages/PsychologistResetPassword";
import PsychologistApplication from "./pages/PsychologistApplication";
import PsychologistApprovalWaiting from "./pages/PsychologistApprovalWaiting";
import PsychologistInterviewRoom from "./pages/PsychologistInterviewRoom";
import PsychologistProfile from "./pages/PsychologistProfile";
import { useAuthStore } from "../../store/auth.store";
import { getApplicationStatus } from "../../api/psychologist.api";
import PsychologistAvailability from "./pages/PsychologistAvailability";
import PsychologistAppointments from "./pages/PsychologistAppointments";
import PsychologistMessages from "./pages/PsychologistMessages";
import PsychologistPatients from "./pages/PsychologistPatients";
import PsychologistWallet from "./pages/PsychologistWallet";
import PsychologistReviews from "./pages/PsychologistReviews";
import PsychologistComplaints from "./pages/PsychologistComplaints";
import ConsultationRoom from "../../components/consultation/ConsultationRoom";

const RouteLoader = () => (
  <div className="min-h-screen bg-[#eef0f5] flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <svg className="animate-spin text-psycho-primary" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
      <p className="text-sm text-gray-500">Loading…</p>
    </div>
  </div>
);

const useAppStatus = (isAuthenticated, role) => {
  const [appStatus, setAppStatus] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || role !== "PSYCHOLOGIST") return;
    getApplicationStatus()
      .then((data) => setAppStatus(data.status))
      .catch(() => setAppStatus(null))
      .finally(() => setChecking(false));
  }, [isAuthenticated, role]);

  return { appStatus, checking };
};

const PostLoginRedirect = ({ isAuthenticated, role }) => {
  const { appStatus, checking } = useAppStatus(isAuthenticated, role);

  if (!isAuthenticated || role !== "PSYCHOLOGIST") {
    return <Navigate to="/psychologist/login" replace />;
  }
  if (checking) return <RouteLoader />;

  if (appStatus === "APPROVED") return <Navigate to="/psychologist/home" replace />;
  if (appStatus === "NOT_SUBMITTED" || appStatus === null) return <Navigate to="/psychologist/application" replace />;
  return <Navigate to="/psychologist/approval-waiting" replace />;
};

const GuardedHome = ({ isAuthenticated, role }) => {
  const { appStatus, checking } = useAppStatus(isAuthenticated, role);

  if (!isAuthenticated || role !== "PSYCHOLOGIST") {
    return <Navigate to="/psychologist/login" replace />;
  }
  if (checking) return <RouteLoader />;

  if (appStatus === "APPROVED") return <PsychologistHome />;
  if (appStatus === "NOT_SUBMITTED" || appStatus === null) return <Navigate to="/psychologist/application" replace />;
  return <Navigate to="/psychologist/approval-waiting" replace />;
};

const GuardedApplication = ({ isAuthenticated, role }) => {
  const { appStatus, checking } = useAppStatus(isAuthenticated, role);

  if (!isAuthenticated || role !== "PSYCHOLOGIST") {
    return <Navigate to="/psychologist/login" replace />;
  }
  if (checking) return <RouteLoader />;

  if (appStatus === "APPROVED") return <Navigate to="/psychologist/home" replace />;
  if (appStatus !== "NOT_SUBMITTED" && appStatus !== null) return <Navigate to="/psychologist/approval-waiting" replace />;
  return <PsychologistApplication />;
};

const GuardedApprovalWaiting = ({ isAuthenticated, role }) => {
  const { appStatus, checking } = useAppStatus(isAuthenticated, role);

  if (!isAuthenticated || role !== "PSYCHOLOGIST") {
    return <Navigate to="/psychologist/login" replace />;
  }
  if (checking) return <RouteLoader />;

  if (appStatus === "APPROVED") return <Navigate to="/psychologist/home" replace />;
  if (appStatus === "NOT_SUBMITTED" || appStatus === null) return <Navigate to="/psychologist/application" replace />;
  return <PsychologistApprovalWaiting />;
};

const PsychologistRoutes = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.role);

  const authRedirect = isAuthenticated && role === "PSYCHOLOGIST";

  return (
    <Routes>
      <Route
        path="signup"
        element={authRedirect ? <PostLoginRedirect isAuthenticated={isAuthenticated} role={role} /> : <PsychologistSignup />}
      />
      <Route path="verification-sent" element={<PsychologistVerification />} />
      <Route path="verify-email" element={<PsychologistVerification />} />
      <Route path="verify-success" element={<PsychologistVerification />} />
      <Route path="verify-error" element={<PsychologistVerification />} />
      <Route
        path="login"
        element={authRedirect ? <PostLoginRedirect isAuthenticated={isAuthenticated} role={role} /> : <PsychologistLogin />}
      />
      <Route
        path="forgot-password"
        element={authRedirect ? <PostLoginRedirect isAuthenticated={isAuthenticated} role={role} /> : <PsychologistForgotPassword />}
      />
      <Route
        path="reset-password"
        element={authRedirect ? <PostLoginRedirect isAuthenticated={isAuthenticated} role={role} /> : <PsychologistResetPassword />}
      />
      <Route
        path="home"
        element={<GuardedHome isAuthenticated={isAuthenticated} role={role} />}
      />
      <Route
        path="application"
        element={<GuardedApplication isAuthenticated={isAuthenticated} role={role} />}
      />
      <Route
        path="approval-waiting"
        element={<GuardedApprovalWaiting isAuthenticated={isAuthenticated} role={role} />}
      />
      <Route
        path="interview/:interviewId"
        element={isAuthenticated && role === "PSYCHOLOGIST" ? <PsychologistInterviewRoom /> : <Navigate to="login" replace />}
      />
      <Route
        path="profile"
        element={
          isAuthenticated && role === "PSYCHOLOGIST"
            ? <PsychologistProfile />
            : <Navigate to="/psychologist/login" replace />
        }
      />
      <Route path="*" element={<Navigate to="login" />} />
      <Route
  path="availability"
  element={
    isAuthenticated && role === "PSYCHOLOGIST"
      ? <PsychologistAvailability />
      : <Navigate to="/psychologist/login" />
  }
/>
      <Route
        path="appointments"
        element={
          isAuthenticated && role === "PSYCHOLOGIST"
            ? <PsychologistAppointments />
            : <Navigate to="/psychologist/login" replace />
        }
      />
      <Route
        path="patients"
        element={
          isAuthenticated && role === "PSYCHOLOGIST"
            ? <PsychologistPatients />
            : <Navigate to="/psychologist/login" replace />
        }
      />
      <Route
        path="messages"
        element={
          isAuthenticated && role === "PSYCHOLOGIST"
            ? <PsychologistMessages />
          : <Navigate to="/psychologist/login" replace />
        }
      />
      <Route
        path="reviews"
        element={
          isAuthenticated && role === "PSYCHOLOGIST"
            ? <PsychologistReviews />
            : <Navigate to="/psychologist/login" replace />
        }
      />
      <Route
        path="complaints"
        element={
          isAuthenticated && role === "PSYCHOLOGIST"
            ? <PsychologistComplaints />
            : <Navigate to="/psychologist/login" replace />
        }
      />
      <Route
        path="consultation/:bookingId"
        element={
          isAuthenticated && role === "PSYCHOLOGIST"
            ? <ConsultationRoom role="psychologist" />
            : <Navigate to="/psychologist/login" replace />
        }
      />
      <Route
        path="wallet"
        element={
          isAuthenticated && role === "PSYCHOLOGIST"
            ? <PsychologistWallet />
            : <Navigate to="/psychologist/login" replace />
        }
      />
    </Routes>
  );
};

export default PsychologistRoutes;

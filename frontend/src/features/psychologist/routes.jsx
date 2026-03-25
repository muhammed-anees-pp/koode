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
import { useAuthStore } from "../../store/auth.store";
import { getApplicationStatus } from "../../api/psychologist.api";

const useAppStatus = (isAuthenticated, role) => {
  const [appStatus, setAppStatus] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || role !== "PSYCHOLOGIST") {
      setChecking(false);
      return;
    }
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
  if (checking) return null;

  if (appStatus === "APPROVED") return <Navigate to="/psychologist/home" replace />;
  if (appStatus === "NOT_SUBMITTED" || appStatus === null) return <Navigate to="/psychologist/application" replace />;
  return <Navigate to="/psychologist/approval-waiting" replace />;
};

const GuardedHome = ({ isAuthenticated, role }) => {
  const { appStatus, checking } = useAppStatus(isAuthenticated, role);

  if (!isAuthenticated || role !== "PSYCHOLOGIST") {
    return <Navigate to="/psychologist/login" replace />;
  }
  if (checking) return null;

  if (appStatus === "APPROVED") return <PsychologistHome />;
  if (appStatus === "NOT_SUBMITTED" || appStatus === null) return <Navigate to="/psychologist/application" replace />;
  return <Navigate to="/psychologist/approval-waiting" replace />;
};

const GuardedApplication = ({ isAuthenticated, role }) => {
  const { appStatus, checking } = useAppStatus(isAuthenticated, role);

  if (!isAuthenticated || role !== "PSYCHOLOGIST") {
    return <Navigate to="/psychologist/login" replace />;
  }
  if (checking) return null;

  if (appStatus === "APPROVED") return <Navigate to="/psychologist/home" replace />;
  if (appStatus !== "NOT_SUBMITTED" && appStatus !== null) return <Navigate to="/psychologist/approval-waiting" replace />;
  return <PsychologistApplication />;
};

const GuardedApprovalWaiting = ({ isAuthenticated, role }) => {
  const { appStatus, checking } = useAppStatus(isAuthenticated, role);

  if (!isAuthenticated || role !== "PSYCHOLOGIST") {
    return <Navigate to="/psychologist/login" replace />;
  }
  if (checking) return null;

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
      <Route path="*" element={<Navigate to="login" />} />
    </Routes>
  );
};

export default PsychologistRoutes;
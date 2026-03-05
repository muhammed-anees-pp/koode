import { Routes, Route, Navigate } from "react-router-dom";
import AdminLogin from "./pages/AdminLogin";
import Dashboard from "./pages/AdminDashboard";
import AdminForgotPassword from "./pages/AdminForgotPassword";
import AdminResetPassword from "./pages/AdminResetPassword";
import AdminPatientList from "./pages/AdminPatientList";
import { useAuthStore } from "../../store/auth.store";

const AdminRoutes = () => {
  const { isAuthenticated, role } = useAuthStore();

  return (
    <Routes>
      <Route
        path="login"
        element={isAuthenticated && role === "ADMIN" ? <Navigate to="/admin/dashboard" replace /> : <AdminLogin />}
      />
      <Route
        path="forgot-password"
        element={isAuthenticated && role === "ADMIN" ? <Navigate to="/admin/dashboard" replace /> : <AdminForgotPassword />}
      />
      <Route
        path="reset-password"
        element={isAuthenticated && role === "ADMIN" ? <Navigate to="/admin/dashboard" replace /> : <AdminResetPassword />}
      />

      <Route
        path="dashboard"
        element={
          isAuthenticated && role === "ADMIN" ? (
            <Dashboard />
          ) : (
            <Navigate to="/admin/login" />
          )
        }
      />

      <Route
        path="patients"
        element={
          isAuthenticated && role === "ADMIN" ? (
            <AdminPatientList />
          ) : (
            <Navigate to="/admin/login" />
          )
        }
      />

      <Route path="*" element={<Navigate to="login" />} />
    </Routes>
  );
};

export default AdminRoutes;

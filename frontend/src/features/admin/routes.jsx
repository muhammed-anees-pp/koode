import { Routes, Route } from "react-router-dom";
import AdminLogin from "./pages/AdminLogin";
import Dashboard from "./pages/AdminDashboard";
import { useAdminStore } from "../../store/admin.store";
import { Navigate } from "react-router-dom";


const AdminRoutes = () => {
  const isAuthenticated = useAdminStore((s) => s.isAuthenticated);

  return (
    <Routes>
      <Route path="login" element={<AdminLogin />} />
      <Route
        path="dashboard"
        element={
          isAuthenticated ? <Dashboard /> : <Navigate to="/admin/login" />
        }
      />
    </Routes>
  );
};

export default AdminRoutes;
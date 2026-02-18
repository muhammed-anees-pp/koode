import { Routes, Route, Navigate } from "react-router-dom";
import AdminRoutes from "../features/admin/routes";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/admin/*" element={<AdminRoutes />} />
      <Route path="*" element={<Navigate to="/admin/login" />} />
    </Routes>
  );
};

export default AppRoutes;

import { Routes, Route, Navigate } from "react-router-dom";
import AdminRoutes from "../features/admin/routes";
import PatientRoutes from "../features/patient/routes";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/admin/*" element={<AdminRoutes />} />
      <Route path="/patient/*" element={<PatientRoutes />} />
      <Route path="*" element={<Navigate to="/patient/login" />} />
    </Routes>
  );
};

export default AppRoutes;
import { Routes, Route, Navigate } from "react-router-dom";
import AdminRoutes from "../features/admin/routes";
import PatientRoutes from "../features/patient/routes";
import PsychologistRoutes from "../features/psychologist/routes"
import PatientHome from "../features/patient/pages/PatientHome";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<PatientHome />} />
      <Route path="/home" element={<PatientHome />} />
      <Route path="/admin/*" element={<AdminRoutes />} />
      <Route path="/patient/*" element={<PatientRoutes />} />
      <Route path="*" element={<Navigate to="/patient/login" />} />
      <Route path="/psychologist/*" element={<PsychologistRoutes />} />
    </Routes>
  );
};

export default AppRoutes;
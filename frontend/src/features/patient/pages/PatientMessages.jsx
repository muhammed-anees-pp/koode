import { Navigate } from "react-router-dom";
import ChatInbox from "../../../components/chat/ChatInbox";
import PatientNavbar from "../../../components/patient/Navbar/PatientNavbar";
import { usePatientSessionGuard } from "../../../hooks/usePatientSessionGuard";
import { useAuthStore } from "../../../store/auth.store";

const PatientMessages = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const role = useAuthStore((state) => state.role);
  usePatientSessionGuard();

  if (!isAuthenticated || role !== "PATIENT") {
    return <Navigate to="/patient/login" replace />;
  }

  return (
    
    <div className="flex h-screen flex-col overflow-hidden font-['DM_Sans',sans-serif] antialiased">
      
      <PatientNavbar />

      
      <main className="flex flex-1 flex-col overflow-hidden pt-[66px]">
        <ChatInbox variant="patient" />
      </main>
    </div>
  );
};

export default PatientMessages;

import { Navigate } from "react-router-dom";
import ChatInbox from "../../../components/chat/ChatInbox";
import PsychologistNavbar from "../../../components/psychologist/Navbar/PsychologistNavbar";
import PsychologistSidebar from "../../../components/psychologist/Sidebar/PsychologistSidebar";
import { usePsychologistSessionGuard } from "../../../hooks/usePsychologistSessionGuard";
import { useAuthStore } from "../../../store/auth.store";

const PsychologistMessages = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const role = useAuthStore((state) => state.role);
  usePsychologistSessionGuard();

  if (!isAuthenticated || role !== "PSYCHOLOGIST") {
    return <Navigate to="/psychologist/login" replace />;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white">
      <PsychologistNavbar />
      <div className="flex flex-1 overflow-hidden">
        <PsychologistSidebar />
        
        <div className="flex flex-1 flex-col overflow-hidden">
          <ChatInbox variant="psychologist" />
        </div>
      </div>
    </div>
  );
};

export default PsychologistMessages;

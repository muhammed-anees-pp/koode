import { useParams, useLocation, useNavigate } from "react-router-dom";
import AdminInterviewRoomModal from "./AdminInterviewRoomModal";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminInterviewRoom() {
    const { interviewId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { applicantName, scheduledAt } = location.state || {};

    const handleClose = () => {
        navigate("/admin/applications");
    };

    const handleInterviewEnded = () => {
        queryClient.invalidateQueries(["admin-applications"]);
        navigate("/admin/applications");
    };

    return (
        <AdminInterviewRoomModal
            interviewId={interviewId}
            applicantName={applicantName || "Candidate"}
            scheduledAt={scheduledAt}
            onClose={handleClose}
            onInterviewEnded={handleInterviewEnded}
        />
    );
}

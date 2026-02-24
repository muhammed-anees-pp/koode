import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../../store/auth.store";
import { psychologistLogout } from "../../../api/psychologist.api";
// import "../../../styles/psychologist/PsychologistHome.css";

const PsychologistHome = () => {
  const navigate = useNavigate();
  const { user, logout: clearAuth } = useAuthStore();

  const handleLogout = async () => {
    try {
      await psychologistLogout();
      clearAuth();
      navigate("/psychologist/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="psychologist-home">
      <header className="home-header">
        <h1>Welcome, {user?.full_name || "Psychologist"}!</h1>
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </header>
      <main className="home-content">
        <div className="welcome-card">
          <h2>Your Professional Dashboard</h2>
          <p>This is your psychologist dashboard. More features coming soon!</p>
        </div>
      </main>
    </div>
  );
};

export default PsychologistHome;
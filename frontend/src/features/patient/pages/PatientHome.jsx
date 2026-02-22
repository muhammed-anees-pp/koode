import { useQuery } from "@tanstack/react-query";
import { fetchPatientHome } from "../../../api/patient.api";
import PatientNavbar from "../../../components/patient/Navbar/PatientNavbar";
import PatientFooter from "../../../components/patient/Footer/PatientFooter";
import { useAuthStore } from "../../../store/auth.store";
import "../../../styles/patient/PatientHome.css";

export default function PatientHome() {
  const { patient, isAuthenticated } = useAuthStore();

  const { data } = useQuery({
    queryKey: ["patient-home"],
    queryFn: fetchPatientHome,
    enabled: isAuthenticated,
  });

  return (
    <div className="patient-layout">
      <PatientNavbar />

      <main className="patient-content">
        <div className="home-greeting">
          {isAuthenticated ? (
            <>
              <h1 className="greeting-title">
                Welcome, {patient?.full_name || data?.patient_email || 'Patient'}
              </h1>
              <p className="greeting-subtitle">This is your home page.</p>
            </>
          ) : (
            <>
              <h1 className="greeting-title">
                Welcome to Koode
              </h1>
              <p className="greeting-subtitle">Start your wellness journey with us.</p>
            </>
          )}
        </div>
      </main>

      <PatientFooter />
    </div>
  );
}
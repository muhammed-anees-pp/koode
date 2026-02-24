import { Link } from "react-router-dom";
import patientLogo from "../../../assets/patient-logo.png";
import "../../../styles/patient/PatientAuth.css";

export default function PatientAuthNavbar({ actionText, actionLink }) {
    return (
        <header className="header">
            <div className="header-content">
                <Link to="/" className="logo">
                    <img src={patientLogo} alt="Koode" style={{ height: '40px' }} />
                </Link>
                <nav className="nav">
                    <a href="#about">About Us</a>
                    <a href="#find">Find a Psychologist</a>
                    <a href="#help">Help Center</a>
                    {actionText && actionLink && (
                        <Link to={actionLink} className="login-link">{actionText}</Link>
                    )}
                </nav>
            </div>
        </header>
    );
}
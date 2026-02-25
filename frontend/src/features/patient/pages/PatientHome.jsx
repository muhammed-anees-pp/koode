import { useQuery } from "@tanstack/react-query";
import { fetchPatientHome } from "../../../api/patient.api";
import PatientNavbar from "../../../components/patient/Navbar/PatientNavbar";
import PatientFooter from "../../../components/patient/Footer/PatientFooter";
import { useAuthStore } from "../../../store/auth.store";
import { usePatientSessionGuard } from "../../../hooks/usePatientSessionGuard";
import { Link } from "react-router-dom";
import "../../../styles/patient/PatientHome.css";

/* Data */
const publicStats = [
  { value: "10K+", label: "Patients Helped" },
  { value: "500+", label: "Expert Therapists" },
  { value: "98%", label: "Satisfaction Rate" },
  { value: "24/7", label: "Always Available" },
];

const publicFeatures = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
    title: "Personalised Therapy",
    description:
      "Get matched with a licensed therapist who fits your needs, schedule, and communication style.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    title: "Flexible Scheduling",
    description:
      "Book, reschedule, or cancel sessions at your convenience — no phone calls, no hassle.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    title: "100% Confidential",
    description:
      "Your privacy is our priority. All sessions and messages are end-to-end encrypted.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
    title: "Video & Chat Sessions",
    description:
      "Attend therapy from anywhere — via video call or secure messaging, whichever you prefer.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    title: "Track Your Progress",
    description:
      "Monitor your mental wellness journey with mood tracking and session insights over time.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: "Expert Therapists",
    description:
      "All therapists are licensed, verified professionals — browse profiles and find your best match.",
  },
];

const dashboardTiles = [
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: "Find a Therapist",
    desc: "Browse verified, licensed therapists and find the right fit for you.",
    action: "Explore →",
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    title: "Book a Session",
    desc: "Schedule a therapy session at a time that works for you.",
    action: "Book Now →",
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    title: "My Journey",
    desc: "Track your mood, reflect on progress, and see how far you've come.",
    action: "View Progress →",
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    title: "Secure Chat",
    desc: "Message your therapist anytime between sessions, safely and privately.",
    action: "Open Chat →",
  },
];

/* Component */
export default function PatientHome() {
  const { user: authUser, isAuthenticated, role } = useAuthStore();
  const isPatient = isAuthenticated && role === "PATIENT";

  // Session guard only when logged in
  usePatientSessionGuard();

  const { data } = useQuery({
    queryKey: ["patient-home"],
    queryFn: fetchPatientHome,
    enabled: isPatient,
  });

  const fullName =
    authUser?.full_name ||
    data?.patient_email?.split("@")[0] ||
    "there";

  /* AUTHENTICATED: dashboard view */
  if (isPatient) {
    return (
      <div className="patient-layout">
        <PatientNavbar />
        <main className="ph-dashboard">
          <div className="ph-welcome">
            <h1 className="ph-welcome-title">
              Welcome back, <span className="ph-welcome-name">{fullName}</span> 👋
            </h1>
            <p className="ph-welcome-sub">What would you like to do today?</p>
          </div>

          <div className="ph-tiles-grid">
            {dashboardTiles.map((tile) => (
              <div className="ph-tile" key={tile.title}>
                <div className="ph-tile-icon">{tile.icon}</div>
                <div className="ph-tile-body">
                  <h3 className="ph-tile-title">{tile.title}</h3>
                  <p className="ph-tile-desc">{tile.desc}</p>
                  <span className="ph-tile-action">{tile.action}</span>
                </div>
              </div>
            ))}
          </div>
        </main>
        <PatientFooter />
      </div>
    );
  }

  /* UNAUTHENTICATED: public landing page */
  return (
    <div className="ph-landing">
      <PatientNavbar />

      {/* Hero */}
      <section className="ph-hero">
        <div className="ph-hero-orb ph-orb-1" />
        <div className="ph-hero-orb ph-orb-2" />
        <div className="ph-hero-content">
          <div className="ph-hero-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#1ABEAA" stroke="none"><circle cx="12" cy="12" r="10" /></svg>
            Your mental wellness starts here
          </div>
          <h1 className="ph-hero-title">
            Feel Better,<br />
            <span className="ph-hero-highlight">Live Better.</span>
          </h1>
          <p className="ph-hero-subtitle">
            Koode connects you with licensed therapists for personalised, confidential
            support — whenever and wherever you need it.
          </p>
          <div className="ph-hero-actions">
            <Link to="/patient/signup" className="ph-btn-primary">
              Get Started Free
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
            <Link to="/patient/login" className="ph-btn-secondary">
              Sign In
            </Link>
          </div>
        </div>

        {/* Stats row */}
        <div className="ph-stats-row">
          {publicStats.map((s) => (
            <div className="ph-stat-card" key={s.label}>
              <span className="ph-stat-value">{s.value}</span>
              <span className="ph-stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="ph-features-section">
        <div className="ph-section-header">
          <p className="ph-section-eyebrow">Why Koode</p>
          <h2 className="ph-section-title">Everything you need to thrive</h2>
          <p className="ph-section-subtitle">
            Simple, safe, and effective tools for your mental wellness journey.
          </p>
        </div>
        <div className="ph-features-grid">
          {publicFeatures.map((f) => (
            <div className="ph-feature-card" key={f.title}>
              <div className="ph-feature-icon">{f.icon}</div>
              <h3 className="ph-feature-title">{f.title}</h3>
              <p className="ph-feature-desc">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="ph-cta-section">
        <div className="ph-cta-inner">
          <h2 className="ph-cta-title">Ready to start your wellness journey?</h2>
          <p className="ph-cta-subtitle">
            Join thousands of people who've taken the first step with Koode.
          </p>
          <Link to="/patient/signup" className="ph-btn-cta">
            Create Free Account
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>
      </section>

      <PatientFooter />
    </div>
  );
}
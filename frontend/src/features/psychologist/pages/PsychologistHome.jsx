import React from 'react';
import PsychologistNavbar from '../../../components/psychologist/Navbar/PsychologistNavbar';
import { useAuthStore } from '../../../store/auth.store';
import '../../../styles/psychologist/PsychologistHome.css';

const stats = [
  { value: '10K+', label: 'Patients Helped' },
  { value: '500+', label: 'Licensed Therapists' },
  { value: '98%', label: 'Satisfaction Rate' },
  { value: '24/7', label: 'Always Available' },
];

const features = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: 'Manage Your Patients',
    description: 'View your full patient list, access session histories, and track progress — all in one organised dashboard.',
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
    title: 'Smart Scheduling',
    description: 'Effortlessly manage appointments, set your availability, and handle rescheduling without the back-and-forth.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    title: 'Secure Messaging',
    description: 'Communicate with patients through encrypted, HIPAA-compliant messaging built for clinical confidentiality.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    title: 'Progress Analytics',
    description: 'Gain insight into patient journeys with visual progress reports and outcome-tracking tools.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    title: 'Privacy First',
    description: 'Your practice data and patient records are protected with enterprise-grade security and encryption.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
    title: 'Telehealth Ready',
    description: 'Deliver seamless video sessions directly through the platform — no third-party tools required.',
  },
];

const PsychologistHome = () => {
  const { user: authUser } = useAuthStore();
  const firstName = authUser?.full_name?.split(' ')[0] || 'Doctor';

  return (
    <div className="psych-home">
      <PsychologistNavbar />

      {/* Hero */}
      <section className="psych-hero">
        <div className="psych-hero-bg-orb psych-orb-1" />
        <div className="psych-hero-bg-orb psych-orb-2" />
        <div className="psych-hero-content">
          <div className="psych-hero-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#1188d8" stroke="none"><circle cx="12" cy="12" r="10" /></svg>
            Welcome back, {firstName}
          </div>
          <h1 className="psych-hero-title">
            Your Practice,<br />
            <span className="psych-hero-highlight">Elevated.</span>
          </h1>
          <p className="psych-hero-subtitle">
            Koode gives you the tools to focus on what matters most — your patients.
            Manage sessions, track progress, and grow your practice from one place.
          </p>
          <div className="psych-hero-actions">
            <button className="psych-btn-primary">
              View Appointments
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
            <button className="psych-btn-secondary">My Patients</button>
          </div>
        </div>

        {/* Stats row */}
        <div className="psych-stats-row">
          {stats.map((s) => (
            <div className="psych-stat-card" key={s.label}>
              <span className="psych-stat-value">{s.value}</span>
              <span className="psych-stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="psych-features-section">
        <div className="psych-section-header">
          <p className="psych-section-eyebrow">Everything you need</p>
          <h2 className="psych-section-title">Built for Mental Health Professionals</h2>
          <p className="psych-section-subtitle">
            Every tool designed with clinicians in mind — secure, intuitive, and effective.
          </p>
        </div>
        <div className="psych-features-grid">
          {features.map((f) => (
            <div className="psych-feature-card" key={f.title}>
              <div className="psych-feature-icon">{f.icon}</div>
              <h3 className="psych-feature-title">{f.title}</h3>
              <p className="psych-feature-desc">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="psych-cta-section">
        <div className="psych-cta-inner">
          <h2 className="psych-cta-title">Ready to transform your practice?</h2>
          <p className="psych-cta-subtitle">
            Join hundreds of therapists already using Koode to deliver better care.
          </p>
          <button className="psych-btn-cta">
            Get Started Today
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </section>
    </div>
  );
};

export default PsychologistHome;
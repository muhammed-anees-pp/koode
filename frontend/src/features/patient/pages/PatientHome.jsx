import { useQuery } from "@tanstack/react-query";
import { fetchPatientHome } from "../../../api/patient.api";
import PatientNavbar from "../../../components/patient/Navbar/PatientNavbar";
import PatientFooter from "../../../components/patient/Footer/PatientFooter";
import { useAuthStore } from "../../../store/auth.store";
import { usePatientSessionGuard } from "../../../hooks/usePatientSessionGuard";
import { Link } from "react-router-dom";

const publicStats = [
  { value: "10K+", label: "Patients Helped" },
  { value: "500+", label: "Expert Therapists" },
  { value: "98%", label: "Satisfaction Rate" },
  { value: "24/7", label: "Always Available" },
];

const publicFeatures = [
  { icon: (<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>), title: "Personalised Therapy", description: "Get matched with a licensed therapist who fits your needs, schedule, and communication style." },
  { icon: (<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>), title: "Flexible Scheduling", description: "Book, reschedule, or cancel sessions at your convenience — no phone calls, no hassle." },
  { icon: (<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>), title: "100% Confidential", description: "Your privacy is our priority. All sessions and messages are end-to-end encrypted." },
  { icon: (<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>), title: "Video & Chat Sessions", description: "Attend therapy from anywhere — via video call or secure messaging, whichever you prefer." },
  { icon: (<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>), title: "Track Your Progress", description: "Monitor your mental wellness journey with mood tracking and session insights over time." },
  { icon: (<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>), title: "Expert Therapists", description: "All therapists are licensed, verified professionals — browse profiles and find your best match." },
];

const dashboardTiles = [
  { icon: (<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>), title: "Find a Therapist", desc: "Browse verified, licensed therapists and find the right fit for you.", action: "Explore →" },
  { icon: (<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>), title: "Book a Session", desc: "Schedule a therapy session at a time that works for you.", action: "Book Now →" },
  { icon: (<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>), title: "My Journey", desc: "Track your mood, reflect on progress, and see how far you've come.", action: "View Progress →" },
  { icon: (<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>), title: "Secure Chat", desc: "Message your therapist anytime between sessions, safely and privately.", action: "Open Chat →" },
];

export default function PatientHome() {
  const { user: authUser, isAuthenticated, role } = useAuthStore();
  const isPatient = isAuthenticated && role === "PATIENT";
  usePatientSessionGuard();

  const { data } = useQuery({ queryKey: ["patient-home"], queryFn: fetchPatientHome, enabled: isPatient });
  const fullName = authUser?.full_name || data?.patient_email?.split("@")[0] || "there";

  /* AUTHENTICATED: dashboard view */
  if (isPatient) {
    return (
      <div className="flex flex-col min-h-screen font-['DM_Sans',sans-serif] antialiased">
        <PatientNavbar />
        <main className="flex-1 max-w-[960px] mx-auto px-8 pt-[5.5rem] pb-12 w-full">
          {/* Welcome */}
          <div className="mb-10 animate-[phFadeUp_0.5s_ease_both]">
            <h1 className="font-outfit text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold text-[#0f172a] tracking-tight mb-2">
              Welcome back, <span className="text-gradient-patient">{fullName}</span> 👋
            </h1>
            <p className="text-base text-ui-500">What would you like to do today?</p>
          </div>

          {/* Tiles */}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-5 animate-[phFadeUp_0.5s_ease_0.1s_both]">
            {dashboardTiles.map((tile) => (
              <div key={tile.title} className="bg-white border border-ui-200 rounded-[16px] p-7 flex items-start gap-[1.1rem] cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(26,190,170,0.1)] hover:border-[rgba(26,190,170,0.3)]">
                <div className="w-[52px] h-[52px] flex-shrink-0 bg-gradient-to-br from-[rgba(26,190,170,0.08)] to-[rgba(20,160,144,0.1)] rounded-[13px] flex items-center justify-center text-patient-primary transition-all duration-200">
                  {tile.icon}
                </div>
                <div className="flex flex-col gap-1 min-w-0">
                  <h3 className="font-outfit text-base font-bold text-[#0f172a] tracking-tight">{tile.title}</h3>
                  <p className="text-[0.85rem] text-ui-500 leading-[1.55]">{tile.desc}</p>
                  <span className="text-[0.82rem] font-semibold text-patient-primary mt-1 transition-all duration-200">{tile.action}</span>
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
    <div className="flex flex-col min-h-screen font-['DM_Sans',sans-serif] antialiased">
      <PatientNavbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-36 pb-16 px-8 text-center bg-gradient-to-[160deg] from-[#f0fdf9] via-[#f8fafc] to-[#edfcf7]"
        style={{ background: "linear-gradient(160deg, #f0fdf9 0%, #f8fafc 60%, #edfcf7 100%)" }}>
        {/* Orbs */}
        <div className="absolute w-[500px] h-[500px] rounded-full pointer-events-none -top-[120px] -left-[100px] animate-[orbFloat_8s_ease-in-out_infinite_alternate]"
          style={{ background: "radial-gradient(circle, rgba(26,190,170,0.15) 0%, transparent 70%)", filter: "blur(80px)" }} />
        <div className="absolute w-[400px] h-[400px] rounded-full pointer-events-none -bottom-[80px] -right-[80px] animate-[orbFloat_10s_ease-in-out_infinite_alternate-reverse]"
          style={{ background: "radial-gradient(circle, rgba(20,160,144,0.12) 0%, transparent 70%)", filter: "blur(80px)" }} />

        <div className="relative z-10 max-w-[680px] mx-auto animate-[phFadeUp_0.7s_ease-out_both]">
          <div className="inline-flex items-center gap-1.5 bg-[rgba(26,190,170,0.1)] border border-[rgba(26,190,170,0.2)] text-patient-primary text-[13px] font-semibold px-[14px] py-1.5 rounded-[100px] mb-6">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#1ABEAA" stroke="none"><circle cx="12" cy="12" r="10" /></svg>
            Your mental wellness starts here
          </div>
          <h1 className="font-outfit text-[clamp(2.4rem,5vw,3.6rem)] font-extrabold leading-[1.1] text-[#0f172a] tracking-tight mb-5">
            Feel Better,<br />
            <span className="text-gradient-patient">Live Better.</span>
          </h1>
          <p className="text-[1.05rem] text-[#4b5563] leading-[1.75] max-w-[560px] mx-auto mb-9">
            Koode connects you with licensed therapists for personalised, confidential support — whenever and wherever you need it.
          </p>
          <div className="flex justify-center gap-4 flex-wrap mb-16">
            <Link to="/patient/signup" className="inline-flex items-center gap-2 bg-gradient-to-r from-patient-primary to-[#14a090] text-white border-none px-7 py-[0.875rem] rounded-[12px] text-[0.95rem] font-semibold no-underline cursor-pointer shadow-[0_4px_16px_rgba(26,190,170,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(26,190,170,0.45)]">
              Get Started Free
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
            </Link>
            <Link to="/patient/login" className="inline-flex items-center bg-white text-patient-primary border-[1.5px] border-patient-primary px-7 py-[0.875rem] rounded-[12px] text-[0.95rem] font-semibold no-underline cursor-pointer transition-all duration-200 hover:bg-[rgba(26,190,170,0.06)] hover:-translate-y-0.5">Sign In</Link>
          </div>
        </div>

        {/* Stats */}
        <div className="relative z-10 flex justify-center gap-5 flex-wrap max-w-[900px] mx-auto animate-[phFadeUp_0.7s_ease-out_0.15s_both]">
          {publicStats.map((s) => (
            <div key={s.label} className="bg-white border border-[#e2e8f0] rounded-[16px] px-8 py-5 flex flex-col items-center gap-1 min-w-[150px] shadow-[0_2px_12px_rgba(0,0,0,0.05)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(26,190,170,0.12)]">
              <span className="font-outfit text-[1.9rem] font-extrabold tracking-tight text-gradient-patient">{s.value}</span>
              <span className="text-[0.8rem] text-ui-500 font-medium text-center">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-8 max-w-[1200px] mx-auto w-full">
        <div className="text-center mb-12">
          <p className="text-[0.8rem] font-bold text-patient-primary uppercase tracking-[0.1em] mb-3">Why Koode</p>
          <h2 className="font-outfit text-[clamp(1.75rem,3.5vw,2.5rem)] font-extrabold text-[#0f172a] tracking-tight mb-[0.875rem]">Everything you need to thrive</h2>
          <p className="text-base text-ui-500 max-w-[480px] mx-auto leading-[1.7]">Simple, safe, and effective tools for your mental wellness journey.</p>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-6">
          {publicFeatures.map((f) => (
            <div key={f.title} className="bg-white border border-[#e8edf5] rounded-[18px] p-8 transition-all duration-[0.25s] hover:-translate-y-1.5 hover:shadow-[0_16px_40px_rgba(26,190,170,0.1)] hover:border-[rgba(26,190,170,0.25)]">
              <div className="w-14 h-14 bg-gradient-to-br from-[rgba(26,190,170,0.08)] to-[rgba(20,160,144,0.1)] rounded-[14px] flex items-center justify-center text-patient-primary mb-5 transition-all duration-[0.25s]">
                {f.icon}
              </div>
              <h3 className="font-outfit text-[1.05rem] font-bold text-[#0f172a] mb-2 tracking-tight">{f.title}</h3>
              <p className="text-[0.9rem] text-ui-500 leading-[1.7]">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-8 pb-20">
        <div className="max-w-[1160px] mx-auto bg-gradient-to-r from-patient-primary to-[#14a090] rounded-[24px] px-12 py-16 text-center relative overflow-hidden shadow-[0_20px_60px_rgba(26,190,170,0.3)]"
          style={{ background: "linear-gradient(135deg, #1ABEAA 0%, #14a090 100%)" }}>
          <div className="absolute -top-[60px] -right-[60px] w-[300px] h-[300px] bg-white/[0.08] rounded-full" />
          <div className="absolute -bottom-[80px] -left-[40px] w-[250px] h-[250px] bg-white/[0.06] rounded-full" />
          <h2 className="font-outfit text-[clamp(1.6rem,3vw,2.25rem)] font-extrabold text-white tracking-tight mb-[0.875rem] relative z-10">Ready to start your wellness journey?</h2>
          <p className="text-base text-white/85 mb-8 relative z-10">Join thousands of people who've taken the first step with Koode.</p>
          <Link to="/patient/signup" className="inline-flex items-center gap-2 bg-white text-patient-primary border-none px-8 py-[0.9rem] rounded-[12px] text-[0.95rem] font-bold no-underline cursor-pointer relative z-10 transition-all duration-200 shadow-[0_4px_16px_rgba(0,0,0,0.15)] hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(0,0,0,0.2)]">
            Create Free Account
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
          </Link>
        </div>
      </section>

      <PatientFooter />
    </div>
  );
}
import React from 'react';
import PsychologistNavbar from '../../../components/psychologist/Navbar/PsychologistNavbar';
import PsychologistSidebar from '../../../components/psychologist/Sidebar/PsychologistSidebar';
import { useAuthStore } from '../../../store/auth.store';
import { usePsychologistSessionGuard } from '../../../hooks/usePsychologistSessionGuard';

const stats = [
  { value: '10K+', label: 'Patients Helped' },
  { value: '500+', label: 'Licensed Psychologists' },
  { value: '98%', label: 'Satisfaction Rate' },
  { value: '24/7', label: 'Always Available' },
];

const features = [
  { icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>, title: 'Manage Your Patients', description: 'View your full patient list, access session histories, and track progress — all in one organised dashboard.' },
  { icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>, title: 'Smart Scheduling', description: 'Effortlessly manage appointments, set your availability, and handle rescheduling without the back-and-forth.' },
  { icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>, title: 'Secure Messaging', description: 'Communicate with patients through encrypted, HIPAA-compliant messaging built for clinical confidentiality.' },
  { icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>, title: 'Progress Analytics', description: 'Gain insight into patient journeys with visual progress reports and outcome-tracking tools.' },
  { icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>, title: 'Privacy First', description: 'Your practice data and patient records are protected with enterprise-grade security and encryption.' },
  { icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>, title: 'Telehealth Ready', description: 'Deliver seamless video sessions directly through the platform — no third-party tools required.' },
];

const PsychologistHome = () => {
  const { user: authUser } = useAuthStore();
  const firstName = authUser?.full_name?.split(' ')[0] || 'Doctor';
  usePsychologistSessionGuard();

  return (
    <div className="min-h-screen bg-[#eef0f5] text-gray-900 flex flex-col">
      
      <PsychologistNavbar />

      
      <div className="flex flex-1">
        
        <PsychologistSidebar />

        
        <main className="min-w-0 flex-1">
          
          <section className="relative pt-20 pb-16 px-6 overflow-hidden">
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-psycho-primary/5 rounded-full blur-[160px] pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-blue-200/30 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-[700px] mx-auto text-center relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-full text-sm text-psycho-primary font-medium mb-6">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="#1188d8"><circle cx="5" cy="5" r="5" /></svg>
                Welcome back, {firstName}
              </div>
              <h1 className="text-5xl font-bold text-gray-900 leading-[1.1] tracking-tight mb-5">
                Your Practice,<br />
                <span className="text-psycho-primary">Elevated.</span>
              </h1>
              <p className="text-gray-500 text-lg leading-relaxed mb-8 max-w-[520px] mx-auto">
                Koode gives you the tools to focus on what matters most — your patients.
                Manage sessions, track progress, and grow your practice from one place.
              </p>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <button className="flex items-center gap-2 px-7 py-3.5 bg-psycho-primary text-white font-semibold text-sm rounded-full border-none cursor-pointer transition-all hover:bg-psycho-hover shadow-[0_4px_16px_rgba(17,136,216,0.3)]">
                  View Appointments
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                </button>
                <button className="px-7 py-3.5 bg-white border border-gray-200 text-gray-700 font-medium text-sm rounded-full cursor-pointer transition-all hover:bg-gray-50 hover:border-gray-300 shadow-sm">
                  My Patients
                </button>
              </div>
            </div>

            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-[700px] mx-auto mt-14">
              {stats.map((s) => (
                <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-5 text-center shadow-sm hover:shadow-md hover:border-blue-100 transition-all">
                  <span className="text-2xl font-bold text-psycho-primary block">{s.value}</span>
                  <span className="text-gray-500 text-xs leading-tight mt-1 block">{s.label}</span>
                </div>
              ))}
            </div>
          </section>

          
          <section className="py-16 px-6">
            <div className="max-w-[1000px] mx-auto">
              <div className="text-center mb-12">
                <p className="text-psycho-primary text-sm font-semibold uppercase tracking-[0.12em] mb-3">Everything you need</p>
                <h2 className="text-3xl font-bold text-gray-900 mb-3">Built for Mental Health Professionals</h2>
                <p className="text-gray-500 text-base max-w-[480px] mx-auto">Every tool designed with clinicians in mind — secure, intuitive, and effective.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {features.map((f) => (
                  <div key={f.title} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm transition-all hover:shadow-md hover:border-blue-100 hover:-translate-y-0.5">
                    <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center mb-4 text-psycho-primary">{f.icon}</div>
                    <h3 className="text-base font-semibold text-gray-900 mb-2">{f.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{f.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          
          <section className="py-16 px-6">
            <div className="max-w-[700px] mx-auto text-center bg-white border border-blue-100 rounded-3xl px-10 py-14 shadow-sm">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Ready to transform your practice?</h2>
              <p className="text-gray-500 text-base mb-7">Join hundreds of psychologists already using Koode to deliver better care.</p>
              <button className="flex items-center gap-2 px-7 py-3.5 bg-psycho-primary text-white font-semibold text-sm rounded-full border-none cursor-pointer transition-all hover:bg-psycho-hover shadow-[0_4px_16px_rgba(17,136,216,0.3)] mx-auto">
                Get Started Today
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default PsychologistHome;

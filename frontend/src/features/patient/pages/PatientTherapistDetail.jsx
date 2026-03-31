import React, { useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchPatientTherapistDetail } from "../../../api/patient.api";
import PatientNavbar from "../../../components/patient/Navbar/PatientNavbar";
import PatientFooter from "../../../components/patient/Footer/PatientFooter";

const SectionTitle = ({ children }) => (
  <h3 className="font-outfit text-xl font-bold text-slate-900 mt-12 mb-6 tracking-tight">{children}</h3>
);

export default function PatientTherapistDetail() {
  const { id } = useParams();
  const { data: therapist, isLoading, isError } = useQuery({
    queryKey: ["patient-therapist-detail", id],
    queryFn: () => fetchPatientTherapistDetail(id),
    enabled: !!id,
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen font-['DM_Sans',sans-serif] antialiased">
        <PatientNavbar />
        <main className="flex-1 max-w-[1200px] w-full mx-auto px-6 md:px-12 pt-[8rem] pb-24">
          <div className="animate-pulse h-[600px] bg-slate-100 rounded-[32px] w-full" />
        </main>
      </div>
    );
  }

  if (isError || !therapist) {
    return (
      <div className="flex flex-col min-h-screen font-['DM_Sans',sans-serif] antialiased">
        <PatientNavbar />
        <main className="flex-1 max-w-[1200px] w-full mx-auto px-6 md:px-12 pt-[8rem] pb-24 text-center">
          <h2 className="text-2xl font-bold text-slate-800">Therapist not found</h2>
          <Link to="/patient/therapists" className="text-patient-primary hover:underline mt-4 inline-block">Back to directory</Link>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white font-['DM_Sans',sans-serif] antialiased">
      <PatientNavbar />

      <main className="flex-1 max-w-[1240px] w-full mx-auto px-6 md:px-12 pt-[7rem] pb-24 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12 items-start">
        

        <div className="w-full">

          <div className="bg-[#f0fdf9] rounded-[32px] p-8 md:p-10 relative overflow-hidden">

            <div className="flex flex-col md:flex-row gap-8 items-start mb-8 relative z-10">
              

              <div className="relative flex-shrink-0">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full p-1.5 border-2 border-patient-primary bg-white">
                  <div className="w-full h-full rounded-full overflow-hidden bg-slate-200">
                    {therapist.profile_picture ? (
                       <img src={therapist.profile_picture} alt={therapist.full_name} className="w-full h-full object-cover" />
                    ) : (
                       <div className="w-full h-full bg-patient-primary flex flex-col items-center justify-center text-white text-3xl font-bold">
                         {therapist.full_name?.charAt(0)}
                       </div>
                    )}
                  </div>
                </div>

                <div className="absolute bottom-4 right-4 w-4 h-4 rounded-full border-2 border-white bg-green-500" />
              </div>


              <div className="flex-1 pt-2">
                <h1 className="font-outfit text-2xl md:text-[2rem] font-extrabold text-[#0f172a] tracking-tight mb-2">
                  {therapist.full_name}
                </h1>
                <p className="text-patient-primary font-semibold text-sm mb-4">
                  {therapist.job_title || "Consultant Psychologist"}
                </p>
                
                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500 mb-6">
                  {therapist.highest_education && (
                    <div className="flex items-center gap-1.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                      {therapist.highest_education.toUpperCase()}
                    </div>
                  )}
                  {therapist.years_of_experience > 0 && (
                    <div className="flex items-center gap-1.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                      {therapist.years_of_experience * 1000}+ Hours of Therapy Experience
                    </div>
                  )}
                </div>


                <div className="bg-white rounded-[100px] p-2 pr-6 flex items-center gap-4 mb-6 shadow-sm border border-slate-100 max-w-[400px]">
                  <button onClick={togglePlay} className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-white transition-colors hover:bg-slate-800 flex-shrink-0">
                    {isPlaying ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    )}
                  </button>
                  <div className="flex-1 flex items-center gap-0.5 h-6">
                    {Array.from({ length: 40 }).map((_, i) => (
                      <div key={i} className="flex-1 rounded-full bg-slate-300" style={{ height: `${Math.max(20, Math.random() * 100)}%`, backgroundColor: isPlaying && i < 20 ? '#1ABEAA' : undefined }} />
                    ))}
                  </div>
                  <span className="text-[0.7rem] text-slate-400 font-bold tracking-widest leading-none">0:58</span>
                  {therapist.audio_intro && (
                    <audio ref={audioRef} src={therapist.audio_intro} onEnded={() => setIsPlaying(false)} className="hidden" />
                  )}
                </div>

              </div>
            </div>

            <p className="text-[0.95rem] text-slate-600 leading-[1.8] mb-8 relative z-10 max-w-[800px]">
              {therapist.about || "I am a dedicated professional providing a safe space to be heard and understood. I help people explore their thoughts and emotions in a respectful, non-judgmental way."}
            </p>

            <button className="bg-slate-900 text-white font-bold text-sm px-6 py-3 rounded-full flex items-center gap-2 hover:bg-slate-800 transition-colors relative z-10">
              Book Now
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
            

            <div className="absolute -top-32 -left-32 w-64 h-64 border-[40px] border-white/40 rounded-full" />
            <div className="absolute -bottom-32 -right-32 w-96 h-96 border-[40px] border-white/40 rounded-full" />
          </div>

          <SectionTitle>Concerns I can help with</SectionTitle>
          <div className="flex flex-wrap gap-3">
             {[
               { icon: "⚡", label: "I feel stressed all day", color: "bg-red-50 text-red-600 border-red-100" },
               { icon: "💝", label: "I have concerns about my sexuality", color: "bg-pink-50 text-pink-600 border-pink-100" },
               { icon: "💬", label: "My partner and I struggle to communicate", color: "bg-orange-50 text-orange-600 border-orange-100" },
               { icon: "🫂", label: "I find it hard to accept myself", color: "bg-rose-50 text-rose-600 border-rose-100" },
               { icon: "🌀", label: "My past still affects me in ways I can't explain", color: "bg-red-50 text-red-600 border-red-100" },
             ].map((concern, i) => (
                <div key={i} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[0.85rem] font-bold ${concern.color}`}>
                  <span className="text-sm">{concern.icon}</span>
                  {concern.label}
                </div>
             ))}
          </div>

          <SectionTitle>Issues I can help you with</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {therapist.specializations?.map((spec, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-patient-primary text-white flex items-center justify-center flex-shrink-0 shadow-md">
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                </div>
                <span className="text-[0.9rem] font-medium text-slate-700">{spec}</span>
              </div>
            ))}
            {(!therapist.specializations || therapist.specializations.length === 0) && (
              <div className="text-slate-500 italic text-sm">No specific issues listed.</div>
            )}
          </div>

          <SectionTitle>Therapeutic Focus</SectionTitle>
          <div className="bg-[#fffbeb] border border-[#fef3c7] rounded-2xl p-6">
             <p className="text-[0.95rem] text-[#92400e] font-medium">Cognitive Behavioural Therapy (CBT), Dialectical Behaviour Therapy (DBT), Person-Centred Therapy</p>
          </div>

          <SectionTitle>FAQs</SectionTitle>
          <div className="flex flex-col gap-4">
             {[
               { q: "What is a Psychosexual Counselor?", a: "A Psychosexual Counselor is a trained professional who helps individuals and couples explore concerns related to intimacy, relationships, sexual health, and overall well-being in a safe, confidential, and non-judgmental space." },
               { q: "What kind of concerns can I discuss?", a: "You can discuss anything that affects your well-being or relationships." },
               { q: "Will I be judged or shamed for what I share?", a: "No, therapy offers a safe, non-judgmental environment for you." }
             ].map((faq, i) => (
                <details key={i} className="group border border-slate-200 rounded-2xl bg-white overflow-hidden [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex items-center justify-between gap-4 p-5 font-bold text-[0.95rem] text-slate-800 cursor-pointer hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-patient-primary flex-shrink-0"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      {faq.q}
                    </div>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400 group-open:-rotate-180 transition-transform"><polyline points="6 9 12 15 18 9"/></svg>
                  </summary>
                  <p className="px-5 pb-5 pt-1 text-[0.9rem] text-slate-600 leading-relaxed border-t border-slate-100 mt-2 ml-4">
                    {faq.a}
                  </p>
                </details>
             ))}
          </div>

        </div>


        <div className="w-full flex md:sticky top-[120px] flex-col gap-6">
           

           <div className="bg-white border border-slate-200 shadow-xl shadow-slate-200/50 rounded-[32px] p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-outfit text-lg font-bold text-slate-900">Book Appointment</h3>
                <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">Available</span>
              </div>
              

              <div className="flex justify-between items-center mb-4">
                 <span className="text-sm font-bold text-slate-800">May 2024</span>
                 <div className="flex gap-2">
                   <button className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg></button>
                   <button className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg></button>
                 </div>
              </div>


              <div className="grid grid-cols-7 gap-y-3 mb-6">
                {['Mo','Tu','We','Th','Fr','Sa','Su'].map(d=><div key={d} className="text-center text-[10px] text-slate-400 font-bold uppercase">{d}</div>)}
                <div className="text-center text-xs text-slate-300">26</div>
                <div className="text-center text-xs text-slate-300">27</div>
                <div className="text-center text-xs text-slate-300">28</div>
                <div className="text-center text-xs text-slate-300">29</div>
                <div className="text-center text-xs text-slate-300">30</div>
                <div className="text-center text-xs font-bold text-white bg-patient-primary rounded-lg py-1 aspect-square flex items-center justify-center cursor-pointer shadow-md">01</div>
                <div className="text-center text-xs font-bold text-slate-700 py-1 aspect-square flex items-center justify-center cursor-pointer hover:bg-slate-100 rounded-lg">02</div>
                
                <div className="text-center text-xs font-bold text-patient-primary bg-patient-primary/10 py-1 aspect-square flex items-center justify-center cursor-pointer rounded-lg">03</div>
                <div className="text-center text-xs font-bold text-slate-700 py-1 aspect-square flex items-center justify-center cursor-pointer hover:bg-slate-100 rounded-lg">04</div>
                <div className="text-center text-xs font-bold text-slate-700 py-1 aspect-square flex items-center justify-center cursor-pointer hover:bg-slate-100 rounded-lg">05</div>
                <div className="text-center text-xs font-bold text-patient-primary bg-patient-primary/10 py-1 aspect-square flex items-center justify-center cursor-pointer rounded-lg">06</div>
                <div className="text-center text-xs font-bold text-slate-700 py-1 aspect-square flex items-center justify-center cursor-pointer hover:bg-slate-100 rounded-lg">07</div>
              </div>

              <div className="h-px bg-slate-100 mb-6" />

              <div className="flex justify-between items-center mb-6">
                 <span className="text-sm font-medium text-slate-600">Consultation Fee</span>
                 <div className="text-right">
                    <span className="text-xl font-extrabold text-slate-900">₹ {therapist.consultation_fee || "500"}</span>
                    <span className="text-xs text-slate-400 font-medium ml-1">/ session</span>
                 </div>
              </div>

              <div className="flex flex-col gap-3 mb-8 text-[0.8rem] text-slate-500 font-medium">
                <div className="flex items-center gap-2"><svg className="text-patient-primary" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> 50 Minutes Session</div>
                <div className="flex items-center gap-2"><svg className="text-patient-primary" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg> Online Video Consultation</div>
              </div>

              <button className="w-full bg-patient-primary hover:bg-patient-hover text-white font-bold text-[0.95rem] py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-colors shadow-patient-sm">
                Check availability
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </button>
           </div>


           <div>
             <h4 className="font-outfit font-bold text-slate-900 mb-3 ml-2">Languages</h4>
             <div className="flex gap-2">
               <span className="border border-slate-200 text-slate-700 text-sm font-medium py-1.5 px-4 rounded-full shadow-sm bg-white">🇬🇧 English</span>
               <span className="border border-slate-200 text-slate-700 text-sm font-medium py-1.5 px-4 rounded-full shadow-sm bg-white">🇮🇳 Malayalam</span>
             </div>
           </div>



           <div className="bg-[#1f2937] rounded-[24px] p-6 text-white mt-4 relative overflow-hidden shadow-xl shadow-slate-900/20">
              <h4 className="font-bold text-base mb-2">Need Help?</h4>
              <p className="text-slate-300 text-[0.85rem] leading-relaxed mb-6">Our support team is available 24/7 to assist you with booking.</p>
              <button className="text-[0.85rem] font-bold text-white hover:text-slate-200 transition-colors inline-block border-b border-white/30 pb-0.5">Chat with us</button>
              

              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full" />
           </div>

        </div>

      </main>
      <PatientFooter />
    </div>
  );
}

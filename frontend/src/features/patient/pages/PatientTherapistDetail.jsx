import React, { useMemo, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchPatientTherapistDetail, getPsychologistSlots } from "../../../api/patient.api";
import PatientNavbar from "../../../components/patient/Navbar/PatientNavbar";
import PatientFooter from "../../../components/patient/Footer/PatientFooter";
import { Stars } from "../../../components/patient/ReviewModal";
import {
  calendarDateToISO,
  formatIndiaDate,
  formatIndiaTime,
  getIndiaTodayISO,
  isoToCalendarDate,
} from "../../../utils/indiaDateTime";

const SectionTitle = ({ children }) => (
  <h3 className="font-outfit text-lg sm:text-xl font-bold text-slate-900 mt-10 sm:mt-12 mb-5 tracking-tight">{children}</h3>
);

const formatRating = (value) => {
  if (value == null) return "New";
  return Number(value).toFixed(1);
};

const INITIAL_REVIEW_COUNT = 3;

const specializationIconVariants = [
  (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" />
    </svg>
  ),
  (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
    </svg>
  ),
  (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s-7-4.35-7-10a7 7 0 0 1 14 0c0 5.65-7 10-7 10z" />
      <path d="M9 10.5h6" />
      <path d="M12 7.5v6" />
    </svg>
  ),
];

export default function PatientTherapistDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const bookingPanelRef = useRef(null);
  const { data: therapist, isLoading, isError } = useQuery({
    queryKey: ["patient-therapist-detail", id],
    queryFn: () => fetchPatientTherapistDetail(id),
    enabled: !!id,
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [hasCheckedAvailability, setHasCheckedAvailability] = useState(false);
  const [bookingMessage, setBookingMessage] = useState({
    type: "",
    text: "",
  });
  const [showAllReviews, setShowAllReviews] = useState(false);

  const todayIso = useMemo(() => getIndiaTodayISO(), []);
  const today = useMemo(() => isoToCalendarDate(todayIso), [todayIso]);
  const waveformBars = useMemo(
    () =>
      Array.from({ length: 40 }, () => Math.max(20, Math.random() * 100)),
    []
  );

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleBack = () => {
    if (window.history.state?.idx > 0) {
      navigate(-1);
      return;
    }
    navigate("/patient/therapists");
  };

  const fetchSlots = async () => {
    if (!selectedDate) {
      setBookingMessage({
        type: "error",
        text: "Select a date before checking availability.",
      });
      return;
    }

    setIsLoadingSlots(true);
    setHasCheckedAvailability(true);
    setBookingMessage({ type: "", text: "" });
    try {
      const data = await getPsychologistSlots(id, selectedDate);
      const matchingAvailability = data.find((entry) => entry.date === selectedDate);
      setSlots((matchingAvailability?.slots ?? []).filter((slot) => !slot.is_booked));
    } catch (error) {
      console.error("Error fetching slots:", error);
      setBookingMessage({
        type: "error",
        text: "Unable to load slots for this date.",
      });
      setSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const getCurrentMonthDays = () => {
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); 
    
    const days = [];
    
    const adjustedStart = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;
    for (let i = 0; i < adjustedStart; i++) {
      days.push(null);
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const isDateSelected = (date) => {
    return selectedDate === calendarDateToISO(date);
  };

  const handleDateSelect = (date) => {
    const dateString = calendarDateToISO(date);
    setSelectedDate(dateString);
    setSlots([]);
    setHasCheckedAvailability(false);
    setBookingMessage({ type: "", text: "" });
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentMonth = monthNames[today.getMonth()];
  const currentYear = today.getFullYear();
  const monthDays = getCurrentMonthDays();
  const ratingSummary = therapist?.ratings || {};
  const averageRating = ratingSummary.average_rating;
  const visibleReviews = ratingSummary.reviews || [];
  const displayedReviews = showAllReviews
    ? visibleReviews
    : visibleReviews.slice(0, INITIAL_REVIEW_COUNT);
  const hasMoreReviews = visibleReviews.length > INITIAL_REVIEW_COUNT;
  const specializationDetails = therapist?.specialization_details?.length
    ? therapist.specialization_details
    : (therapist?.specializations || []).map((name) => ({ name, description: "" }));
  const focusedOnItems = specializationDetails.filter((item) => item.description?.trim());

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

      <main className="flex-1 max-w-[1240px] w-full mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 pt-[6.5rem] sm:pt-[7rem] pb-16 sm:pb-24 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_400px] gap-8 xl:gap-12 items-start">
        <div className="lg:col-span-2">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-patient-primary/40 hover:bg-patient-light hover:text-patient-primary"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>
        </div>
        
        <div className="w-full">

          <div className="relative overflow-hidden rounded-[28px] border border-patient-primary/10 bg-gradient-to-br from-[#f0fdf9] via-white to-[#e8fbf7] p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8 md:p-10">

            <div className="relative z-10 mb-8 flex flex-col items-start gap-6 md:flex-row md:gap-8">
              
              <div className="relative flex-shrink-0 self-center md:self-start">
                <div className="h-32 w-32 rounded-full border-2 border-patient-primary bg-white p-1.5 shadow-xl shadow-patient-primary/10 md:h-40 md:w-40">
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

              <div className="min-w-0 flex-1 pt-1 text-center md:text-left">
                <h1 className="font-outfit text-2xl sm:text-3xl md:text-[2.15rem] font-extrabold text-[#0f172a] tracking-tight mb-2 leading-tight">
                  {therapist.full_name}
                </h1>
                <p className="text-patient-primary font-semibold text-sm mb-4">
                  {therapist.job_title || "Consultant Psychologist"}
                </p>

                <div className="mb-4 flex flex-wrap items-center justify-center gap-2 md:justify-start">
                  {averageRating != null ? (
                    <div className="inline-flex items-center gap-2 rounded-full border border-amber-100 bg-white/90 px-3.5 py-2 shadow-sm">
                      <Stars value={Math.round(Number(averageRating))} readOnly size={18} />
                      <span className="text-sm font-extrabold text-slate-900">{formatRating(averageRating)}</span>
                    </div>
                  ) : (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500 shadow-sm border border-slate-100">
                      No ratings yet
                    </span>
                  )}
                </div>
                
                <div className="mb-6 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-slate-500 md:justify-start">
                  {therapist.highest_education && (
                    <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/70 px-3 py-1.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                      {therapist.highest_education.toUpperCase()}
                    </div>
                  )}
                  {therapist.years_of_experience > 0 && (
                    <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/70 px-3 py-1.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                      {therapist.years_of_experience * 1000}+ Hours of Therapy Experience
                    </div>
                  )}
                </div>

                <div className="mx-auto mb-6 flex w-full max-w-[440px] items-center gap-3 rounded-[100px] border border-slate-100 bg-white p-2 pr-4 shadow-sm md:mx-0">
                  <button onClick={togglePlay} className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-white transition-colors hover:bg-slate-800 flex-shrink-0">
                    {isPlaying ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    )}
                  </button>
                  <div className="flex-1 flex items-center gap-0.5 h-6">
                    {waveformBars.map((height, i) => (
                      <div key={i} className="flex-1 rounded-full bg-slate-300" style={{ height: `${height}%`, backgroundColor: isPlaying && i < 20 ? '#1ABEAA' : undefined }} />
                    ))}
                  </div>
                  <span className="hidden text-[0.7rem] text-slate-400 font-bold tracking-widest leading-none sm:inline">0:58</span>
                  {therapist.audio_intro && (
                    <audio ref={audioRef} src={therapist.audio_intro} onEnded={() => setIsPlaying(false)} className="hidden" />
                  )}
                </div>
              </div>
            </div>

            <p className="text-[0.95rem] text-slate-600 leading-[1.8] mb-8 relative z-10 max-w-[820px]">
              {therapist.about || "I am a dedicated professional providing a safe space to be heard and understood. I help people explore their thoughts and emotions in a respectful, non-judgmental way."}
            </p>

            <button
              onClick={() => navigate(`/patient/therapists/${id}/book`)}
              className="relative z-10 flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800 sm:w-auto"
            >
              Book Now
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
            
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-patient-primary/30 to-transparent" />
          </div>

          <SectionTitle>Specializations</SectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {specializationDetails.map((spec, i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-patient-primary text-white shadow-patient-sm">
                  {specializationIconVariants[i % specializationIconVariants.length]}
                </div>
                <span className="text-[0.9rem] font-medium text-slate-700">{spec.name}</span>
              </div>
            ))}
            {specializationDetails.length === 0 && (
              <div className="text-slate-500 italic text-sm">No specializations listed.</div>
            )}
          </div>

          <SectionTitle>Focused on</SectionTitle>
          {focusedOnItems.length > 0 ? (
            <div className="rounded-2xl border border-patient-primary/15 bg-[#f0fdf9] p-5 shadow-sm">
              <ul className="space-y-3">
              {focusedOnItems.map((item, i) => (
                <li key={item.name} className="flex gap-3 text-sm leading-6 text-slate-600">
                  <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white text-patient-primary shadow-sm">
                    <span className="scale-75">
                      {specializationIconVariants[i % specializationIconVariants.length]}
                    </span>
                  </span>
                  <span>{item.description}</span>
                </li>
              ))}
              </ul>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-500">
              No focus descriptions listed.
            </div>
          )}

          <SectionTitle>Reviews</SectionTitle>
          {averageRating != null ? (
            <div className="mb-5 flex flex-col gap-3 rounded-3xl border border-patient-primary/15 bg-[#f0fdf9] px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-patient-dark">Overall rating</p>
                <div className="mt-2 flex items-center gap-2">
                  <Stars value={Math.round(Number(averageRating))} readOnly size={21} />
                  <span className="text-2xl font-extrabold text-slate-900">{formatRating(averageRating)}</span>
                </div>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm">
                Patient feedback
              </div>
            </div>
          ) : null}
          {visibleReviews.length > 0 ? (
            <div>
              <div className="grid gap-4">
                {displayedReviews.map((item) => (
                  <article key={item.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-patient-primary/30 hover:shadow-[0_14px_35px_rgba(15,23,42,0.08)] sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{item.patient_name}</p>
                      </div>
                      <div className="rounded-full bg-amber-50 px-3 py-1">
                        <Stars value={item.rating} readOnly size={17} />
                      </div>
                    </div>
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">{item.review}</p>
                  </article>
                ))}
              </div>
              {hasMoreReviews ? (
                <button
                  type="button"
                  onClick={() => setShowAllReviews((current) => !current)}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full border border-patient-primary/30 bg-white px-5 py-3 text-sm font-bold text-patient-dark transition-colors hover:bg-patient-light sm:w-auto"
                >
                  {showAllReviews ? "Show fewer reviews" : "More reviews"}
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className={`transition-transform ${showAllReviews ? "rotate-180" : ""}`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              ) : null}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-sm text-slate-500">
              No written reviews yet.
            </div>
          )}

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

        
        <div ref={bookingPanelRef} className="w-full flex lg:sticky top-[120px] flex-col gap-6">
           
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60 sm:p-7">
            <div className="flex justify-between items-center mb-6 gap-3">
              <h3 className="font-outfit text-lg font-bold text-slate-900">Book Appointment</h3>
              <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">Available</span>
            </div>
            
            
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-bold text-slate-800">{currentMonth} {currentYear}</span>
              </div>

              <div className="grid grid-cols-7 gap-1.5 mb-6 sm:gap-2">
                {['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => (
                  <div key={d} className="text-center text-[10px] text-slate-400 font-bold uppercase">{d}</div>
                ))}
                {monthDays.map((date, index) => (
                  date ? (
                    <button
                      key={index}
                      onClick={() => handleDateSelect(date)}
                      className={`text-center text-xs font-bold aspect-square flex items-center justify-center rounded-xl transition-all ${
                        isDateSelected(date)
                          ? 'bg-patient-primary text-white shadow-md'
                          : date < today
                          ? 'text-slate-300 cursor-not-allowed'
                          : 'text-slate-700 hover:bg-slate-100 cursor-pointer'
                      }`}
                      disabled={date < today}
                    >
                      {date.getDate()}
                    </button>
                  ) : (
                    <div key={index} className="text-center text-xs py-1 aspect-square"></div>
                  )
                ))}
              </div>
            </div>

            
            <button 
              onClick={fetchSlots}
              disabled={!selectedDate || isLoadingSlots}
              className="w-full bg-patient-primary hover:bg-patient-hover text-white font-bold text-[0.95rem] py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-colors shadow-patient-sm disabled:opacity-50 disabled:cursor-not-allowed mb-6"
            >
              {isLoadingSlots ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading slots...
                </>
              ) : (
                <>
                  Check availability
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </>
              )}
            </button>

            {selectedDate ? (
              <div className="mb-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Selected date:{" "}
                <span className="font-semibold text-slate-900">
                  {formatIndiaDate(selectedDate)}
                </span>
              </div>
            ) : null}

            {bookingMessage.text ? (
              <div
                className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-medium ${
                  bookingMessage.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {bookingMessage.text}
              </div>
            ) : null}

            
            {isLoadingSlots ? (
              <div className="mt-4">
                <h4 className="mb-3 text-sm font-bold text-slate-800">Available Slots</h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-[66px] animate-pulse rounded-xl bg-slate-100" />
                  ))}
                </div>
              </div>
            ) : null}

            {!isLoadingSlots && slots.length > 0 && (
              <div className="mt-4">
                <h4 className="mb-3 text-sm font-bold text-slate-800">Available Slots</h4>
                <div className="grid max-h-[300px] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  {slots.map((slot) => (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() =>
                        navigate(
                          `/patient/therapists/${id}/book?date=${selectedDate}&slot=${slot.id}`
                        )
                      }
                      className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-patient-primary hover:bg-patient-light hover:text-patient-primary"
                    >
                      <div>{formatIndiaTime(slot.start_time)}</div>
                      <div className="mt-0.5 text-xs font-medium opacity-80">
                        to {formatIndiaTime(slot.end_time)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedDate && hasCheckedAvailability && !isLoadingSlots && slots.length === 0 && (
              <div className="text-center py-4 text-slate-500 text-sm">
                No slots available for this date
              </div>
            )}

            <div className="h-px bg-slate-100 my-6" />

            <div className="flex justify-between items-center mb-6">
              <span className="text-sm font-medium text-slate-600">Consultation Fee</span>
              <div className="text-right">
                <span className="text-xl font-extrabold text-slate-900">₹ {therapist.consultation_fee || "500"}</span>
                <span className="text-xs text-slate-400 font-medium ml-1">/ session</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 mb-8 text-[0.8rem] text-slate-500 font-medium">
              <div className="flex items-center gap-2">
                <svg className="text-patient-primary" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                50 Minutes Session
              </div>
              <div className="flex items-center gap-2">
                <svg className="text-patient-primary" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>
                Online Video Consultation
              </div>
            </div>
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

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { fetchPatientHome, fetchPatientPsychologists } from "../../../api/patient.api";
import PatientNavbar from "../../../components/patient/Navbar/PatientNavbar";
import PatientFooter from "../../../components/patient/Footer/PatientFooter";
import { useAuthStore } from "../../../store/auth.store";
import { usePatientSessionGuard } from "../../../hooks/usePatientSessionGuard";
import { formatIndiaDate, formatIndiaDateTime, formatIndiaTime } from "../../../utils/indiaDateTime";

const quickActions = [
  { title: "Find Therapist", desc: "Match with AI based on your needs", to: "/patient/find-psychologist", badge: "New AI", color: "violet", icon: "spark" },
  { title: "Appointments", desc: "See calendar", to: "/patient/appointments", color: "blue", icon: "calendar" },
  { title: "Wallet", desc: "Manage balance", to: "/patient/wallet", color: "green", icon: "wallet" },
];

const publicSteps = [
  { icon: "spark", title: "Find your match", text: "Answer a few questions and get guided toward therapists who fit your concern and comfort." },
  { icon: "calendar", title: "Choose a slot", text: "Browse verified psychologists and book a private session at a time that works for you." },
  { icon: "message", title: "Begin with support", text: "After booking, your appointment, messages, and care history stay together in Koode." },
];

const publicHighlights = [
  { value: "Verified", label: "psychologists" },
  { value: "Private", label: "online sessions" },
  { value: "Simple", label: "booking flow" },
];

const BAR_HEIGHTS = [
  34, 58, 42, 76, 52, 88, 46, 68, 38, 82, 56, 94, 48, 72, 44, 86, 60, 40,
  78, 50, 92, 62, 36, 74, 54, 84, 46, 66, 90, 52, 70, 44, 80, 58, 96, 48,
  64, 42, 76, 56, 88, 46,
];

const faqCards = [
  {
    icon: "target",
    title: "What should I expect from my first therapy session?",
    points: [
      "A welcoming introduction to build rapport with your therapist.",
      "An opportunity to share your concerns, experiences, and goals.",
      "A collaborative space to set expectations and frequency of sessions.",
      "A clear next step for your therapy journey, designed just for you.",
    ],
  },
  {
    icon: "calendar",
    title: "How frequently should I attend therapy sessions?",
    points: [
      "It depends on the nature of your concerns and personal goals.",
      "Your therapist will suggest a frequency that best suits your needs.",
      "Weekly sessions are common to maintain continuity and progress.",
      "Flexibility is possible based on your comfort and schedule.",
    ],
  },
  {
    icon: "message",
    title: "How do I know which therapist is right for me?",
    points: [
      "Look for experience with concerns similar to yours.",
      "Review their specialization, communication style, and availability.",
      "A first session can help you decide whether the fit feels supportive.",
      "You can choose another therapist if your needs change.",
    ],
  },
  {
    icon: "spark",
    title: "Can online therapy be effective?",
    points: [
      "Many people find online sessions easier to attend consistently.",
      "Private video sessions can support open, focused conversation.",
      "Effectiveness depends on your goals, participation, and therapist fit.",
      "Your therapist can suggest a care rhythm that supports progress.",
    ],
  },
  {
    icon: "check",
    title: "What should I prepare before a session?",
    points: [
      "Choose a quiet place where you can speak comfortably.",
      "Keep notes about concerns, questions, or recent experiences.",
      "Join a few minutes early and check your internet connection.",
      "You do not need perfect words; starting honestly is enough.",
    ],
  },
  {
    icon: "clock",
    title: "What if I miss or need to change an appointment?",
    points: [
      "Review your appointment details from your patient dashboard.",
      "Use the available booking tools to manage upcoming sessions.",
      "Message support or your therapist if you need clarity.",
      "Try to make changes early so the slot can be handled smoothly.",
    ],
  },
  {
    icon: "wallet",
    title: "How do payments and wallet balance work?",
    points: [
      "Your wallet balance can be used during eligible appointment bookings.",
      "Session charges are shown before you confirm a booking.",
      "Payment and wallet details stay available from your patient account.",
      "You can review your transaction history whenever needed.",
    ],
  },
  {
    icon: "eye",
    title: "Will my therapy information stay private?",
    points: [
      "Your care information is handled inside your secure patient account.",
      "Use private devices and quiet spaces for better confidentiality.",
      "Therapists follow professional boundaries around personal information.",
      "Only share what you feel ready to discuss in the session.",
    ],
  },
  {
    icon: "sun",
    title: "When should I consider starting therapy?",
    points: [
      "You can start when stress, mood, thoughts, or relationships feel hard to manage.",
      "Therapy can support both immediate concerns and long-term growth.",
      "You do not need to wait until things feel severe.",
      "A first session can help you understand what kind of support may help.",
    ],
  },
];

const iconPaths = {
  arrow: (
    <>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </>
  ),
  check: (
    <>
      <path d="M20 6 9 17l-5-5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  message: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  spark: (
    <>
      <path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3Z" />
      <path d="m19 14 .8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" />
    </>
  ),
  video: (
    <>
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" />
    </>
  ),
  wallet: (
    <>
      <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" />
      <path d="M16 12h6v5h-6a2.5 2.5 0 0 1 0-5Z" />
      <circle cx="18" cy="14.5" r=".7" />
    </>
  ),
};

function Icon({ name, className = "h-5 w-5", strokeWidth = 2 }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {iconPaths[name]}
    </svg>
  );
}

function TimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function DoctorAvatar({ src, name, size = "h-16 w-16", rounded = "rounded-2xl" }) {
  const shapeClass = `${size} ${rounded} aspect-square shrink-0 overflow-hidden`;

  if (src) {
    return <img src={src} alt={name} className={`${shapeClass} object-cover shadow-sm`} />;
  }

  return (
    <div className={`${shapeClass} flex items-center justify-center bg-white text-xl font-extrabold text-patient-primary shadow-sm`}>
      {name?.charAt(0) || "K"}
    </div>
  );
}

function isConsultationJoinWindowActive(booking, now) {
  if (!booking || booking.status !== "CONFIRMED") return false;
  if (booking.consultation?.is_open) return true;

  const opensAt = booking.consultation?.opens_at ? Date.parse(booking.consultation.opens_at) : NaN;
  if (!Number.isFinite(opensAt) || now.getTime() < opensAt) return false;

  const endTime = booking.end_time || booking.start_time;
  const closesAt = booking.date && endTime ? Date.parse(`${booking.date}T${endTime}+05:30`) + 60 * 60 * 1000 : NaN;
  return !Number.isFinite(closesAt) || now.getTime() <= closesAt;
}

function Rating({ value }) {
  const rating = Math.round(Number(value || 0));
  return (
    <div className="flex items-center gap-0.5 text-[13px] text-amber-400" aria-label={`${rating} star rating`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <span key={index} className={index < rating ? "" : "text-slate-200"}>*</span>
      ))}
    </div>
  );
}

function formatRating(value) {
  if (value == null || value === "") return "New";
  const rating = Number(value);
  return Number.isFinite(rating) ? rating.toFixed(1) : "New";
}

function formatSessionCharge(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return "Fee unavailable";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

function PsychologistWaveform({ isPlaying = false, progress = 0, disabled = false }) {
  const normalizedProgress = Math.max(0, Math.min(progress, 1));
  const activeBars = Math.max(1, Math.ceil(normalizedProgress * BAR_HEIGHTS.length));

  return (
    <div
      aria-hidden="true"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 3,
        height: 36,
        width: "100%",
        minWidth: 0,
        flex: "1 1 auto",
        overflow: "hidden",
      }}
    >
      {BAR_HEIGHTS.map((height, index) => (
        <div
          key={index}
          style={{
            flex: "1 1 0",
            minWidth: 2,
            maxWidth: 6,
            height: `${height}%`,
            background: disabled
              ? "#cbd5d9"
              : index < activeBars
                ? "linear-gradient(180deg, #00897b 0%, #26c6da 100%)"
                : "#d9e6e4",
            borderRadius: 100,
            opacity: disabled ? 0.65 : 1,
            transformOrigin: "center",
            animation: isPlaying ? `waveformPulse ${0.75 + (index % 6) * 0.08}s ease-in-out infinite` : "none",
            animationDelay: `${index * 0.035}s`,
            transition: "background 0.25s ease, opacity 0.25s ease",
          }}
        />
      ))}
    </div>
  );
}

function DatePill({ date }) {
  return (
    <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[#eef8ff] px-4 py-2 text-xs font-extrabold text-blue-600">
      <Icon name="sun" className="h-4 w-4 text-amber-400" />
      {date ? formatIndiaDate(date) : "Today"}
    </div>
  );
}

function AppointmentMeta({ booking }) {
  if (!booking) return null;

  return (
    <div className="flex flex-wrap gap-3">
      <span className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-600">
        <Icon name="calendar" className="h-4 w-4 text-patient-primary" />
        {formatIndiaDate(booking.date)}
      </span>
      <span className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-600">
        <Icon name="clock" className="h-4 w-4 text-patient-primary" />
        {formatIndiaTime(booking.start_time)} - {formatIndiaTime(booking.end_time)}
      </span>
    </div>
  );
}

function ConsultationIllustration() {
  return (
    <div className="hidden min-h-[250px] min-w-[260px] items-center justify-center text-patient-primary lg:flex">
      <Icon name="video" className="h-44 w-44" strokeWidth={1.25} />
    </div>
  );
}

function TodayConsultationCard({ booking }) {
  const [now, setNow] = useState(() => new Date());
  const opensAt = formatIndiaDateTime(booking?.consultation?.opens_at);
  const isOpen = isConsultationJoinWindowActive(booking, now);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="relative flex min-h-[430px] flex-col justify-between overflow-hidden rounded-[26px] border border-[#d8f4ef] bg-[#eafbf8] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.05)] sm:p-8 lg:min-h-[500px]">
      <div className="absolute bottom-0 left-0 h-32 w-32 rounded-tr-[90px] bg-white/45" />
      <div className="absolute right-16 top-20 h-16 w-16 rounded-full bg-white/55" />
      <div className="absolute right-7 top-7 text-slate-300">...</div>
      <div className="relative flex flex-1 flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[11px] font-extrabold uppercase tracking-wide text-patient-primary">
            <span className={`h-2 w-2 rounded-full ${isOpen ? "bg-emerald-500" : "bg-rose-400"}`} />
            {isOpen ? "Consultation room is open" : opensAt ? `Upcoming - opens ${opensAt}` : "Consultation today"}
          </div>

          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative w-fit">
              <DoctorAvatar src={booking.psychologist_photo} name={booking.psychologist_name} size="h-24 w-24 min-h-24 min-w-24" rounded="rounded-full" />
              <span className="absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full border-4 border-[#eafbf8] bg-white text-patient-primary">
                <Icon name="check" className="h-4 w-4" strokeWidth={3} />
              </span>
            </div>
            <div>
              <h2 className="font-outfit text-3xl font-extrabold tracking-tight text-slate-900">{booking.psychologist_name}</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">{booking.specialization || "Clinical Psychologist"}</p>
              <div className="mt-3">
                <AppointmentMeta booking={booking} />
              </div>
            </div>
          </div>
        </div>

        <ConsultationIllustration />
      </div>

      <div className="relative mt-8 grid gap-3 sm:grid-cols-2">
        <Link to={isOpen ? `/patient/consultation/${booking.id}` : `/patient/appointments/${booking.id}`} className="inline-flex items-center justify-center gap-2 rounded-[14px] bg-patient-primary px-5 py-4 text-sm font-extrabold text-white no-underline shadow-patient-sm transition hover:bg-patient-hover">
          <Icon name={isOpen ? "video" : "eye"} className="h-4 w-4" />
          {isOpen ? "Join Video Call" : "Details"}
        </Link>
        <Link to={`/patient/messages?appointment=${booking.id}`} className="inline-flex items-center justify-center gap-2 rounded-[14px] border border-slate-100 bg-white px-5 py-4 text-sm font-extrabold text-slate-700 no-underline transition hover:border-patient-primary/30 hover:text-patient-primary">
          <Icon name="message" className="h-4 w-4" />
          Message Doctor
        </Link>
      </div>
    </section>
  );
}

function NoTodayCard() {
  return (
    <section className="relative overflow-hidden rounded-[28px] border border-[#d8f4ef] bg-[#eafbf8] p-6 shadow-[0_18px_45px_rgba(15,23,42,0.05)] sm:p-8">
      <div className="absolute right-8 top-8 h-24 w-24 rounded-full border border-white/70" />
      <div className="absolute right-20 top-24 h-12 w-12 rounded-full bg-white/60" />
      <div className="absolute bottom-0 left-0 h-28 w-28 rounded-tr-[90px] bg-white/45" />
      <div className="relative grid gap-8 lg:grid-cols-[1fr_280px] lg:items-center">
        <div>
          <span className="inline-flex rounded-full bg-white px-4 py-2 text-[11px] font-extrabold uppercase tracking-wide text-patient-primary shadow-sm">
            A softer moment
          </span>
          <h2 className="mt-6 max-w-2xl font-outfit text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl">
            Take a slow breath. You are allowed to arrive gently today.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            A quiet pause can be part of care too. Let this space feel light, steady, and uncluttered while you move through the day at your own pace.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {[
              { label: "Breathe", value: "4 - 4 - 6", desc: "Inhale, hold, exhale." },
              { label: "Notice", value: "3 things", desc: "Name what feels steady." },
              { label: "Reset", value: "1 minute", desc: "Relax your shoulders." },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl bg-white/85 p-4 shadow-[0_1px_0_rgba(15,23,42,0.03)]">
                <p className="text-[11px] font-extrabold uppercase tracking-wide text-patient-primary">{item.label}</p>
                <p className="mt-2 font-outfit text-xl font-extrabold text-slate-900">{item.value}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[24px] bg-white p-5 shadow-[0_14px_35px_rgba(15,23,42,0.07)]">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eafbf8] text-patient-primary">
            <Icon name="sun" className="h-7 w-7" />
          </div>
          <p className="mt-5 text-[11px] font-extrabold uppercase tracking-wide text-slate-400">Today&apos;s note</p>
          <h3 className="mt-3 font-outfit text-xl font-extrabold leading-tight text-slate-900">Small calm counts.</h3>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Drink some water, step away from the screen for a moment, and let one kind thought be enough.
          </p>
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-2/3 rounded-full bg-patient-primary" />
          </div>
        </div>
      </div>
    </section>
  );
}

function QuickActionCard({ action, walletBalance, onOpenChatbot }) {
  const colorMap = {
    violet: "bg-violet-50 text-violet-600",
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
  };

  const content = (
    <>
      {action.badge ? <span className="absolute right-5 top-5 rounded-md bg-violet-500 px-3 py-1 text-[10px] font-extrabold text-white">{action.badge}</span> : null}
      <div className={`mb-6 flex h-11 w-11 items-center justify-center rounded-xl ${colorMap[action.color]}`}>
        <Icon name={action.icon} className="h-5 w-5" />
      </div>
      <h3 className="font-outfit text-base font-extrabold text-slate-900">{action.title}</h3>
      <p className="mt-1 text-xs font-semibold text-slate-500">{action.title === "Wallet" && walletBalance ? `Rs. ${walletBalance}` : action.desc}</p>
    </>
  );

  if (action.opensChatbot) {
    return (
      <button type="button" onClick={onOpenChatbot} className="relative rounded-[18px] border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
        {content}
      </button>
    );
  }

  return (
    <Link to={action.to} className="relative rounded-[18px] border border-slate-200 bg-white p-5 text-left no-underline shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      {content}
    </Link>
  );
}

function getPsychologistId(psychologist) {
  return psychologist.psychologist_id || psychologist.id;
}

function getPsychologistName(psychologist) {
  return psychologist.full_name || psychologist.name || "Koode Psychologist";
}

function getPsychologistPhoto(psychologist) {
  return psychologist.profile_picture || psychologist.photo;
}

function getPsychologistTags(psychologist) {
  if (psychologist.specializations?.length) return psychologist.specializations;
  if (psychologist.tags?.length) return psychologist.tags;
  return psychologist.specialization ? [psychologist.specialization] : [];
}

function HomePsychologistCard({ psychologist }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const id = getPsychologistId(psychologist);
  const name = getPsychologistName(psychologist);
  const photo = getPsychologistPhoto(psychologist);
  const tags = getPsychologistTags(psychologist);
  const rating = psychologist.ratings?.average_rating ?? psychologist.average_rating;
  const years = Number(psychologist.years_of_experience || 0);
  const consultationHours = Number(psychologist.total_experience_hours ?? psychologist.experience_hours ?? 0);
  const experienceLabel = years > 0
    ? `${years} year${years === 1 ? "" : "s"} experience`
    : consultationHours > 0
      ? `${Math.round(consultationHours).toLocaleString("en-IN")} consultation hours`
      : "Experience not listed";
  const nextSlot = psychologist.next_available_slot;
  const bookTo = nextSlot?.date && nextSlot?.id
    ? `/patient/psychologists/${id}/book?date=${nextSlot.date}&slot=${nextSlot.id}`
    : `/patient/psychologists/${id}/book`;
  const hasAudioIntro = Boolean(psychologist.audio_intro);
  const waveformProgress = duration ? currentTime / duration : 0;

  const formatAudioTime = (seconds) => {
    const safeSeconds = Number.isFinite(seconds) ? Math.max(seconds, 0) : 0;
    const minutes = Math.floor(safeSeconds / 60);
    const remainingSeconds = Math.floor(safeSeconds % 60);
    return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [psychologist.audio_intro]);

  const toggleAudioIntro = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      return;
    }

    audio.play().catch(() => setIsPlaying(false));
  };

  return (
    <article
      style={{
        background: "#f4f8f8",
        borderRadius: 20,
        padding: "24px 22px 20px",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
        border: "1px solid #e8efef",
        transition: "box-shadow 0.25s, transform 0.25s",
        minHeight: 0,
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.09)";
        event.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.04)";
        event.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <p style={{ fontWeight: 700, fontSize: 18, color: "#111", margin: 0, lineHeight: 1.3 }}>
            {name}
          </p>
          <p style={{ fontSize: 13, color: "#777", margin: "3px 0 0" }}>
            {psychologist.job_title || psychologist.title || "Consultant Psychologist"}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#fff8e1", border: "1px solid #fde68a", borderRadius: 999, padding: "3px 8px", fontSize: 12, fontWeight: 700, color: "#92400e" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
              {formatRating(rating)}
            </span>
          </div>
        </div>
        <div style={{ width: 62, height: 62, borderRadius: "50%", overflow: "hidden", flexShrink: 0, background: "#c8d8d8", border: "2.5px solid #fff", boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}>
          {photo ? (
            <img src={photo} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#4db6ac", color: "#fff", fontWeight: 700, fontSize: 22 }}>
              {name.charAt(0)}
            </div>
          )}
        </div>
      </div>

      <Link
        to={`/patient/psychologists/${id}`}
        style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", border: "1.5px solid #dde4e4", borderRadius: 100, padding: "5px 14px", fontSize: 13, fontWeight: 600, color: "#222", cursor: "pointer", marginBottom: 18, textDecoration: "none" }}
      >
        Quick View
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </Link>

      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "#0f766e", fontWeight: 700 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {experienceLabel}
          </span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {tags.slice(0, 3).map((tag) => (
            <span key={tag} style={{ background: "#fff", border: "1.5px solid #dde4e4", borderRadius: 100, padding: "4px 12px", fontSize: 12, fontWeight: 500, color: "#444" }}>
              {tag}
            </span>
          ))}
          {tags.length > 3 ? (
            <span style={{ background: "#fff", border: "1.5px solid #dde4e4", borderRadius: 100, padding: "4px 12px", fontSize: 12, fontWeight: 500, color: "#888" }}>
              +{tags.length - 3}
            </span>
          ) : null}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, background: "#ffffff", border: "1.5px solid #e3eceb", borderRadius: 16, padding: "12px 14px", marginBottom: 14 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0, fontSize: 12, color: "#64748b", fontWeight: 700 }}>
          <span style={{ width: 26, height: 26, borderRadius: "50%", background: "#ecfdf5", color: "#00897b", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 3h12" />
              <path d="M6 8h12" />
              <path d="M6 13h8" />
              <path d="M6 3c6.5 0 6.5 10 0 10" />
              <path d="M6 13l8 8" />
            </svg>
          </span>
          Session charge
        </span>
        <span style={{ color: "#111827", fontSize: 16, fontWeight: 800, whiteSpace: "nowrap" }}>
          {formatSessionCharge(psychologist.consultation_fee)}
          <span style={{ color: "#94a3b8", fontSize: 12, fontWeight: 700, marginLeft: 4 }}>/ session</span>
        </span>
      </div>

      <div style={{ background: "#fff", borderRadius: 18, padding: "9px 14px 9px 9px", display: "flex", alignItems: "center", gap: 11, marginBottom: 18, border: "1.5px solid #e8efef", minWidth: 0 }}>
        <button
          type="button"
          onClick={toggleAudioIntro}
          disabled={!hasAudioIntro}
          aria-label={isPlaying ? "Pause audio intro" : "Play audio intro"}
          style={{ width: 38, height: 38, borderRadius: "50%", border: "1.5px solid #d7e4e2", background: hasAudioIntro ? "#111" : "#f1f5f9", color: hasAudioIntro ? "#fff" : "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", cursor: hasAudioIntro ? "pointer" : "not-allowed", flexShrink: 0 }}
        >
          {isPlaying ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
        </button>
        <PsychologistWaveform isPlaying={isPlaying} progress={waveformProgress} disabled={!hasAudioIntro} />
        <span style={{ fontSize: 12, color: "#64748b", fontWeight: 700, flexShrink: 0, minWidth: 34, textAlign: "right" }}>
          {hasAudioIntro ? (duration ? formatAudioTime(duration - currentTime) : "0:00") : "--:--"}
        </span>
        {psychologist.audio_intro ? (
          <audio ref={audioRef} src={psychologist.audio_intro} style={{ display: "none" }} />
        ) : null}
      </div>

      <div style={{ height: 1, background: "#e2eaea", marginBottom: 14, marginTop: "auto" }} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 11, color: "#aaa", margin: "0 0 2px" }}>Next available slot:</p>
          <p style={{ fontSize: 13, color: "#00897b", fontWeight: 600, margin: 0 }}>
            {nextSlot?.label || "No upcoming slots"}
          </p>
        </div>
        <Link
          to={bookTo}
          style={{ background: "#111", color: "#fff", border: "none", borderRadius: 100, padding: "10px 20px", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", transition: "background 0.2s", textDecoration: "none" }}
          onMouseEnter={(event) => (event.currentTarget.style.background = "#333")}
          onMouseLeave={(event) => (event.currentTarget.style.background = "#111")}
        >
          Book
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
      </div>
    </article>
  );
}

function RecentHistory({ items = [] }) {
  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="font-outfit text-base font-extrabold text-slate-900">Recent History</h2>
        <Link to="/patient/appointments" className="text-xs font-extrabold text-patient-primary no-underline">View All</Link>
      </div>
      {items.length ? (
        <div className="space-y-4">
          {items.slice(0, 3).map((booking) => (
            <Link key={booking.id} to={`/patient/appointments/${booking.id}`} className="flex items-center gap-3 rounded-xl no-underline transition hover:bg-slate-50">
              <DoctorAvatar src={booking.psychologist_photo} name={booking.psychologist_name} size="h-12 w-12" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold text-slate-900">{booking.psychologist_name}</p>
                <p className="truncate text-xs font-medium text-slate-500">{formatIndiaDate(booking.date)} - {booking.specialization || "Consultation"}</p>
              </div>
              <Rating value={booking.review?.rating} />
            </Link>
          ))}
        </div>
      ) : (
        <p className="rounded-xl bg-slate-50 px-4 py-5 text-sm leading-6 text-slate-500">Your completed consultations will appear here after your first session.</p>
      )}
    </section>
  );
}

function TopPsychologistsSection({ psychologists = [], title = "Top Rated Psychologists" }) {
  return (
    <section className="mx-auto mt-14 max-w-6xl px-5 sm:px-8">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="font-outfit text-xl font-extrabold text-slate-900 sm:text-2xl">{title}</h2>
        <Link to="/patient/psychologists" className="inline-flex items-center gap-2 text-sm font-extrabold text-patient-primary no-underline">
          View more
          <Icon name="arrow" className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {psychologists.length ? (
          psychologists.slice(0, 3).map((psychologist) => (
            <HomePsychologistCard key={getPsychologistId(psychologist)} psychologist={psychologist} />
          ))
        ) : (
          <div className="rounded-[22px] bg-[#eef8f9] p-7 text-sm text-slate-500 md:col-span-2 xl:col-span-3">
            We are preparing therapist recommendations for you.
          </div>
        )}
      </div>
    </section>
  );
}

function FaqSection() {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(faqCards.length / 2);
  const startIndex = (page * 2) % faqCards.length;
  const visibleCards = [
    faqCards[startIndex],
    faqCards[(startIndex + 1) % faqCards.length],
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setPage((current) => (current + 1) % totalPages);
    }, 10000);
    return () => clearInterval(timer);
  }, [totalPages]);

  return (
    <section className="mx-auto mb-28 mt-20 max-w-6xl px-5 pb-8 sm:px-8">
      <h2 className="mx-auto max-w-xl text-center font-outfit text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl">
        Your Questions About Therapy, <span className="font-medium">Answered</span>
      </h2>
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {visibleCards.map((card) => (
          <article key={card.title} className="rounded-[24px] bg-[#e4f7f7] p-7 sm:p-9">
            <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-full bg-white text-orange-500">
              <Icon name={card.icon} className="h-6 w-6" />
            </div>
            <h3 className="font-outfit text-xl font-extrabold text-slate-900">{card.title}</h3>
            <ul className="mt-6 list-disc space-y-4 pl-4 text-sm leading-6 text-slate-600">
              {card.points.map((point) => <li key={point}>{point}</li>)}
            </ul>
          </article>
        ))}
      </div>
      <div className="mt-8 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => setPage((current) => (current - 1 + totalPages) % totalPages)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm transition hover:text-patient-primary"
          aria-label="Previous questions"
        >
          <Icon name="arrow" className="h-4 w-4 rotate-180" />
        </button>
        <span className="text-sm font-extrabold text-slate-600">{page + 1} / {totalPages}</span>
        <button
          type="button"
          onClick={() => setPage((current) => (current + 1) % totalPages)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm transition hover:text-patient-primary"
          aria-label="Next questions"
        >
          <Icon name="arrow" className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}

function LoggedInHome({ data, fullName }) {
  const topPsychologists = data?.top_psychologists || [];
  const hasTodayConsultation = Boolean(data?.today_consultation);
  const walletBalance = data?.wallet?.balance;
  const statusCopy = hasTodayConsultation
    ? "Let's prioritize your mental well-being today."
    : data?.next_appointment
      ? "Your next appointment is already scheduled."
      : "Your care dashboard is ready.";

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] font-['DM_Sans',sans-serif] antialiased">
      <PatientNavbar />
      <main className="flex-1 pt-[6.75rem]">
        <div className="mx-auto grid max-w-6xl gap-7 px-5 pb-16 sm:px-8 lg:grid-cols-[1fr_330px]">
          <div>
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="font-outfit text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                  <TimeGreeting />, {fullName}
                </h1>
                <p className="mt-2 text-sm font-semibold text-slate-500">{statusCopy}</p>
              </div>
              <DatePill date={data?.today} />
            </div>

            {hasTodayConsultation ? <TodayConsultationCard booking={data.today_consultation} /> : <NoTodayCard />}

          </div>

          <aside className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <QuickActionCard action={quickActions[0]} walletBalance={walletBalance} />
              <div className="grid grid-cols-2 gap-4">
                {quickActions.slice(1).map((action) => (
                  <QuickActionCard key={action.title} action={action} walletBalance={walletBalance} />
                ))}
              </div>
            </div>
            <RecentHistory items={data?.recent_history} />
          </aside>
        </div>
        <TopPsychologistsSection psychologists={topPsychologists} />
        <FaqSection />
      </main>
      <PatientFooter />
    </div>
  );
}

function PublicCarePanel() {
  return (
    <div className="rounded-[28px] border border-[#dcebea] bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
      <div className="rounded-[24px] bg-[#eafbf8] p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="inline-flex rounded-full bg-white px-4 py-2 text-[11px] font-extrabold uppercase tracking-wide text-patient-primary">
              Therapy made simpler
            </span>
            <h2 className="mt-5 max-w-sm font-outfit text-2xl font-extrabold leading-tight text-slate-950">
              Start by finding the therapist who feels right for you.
            </h2>
          </div>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-patient-primary shadow-sm">
            <Icon name="spark" className="h-7 w-7" />
          </div>
        </div>

        <div className="mt-7 space-y-3">
          {publicSteps.map((step, index) => (
            <div key={step.title} className="flex gap-4 rounded-2xl bg-white/80 p-4 shadow-[0_1px_0_rgba(15,23,42,0.03)]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f7fbfb] text-patient-primary">
                <Icon name={step.icon} className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">Step {index + 1}</p>
                <h3 className="mt-1 font-outfit text-base font-extrabold text-slate-900">{step.title}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">{step.text}</p>
              </div>
            </div>
          ))}
        </div>

        <Link to="/patient/psychologists" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-[14px] bg-slate-950 px-5 py-4 text-sm font-extrabold text-white no-underline transition hover:bg-slate-800">
          Browse Psychologists
          <Icon name="arrow" className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {publicHighlights.map((item) => (
          <div key={item.label} className="rounded-2xl bg-slate-50 p-4 text-center">
            <p className="font-outfit text-base font-extrabold text-slate-950">{item.value}</p>
            <p className="mt-1 text-[11px] font-semibold leading-4 text-slate-500">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PublicHome() {
  const navigate = useNavigate();
  const { data: psychologistData } = useQuery({
    queryKey: ["patient-psychologists"],
    queryFn: fetchPatientPsychologists,
  });

  const topPsychologists = useMemo(() => {
    const list = psychologistData?.results || [];
    return [...list]
      .sort((a, b) => Number(b.ratings?.average_rating || 0) - Number(a.ratings?.average_rating || 0))
      .slice(0, 3);
  }, [psychologistData?.results]);

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] font-['DM_Sans',sans-serif] antialiased">
      <PatientNavbar />
      <main className="flex-1 pt-[6.5rem]">
        <section className="mx-auto grid max-w-6xl gap-10 px-5 pb-14 pt-10 sm:px-8 lg:min-h-[620px] lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <span className="inline-flex rounded-full bg-[#e4f7f4] px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-patient-primary">
              Online therapy made easier
            </span>
            <h1 className="mt-6 max-w-2xl font-outfit text-4xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-6xl">
              Find the right therapist and book with confidence.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-slate-600">
              Explore verified psychologists, understand what support may fit you, and create an account when you are ready to book a private consultation.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button type="button" onClick={() => navigate("/patient/signup")} className="inline-flex items-center gap-2 rounded-[14px] bg-patient-primary px-6 py-4 text-sm font-extrabold text-white shadow-patient-sm transition hover:bg-patient-hover">
                Get Started
                <Icon name="arrow" className="h-4 w-4" />
              </button>
              <Link to="/patient/psychologists" className="inline-flex items-center rounded-[14px] border border-slate-200 bg-white px-6 py-4 text-sm font-extrabold text-slate-700 no-underline transition hover:border-patient-primary/40 hover:text-patient-primary">
                View Psychologists
              </Link>
            </div>
          </div>

          <PublicCarePanel />
        </section>
        <TopPsychologistsSection psychologists={topPsychologists} />
        <FaqSection />
      </main>
      <PatientFooter />
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] font-['DM_Sans',sans-serif] antialiased">
      <PatientNavbar />
      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-7 px-5 pb-16 pt-[6.75rem] sm:px-8 lg:grid-cols-[1fr_330px]">
        <div className="space-y-7">
          <div className="h-20 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-64 animate-pulse rounded-[26px] bg-slate-200" />
          <div className="grid gap-5 md:grid-cols-2">
            <div className="h-72 animate-pulse rounded-[22px] bg-slate-200" />
            <div className="h-72 animate-pulse rounded-[22px] bg-slate-200" />
          </div>
        </div>
        <div className="space-y-5">
          <div className="h-32 animate-pulse rounded-[18px] bg-slate-200" />
          <div className="h-40 animate-pulse rounded-[18px] bg-slate-200" />
          <div className="h-64 animate-pulse rounded-[18px] bg-slate-200" />
        </div>
      </main>
    </div>
  );
}

export default function PatientHome() {
  const { user: authUser, isAuthenticated, role } = useAuthStore();
  const isPatient = isAuthenticated && role === "PATIENT";
  usePatientSessionGuard();

  const { data, isLoading } = useQuery({
    queryKey: ["patient-home"],
    queryFn: fetchPatientHome,
    enabled: isPatient,
    refetchInterval: isPatient ? 30000 : false,
  });

  const fullName = useMemo(() => {
    const name = authUser?.full_name || data?.patient_name || data?.patient_email?.split("@")[0] || "there";
    return String(name).split(" ")[0] || "there";
  }, [authUser?.full_name, data?.patient_email, data?.patient_name]);

  if (!isPatient) return <PublicHome />;
  if (isLoading) return <HomeSkeleton />;

  return <LoggedInHome data={data} fullName={fullName} />;
}

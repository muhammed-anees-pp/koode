import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cancelPatientBooking, getMyBookings } from "../../../api/patient.api";
import PatientNavbar from "../../../components/patient/Navbar/PatientNavbar";
import PatientFooter from "../../../components/patient/Footer/PatientFooter";
import { usePatientSessionGuard } from "../../../hooks/usePatientSessionGuard";
import { useAuthStore } from "../../../store/auth.store";
import {
  compareIndiaAppointmentDateTime,
  formatIndiaDate,
  formatIndiaDateTime,
  formatIndiaTime,
  getIndiaTodayISO,
} from "../../../utils/indiaDateTime";

const TABS = ["Upcoming", "Past", "Cancelled"];

const DATE_FILTER_UPCOMING = ["Next 7 Days", "Next 30 Days", "All Upcoming"];
const DATE_FILTER_PAST = ["Last 7 Days", "Last 30 Days", "All Past"];


function CancelBookingModal({ booking, note, onChange, onClose, onSubmit, isPending, error }) {
  if (!booking) return null;
  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/50 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-rose-500">Cancel Appointment</p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">{booking.psychologist_name}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {formatIndiaDate(booking.date)} &bull;{" "}
              {formatIndiaTime(booking.start_time)} – {formatIndiaTime(booking.end_time)}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 transition p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="mt-5">
          <label className="mb-2 block text-sm font-medium text-slate-600">Reason for cancellation</label>
          <textarea
            value={note}
            onChange={(e) => onChange(e.target.value)}
            rows={4}
            placeholder="Please describe why you are cancelling..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-patient-primary focus:bg-white resize-none"
          />
          {error && <p className="mt-2 text-sm font-medium text-rose-600">{error}</p>}
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
            Keep Appointment
          </button>
          <button
            type="button" onClick={onSubmit} disabled={isPending}
            className="rounded-xl bg-rose-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {isPending ? "Cancelling..." : "Cancel Appointment"}
          </button>
        </div>
      </div>
    </div>
  );
}


function StatusBadge({ status }) {
  const map = {
    CONFIRMED: "bg-emerald-100 text-emerald-700",
    PENDING:   "bg-amber-100 text-amber-700",
    CANCELLED: "bg-rose-100 text-rose-700",
    COMPLETED: "bg-slate-100 text-slate-600",
  };
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${map[status] || map.PENDING}`}>
      {status}
    </span>
  );
}


function AppointmentAvatar({ booking }) {
  const photo = booking.psychologist_photo;
  if (photo) {
    return (
      <img src={photo} alt={booking.psychologist_name}
        className="w-16 h-16 rounded-full object-cover flex-shrink-0" />
    );
  }
  return (
    <div className="w-16 h-16 rounded-full bg-patient-light flex items-center justify-center text-patient-primary text-xl font-bold flex-shrink-0">
      {booking.psychologist_name?.charAt(0) ?? "?"}
    </div>
  );
}


function UpcomingCard({ booking, onCancel, onOpenChat, onJoinConsultation }) {
  const canJoin = booking.status === "CONFIRMED" && Boolean(booking.consultation?.is_open);
  const canChat = booking.chat_enabled || booking.status === "CONFIRMED";
  const opensAt = formatIndiaDateTime(booking.consultation?.opens_at);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4">
      <AppointmentAvatar booking={booking} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-base font-bold text-slate-900">{booking.psychologist_name}</h2>
          <StatusBadge status={booking.status} />
        </div>
        <p className="text-sm text-slate-500 mt-0.5">{booking.specialization || "Psychologist"}</p>
        <div className="flex items-center gap-4 mt-2 flex-wrap">
          <span className="flex items-center gap-1.5 text-sm text-slate-600">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {formatIndiaDate(booking.date)}
          </span>
          <span className="flex items-center gap-1.5 text-sm text-slate-600">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            {formatIndiaTime(booking.start_time)}
          </span>
          <Link
            to={`/patient/appointments/${booking.id}`}
            className="text-xs font-semibold text-patient-primary hover:underline"
          >
            View Details
          </Link>
        </div>
      </div>

      <div className="flex flex-col items-stretch sm:items-end gap-2 min-w-[180px]">
        {canChat ? (
          <button
            type="button"
            onClick={() => onOpenChat(booking)}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Open chat
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onJoinConsultation(booking)}
          className={`flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            canJoin
              ? "bg-patient-primary text-white shadow-patient-sm hover:bg-patient-hover"
              : "bg-slate-100 text-slate-400 cursor-not-allowed"
          }`}
          disabled={!canJoin}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" />
          </svg>
          {canJoin ? "Join Consultation" : opensAt ? `Opens ${opensAt}` : "Wait for Link"}
        </button>
        <button
          type="button"
          onClick={() => onCancel(booking)}
          className="text-xs font-semibold text-rose-500 hover:text-rose-700 transition uppercase tracking-wide text-right"
        >
          Cancel Session
        </button>
      </div>
    </article>
  );
}


function PastCard({ booking, onBookAgain, onViewPrescription }) {
  const [rated, setRated] = useState(booking.rating ?? 0);
  const [hovered, setHovered] = useState(0);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <AppointmentAvatar booking={booking} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={booking.status} />
              <h2 className="text-base font-bold text-slate-900">{booking.psychologist_name}</h2>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button type="button" className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition" title="Download receipt">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>
              <button type="button" className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-amber-400 hover:bg-amber-50 transition" title="Rate session">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 mt-1.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span className="text-sm text-slate-500">
              {formatIndiaDate(booking.date)}
            </span>
            <span className="text-slate-300 mx-1">|</span>
            <span className="text-sm text-slate-500">
              {formatIndiaTime(booking.start_time)} – {formatIndiaTime(booking.end_time)}
            </span>
          </div>

          
          <div className="flex items-center gap-1 mt-3">
            {Array.from({ length: 5 }).map((_, i) => {
              const filled = i < (hovered || rated);
              return (
                <button
                  key={i} type="button"
                  onClick={() => setRated(i + 1)}
                  onMouseEnter={() => setHovered(i + 1)}
                  onMouseLeave={() => setHovered(0)}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? "#f59e0b" : "none"} stroke={filled ? "#f59e0b" : "#d1d5db"} strokeWidth="1.5">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </button>
              );
            })}
            {rated > 0 && <span className="text-xs text-slate-400 ml-1">Rated</span>}
            {rated === 0 && <span className="text-xs text-patient-primary font-medium ml-1 hover:underline cursor-pointer">Rate Psychologist</span>}
          </div>

        </div>

        <div className="flex flex-shrink-0 flex-col gap-2">
          <button
            type="button"
            onClick={() => onBookAgain(booking)}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-patient-primary bg-white px-4 py-2 text-sm font-semibold text-patient-primary transition hover:bg-patient-light"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Book Again
          </button>
          <button
            type="button"
            onClick={() => onViewPrescription(booking)}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-patient-primary px-4 py-2 text-sm font-semibold text-white shadow-patient-sm transition hover:bg-patient-hover"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
              <path d="M8 13h8" />
              <path d="M8 17h5" />
            </svg>
            Prescription
          </button>
        </div>
      </div>
    </article>
  );
}

function PrescriptionModal({ booking, onClose }) {
  if (!booking) return null;
  const patientNote = booking.consultation?.patient_note || "";

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/50 px-4 py-6">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-patient-primary">Prescription</p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">{booking.psychologist_name}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {formatIndiaDate(booking.date)} - {formatIndiaTime(booking.start_time)} to {formatIndiaTime(booking.end_time)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close prescription"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <p className="mt-5 max-h-[52vh] overflow-y-auto whitespace-pre-wrap rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-4 text-sm leading-6 text-slate-700">
          {patientNote || "No prescription note was added for this consultation."}
        </p>
      </div>
    </div>
  );
}


function CancellationReasonModal({ booking, onClose }) {
  if (!booking) return null;
  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/50 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-[pdmSlideUp_0.22s_cubic-bezier(0.22,1,0.36,1)]"
        onClick={(e) => e.stopPropagation()}
      >
        
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-xs font-bold text-rose-600 uppercase tracking-wider mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              Cancelled
            </span>
            <h2 className="text-lg font-bold text-slate-900">{booking.psychologist_name}</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {formatIndiaDate(booking.date)} &bull; {formatIndiaTime(booking.start_time)} – {formatIndiaTime(booking.end_time)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition flex-shrink-0"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        
        <div className="h-px bg-slate-100 mb-5" />

        
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Cancellation Reason</p>
          <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
            {booking.cancellation_note || "No reason provided."}
          </p>
        </div>

        
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          Close
        </button>
      </div>
    </div>
  );
}


function CancelledCard({ booking, onBookAgain, onViewReason }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <AppointmentAvatar booking={booking} />

        <div className="flex-1 min-w-0">
          <StatusBadge status="CANCELLED" />
          <h2 className="mt-2 text-base font-bold text-slate-900">{booking.psychologist_name}</h2>
          <p className="text-sm text-slate-500">{booking.specialization || "Psychologist"}</p>
          <div className="flex items-center gap-3 mt-2 flex-wrap text-sm text-slate-600">
            <span>{formatIndiaDate(booking.date)}</span>
            <span className="text-slate-300">&bull;</span>
            <span>{formatIndiaTime(booking.start_time)} – {formatIndiaTime(booking.end_time)}</span>
          </div>

          <div className="flex items-center gap-3 mt-4 flex-wrap">
            <button
              type="button"
              onClick={() => onBookAgain(booking)}
              className="rounded-xl bg-patient-primary px-4 py-2 text-sm font-semibold text-white hover:bg-patient-hover transition shadow-patient-sm"
            >
              Book New Appointment
            </button>

            {booking.cancellation_note && (
              <button
                type="button"
                onClick={() => onViewReason(booking)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 transition"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                Cancellation Reason
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}


export default function PatientAppointments() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.role);
  const [activeTab, setActiveTab] = useState("Upcoming");
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelNote, setCancelNote] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [reasonTarget, setReasonTarget] = useState(null);
  const [prescriptionTarget, setPrescriptionTarget] = useState(null);
  const [dateFilter, setDateFilter] = useState(DATE_FILTER_UPCOMING[0]);
  const [searchQuery, setSearchQuery] = useState("");
  usePatientSessionGuard();

  const bookingsQuery = useQuery({
    queryKey: ["patient-appointments"],
    queryFn: getMyBookings,
    enabled: isAuthenticated && role === "PATIENT",
    refetchInterval: 30000,
  });

  const today = useMemo(() => getIndiaTodayISO(), []);

  const filteredBookings = useMemo(() => {
    const all = bookingsQuery.data ?? [];

    let list;
    if (activeTab === "Past") {
      list = all.filter((b) => b.status === "COMPLETED");
    } else if (activeTab === "Cancelled") {
      list = all.filter((b) => b.status === "CANCELLED");
    } else {
      list = all.filter(
        (b) => b.date >= today && b.status !== "COMPLETED" && b.status !== "CANCELLED"
      );
    }

    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((b) => b.psychologist_name?.toLowerCase().includes(q));
    }

    return [...list].sort(compareIndiaAppointmentDateTime);
  }, [activeTab, bookingsQuery.data, today, searchQuery]);

  const cancelMutation = useMutation({
    mutationFn: ({ bookingId, note }) => cancelPatientBooking(bookingId, note),
    onSuccess: async () => {
      setCancelTarget(null);
      setCancelNote("");
      setCancelError("");
      await queryClient.invalidateQueries({ queryKey: ["patient-appointments"] });
    },
    onError: (error) => {
      const apiError = error?.response?.data;
      const message =
        apiError?.note?.[0] ||
        apiError?.non_field_errors?.[0] ||
        apiError?.detail ||
        "Unable to cancel this appointment.";
      setCancelError(message);
    },
  });

  const openCancelModal = (booking) => {
    setCancelTarget(booking);
    setCancelNote("");
    setCancelError("");
  };

  const submitCancel = () => {
    if (!cancelNote.trim()) {
      setCancelError("Cancellation note is required");
      return;
    }
    cancelMutation.mutate({ bookingId: cancelTarget.id, note: cancelNote.trim() });
  };

  const handleBookAgain = (booking) => {
    if (booking.psychologist_id) {
      navigate(`/patient/therapists/${booking.psychologist_id}/book`);
    } else {
      navigate("/patient/therapists");
    }
  };

  const handleOpenChat = (booking) => {
    navigate(`/patient/messages?appointment=${booking.id}`);
  };

  const handleJoinConsultation = (booking) => {
    navigate(`/patient/consultation/${booking.id}`);
  };


  if (!isAuthenticated || role !== "PATIENT") {
    return <Navigate to="/patient/login" replace />;
  }

  const dateFilterOptions = activeTab === "Past" ? DATE_FILTER_PAST : DATE_FILTER_UPCOMING;
  const showFilters = activeTab !== "Cancelled";

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] font-['DM_Sans',sans-serif] antialiased">
      <PatientNavbar />

      <main className="flex-1 px-6 pt-[7rem] pb-24">
        <div className="mx-auto max-w-[940px]">
          
          <div className="mb-2">
            <h1 className="text-3xl font-bold text-slate-900">My Appointments</h1>
            <p className="mt-1 text-sm text-slate-500">
              {activeTab === "Upcoming"
                ? "View and manage your upcoming sessions"
                : activeTab === "Past"
                ? "Manage your journey and session history"
                : "Manage your journey and session history"}
            </p>
            
            <div className="mt-3 h-1 w-12 rounded-full bg-patient-primary" />
          </div>

          
          <div className="mt-6 flex items-center gap-2">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setActiveTab(tab);
                  setSearchQuery("");
                  setDateFilter(tab === "Past" ? DATE_FILTER_PAST[0] : DATE_FILTER_UPCOMING[0]);
                }}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  activeTab === tab
                    ? "bg-patient-primary text-white shadow-patient-sm"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          
          {showFilters && (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Filter by Date</p>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-patient-primary focus:ring-1 focus:ring-patient-primary/30 transition"
                >
                  {dateFilterOptions.map((opt) => (
                    <option key={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Search by Psychologist</p>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name..."
                    className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2.5 text-sm text-slate-700 outline-none focus:border-patient-primary focus:ring-1 focus:ring-patient-primary/30 transition"
                  />
                </div>
              </div>
            </div>
          )}

          
          <div className="mt-6 space-y-4">
            
            {bookingsQuery.isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl bg-white" />
              ))}

            
            {bookingsQuery.isError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
                Unable to load your appointments right now.
              </div>
            )}

            
            {!bookingsQuery.isLoading && !bookingsQuery.isError && filteredBookings.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-8 py-16 text-center">
                <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-slate-800">No {activeTab.toLowerCase()} appointments</h2>
                <p className="mt-2 text-sm text-slate-500">Your {activeTab.toLowerCase()} sessions will appear here.</p>
                {activeTab !== "Cancelled" && (
                  <button
                    type="button"
                    onClick={() => navigate("/patient/therapists")}
                    className="mt-5 rounded-xl bg-patient-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-patient-hover transition shadow-patient-sm"
                  >
                    Browse Therapists
                  </button>
                )}
              </div>
            )}

            
            {!bookingsQuery.isLoading && !bookingsQuery.isError &&
              filteredBookings.map((booking) => {
                if (activeTab === "Upcoming") {
                  return (
                    <UpcomingCard
                      key={booking.id}
                      booking={booking}
                      onCancel={openCancelModal}
                      onOpenChat={handleOpenChat}
                      onJoinConsultation={handleJoinConsultation}
                    />
                  );
                }
                if (activeTab === "Past") {
                  return (
                    <PastCard
                      key={booking.id}
                      booking={booking}
                      onBookAgain={handleBookAgain}
                      onViewPrescription={setPrescriptionTarget}
                    />
                  );
                }
                return (
                  <CancelledCard
                    key={booking.id}
                    booking={booking}
                    onBookAgain={handleBookAgain}
                    onViewReason={setReasonTarget}
                  />
                );
              })}
          </div>
        </div>
      </main>

      <PatientFooter />

      <CancelBookingModal
        booking={cancelTarget}
        note={cancelNote}
        onChange={setCancelNote}
        onClose={() => { setCancelTarget(null); setCancelNote(""); setCancelError(""); }}
        onSubmit={submitCancel}
        isPending={cancelMutation.isPending}
        error={cancelError}
      />

      <CancellationReasonModal
        booking={reasonTarget}
        onClose={() => setReasonTarget(null)}
      />

      <PrescriptionModal
        booking={prescriptionTarget}
        onClose={() => setPrescriptionTarget(null)}
      />

    </div>
  );
}

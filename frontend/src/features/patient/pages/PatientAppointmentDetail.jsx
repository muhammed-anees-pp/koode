import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cancelPatientBooking, getMyBookings, submitBookingReview } from "../../../api/patient.api";
import PatientNavbar from "../../../components/patient/Navbar/PatientNavbar";
import PatientFooter from "../../../components/patient/Footer/PatientFooter";
import ReviewModal, { Stars } from "../../../components/patient/ReviewModal";
import { usePatientSessionGuard } from "../../../hooks/usePatientSessionGuard";
import { useAuthStore } from "../../../store/auth.store";
import { formatIndiaDate, formatIndiaDateTime, formatIndiaTime, getIndiaTodayISO } from "../../../utils/indiaDateTime";

function CancelModal({ booking, note, onChange, onClose, onSubmit, isPending, error }) {
  if (!booking) return null;
  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-rose-500">Cancel Appointment</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">{booking.psychologist_name}</h2>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 transition p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="mt-4">
          <label className="mb-2 block text-sm font-medium text-slate-600">Reason</label>
          <textarea
            value={note} onChange={(e) => onChange(e.target.value)} rows={4}
            placeholder="Please describe why you are cancelling..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-patient-primary focus:bg-white resize-none"
          />
          {error && <p className="mt-2 text-sm font-medium text-rose-600">{error}</p>}
        </div>
        <div className="mt-4 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">Keep</button>
          <button type="button" onClick={onSubmit} disabled={isPending}
            className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-60 transition">
            {isPending ? "Cancelling..." : "Cancel Appointment"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PrescriptionModal({ booking, onClose }) {
  if (!booking) return null;
  const patientNote = booking.consultation?.patient_note || "";

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/50 px-4 py-6" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
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

export default function PatientAppointmentDetail() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.role);
  const [cancelNote, setCancelNote] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [showPrescription, setShowPrescription] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [reviewError, setReviewError] = useState("");
  usePatientSessionGuard();

  const bookingsQuery = useQuery({
    queryKey: ["patient-appointments"],
    queryFn: getMyBookings,
    enabled: isAuthenticated && role === "PATIENT",
    refetchInterval: 30000,
  });

  const today = getIndiaTodayISO();

  const cancelMutation = useMutation({
    mutationFn: ({ id, note }) => cancelPatientBooking(id, note),
    onSuccess: async () => {
      setShowCancel(false);
      setCancelNote("");
      setCancelError("");
      await queryClient.invalidateQueries({ queryKey: ["patient-appointments"] });
    },
    onError: (error) => {
      const apiError = error?.response?.data;
      const message =
        apiError?.note?.[0] || apiError?.non_field_errors?.[0] || apiError?.detail || "Unable to cancel.";
      setCancelError(message);
    },
  });

  const reviewMutation = useMutation({
    mutationFn: ({ rating, review }) => submitBookingReview({ bookingId, rating, review }),
    onSuccess: async () => {
      setShowReview(false);
      setReviewError("");
      await queryClient.invalidateQueries({ queryKey: ["patient-appointments"] });
    },
    onError: (error) => {
      const apiError = error?.response?.data;
      setReviewError(
        apiError?.rating?.[0] ||
        apiError?.review?.[0] ||
        apiError?.detail ||
        "Unable to save your review."
      );
    },
  });

  if (!isAuthenticated || role !== "PATIENT") {
    return <Navigate to="/patient/login" replace />;
  }

  if (bookingsQuery.isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f8fafc] font-['DM_Sans',sans-serif] antialiased">
        <PatientNavbar />
        <main className="flex-1 px-6 pt-[7rem] pb-24">
          <div className="mx-auto max-w-[1100px] animate-pulse space-y-4">
            <div className="h-6 w-48 bg-slate-200 rounded" />
            <div className="h-48 bg-white rounded-2xl" />
            <div className="h-64 bg-white rounded-2xl" />
          </div>
        </main>
        <PatientFooter />
      </div>
    );
  }

  const booking = (bookingsQuery.data ?? []).find((b) => String(b.id) === String(bookingId));

  if (!booking) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f8fafc] font-['DM_Sans',sans-serif] antialiased">
        <PatientNavbar />
        <main className="flex-1 px-6 pt-[7rem] pb-24 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-bold text-slate-900">Appointment not found</h2>
            <Link to="/patient/appointments" className="mt-3 inline-block text-patient-primary hover:underline text-sm">
              ← Back to Appointments
            </Link>
          </div>
        </main>
        <PatientFooter />
      </div>
    );
  }

  const statusColors = {
    CONFIRMED: "text-emerald-600 bg-emerald-50 border-emerald-200",
    PENDING:   "text-amber-600 bg-amber-50 border-amber-200",
    CANCELLED: "text-rose-600 bg-rose-50 border-rose-200",
    COMPLETED: "text-slate-600 bg-slate-100 border-slate-200",
  };
  const dotColors = {
    CONFIRMED: "bg-emerald-500",
    PENDING:   "bg-amber-500",
    CANCELLED: "bg-rose-500",
    COMPLETED: "bg-slate-400",
  };

  const statusLabel = booking.status === "CONFIRMED" ? "Upcoming" : booking.status;
  const isUpcoming = booking.status !== "CANCELLED" && booking.status !== "COMPLETED" && booking.date >= today;
  const canJoinConsultation = booking.status === "CONFIRMED" && Boolean(booking.consultation?.is_open);
  const opensAt = formatIndiaDateTime(booking.consultation?.opens_at);
  const reviewLabel = booking.review ? (booking.review.can_edit ? "Edit Review" : "View Review") : "Rate & Review";

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] font-['DM_Sans',sans-serif] antialiased">
      <PatientNavbar />

      <main className="flex-1 px-6 pt-[7rem] pb-24">
        <div className="mx-auto max-w-[1100px]">
          
          <div className="mb-5 flex items-center gap-2 text-sm text-slate-500">
            <Link to="/patient/appointments" className="flex items-center gap-1 hover:text-patient-primary transition font-medium">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
              </svg>
              Back to List
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-700 font-medium">Appointment Details</span>
          </div>

          
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-slate-900">Appointment Details</h1>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${statusColors[booking.status] || statusColors.PENDING}`}>
              <span className={`w-2 h-2 rounded-full ${dotColors[booking.status] || dotColors.PENDING}`} />
              {statusLabel}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
            
            <div className="space-y-5">
              
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-100 flex-shrink-0">
                      {booking.psychologist_photo ? (
                        <img src={booking.psychologist_photo} alt={booking.psychologist_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-patient-primary flex items-center justify-center text-white text-xl font-bold">
                          {booking.psychologist_name?.charAt(0)}
                        </div>
                      )}
                    </div>
                    <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-400 border-2 border-white" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold uppercase tracking-widest text-patient-primary">
                      {booking.specialization || "Psychologist"}
                    </p>
                    <h2 className="mt-0.5 text-xl font-bold text-slate-900">{booking.psychologist_name}</h2>
                    <Link
                      to={booking.psychologist_id ? `/patient/psychologists/${booking.psychologist_id}` : "#"}
                      className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-patient-primary hover:underline"
                    >
                      View Profile
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                      </svg>
                    </Link>
                  </div>

                  <div className="text-right text-sm text-slate-500">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Specialization</p>
                    <p className="font-semibold text-slate-700">{booking.specialization || "Cognitive Behavioral Consultation"}</p>
                  </div>
                </div>
              </div>

              
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-5">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1ABEAA" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <h3 className="text-base font-bold text-slate-900">Appointment Summary</h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mb-6">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Date</p>
                    <p className="text-sm font-semibold text-slate-800">{formatIndiaDate(booking.date)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Time</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {formatIndiaTime(booking.start_time)} (50 min)
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Type</p>
                    <p className="text-sm font-semibold text-slate-800 flex items-center gap-1">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" />
                      </svg>
                      Video Session
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Booking ID</p>
                    <p className="text-sm font-semibold text-slate-700">#{booking.id}</p>
                  </div>
                  {isUpcoming && (
                    <button
                      type="button"
                      onClick={() => setShowCancel(true)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-rose-500 hover:text-rose-700 transition border border-rose-200 hover:border-rose-400 rounded-xl px-3 py-1.5"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                      </svg>
                      Cancel Appointment
                    </button>
                  )}
                </div>
              </div>

              
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-patient-light flex items-center justify-center flex-shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1ABEAA" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.69h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l1.72-.86a2 2 0 0 1 2.11.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 18.18z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Consultation Support</p>
                    <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                      Your wellbeing is our priority. If you encounter any technical issues or concerns during your session, you can raise a complaint within 24 hours after the session concludes.
                    </p>
                  </div>
                </div>
              </div>

              {booking.status === "COMPLETED" ? (
                <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
                  <div className="mb-3 flex items-center gap-2">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <path d="M14 2v6h6" />
                      <path d="M8 13h8" />
                      <path d="M8 17h5" />
                    </svg>
                    <h3 className="text-base font-bold text-slate-900">Prescription</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPrescription(true)}
                    className="rounded-xl bg-patient-primary px-5 py-3 text-sm font-bold text-white shadow-patient-sm transition hover:bg-patient-hover"
                  >
                    View Prescription
                  </button>
                </div>
              ) : null}

              {booking.status === "COMPLETED" ? (
                <div className="rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
                  <div className="mb-3 flex items-center gap-2">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    <h3 className="text-base font-bold text-slate-900">Review</h3>
                  </div>
                  {booking.review ? (
                    <div className="mb-4">
                      <Stars value={booking.review.rating} readOnly size={19} />
                      {booking.review.review ? (
                        <p className="mt-3 whitespace-pre-wrap rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                          {booking.review.review}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mb-4 text-sm text-slate-500">Share your experience from this consultation.</p>
                  )}
                  <button
                    type="button"
                    onClick={() => { setShowReview(true); setReviewError(""); }}
                    className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-amber-600"
                  >
                    {reviewLabel}
                  </button>
                </div>
              ) : null}
            </div>

            
            <div className="space-y-5">
              
              <div className="rounded-2xl bg-patient-primary p-6 text-white shadow-patient-lg relative overflow-hidden">
                
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10" />
                <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/10" />

                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" />
                      </svg>
                    </div>
                    {canJoinConsultation && (
                      <span className="rounded-full bg-white px-3 py-0.5 text-xs font-bold text-patient-primary">
                        Room Open
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold mb-1">Join Consultation</h3>
                  <p className="text-sm text-white/80 mb-5">
                    Ready to start? The room opens 5 minutes before your time.
                  </p>

                  <button
                    type="button"
                    disabled={!canJoinConsultation}
                    onClick={() => navigate(`/patient/consultation/${booking.id}`)}
                    className={`w-full rounded-xl py-3 text-sm font-bold transition ${
                      canJoinConsultation
                        ? "bg-white text-patient-primary hover:bg-white/90"
                        : "bg-white/20 text-white/60 cursor-not-allowed"
                    }`}
                  >
                    {canJoinConsultation ? "Join Video Call" : opensAt ? `Opens ${opensAt}` : "Join Video Call"}
                  </button>
                </div>
              </div>

              
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <h3 className="text-sm font-bold text-slate-800">Message Psychologist</h3>
                </div>
                <p className="text-sm text-slate-500 mb-4">
                  Send a pre-session note or documents to {booking.psychologist_name}.
                </p>
                <button
                  type="button"
                  onClick={() => navigate(`/patient/messages?appointment=${booking.id}`)}
                  className="w-full rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-700 hover:border-patient-primary hover:text-patient-primary transition"
                >
                  Open Chat
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <PatientFooter />

      <CancelModal
        booking={showCancel ? booking : null}
        note={cancelNote}
        onChange={setCancelNote}
        onClose={() => { setShowCancel(false); setCancelNote(""); setCancelError(""); }}
        onSubmit={() => {
          if (!cancelNote.trim()) { setCancelError("Please provide a reason."); return; }
          cancelMutation.mutate({ id: booking.id, note: cancelNote.trim() });
        }}
        isPending={cancelMutation.isPending}
        error={cancelError}
      />
      <PrescriptionModal
        booking={showPrescription ? booking : null}
        onClose={() => setShowPrescription(false)}
      />
      <ReviewModal
        key={booking.id}
        booking={showReview ? booking : null}
        onClose={() => { setShowReview(false); setReviewError(""); }}
        onSubmit={({ rating, review }) => reviewMutation.mutate({ rating, review })}
        isPending={reviewMutation.isPending}
        error={reviewError}
      />
    </div>
  );
}

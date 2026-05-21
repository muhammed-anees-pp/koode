import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import PatientNavbar from "../../../components/patient/Navbar/PatientNavbar";
import PatientFooter from "../../../components/patient/Footer/PatientFooter";
import { usePatientSessionGuard } from "../../../hooks/usePatientSessionGuard";
import { useAuthStore } from "../../../store/auth.store";
import { getMyBookings } from "../../../api/patient.api";
import { formatIndiaTime } from "../../../utils/indiaDateTime";

export default function PatientPaymentConfirmed() {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get("booking");
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.role);
  usePatientSessionGuard();

  const bookingsQuery = useQuery({
    queryKey: ["my-bookings"],
    queryFn: getMyBookings,
    enabled: isAuthenticated && role === "PATIENT" && !!bookingId,
  });

  if (!isAuthenticated || role !== "PATIENT") {
    return <Navigate to="/patient/login" replace />;
  }

  const booking = bookingsQuery.data?.find?.(
    (b) => String(b.id) === String(bookingId)
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (t) => (t ? formatIndiaTime(t) : "—");
  const formatAmount = (value) => `₹${Number(value || 0).toFixed(2)}`;

  return (
    <div className="flex min-h-screen flex-col bg-[#f0f4f8] font-['DM_Sans',sans-serif] antialiased">
      <PatientNavbar />

      <main className="flex flex-1 items-start justify-center px-4 pt-[7rem] pb-24 sm:px-6">
        <div className="w-full max-w-[560px]">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            {/* ── Success header ── */}
            <div
              className="flex flex-col items-center pb-7 pt-10 text-center"
              style={{
                background: "linear-gradient(160deg, #f0fdfb 0%, #ffffff 60%)",
              }}
            >
              <div className="relative mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-patient-primary text-white shadow-patient-md">
                  <svg
                    width="30"
                    height="30"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </div>
                <span className="absolute inset-0 animate-ping rounded-full bg-patient-primary/20" />
              </div>

              <h1 className="text-2xl font-bold text-slate-900">
                Appointment Confirmed!
              </h1>
              <p className="mt-1.5 text-sm text-slate-500">
                Your booking has been successfully processed.
              </p>
            </div>

            {/* ── Psychologist info strip ── */}
            <div className="mx-6 mb-1 flex flex-col items-center rounded-xl border border-slate-100 bg-slate-50 px-5 py-5 text-center">
              {booking?.psychologist_photo ? (
                <img
                  src={booking.psychologist_photo}
                  alt={booking.psychologist_name}
                  className="h-16 w-16 rounded-full object-cover ring-2 ring-patient-primary/30"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-patient-primary/10 text-2xl font-bold text-patient-primary ring-2 ring-patient-primary/20">
                  {booking?.psychologist_name?.[0] || "T"}
                </div>
              )}
              <p className="mt-3 text-base font-bold text-slate-900">
                {booking?.psychologist_name || "Your Psychologist"}
              </p>
              {booking?.specialization && (
                <p className="mt-0.5 text-xs font-semibold text-patient-primary">
                  {booking.specialization}
                </p>
              )}
              <p className="mt-2 text-xs italic text-slate-400">
                "Your psychologist is looking forward to meeting you soon."
              </p>
            </div>

            {/* ── Appointment detail rows ── */}
            <div className="mx-6 mt-4 overflow-hidden rounded-xl border border-slate-100">
              {/* Date */}
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                <div className="flex items-center gap-2.5 text-sm text-slate-500">
                  <svg className="text-slate-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  Date
                </div>
                <span className="text-sm font-semibold text-slate-800">
                  {formatDate(booking?.date)}
                </span>
              </div>

              {/* Time */}
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                <div className="flex items-center gap-2.5 text-sm text-slate-500">
                  <svg className="text-slate-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  Time
                </div>
                <span className="text-sm font-semibold text-slate-800">
                  {booking?.start_time && booking?.end_time
                    ? `${formatTime(booking.start_time)} – ${formatTime(booking.end_time)}`
                    : "—"}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                <div className="flex items-center gap-2.5 text-sm text-slate-500">
                  <svg className="text-slate-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="5" width="20" height="14" rx="3" />
                    <path d="M16 12h2" />
                  </svg>
                  Wallet Used
                </div>
                <span className="text-sm font-semibold text-slate-800">
                  {formatAmount(booking?.wallet_amount)}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                <div className="flex items-center gap-2.5 text-sm text-slate-500">
                  <svg className="text-slate-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                  Razorpay Paid
                </div>
                <span className="text-sm font-semibold text-slate-800">
                  {formatAmount(booking?.razorpay_amount)}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                <div className="flex items-center gap-2.5 text-sm text-slate-500">
                  <svg className="text-slate-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="6" width="18" height="12" rx="2" />
                    <circle cx="12" cy="12" r="3" />
                    <path d="M6 9v.01M18 15v.01" />
                  </svg>
                  Total Paid
                </div>
                <span className="text-sm font-semibold text-slate-800">
                  {formatAmount(booking?.total_amount)}
                </span>
              </div>

              {/* Payment Status */}
              <div className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-2.5 text-sm text-slate-500">
                  <svg className="text-slate-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                  Payment Status
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600 ring-1 ring-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Paid Successfully
                </span>
              </div>
            </div>

            {/* ── CTA buttons ── */}
            <div className="mx-6 mt-5 flex flex-col gap-3">
              <Link
                to="/patient"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-patient-primary py-3.5 text-sm font-bold text-white transition hover:bg-patient-hover"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
                Go to Home
              </Link>

              {bookingId && (
                <Link
                  to={`/patient/appointments/${bookingId}`}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-3.5 text-sm font-bold text-slate-700 transition hover:border-patient-primary/30 hover:bg-slate-50"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  View Appointment
                </Link>
              )}
            </div>

            {/* ── Reminder note ── */}
            <div className="mx-6 my-6 flex gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3.5">
              <svg
                className="mt-0.5 flex-shrink-0 text-patient-primary"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div>
                <p className="text-xs font-bold text-slate-700">
                  Join Consultation Reminder
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                  You can join the virtual session up to 5 minutes before the
                  scheduled time from your dashboard. A secure link will also be
                  sent to your email.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <PatientFooter />
    </div>
  );
}

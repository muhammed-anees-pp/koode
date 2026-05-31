import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  bookSlot,
  cancelRazorpayOrder,
  fetchPatientPsychologistDetail,
  getWallet,
  getPsychologistSlots,
  verifyAppointmentPayment,
} from "../../../api/patient.api";
import PatientNavbar from "../../../components/patient/Navbar/PatientNavbar";
import PatientFooter from "../../../components/patient/Footer/PatientFooter";
import { usePatientSessionGuard } from "../../../hooks/usePatientSessionGuard";
import { useAuthStore } from "../../../store/auth.store";
import {
  formatIndiaDate,
  formatIndiaTime,
  getIndiaTodayISO,
  isoToCalendarDate,
  calendarDateToISO,
} from "../../../utils/indiaDateTime";
import { openRazorpayCheckout } from "../../../utils/razorpay";


const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function MiniCalendar({ selectedDate, onSelect, minDate }) {
  const [viewYear, setViewYear] = useState(() => {
    const d = isoToCalendarDate(selectedDate);
    return d.getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    const d = isoToCalendarDate(selectedDate);
    return d.getMonth();
  });

  const minDateObj = isoToCalendarDate(minDate);

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else { setViewMonth(viewMonth - 1); }
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else { setViewMonth(viewMonth + 1); }
  };

  const isDisabled = (day) => {
    const d = new Date(viewYear, viewMonth, day);
    d.setHours(0, 0, 0, 0);
    const min = new Date(minDateObj);
    min.setHours(0, 0, 0, 0);
    return d < min;
  };

  const isSelected = (day) => {
    const iso = calendarDateToISO(new Date(viewYear, viewMonth, day));
    return iso === selectedDate;
  };

  const isToday = (day) => {
    const iso = calendarDateToISO(new Date(viewYear, viewMonth, day));
    return iso === minDate;
  };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={prevMonth}
          className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 transition"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-slate-800">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 transition"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 mb-2">
        {DAYS.map((d, i) => (
          <div key={i} className="text-center text-xs font-semibold text-slate-400 py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const disabled = isDisabled(day);
          const selected = isSelected(day);
          const today = isToday(day);
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(calendarDateToISO(new Date(viewYear, viewMonth, day)))}
              className={`w-8 h-8 mx-auto text-sm rounded-full flex items-center justify-center transition font-medium
                ${selected ? "bg-patient-primary text-white shadow-patient-sm" : ""}
                ${!selected && today ? "border border-patient-primary text-patient-primary" : ""}
                ${!selected && !today && !disabled ? "text-slate-700 hover:bg-slate-100" : ""}
                ${disabled ? "text-slate-300 cursor-not-allowed" : "cursor-pointer"}
              `}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function PatientBooking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.role);
  usePatientSessionGuard();

  const today = useMemo(() => getIndiaTodayISO(), []);
  const [selectedDate, setSelectedDate] = useState(searchParams.get("date") || today);
  const [selectedSlotId, setSelectedSlotId] = useState(searchParams.get("slot") || "");
  const [feedback, setFeedback] = useState({ type: "", text: "" });
  const [useWallet, setUseWallet] = useState(false);

  const psychologistQuery = useQuery({
    queryKey: ["patient-psychologist-detail", id],
    queryFn: () => fetchPatientPsychologistDetail(id),
    enabled: !!id,
  });

  const slotsQuery = useQuery({
    queryKey: ["patient-booking-slots", id, selectedDate],
    queryFn: async () => {
      const data = await getPsychologistSlots(id, selectedDate);
      const matchingAvailability = data.find((entry) => entry.date === selectedDate);
      return (matchingAvailability?.slots ?? []).filter((slot) => !slot.is_booked);
    },
    enabled: !!id && !!selectedDate,
  });

  const walletQuery = useQuery({
    queryKey: ["patient-wallet"],
    queryFn: getWallet,
    enabled: isAuthenticated && role === "PATIENT",
  });

  const bookingMutation = useMutation({
    mutationFn: bookSlot,
    onSuccess: async (data) => {
      if (data.payment_required && data.razorpay) {
        try {
          const payment = await openRazorpayCheckout({
            key: data.razorpay.key,
            amount: data.razorpay.amount,
            currency: data.razorpay.currency,
            name: "Koode",
            description: "Appointment payment",
            order_id: data.razorpay.order_id,
          });
          const confirmedBooking = await verifyAppointmentPayment(payment);
          navigate(`/patient/payment-confirmed?booking=${confirmedBooking.id}`, { replace: true });
          return;
        } catch (error) {
          await cancelRazorpayOrder(data.razorpay.order_id).catch(() => {});
          navigate(`/patient/payment-cancelled?booking=${data.booking?.id || ""}`, { replace: true });
          throw error;
        }
      }
      if (!data.payment_required) {
        navigate(`/patient/payment-confirmed?booking=${data.booking?.id || ""}`, { replace: true });
        return;
      }
      setFeedback({ type: "success", text: "Booking completed for the selected slot." });
      setSelectedSlotId("");
      setSearchParams((params) => {
        const next = new URLSearchParams(params);
        next.set("date", selectedDate);
        next.delete("slot");
        return next;
      });
      await slotsQuery.refetch();
      await walletQuery.refetch();
    },
    onError: async (error) => {
      const apiError = error?.response?.data;
      const message =
        apiError?.non_field_errors?.[0] ||
        apiError?.detail ||
        "Unable to complete the booking or payment for this slot.";
      setFeedback({ type: "error", text: message });
      await slotsQuery.refetch();
      await walletQuery.refetch();
    },
  });

  if (!isAuthenticated || role !== "PATIENT") {
    return <Navigate to="/patient/login" replace />;
  }

  const psychologist = psychologistQuery.data;
  const availableSlots = slotsQuery.data ?? [];
  const selectedSlot = availableSlots.find((slot) => slot.id === selectedSlotId) ?? null;

  const handleDateChange = (value) => {
    setSelectedDate(value);
    setSelectedSlotId("");
    setFeedback({ type: "", text: "" });
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      next.set("date", value);
      next.delete("slot");
      return next;
    });
  };

  const handleSlotSelect = (slotId) => {
    setSelectedSlotId(slotId);
    setFeedback({ type: "", text: "" });
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      next.set("date", selectedDate);
      next.set("slot", slotId);
      return next;
    });
  };

  const handleBack = () => {
    if (window.history.state?.idx > 0) {
      navigate(-1);
      return;
    }
    navigate(`/patient/psychologists/${id}`);
  };

  const handleBook = () => {
    if (!selectedSlotId) {
      setFeedback({ type: "error", text: "Select a slot before booking." });
      return;
    }
    bookingMutation.mutate({ slotId: selectedSlot.id, walletAmount });
  };

  if (psychologistQuery.isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f8fafc] font-['DM_Sans',sans-serif] antialiased">
        <PatientNavbar />
        <main className="flex-1 px-6 pt-[7rem] pb-24">
          <div className="mx-auto max-w-[1240px] animate-pulse">
            <div className="h-8 w-48 bg-slate-200 rounded mb-8" />
            <div className="h-[600px] bg-white rounded-2xl" />
          </div>
        </main>
        <PatientFooter />
      </div>
    );
  }

  if (psychologistQuery.isError || !psychologist) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f8fafc] font-['DM_Sans',sans-serif] antialiased">
        <PatientNavbar />
        <main className="flex-1 px-6 pt-[7rem] pb-24">
          <div className="mx-auto max-w-[900px] text-center">
            <h2 className="text-2xl font-bold text-slate-900">Psychologist not found</h2>
            <Link to="/patient/psychologists" className="mt-4 inline-block text-patient-primary hover:underline">
              Back to directory
            </Link>
          </div>
        </main>
        <PatientFooter />
      </div>
    );
  }

  
  const fee = Number(psychologist.consultation_fee) || 500;
  const gst = Math.round(fee * 0.1);
  const total = fee + gst;
  const walletBalance = Number(walletQuery.data?.balance || 0);
  const walletAmount = useWallet ? Math.min(walletBalance, total) : 0;
  const razorpayAmount = Math.max(total - walletAmount, 0);

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] font-['DM_Sans',sans-serif] antialiased">
      <PatientNavbar />

      <main className="flex-1 px-6 pt-[7rem] pb-24">
        <div className="mx-auto max-w-[1200px]">
          
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Slot Selection &amp; Booking</h1>
              <p className="mt-1 text-sm text-slate-500">
                Secure your path to wellness. Choose a time that works best for you.
              </p>
            </div>
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-patient-primary/40 hover:bg-patient-light hover:text-patient-primary"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Back
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.8fr]">
            
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm h-fit">
              <p className="text-sm font-semibold text-slate-800 mb-5">Choose a Date</p>
              <MiniCalendar
                selectedDate={selectedDate}
                onSelect={handleDateChange}
                minDate={today}
              />

              
              <div className="mt-6 pt-5 border-t border-slate-100">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-patient-light flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1ABEAA" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Session Duration</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Each slot is <span className="font-semibold text-slate-600">1 hour</span> — of which{" "}
                      <span className="font-semibold text-slate-600">50 minutes</span> is your consultation time.
                      The remaining 10 minutes is a buffer for any delays or extra time needed.
                      You are only booking a 50-minute session.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            
            <div className="flex flex-col gap-5">
              
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold text-slate-800 mb-5">Select an Available Slot</p>

                {feedback.text ? (
                  <div
                    className={`mb-4 rounded-xl border px-4 py-3 text-sm font-medium ${
                      feedback.type === "success"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-red-200 bg-red-50 text-red-700"
                    }`}
                  >
                    {feedback.text}
                  </div>
                ) : null}

                {slotsQuery.isLoading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />
                    ))}
                  </div>
                ) : null}

                {!slotsQuery.isLoading && availableSlots.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {availableSlots.map((slot) => {
                      const active = slot.id === selectedSlotId;
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => handleSlotSelect(slot.id)}
                          className={`rounded-xl border px-3 py-3 text-center text-sm font-semibold transition ${
                            active
                              ? "border-patient-primary bg-patient-light text-patient-primary shadow-patient-sm"
                              : "border-slate-200 bg-white text-slate-700 hover:border-patient-primary hover:text-patient-primary"
                          }`}
                        >
                          <div>{formatIndiaTime(slot.start_time)}</div>
                          <div className="text-xs font-medium mt-0.5 opacity-80">to {formatIndiaTime(slot.end_time)}</div>
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                {!slotsQuery.isLoading && availableSlots.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
                    No available slots for {formatIndiaDate(selectedDate)}.
                  </div>
                ) : null}
              </div>

              
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                
                <div className="flex items-center gap-4 mb-5 pb-5 border-b border-slate-100">
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-slate-100 flex-shrink-0">
                    {psychologist.profile_picture ? (
                      <img
                        src={psychologist.profile_picture}
                        alt={psychologist.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-patient-primary flex items-center justify-center text-white text-xl font-bold">
                        {psychologist.full_name?.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-patient-primary uppercase tracking-wider mb-0.5">
                      Psychologist
                    </p>
                    <p className="text-base font-bold text-slate-900">{psychologist.full_name}</p>
                    {selectedSlot ? (
                      <p className="text-sm text-slate-500 mt-0.5">
                        {formatIndiaDate(selectedDate)} at{" "}
                        {formatIndiaTime(selectedSlot.start_time)}
                      </p>
                    ) : (
                      <p className="text-sm text-slate-400 mt-0.5">No slot selected</p>
                    )}
                  </div>
                </div>

                
                <div className="space-y-3 mb-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Consultation Fee</span>
                    <span className="text-sm font-semibold text-slate-800">₹{fee.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">GST (10%)</span>
                    <span className="text-sm font-semibold text-slate-800">₹{gst.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <span className="text-sm font-semibold text-slate-700">Total Payable</span>
                    <span className="text-2xl font-bold text-slate-900">₹{total.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-slate-400 text-right">Includes all applicable taxes and processing fees.</p>
                </div>

                <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-3 text-sm font-semibold text-slate-800">Payment Option</p>
                  <button
                    type="button"
                    onClick={() => setUseWallet((current) => !current)}
                    disabled={walletBalance <= 0}
                    className={`flex w-full items-center justify-between rounded-xl border bg-white px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      useWallet
                        ? "border-patient-primary ring-2 ring-patient-primary/15"
                        : "border-slate-200 hover:border-patient-primary/50"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                          useWallet ? "bg-patient-primary text-white" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="2" y="5" width="20" height="14" rx="3" />
                          <path d="M16 12h2" />
                        </svg>
                      </span>
                      <span>
                        <span className="block text-sm font-bold text-slate-800">Wallet</span>
                        <span className="block text-xs text-slate-500">Balance ₹{walletBalance.toFixed(2)}</span>
                      </span>
                    </span>
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                        useWallet ? "border-patient-primary bg-patient-primary" : "border-slate-300 bg-white"
                      }`}
                    >
                      {useWallet ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      ) : null}
                    </span>
                  </button>
                  <div className="mt-3 space-y-1 text-xs text-slate-500">
                    <div className="flex justify-between">
                      <span>Wallet</span>
                      <span>₹{walletAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Razorpay</span>
                      <span>₹{razorpayAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                
                {selectedSlot && (
                  <div className="mb-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700 font-medium">
                    Selected slot:{" "}
                    <span className="text-patient-primary font-semibold">
                      {formatIndiaTime(selectedSlot.start_time)} to {formatIndiaTime(selectedSlot.end_time)}
                    </span>
                  </div>
                )}

                
                <button
                  type="button"
                  onClick={handleBook}
                  disabled={!selectedSlot || bookingMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-patient-primary py-4 text-sm font-bold text-white transition hover:bg-patient-hover disabled:cursor-not-allowed disabled:opacity-60 shadow-patient-sm"
                >
                  {bookingMutation.isPending ? "Processing..." : "Confirm & Proceed to Payment"}
                  {!bookingMutation.isPending && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <PatientFooter />
    </div>
  );
}

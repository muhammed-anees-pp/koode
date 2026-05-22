import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import PsychologistNavbar from "../../../components/psychologist/Navbar/PsychologistNavbar";
import PsychologistSidebar from "../../../components/psychologist/Sidebar/PsychologistSidebar";
import {
  cancelPsychologistBooking,
  completePsychologistBooking,
  getPsychologistBookings,
  reschedulePsychologistBooking,
} from "../../../api/psychologist.api";
import { getPsychologistSlots } from "../../../api/patient.api";
import { usePsychologistSessionGuard } from "../../../hooks/usePsychologistSessionGuard";
import {
  compareIndiaAppointmentDateTime,
  formatIndiaDate,
  formatIndiaDateTime,
  formatIndiaTime,
  getIndiaTodayISO,
} from "../../../utils/indiaDateTime";

const STATUS_STYLES = {
  CONFIRMED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
  COMPLETED: "bg-slate-100 text-slate-700 border-slate-200",
};

const FILTER_OPTIONS = ["Upcoming", "Past", "Cancelled"];
const ITEMS_PER_PAGE = 8;

const getInitialFilter = (search) => {
  const requestedFilter = new URLSearchParams(search).get("filter");
  return FILTER_OPTIONS.includes(requestedFilter) ? requestedFilter : "Upcoming";
};

const sortAppointmentsForFilter = (appointments, activeFilter) => {
  const direction = activeFilter === "Past" || activeFilter === "Cancelled" ? -1 : 1;
  return [...appointments].sort(
    (left, right) => direction * compareIndiaAppointmentDateTime(left, right)
  );
};

const formatDateInputValue = (value) => {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
};

const getLaterDateISO = (firstDate, secondDate) =>
  firstDate >= secondDate ? firstDate : secondDate;

const isSlotAfterCurrentBooking = (slot, booking, selectedDate) => {
  if (!booking) return false;
  if (selectedDate > booking.date) return true;
  if (selectedDate < booking.date) return false;
  return slot.start_time >= booking.end_time;
};

function CancelBookingModal({
  booking,
  note,
  onChange,
  onClose,
  onSubmit,
  isPending,
  error,
}) {
  if (!booking) return null;

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/45 px-4">
      <div className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-rose-500">
              Cancel Appointment
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              {booking.patient_name}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {formatIndiaDate(booking.date)} • {formatIndiaTime(booking.start_time)} - {formatIndiaTime(booking.end_time)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="mt-6">
          <label className="mb-2 block text-sm font-medium text-slate-600">
            Cancellation note
          </label>
          <textarea
            value={note}
            onChange={(event) => onChange(event.target.value)}
            rows={5}
            placeholder="Enter the reason for cancellation"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-psycho-primary focus:bg-white"
          />
          {error ? (
            <p className="mt-2 text-sm font-medium text-rose-600">{error}</p>
          ) : null}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isPending}
            className="rounded-full bg-rose-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Cancelling..." : "Cancel appointment"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RescheduleBookingModal({
  booking,
  selectedDate,
  onDateChange,
  selectedSlotId,
  onSlotSelect,
  note,
  onNoteChange,
  onClose,
  onSubmit,
  isPending,
  error,
}) {
  const dateInputRef = useRef(null);
  const slotsQuery = useQuery({
    queryKey: ["psychologist-reschedule-slots", booking?.id, selectedDate],
    queryFn: async () => {
      const data = await getPsychologistSlots(booking.psychologist, selectedDate);
      const matchingAvailability = data.find((entry) => entry.date === selectedDate);
      return (matchingAvailability?.slots ?? []).filter(
        (slot) =>
          !slot.is_booked && isSlotAfterCurrentBooking(slot, booking, selectedDate)
      );
    },
    enabled: Boolean(booking && selectedDate),
  });

  if (!booking) return null;

  const availableSlots = slotsQuery.data ?? [];

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <div className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-psycho-primary">
              Reschedule Appointment
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              {booking.patient_name}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Current: {formatIndiaDate(booking.date)} • {formatIndiaTime(booking.start_time)} - {formatIndiaTime(booking.end_time)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="mt-6">
          <label className="mb-2 block text-sm font-medium text-slate-600">
            Choose the date
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                if (typeof dateInputRef.current?.showPicker === "function") {
                  dateInputRef.current.showPicker();
                } else {
                  dateInputRef.current?.focus();
                  dateInputRef.current?.click();
                }
              }}
              className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 transition hover:border-slate-300"
            >
              <span>{formatDateInputValue(selectedDate)}</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </button>
            <input
              ref={dateInputRef}
              type="date"
              min={getLaterDateISO(getIndiaTodayISO(), booking.date)}
              value={selectedDate}
              onChange={(event) => onDateChange(event.target.value)}
              className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
              tabIndex={-1}
              aria-hidden="true"
            />
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Available Slots</h3>
            <span className="text-sm text-slate-500">
              {availableSlots.length} slot{availableSlots.length === 1 ? "" : "s"}
            </span>
          </div>

          {slotsQuery.isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-14 animate-pulse rounded-2xl bg-slate-100" />
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
                    onClick={() => onSlotSelect(slot.id)}
                    className={`rounded-2xl border px-4 py-4 text-left transition ${
                      active
                        ? "border-psycho-primary bg-[#e8f4fd] text-psycho-primary shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="text-sm font-semibold">
                      {formatIndiaTime(slot.start_time)} - {formatIndiaTime(slot.end_time)}
                    </div>
                    <div className="mt-1 text-xs font-medium">
                      {active ? "Selected" : "Tap to select"}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}

          {!slotsQuery.isLoading && availableSlots.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-sm text-slate-500">
              No available slots for {formatIndiaDate(selectedDate)}.
            </div>
          ) : null}
        </div>

        <div className="mt-6">
          <label className="mb-2 block text-sm font-medium text-slate-600">
            Reschedule note
          </label>
          <textarea
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
            rows={4}
            placeholder="Add a note for this reschedule"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-psycho-primary focus:bg-white"
          />
          {error ? (
            <p className="mt-2 text-sm font-medium text-rose-600">{error}</p>
          ) : null}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isPending}
            className="rounded-full bg-psycho-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-psycho-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Rescheduling..." : "Reschedule"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConsultationNoteModal({ booking, noteType, onClose }) {
  if (!booking || !noteType) return null;

  const patientNote = booking.consultation?.patient_note || "";
  const psychologistNote = booking.consultation?.psychologist_note || "";
  const isPatientNote = noteType === "patient";
  const title = isPatientNote ? "Prescription" : "Consultation note";
  const content = isPatientNote ? patientNote : psychologistNote;

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/50 px-4 py-6" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={`text-xs font-bold uppercase tracking-[0.14em] ${isPatientNote ? "text-emerald-700" : "text-sky-700"}`}>
              {title}
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">{booking.patient_name}</h2>
            <p className="mt-2 text-sm text-slate-600">
              {formatIndiaDate(booking.date)} - {formatIndiaTime(booking.start_time)} to {formatIndiaTime(booking.end_time)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close note"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <p className="mt-6 max-h-[52vh] overflow-y-auto whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700">
          {content || `No ${title.toLowerCase()} saved for this consultation.`}
        </p>
      </div>
    </div>
  );
}

function ConsultationNoteButtons({ booking, onOpenNote }) {
  if (booking.status !== "COMPLETED") return null;

  return (
    <div className="mt-5 flex flex-wrap gap-3">
      <button
        type="button"
        onClick={() => onOpenNote(booking, "patient")}
        className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
      >
        Prescription
      </button>
      <button
        type="button"
        onClick={() => onOpenNote(booking, "clinical")}
        className="rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
      >
        Consultation note
      </button>
    </div>
  );
}

function PatientSummaryModal({ booking, onClose }) {
  const summary = booking?.patient_summary?.summary || "";
  if (!booking || !summary) return null;

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/50 px-4 py-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-psycho-primary">
              Patient Summary
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">{booking.patient_name}</h2>
            <p className="mt-2 text-sm text-slate-600">
              Available from previous completed consultations.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close summary"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <p className="mt-6 max-h-[58vh] overflow-y-auto whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700">
          {summary}
        </p>
      </div>
    </div>
  );
}

export default function PsychologistAppointments() {
  usePsychologistSessionGuard();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const dateInputRef = useRef(null);
  const [activeFilter, setActiveFilter] = useState(() => getInitialFilter(location.search));
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelNote, setCancelNote] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState(getIndiaTodayISO());
  const [rescheduleSlotId, setRescheduleSlotId] = useState("");
  const [rescheduleNote, setRescheduleNote] = useState("");
  const [rescheduleError, setRescheduleError] = useState("");
  const [noteModal, setNoteModal] = useState({ booking: null, type: null });
  const [summaryBooking, setSummaryBooking] = useState(null);

  const bookingsQuery = useQuery({
    queryKey: ["psychologist-appointments"],
    queryFn: getPsychologistBookings,
    refetchInterval: 30000,
  });

  const today = useMemo(() => getIndiaTodayISO(), []);
  const filteredBookings = useMemo(() => {
    let bookings = bookingsQuery.data ?? [];

    if (activeFilter === "Past") {
      bookings = bookings.filter((b) => b.status === "COMPLETED");
    } else if (activeFilter === "Cancelled") {
      bookings = bookings.filter((b) => b.status === "CANCELLED");
    } else {
      bookings = bookings.filter(
        (b) => b.date >= today && b.status !== "COMPLETED" && b.status !== "CANCELLED"
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      bookings = bookings.filter((b) => b.patient_name?.toLowerCase().includes(q));
    }

    if (dateFilter) {
      bookings = bookings.filter((b) => b.date === dateFilter);
    }

    return sortAppointmentsForFilter(bookings, activeFilter);
  }, [activeFilter, bookingsQuery.data, today, searchQuery, dateFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedBookings = useMemo(
    () => filteredBookings.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE),
    [filteredBookings, safePage]
  );

  const cancelMutation = useMutation({
    mutationFn: ({ bookingId, note }) => cancelPsychologistBooking(bookingId, note),
    onSuccess: async () => {
      setCancelTarget(null);
      setCancelNote("");
      setCancelError("");
      await queryClient.invalidateQueries({ queryKey: ["psychologist-appointments"] });
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

  const rescheduleMutation = useMutation({
    mutationFn: ({ bookingId, slotId, note }) =>
      reschedulePsychologistBooking(bookingId, {
        slot_id: slotId,
        note,
      }),
    onSuccess: async () => {
      setRescheduleTarget(null);
      setRescheduleSlotId("");
      setRescheduleNote("");
      setRescheduleError("");
      await queryClient.invalidateQueries({ queryKey: ["psychologist-appointments"] });
    },
    onError: (error) => {
      const apiError = error?.response?.data;
      const message =
        apiError?.note?.[0] ||
        apiError?.slot_id?.[0] ||
        apiError?.non_field_errors?.[0] ||
        apiError?.detail ||
        "Unable to reschedule this appointment.";
      setRescheduleError(message);
    },
  });

  const completeMutation = useMutation({
    mutationFn: completePsychologistBooking,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["psychologist-appointments"] });
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

    cancelMutation.mutate({
      bookingId: cancelTarget.id,
      note: cancelNote.trim(),
    });
  };

  const openRescheduleModal = (booking) => {
    setRescheduleTarget(booking);
    setRescheduleDate(booking.date >= today ? booking.date : today);
    setRescheduleSlotId("");
    setRescheduleNote("");
    setRescheduleError("");
  };

  const submitReschedule = () => {
    if (!rescheduleSlotId) {
      setRescheduleError("Select an available slot to continue");
      return;
    }

    if (!rescheduleNote.trim()) {
      setRescheduleError("Reschedule note is required");
      return;
    }

    rescheduleMutation.mutate({
      bookingId: rescheduleTarget.id,
      slotId: rescheduleSlotId,
      note: rescheduleNote.trim(),
    });
  };

  return (
    <div className="min-h-screen bg-[#eef0f5] text-gray-900 flex flex-col">
      <PsychologistNavbar />

      <div className="flex flex-1">
        <PsychologistSidebar />

        <main className="min-w-0 flex-1 px-6 py-8">
          <div className="mx-auto max-w-6xl">
                        
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-slate-900">Appointments</h1>
              <p className="mt-1 text-sm text-slate-500">Review and manage your patient sessions.</p>
              <div className="mt-3 h-1 w-10 rounded-full bg-psycho-primary" />
            </div>

                        <section className="mt-0">
              
              <div className="mb-5 flex flex-wrap gap-3">
                {FILTER_OPTIONS.map((option) => {
                  const active = option === activeFilter;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setActiveFilter(option);
                        setDateFilter("");
                        setSearchQuery("");
                        setCurrentPage(1);
                      }}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        active
                          ? "bg-psycho-primary text-white shadow-[0_4px_16px_rgba(17,136,216,0.22)]"
                          : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>

              <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    placeholder="Search by patient name..."
                    className="w-full rounded-2xl border border-slate-200 bg-white pl-9 pr-4 py-2.5 text-sm text-slate-700 outline-none focus:border-psycho-primary focus:ring-1 focus:ring-psycho-primary/20 transition"
                  />
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof dateInputRef.current?.showPicker === "function") {
                        dateInputRef.current.showPicker();
                      } else {
                        dateInputRef.current?.focus();
                        dateInputRef.current?.click();
                      }
                    }}
                    className="w-full flex items-center gap-2 rounded-2xl border border-slate-200 bg-white pl-9 pr-9 py-2.5 text-sm text-slate-700 outline-none hover:border-slate-300 transition text-left"
                  >
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <span className={dateFilter ? "text-slate-800" : "text-slate-400"}>
                      {dateFilter ? formatDateInputValue(dateFilter) : "Filter by date"}
                    </span>
                  </button>
                  <input
                    ref={dateInputRef}
                    type="date"
                    value={dateFilter}
                    onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); }}
                    className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
                    tabIndex={-1}
                    aria-hidden="true"
                  />
                  {dateFilter && (
                    <button
                      type="button"
                      onClick={() => { setDateFilter(""); setCurrentPage(1); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition z-10"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {bookingsQuery.isLoading ? (
                <div className="grid gap-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-36 animate-pulse rounded-[28px] bg-white" />
                  ))}
                </div>
              ) : null}

              {bookingsQuery.isError ? (
                <div className="rounded-[28px] border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-700">
                  Unable to load appointments right now.
                </div>
              ) : null}

              {!bookingsQuery.isLoading && !bookingsQuery.isError && filteredBookings.length === 0 ? (
                <div className="rounded-[32px] border border-dashed border-slate-200 bg-white px-8 py-16 text-center">
                  <h2 className="text-xl font-semibold text-slate-900">No {activeFilter.toLowerCase()} appointments</h2>
                  <p className="mt-3 text-sm text-slate-500">
                    Matching patient bookings will appear here.
                  </p>
                </div>
              ) : null}

              <div className="grid gap-4">
                {paginatedBookings.map((booking) => (
                  <article
                    key={booking.id}
                    className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Patient
                        </p>
                        <h2 className="mt-2 text-xl font-bold text-slate-900">
                          {booking.patient_name}
                        </h2>
                        <p className="mt-3 text-sm text-slate-600">
                          {formatIndiaDate(booking.date)}
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-700">
                          {formatIndiaTime(booking.start_time)} - {formatIndiaTime(booking.end_time)}
                        </p>
                        {activeFilter === "Upcoming" ? (
                          <div className="mt-4 flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() => navigate(`/psychologist/consultation/${booking.id}`)}
                              disabled={booking.status !== "CONFIRMED" || !booking.consultation?.is_open}
                              className="rounded-full border border-emerald-200 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                            >
                              {booking.consultation?.is_open
                                ? "Enter consultation"
                                : booking.consultation?.opens_at
                                  ? `Opens ${formatIndiaDateTime(booking.consultation.opens_at)}`
                                  : "Room inactive"}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                navigate(`/psychologist/messages?appointment=${booking.id}`)
                              }
                              className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                            >
                              Open chat
                            </button>
                            {booking.patient_summary?.summary ? (
                              <button
                                type="button"
                                onClick={() => setSummaryBooking(booking)}
                                className="rounded-full border border-psycho-primary/20 bg-[#e8f4fd] px-4 py-2 text-sm font-semibold text-psycho-primary transition hover:bg-sky-100"
                              >
                                Summary
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => openRescheduleModal(booking)}
                              className="rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
                            >
                              Reschedule
                            </button>
                            <button
                              type="button"
                              onClick={() => openCancelModal(booking)}
                              className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
                            >
                              Cancel appointment
                            </button>
                            <button
                              type="button"
                              onClick={() => completeMutation.mutate(booking.id)}
                              disabled={completeMutation.isPending || booking.payment_status !== "PAID"}
                              className="rounded-full border border-slate-200 bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Mark completed
                            </button>
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-col items-start gap-3 md:items-end">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                            STATUS_STYLES[booking.status] || STATUS_STYLES.PENDING
                          }`}
                        >
                          {booking.status}
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                          Payment: {booking.payment_status}
                        </span>
                      </div>
                    </div>
                    <ConsultationNoteButtons
                      booking={booking}
                      onOpenNote={(target, type) => setNoteModal({ booking: target, type })}
                    />
                  </article>
                ))}
              </div>

              {!bookingsQuery.isLoading && !bookingsQuery.isError && totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between gap-4">
                  <p className="text-sm text-slate-500">
                    Showing{" "}
                    <span className="font-semibold text-slate-700">
                      {(safePage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safePage * ITEMS_PER_PAGE, filteredBookings.length)}
                    </span>
                    {" "}of{" "}
                    <span className="font-semibold text-slate-700">{filteredBookings.length}</span>
                  </p>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={safePage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="15 18 9 12 15 6" />
                      </svg>
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                      .reduce((acc, p, idx, arr) => {
                        if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((item, idx) =>
                        item === "..." ? (
                          <span key={`ellipsis-${idx}`} className="px-1 text-sm text-slate-400">…</span>
                        ) : (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setCurrentPage(item)}
                            className={`h-9 min-w-[36px] rounded-xl border px-3 text-sm font-semibold transition ${
                              safePage === item
                                ? "border-psycho-primary bg-psycho-primary text-white shadow-[0_2px_10px_rgba(17,136,216,0.25)]"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            {item}
                          </button>
                        )
                      )}

                    
                    <button
                      type="button"
                      disabled={safePage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>

      <CancelBookingModal
        booking={cancelTarget}
        note={cancelNote}
        onChange={setCancelNote}
        onClose={() => {
          setCancelTarget(null);
          setCancelNote("");
          setCancelError("");
        }}
        onSubmit={submitCancel}
        isPending={cancelMutation.isPending}
        error={cancelError}
      />

      <RescheduleBookingModal
        booking={rescheduleTarget}
        selectedDate={rescheduleDate}
        onDateChange={(value) => {
          setRescheduleDate(value);
          setRescheduleSlotId("");
          setRescheduleError("");
        }}
        selectedSlotId={rescheduleSlotId}
        onSlotSelect={(slotId) => {
          setRescheduleSlotId(slotId);
          setRescheduleError("");
        }}
        note={rescheduleNote}
        onNoteChange={setRescheduleNote}
        onClose={() => {
          setRescheduleTarget(null);
          setRescheduleSlotId("");
          setRescheduleNote("");
          setRescheduleError("");
        }}
        onSubmit={submitReschedule}
        isPending={rescheduleMutation.isPending}
        error={rescheduleError}
      />

      <ConsultationNoteModal
        booking={noteModal.booking}
        noteType={noteModal.type}
        onClose={() => setNoteModal({ booking: null, type: null })}
      />
      <PatientSummaryModal
        booking={summaryBooking}
        onClose={() => setSummaryBooking(null)}
      />

    </div>
  );
}

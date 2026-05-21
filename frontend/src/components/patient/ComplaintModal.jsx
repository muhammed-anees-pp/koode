import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { fetchEligibleComplaintBookings, submitComplaint } from "../../api/complaints.api";
import { formatIndiaDate, formatIndiaDateTime, formatIndiaTime } from "../../utils/indiaDateTime";

const categories = [
  ["PSYCHOLOGIST_BEHAVIOR", "Psychologist behavior"],
  ["SESSION_ENDED_EARLY", "Session ended early"],
  ["CONSULTATION_QUALITY", "Consultation quality"],
  ["TECHNICAL_ISSUE", "Technical issue"],
  ["PRIVACY_CONCERN", "Privacy concern"],
  ["PAYMENT_ISSUE", "Payment issue"],
  ["OTHER", "Other"],
];

const initialForm = {
  category: "",
  severity: "MEDIUM",
  subject: "",
  description: "",
  evidence: [],
};

const fieldCls = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-patient-primary focus:ring-2 focus:ring-patient-primary/15";

function normalizeBooking(booking) {
  if (!booking) return null;
  return {
    id: booking.id || booking.booking_id,
    psychologist_name: booking.psychologist_name || booking.consultation?.psychologist?.full_name,
    date: booking.date || booking.consultation?.date,
    start_time: booking.start_time || booking.consultation?.start_time,
    end_time: booking.end_time || booking.consultation?.end_time,
    actual_end_time: booking.actual_end_time || booking.complaint?.actual_end_time || booking.consultation?.actual_end_time,
    complaint_allowed_until: booking.complaint_allowed_until || booking.complaint?.complaint_allowed_until,
  };
}

function ConsultationCard({ booking }) {
  const normalized = normalizeBooking(booking);
  if (!normalized) return null;
  return (
    <div className="rounded-xl border border-teal-100 bg-teal-50/60 p-4">
      <h3 className="font-semibold text-slate-900">{normalized.psychologist_name}</h3>
      <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
        <p><span className="font-semibold text-slate-700">Appointment ID:</span> {normalized.id}</p>
        <p><span className="font-semibold text-slate-700">Date:</span> {formatIndiaDate(normalized.date)}</p>
        <p><span className="font-semibold text-slate-700">Slot:</span> {formatIndiaTime(normalized.start_time)} - {formatIndiaTime(normalized.end_time)}</p>
        <p><span className="font-semibold text-slate-700">Session Ended:</span> {formatIndiaDateTime(normalized.actual_end_time)}</p>
      </div>
    </div>
  );
}

export default function ComplaintModal({ open, booking, onClose, onSuccess }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [successComplaint, setSuccessComplaint] = useState(null);

  const fixedBooking = useMemo(() => normalizeBooking(booking), [booking]);
  const activeBooking = fixedBooking || selectedBooking;
  const needsSelection = open && !fixedBooking && !activeBooking;

  const eligibleQuery = useQuery({
    queryKey: ["eligible-complaint-bookings"],
    queryFn: fetchEligibleComplaintBookings,
    enabled: needsSelection,
  });

  const mutation = useMutation({
    mutationFn: submitComplaint,
    onSuccess: async (complaint) => {
      setSuccessComplaint(complaint);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["patient-appointments"] }),
        queryClient.invalidateQueries({ queryKey: ["patient-complaints"] }),
        queryClient.invalidateQueries({ queryKey: ["eligible-complaint-bookings"] }),
      ]);
      onSuccess?.(complaint);
    },
  });

  if (!open) return null;

  const closeAll = () => {
    setSelectedBooking(null);
    setForm(initialForm);
    setSuccessComplaint(null);
    mutation.reset();
    onClose();
  };

  const apiError = mutation.error?.response?.data;
  const errorMessage =
    apiError?.non_field_errors?.[0] ||
    apiError?.detail ||
    apiError?.subject?.[0] ||
    apiError?.description?.[0] ||
    apiError?.category?.[0] ||
    null;

  const submit = (event) => {
    event.preventDefault();
    if (!activeBooking) return;
    mutation.mutate({
      bookingId: activeBooking.id,
      category: form.category,
      severity: form.severity,
      subject: form.subject,
      description: form.description,
      evidence: form.evidence,
    });
  };

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-slate-950/55 px-4 py-6" onClick={closeAll}>
      <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        {successComplaint ? (
          <div className="p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <h2 className="mt-5 text-2xl font-bold text-slate-900">Complaint Submitted Successfully</h2>
            <p className="mt-2 text-sm text-slate-500">Complaint ID: <span className="font-semibold text-slate-800">{successComplaint.complaint_id}</span></p>
            <p className="mt-1 text-sm text-slate-500">Status: {successComplaint.status_display || "Pending Review"}</p>
            <button
              type="button"
              onClick={() => {
                closeAll();
                navigate("/patient/complaints");
              }}
              className="mt-7 rounded-xl bg-patient-primary px-6 py-3 text-sm font-semibold text-white shadow-patient-sm transition hover:bg-patient-hover"
            >
              Go To Complaints
            </button>
          </div>
        ) : needsSelection ? (
          <div className="max-h-[92vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Select Consultation</h2>
                <p className="mt-1 text-sm text-slate-500">Only completed appointments inside the complaint window are shown.</p>
              </div>
              <button type="button" onClick={closeAll} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Close">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {eligibleQuery.isLoading && <div className="h-24 animate-pulse rounded-xl bg-slate-100" />}
              {eligibleQuery.isError && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">Unable to load eligible consultations.</p>}
              {!eligibleQuery.isLoading && !eligibleQuery.isError && (eligibleQuery.data || []).length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
                  <p className="font-semibold text-slate-800">No eligible consultations</p>
                  <p className="mt-1 text-sm text-slate-500">Complaints can only be raised within the allowed window after a completed consultation.</p>
                </div>
              )}
              {(eligibleQuery.data || []).map((item) => (
                <button key={item.id} type="button" onClick={() => setSelectedBooking(normalizeBooking(item))} className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-patient-primary hover:bg-teal-50">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{item.psychologist_name}</p>
                      <p className="mt-1 text-sm text-slate-500">Session Ended: {formatIndiaDateTime(item.actual_end_time)}</p>
                      <p className="text-sm text-slate-500">Available Till: {formatIndiaDateTime(item.complaint_allowed_until)}</p>
                    </div>
                    <span className="rounded-xl bg-patient-primary px-4 py-2 text-sm font-semibold text-white">Select</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="max-h-[92vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Raise Complaint</h2>
                <p className="mt-1 text-sm text-slate-500">Please describe the issue regarding this consultation.</p>
              </div>
              <button type="button" onClick={closeAll} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Close">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            <div className="mt-5">
              <ConsultationCard booking={activeBooking} />
            </div>

            <div className="mt-5 grid gap-4">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Select Issue Type</span>
                <select required value={form.category} onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))} className={fieldCls}>
                  <option value="">Choose category</option>
                  {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Subject</span>
                <input required value={form.subject} onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))} className={fieldCls} placeholder="Session ended too early" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Severity</span>
                <select value={form.severity} onChange={(event) => setForm((prev) => ({ ...prev, severity: event.target.value }))} className={fieldCls}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Describe your concern</span>
                <textarea required rows={5} value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} className={`${fieldCls} resize-none`} placeholder="Write the details clearly..." />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Upload Screenshot / File</span>
                <input type="file" multiple onChange={(event) => setForm((prev) => ({ ...prev, evidence: Array.from(event.target.files || []) }))} className="w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-patient-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white" />
              </label>
            </div>

            {errorMessage && <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{errorMessage}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={closeAll} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={mutation.isPending} className="rounded-xl bg-patient-primary px-5 py-2.5 text-sm font-semibold text-white shadow-patient-sm transition hover:bg-patient-hover disabled:cursor-not-allowed disabled:opacity-60">
                {mutation.isPending ? "Submitting..." : "Submit Complaint"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

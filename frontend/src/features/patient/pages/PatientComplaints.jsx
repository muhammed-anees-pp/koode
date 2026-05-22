import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchPatientComplaints } from "../../../api/complaints.api";
import ComplaintModal from "../../../components/patient/ComplaintModal";
import PatientFooter from "../../../components/patient/Footer/PatientFooter";
import PatientNavbar from "../../../components/patient/Navbar/PatientNavbar";
import { usePatientSessionGuard } from "../../../hooks/usePatientSessionGuard";
import { useAuthStore } from "../../../store/auth.store";
import { formatIndiaDate, formatIndiaDateTime, formatIndiaTime } from "../../../utils/indiaDateTime";

const statusOptions = [
  ["OPEN", "Open"],
  ["ALL", "All"],
  ["PENDING_REVIEW", "Pending"],
  ["UNDER_REVIEW", "Under Review"],
  ["PSYCHOLOGIST_RESPONSE_SUBMITTED", "Response Submitted"],
  ["RESOLVED", "Resolved"],
  ["REJECTED", "Rejected"],
];

const statusStyles = {
  PENDING_REVIEW: "bg-amber-100 text-amber-700 border-amber-200",
  UNDER_REVIEW: "bg-sky-100 text-sky-700 border-sky-200",
  PSYCHOLOGIST_RESPONSE_SUBMITTED: "bg-violet-100 text-violet-700 border-violet-200",
  RESOLVED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  REJECTED: "bg-rose-100 text-rose-700 border-rose-200",
};

function StatusBadge({ complaint }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${statusStyles[complaint?.status] || "border-slate-200 bg-slate-100 text-slate-600"}`}>
      {complaint?.status_display || complaint?.status || "Pending"}
    </span>
  );
}

function InfoLine({ label, value }) {
  const isEmpty = value === null || value === undefined || value === "";
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-1 text-sm font-medium ${isEmpty ? "text-rose-600" : "text-slate-800"}`}>{isEmpty ? "Not filled" : value}</p>
    </div>
  );
}

function ComplaintDetails({ complaint }) {
  if (!complaint) {
    return (
      <div className="flex h-full min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
        <div>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" /></svg>
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-800">Select a complaint</h2>
          <p className="mt-1 text-sm text-slate-500">Complaint details and timeline will appear here.</p>
        </div>
      </div>
    );
  }

  const consultation = complaint.consultation || {};
  const psychologist = consultation.psychologist || {};

  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Complaint Details</h2>
          <p className="mt-1 text-sm text-slate-500">{complaint.complaint_id}</p>
        </div>
        <StatusBadge complaint={complaint} />
      </div>

      <div className="space-y-5 p-5">
        <div className="grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
          <InfoLine label="Complaint ID" value={complaint.complaint_id} />
          <InfoLine label="Created On" value={formatIndiaDateTime(complaint.created_at)} />
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Consultation Details</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <InfoLine label="Psychologist" value={psychologist.full_name} />
            <InfoLine label="Appointment ID" value={consultation.booking_id} />
            <InfoLine label="Slot" value={`${formatIndiaDate(consultation.date)} | ${formatIndiaTime(consultation.start_time)} - ${formatIndiaTime(consultation.end_time)}`} />
            <InfoLine label="Session Ended" value={formatIndiaDateTime(consultation.actual_end_time)} />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Complaint Content</h3>
          <div className="mt-4 space-y-4">
            <InfoLine label="Category" value={complaint.category_display} />
            <InfoLine label="Subject" value={complaint.subject} />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Description</p>
              <p className="mt-2 whitespace-pre-line rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">{complaint.description}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Attachments</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {(complaint.attachments || []).length === 0 ? (
              <p className="text-sm text-slate-500">No attachments uploaded.</p>
            ) : (
              complaint.attachments.map((attachment) => (
                <a key={attachment.id} href={attachment.file_url} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-patient-primary transition hover:bg-teal-50">
                  View File
                </a>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Timeline</h3>
          <div className="mt-4 space-y-4">
            {(complaint.timeline || []).map((event) => (
              <div key={event.id} className="relative border-l-2 border-teal-100 pl-4">
                <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-patient-primary" />
                <p className="text-xs font-semibold text-slate-400">{formatIndiaDateTime(event.created_at)}</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{event.title}</p>
                {event.note ? <p className="mt-1 text-sm leading-6 text-slate-600">{event.note}</p> : null}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Admin Response</h3>
          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">{complaint.admin_response || "No admin response yet."}</p>
        </div>

        {complaint.resolved_at ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <InfoLine label="Final Resolution" value={`${complaint.status_display} on ${formatIndiaDateTime(complaint.resolved_at)}`} />
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default function PatientComplaints() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.role);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("OPEN");
  const [selectedId, setSelectedId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  usePatientSessionGuard();

  const queryArgs = useMemo(() => ({ search, status }), [search, status]);
  const complaintsQuery = useQuery({
    queryKey: ["patient-complaints", queryArgs],
    queryFn: () => fetchPatientComplaints(queryArgs),
    enabled: isAuthenticated && role === "PATIENT",
  });

  const complaints = useMemo(() => complaintsQuery.data || [], [complaintsQuery.data]);
  const selectedComplaint = complaints.find((item) => item.id === selectedId) || complaints[0] || null;

  if (!isAuthenticated || role !== "PATIENT") {
    return <Navigate to="/patient/login" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] font-['DM_Sans',sans-serif]">
      <PatientNavbar />
      <main className="flex-1 px-4 pt-[7rem] pb-20 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Complaints</h1>
              <p className="mt-1 text-sm text-slate-500">Track complaint status, responses, and resolution history.</p>
              <div className="mt-3 h-1 w-12 rounded-full bg-patient-primary" />
            </div>
            <button type="button" onClick={() => setModalOpen(true)} className="rounded-xl bg-patient-primary px-5 py-3 text-sm font-semibold text-white shadow-patient-sm transition hover:bg-patient-hover">
              Raise Complaint
            </button>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
            <aside className="rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 p-4">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search Complaint ID / Subject" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-patient-primary focus:bg-white" />
                </div>
                <select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-patient-primary">
                  {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>

              <div className="max-h-[650px] overflow-y-auto p-3">
                {complaintsQuery.isLoading && Array.from({ length: 4 }).map((_, index) => <div key={index} className="mb-3 h-28 animate-pulse rounded-xl bg-slate-100" />)}
                {complaintsQuery.isError && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">Unable to load complaints.</p>}
                {!complaintsQuery.isLoading && !complaintsQuery.isError && complaints.length === 0 && (
                  <div className="px-4 py-12 text-center">
                    <p className="font-semibold text-slate-800">No complaints found</p>
                    <p className="mt-1 text-sm text-slate-500">You have not raised any complaints yet.</p>
                    <button type="button" onClick={() => setModalOpen(true)} className="mt-5 rounded-xl bg-patient-primary px-4 py-2 text-sm font-semibold text-white">Raise Complaint</button>
                  </div>
                )}
                {complaints.map((complaint) => (
                  <button key={complaint.id} type="button" onClick={() => setSelectedId(complaint.id)} className={`mb-3 w-full rounded-xl border p-4 text-left transition ${selectedComplaint?.id === complaint.id ? "border-patient-primary bg-teal-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-bold text-slate-900">{complaint.complaint_id}</p>
                      <StatusBadge complaint={complaint} />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-800">{complaint.subject}</p>
                    <p className="mt-1 text-sm text-slate-500">Dr. {complaint.consultation?.psychologist?.full_name}</p>
                    <p className="mt-2 text-xs text-slate-400">{formatIndiaDateTime(complaint.created_at)}</p>
                  </button>
                ))}
              </div>
            </aside>

            <ComplaintDetails complaint={selectedComplaint} />
          </div>
        </div>
      </main>
      <PatientFooter />
      <ComplaintModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}

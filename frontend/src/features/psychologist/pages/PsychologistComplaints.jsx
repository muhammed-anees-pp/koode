import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import {
  fetchPsychologistComplaintDetail,
  fetchPsychologistComplaints,
  submitPsychologistComplaintResponse,
} from "../../../api/complaints.api";
import PsychologistNavbar from "../../../components/psychologist/Navbar/PsychologistNavbar";
import PsychologistSidebar from "../../../components/psychologist/Sidebar/PsychologistSidebar";
import { usePsychologistSessionGuard } from "../../../hooks/usePsychologistSessionGuard";
import { useAuthStore } from "../../../store/auth.store";
import { uppercaseMeridiem } from "../../../utils/indiaDateTime";

const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-psycho-primary";
const invalidInputCls = "border-rose-400 bg-rose-50/50 focus:border-rose-500 focus:ring-2 focus:ring-rose-100";
const errorTextCls = "text-sm font-semibold text-rose-600";

function firstError(value) {
  if (!value) return "";
  if (Array.isArray(value)) return value[0] || "";
  return String(value);
}

const statusOptions = [
  ["OPEN", "Open"],
  ["ALL", "All"],
  ["PSYCHOLOGIST_RESPONSE_SUBMITTED", "Response Submitted"],
  ["RESOLVED", "Resolved"],
  ["REJECTED", "Rejected"],
];

const statusStyles = {
  PENDING_REVIEW: "border-amber-200 bg-amber-50 text-amber-700",
  UNDER_REVIEW: "border-sky-200 bg-sky-50 text-sky-700",
  PSYCHOLOGIST_RESPONSE_SUBMITTED: "border-violet-200 bg-violet-50 text-violet-700",
  RESOLVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  REJECTED: "border-rose-200 bg-rose-50 text-rose-700",
};

const formatDateTime = (value) => {
  if (!value) return "-";
  return uppercaseMeridiem(new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value)));
};

const formatDate = (value) => {
  if (!value) return "-";
  const [year, month, day] = String(value).split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(Date.UTC(year, month - 1, day, 12)));
};

const formatTime = (value) => {
  if (!value) return "-";
  const [hours = "0", minutes = "0"] = String(value).split(":");
  return uppercaseMeridiem(new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "UTC" }).format(new Date(Date.UTC(2026, 0, 1, Number(hours), Number(minutes)))));
};

function Badge({ complaint }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-extrabold uppercase ${statusStyles[complaint?.status] || "border-slate-200 bg-slate-50 text-slate-600"}`}>
      {complaint?.status_display || "Under Review"}
    </span>
  );
}

function DetailLine({ label, value }) {
  const isEmpty = value === null || value === undefined || value === "";
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${isEmpty ? "text-rose-600" : "text-slate-800"}`}>{isEmpty ? "Not filled" : value}</p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="border-b border-slate-100 pb-5 last:border-0">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{title}</h3>
      {children}
    </section>
  );
}

export default function PsychologistComplaints() {
  usePsychologistSessionGuard();
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.role);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("OPEN");
  const [selectedId, setSelectedId] = useState(null);
  const [responseDrafts, setResponseDrafts] = useState({});
  const [evidenceDrafts, setEvidenceDrafts] = useState({});
  const [responseAttempted, setResponseAttempted] = useState(false);

  const listQuery = useQuery({
    queryKey: ["psychologist-complaints", search, status],
    queryFn: () => fetchPsychologistComplaints({ search, status }),
    enabled: isAuthenticated && role === "PSYCHOLOGIST",
  });
  const complaints = useMemo(() => listQuery.data || [], [listQuery.data]);
  const activeComplaintId = complaints.some((item) => item.id === selectedId)
    ? selectedId
    : complaints[0]?.id || null;

  const detailQuery = useQuery({
    queryKey: ["psychologist-complaint-detail", activeComplaintId],
    queryFn: () => fetchPsychologistComplaintDetail(activeComplaintId),
    enabled: Boolean(activeComplaintId) && isAuthenticated && role === "PSYCHOLOGIST",
  });

  const complaint = detailQuery.data;
  const consultation = complaint?.consultation || {};
  const canRespond = complaint?.status === "UNDER_REVIEW";
  const alreadyResponded = Boolean(complaint?.psychologist_response);
  const response = complaint ? responseDrafts[complaint.id] ?? complaint.psychologist_response ?? "" : "";
  const evidence = complaint ? evidenceDrafts[complaint.id] || [] : [];

  const mutation = useMutation({
    mutationFn: submitPsychologistComplaintResponse,
    onSuccess: async (updated) => {
      setResponseAttempted(false);
      setResponseDrafts((current) => ({ ...current, [updated.id]: updated.psychologist_response || "" }));
      setEvidenceDrafts((current) => ({ ...current, [updated.id]: [] }));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["psychologist-complaints"] }),
        queryClient.invalidateQueries({ queryKey: ["psychologist-complaint-detail", updated.id] }),
      ]);
    },
  });
  const apiError = mutation.error?.response?.data;
  const fieldErrors = {
    response: firstError(apiError?.response),
    evidence: firstError(apiError?.evidence),
  };
  const validationErrors = {
    response: responseAttempted && canRespond && !alreadyResponded && !response.trim() ? "Response is required." : fieldErrors.response,
    evidence: fieldErrors.evidence,
  };
  const responseMissing = Boolean(validationErrors.response);
  const formError = firstError(apiError?.non_field_errors) || firstError(apiError?.detail);

  if (!isAuthenticated || role !== "PSYCHOLOGIST") {
    return <Navigate to="/psychologist/login" replace />;
  }

  return (
    <div className="min-h-screen bg-[#eef0f5] text-gray-900">
      <PsychologistNavbar />
      <div className="flex">
        <PsychologistSidebar />
        <main className="min-h-[calc(100vh-73px)] min-w-0 flex-1 px-4 py-7 sm:px-5 lg:px-6">
          <div className="w-full">
            <div className="mb-6">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Complaints</h1>
              <p className="mt-1 text-sm text-slate-500">Review complaints shared by admin and respond while they are open.</p>
            </div>

            <div className="grid min-h-[720px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm xl:grid-cols-[30%_70%]">
              <aside className="border-r border-slate-100">
                <div className="border-b border-slate-100 p-4">
                  <input className={inputCls} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search complaint or patient" />
                  <select value={status} onChange={(event) => setStatus(event.target.value)} className={`${inputCls} mt-3`}>
                    {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
                <div className="max-h-[760px] overflow-y-auto p-3">
                  {listQuery.isLoading ? <p className="p-6 text-center text-sm text-slate-500">Loading complaints...</p> : null}
                  {!listQuery.isLoading && complaints.length === 0 ? <p className="p-6 text-center text-sm text-slate-500">No complaints found.</p> : null}
                  <div className="space-y-3">
                    {complaints.map((item) => (
                      <button
                        key={item.id}
                          type="button"
                          onClick={() => {
                            setSelectedId(item.id);
                            setResponseAttempted(false);
                          }}
                        className={`w-full rounded-lg border p-4 text-left transition hover:border-psycho-primary ${activeComplaintId === item.id ? "border-psycho-primary bg-blue-50/60" : "border-slate-200 bg-white"}`}
                      >
                        <p className="text-sm font-extrabold text-slate-900">{item.complaint_id}</p>
                        <div className="mt-3 space-y-2 text-xs text-slate-500">
                          <p><span className="font-bold text-slate-400">Patient:</span> {item.consultation?.patient?.full_name || "-"}</p>
                          <p><span className="font-bold text-slate-400">Subject:</span> {item.subject}</p>
                          <p><span className="font-bold text-slate-400">Requested:</span> {formatDateTime(item.psychologist_response_requested_at)}</p>
                        </div>
                        <div className="mt-3"><Badge complaint={item} /></div>
                      </button>
                    ))}
                  </div>
                </div>
              </aside>

              <section className="max-h-[820px] overflow-y-auto p-6">
                {detailQuery.isLoading ? <p className="p-10 text-center text-sm text-slate-500">Loading details...</p> : null}
                {!detailQuery.isLoading && complaint ? (
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-900">Complaint Details</h2>
                        <p className="mt-1 text-sm text-slate-500">{complaint.complaint_id}</p>
                      </div>
                      <Badge complaint={complaint} />
                    </div>

                    <Section title="Consultation Information">
                      <div className="grid gap-4 md:grid-cols-4">
                        <DetailLine label="Appointment ID" value={consultation.booking_id} />
                        <DetailLine label="Date" value={formatDate(consultation.date)} />
                        <DetailLine label="Slot" value={`${formatTime(consultation.start_time)} - ${formatTime(consultation.end_time)}`} />
                        <DetailLine label="Session Ended" value={formatDateTime(consultation.actual_end_time || consultation.session?.ended_at)} />
                      </div>
                    </Section>

                    <Section title="Patient Complaint">
                      <div className="mb-4 grid gap-4 md:grid-cols-3">
                        <DetailLine label="Category" value={complaint.category_display} />
                        <DetailLine label="Subject" value={complaint.subject} />
                        <DetailLine label="Severity" value={complaint.severity_display} />
                      </div>
                      <p className="whitespace-pre-line rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm leading-6 text-slate-700">{complaint.description}</p>
                    </Section>

                    <Section title="Attachments">
                      {(complaint.attachments || []).length ? (
                        <div className="flex flex-wrap gap-2">{complaint.attachments.map((file) => <a key={file.id} href={file.file_url} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700">View File</a>)}</div>
                      ) : <p className="text-sm text-slate-500">No attachments uploaded.</p>}
                    </Section>

                    <Section title="Provide Your Response">
                      <div className="space-y-3">
                        <textarea
                          className={`${inputCls} min-h-[150px] resize-none ${responseMissing ? invalidInputCls : ""}`}
                          value={response}
                          onChange={(event) => {
                            mutation.reset();
                            setResponseAttempted(false);
                            setResponseDrafts((current) => ({ ...current, [complaint.id]: event.target.value }));
                          }}
                          disabled={!canRespond || alreadyResponded}
                          placeholder="Provide clarification regarding this consultation"
                        />
                        {validationErrors.response ? <p className={errorTextCls}>{validationErrors.response}</p> : null}
                        {canRespond && !alreadyResponded ? (
                          <input
                            key={complaint.id}
                            className={inputCls}
                            type="file"
                            multiple
                            onChange={(event) => {
                              mutation.reset();
                              setEvidenceDrafts((current) => ({ ...current, [complaint.id]: Array.from(event.target.files || []) }));
                            }}
                          />
                        ) : null}
                        {validationErrors.evidence ? <p className={errorTextCls}>{validationErrors.evidence}</p> : null}
                        {alreadyResponded ? <p className="text-sm font-semibold text-emerald-600">Response submitted successfully.</p> : null}
                        {!canRespond && !alreadyResponded ? <p className="text-sm font-semibold text-slate-500">This complaint is closed for psychologist response.</p> : null}
                        {formError ? <p className={errorTextCls}>{formError}</p> : null}
                        {mutation.isError && !formError && !Object.values(fieldErrors).some(Boolean) ? <p className={errorTextCls}>Unable to submit response. Please add a response and try again.</p> : null}
                        {canRespond && !alreadyResponded ? (
                          <button
                            type="button"
                            onClick={() => {
                              setResponseAttempted(true);
                              if (!response.trim()) return;
                              mutation.mutate({ complaintId: complaint.id, response, evidence });
                            }}
                            disabled={mutation.isPending}
                            className="rounded-lg bg-psycho-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-sky-600 disabled:opacity-60"
                          >
                            {mutation.isPending ? "Submitting..." : "Submit Response"}
                          </button>
                        ) : null}
                      </div>
                    </Section>
                  </div>
                ) : null}
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

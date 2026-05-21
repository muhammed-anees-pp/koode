import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { fetchAdminComplaintDetail, updateAdminComplaint } from "../../../api/complaints.api";
import Navbar from "../../../components/admin/Navbar/AdminNavbar";
import Sidebar from "../../../components/admin/Sidebar/AdminSidebar";
import { uppercaseMeridiem } from "../../../utils/indiaDateTime";

const actionOptions = [
  ["send_to_psychologist", "Send To Psychologist"],
  ["resolve", "Resolve Complaint"],
  ["reject", "Reject Complaint"],
  ["note", "Save Internal Note"],
];

const severityOptions = [
  ["LOW", "Low"],
  ["MEDIUM", "Medium"],
  ["HIGH", "High"],
];

const statusStyles = {
  PENDING_REVIEW: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  UNDER_REVIEW: "bg-sky-500/15 text-sky-300 border-sky-500/25",
  PSYCHOLOGIST_RESPONSE_SUBMITTED: "bg-violet-500/15 text-violet-300 border-violet-500/25",
  RESOLVED: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  REJECTED: "bg-red-500/15 text-red-300 border-red-500/25",
};

const inputCls = "w-full rounded-[10px] border border-slate-700/60 bg-[#141826] px-3 py-2.5 text-sm text-slate-200 outline-none transition placeholder:text-slate-500 focus:border-admin-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)]";

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
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
};

const formatTime = (value) => {
  if (!value) return "";
  const [hours = "0", minutes = "0"] = String(value).split(":");
  const date = new Date(Date.UTC(2026, 0, 1, Number(hours), Number(minutes)));
  return uppercaseMeridiem(new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(date));
};

function StatusBadge({ complaint }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${statusStyles[complaint?.status] || "border-slate-600 bg-slate-700/40 text-slate-300"}`}>
      {complaint?.status_display || complaint?.status || "-"}
    </span>
  );
}

function DetailLine({ label, value }) {
  return (
    <div className="min-w-0 border-b border-slate-800/70 py-3 last:border-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-slate-200">{value || "-"}</p>
    </div>
  );
}

function DetailSection({ title, children }) {
  return (
    <section className="min-w-0 rounded-2xl border border-slate-700/50 bg-[#141826] p-4 sm:p-5">
      <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function AdminComplaintDetail() {
  const { complaintId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [action, setAction] = useState("send_to_psychologist");
  const [message, setMessage] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [severity, setSeverity] = useState("MEDIUM");

  const { data: complaint, isLoading, isError } = useQuery({
    queryKey: ["admin-complaint-detail", complaintId],
    queryFn: () => fetchAdminComplaintDetail(complaintId),
    enabled: Boolean(complaintId),
  });

  useEffect(() => {
    if (!complaint) return;
    const timer = window.setTimeout(() => {
      setInternalNote(complaint.internal_admin_note || "");
      setSeverity(complaint.severity || "MEDIUM");
      setMessage("");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [complaint]);

  const mutation = useMutation({
    mutationFn: updateAdminComplaint,
    onSuccess: async (updatedComplaint) => {
      setMessage("");
      setInternalNote(updatedComplaint.internal_admin_note || "");
      setSeverity(updatedComplaint.severity || "MEDIUM");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-complaints"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-complaint-detail", complaintId] }),
      ]);
    },
  });

  const consultation = complaint?.consultation || {};

  return (
    <div className="flex min-h-screen bg-admin-gradient font-['DM_Sans',sans-serif]">
      <Sidebar />
      <div className="ml-[220px] flex min-w-0 flex-1 flex-col">
        <Navbar />
        <main className="mt-[60px] min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <button
            type="button"
            onClick={() => navigate("/admin/complaints")}
            className="mb-6 inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-[#141826] px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-admin-primary hover:text-slate-100"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to Complaints
          </button>

          {isLoading && (
            <div className="rounded-2xl border border-slate-700/50 bg-[#141826] p-10 text-center text-sm text-slate-500">
              Loading complaint details...
            </div>
          )}

          {isError && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-10 text-center text-sm text-red-300">
              Unable to load this complaint.
            </div>
          )}

          {!isLoading && !isError && complaint ? (
            <>
              <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-admin-primary">Complaint Details</p>
                  <h1 className="mt-2 break-words font-outfit text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">{complaint.complaint_id}</h1>
                  <p className="mt-2 break-words text-sm text-slate-400">{complaint.subject}</p>
                </div>
                <StatusBadge complaint={complaint} />
              </div>

              <div className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,1fr)_380px]">
                <div className="min-w-0 space-y-5">
                  <DetailSection title="Complaint Content">
                    <div className="mb-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <DetailLine label="Category" value={complaint.category_display} />
                      <DetailLine label="Severity" value={complaint.severity_display} />
                      <DetailLine label="Raised On" value={formatDateTime(complaint.created_at)} />
                    </div>
                    <p className="whitespace-pre-line rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm leading-6 text-slate-300">
                      {complaint.description}
                    </p>
                  </DetailSection>

                  {complaint.psychologist_response ? (
                    <DetailSection title="Psychologist Response">
                      <p className="whitespace-pre-line rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm leading-6 text-slate-300">
                        {complaint.psychologist_response}
                      </p>
                      {(complaint.psychologist_attachments || []).length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {complaint.psychologist_attachments.map((attachment) => (
                            <a key={attachment.id} href={attachment.file_url} target="_blank" rel="noreferrer" className="max-w-full break-words rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-admin-primary hover:text-white">
                              View
                            </a>
                          ))}
                        </div>
                      ) : null}
                    </DetailSection>
                  ) : null}

                  <div className="grid gap-5 xl:grid-cols-2">
                    <DetailSection title="People">
                      <DetailLine label="Patient" value={consultation.patient?.full_name} />
                      <DetailLine label="Patient Email" value={consultation.patient?.email} />
                      <DetailLine label="Psychologist" value={consultation.psychologist?.full_name} />
                      <DetailLine label="Psychologist Email" value={consultation.psychologist?.email} />
                    </DetailSection>

                    <DetailSection title="Consultation">
                      <DetailLine label="Appointment ID" value={consultation.booking_id} />
                      <DetailLine label="Slot" value={`${formatDate(consultation.date)} | ${formatTime(consultation.start_time)} - ${formatTime(consultation.end_time)}`} />
                      <DetailLine label="Session Ended" value={formatDateTime(consultation.actual_end_time)} />
                      <DetailLine label="Allowed Until" value={formatDateTime(complaint.complaint_allowed_until)} />
                    </DetailSection>
                  </div>

                  <DetailSection title="Attachments">
                    {(complaint.attachments || []).length === 0 ? (
                      <p className="text-sm text-slate-500">No attachments uploaded.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {complaint.attachments.map((attachment) => (
                          <a key={attachment.id} href={attachment.file_url} target="_blank" rel="noreferrer" className="max-w-full break-words rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-admin-primary hover:text-white">
                            View
                          </a>
                        ))}
                      </div>
                    )}
                  </DetailSection>

                  <DetailSection title="Timeline">
                    <div className="space-y-4">
                      {(complaint.timeline || []).map((event) => (
                        <div key={event.id} className="border-l-2 border-admin-primary/30 pl-4">
                          <p className="text-xs text-slate-500">{formatDateTime(event.created_at)}</p>
                          <p className="mt-1 text-sm font-semibold text-slate-200">{event.title}</p>
                          {event.actor_name ? <p className="mt-0.5 text-xs text-slate-500">By {event.actor_name}</p> : null}
                          {event.note ? <p className="mt-1 text-sm leading-6 text-slate-400">{event.note}</p> : null}
                        </div>
                      ))}
                    </div>
                  </DetailSection>
                </div>

                <aside className="min-w-0 space-y-5">
                  <DetailSection title="Current Admin Response">
                    <p className="whitespace-pre-line text-sm leading-6 text-slate-300">
                      {complaint.admin_response || "No admin response has been sent yet."}
                    </p>
                  </DetailSection>

                  <DetailSection title="Admin Action">
                    <div className="grid gap-4">
                      <select className={inputCls} value={action} onChange={(event) => setAction(event.target.value)}>
                        {actionOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                      <select className={inputCls} value={severity} onChange={(event) => setSeverity(event.target.value)}>
                        {severityOptions.map(([value, label]) => <option key={value} value={value}>{label} Severity</option>)}
                      </select>
                      <textarea
                        className={`${inputCls} min-h-[130px] resize-none`}
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        placeholder={action === "resolve" ? "Resolution message shown to patient" : action === "reject" ? "Reason for rejection" : action === "send_to_psychologist" ? "Message to psychologist" : "Optional timeline note"}
                      />
                      <textarea
                        className={`${inputCls} min-h-[110px] resize-none`}
                        value={internalNote}
                        onChange={(event) => setInternalNote(event.target.value)}
                        placeholder="Internal admin note, private"
                      />
                      {mutation.isError ? <p className="text-sm text-red-400">Unable to update complaint. Please check the fields and try again.</p> : null}
                      {mutation.isSuccess ? <p className="text-sm text-emerald-400">Complaint update saved.</p> : null}
                      <button
                        type="button"
                        onClick={() => mutation.mutate({ complaintId: complaint.id, action, message, internalAdminNote: internalNote, severity })}
                        disabled={mutation.isPending}
                        className="rounded-xl bg-admin-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {mutation.isPending ? "Saving..." : "Save Complaint Update"}
                      </button>
                    </div>
                  </DetailSection>
                </aside>
              </div>
            </>
          ) : null}
        </main>
      </div>
    </div>
  );
}

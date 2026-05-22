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
const invalidInputCls = "border-red-400 bg-red-500/10 focus:border-red-400 focus:shadow-[0_0_0_3px_rgba(248,113,113,0.15)]";
const errorTextCls = "text-sm font-medium text-red-400";

function firstError(value) {
  if (!value) return "";
  if (Array.isArray(value)) return value[0] || "";
  return String(value);
}

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
  const isEmpty = value === null || value === undefined || value === "";
  return (
    <div className="min-w-0 border-b border-slate-800/70 py-3 last:border-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className={`mt-1 break-words text-sm font-medium ${isEmpty ? "text-red-300" : "text-slate-200"}`}>{isEmpty ? "Not filled" : value}</p>
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
  const [severity, setSeverity] = useState("MEDIUM");
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const { data: complaint, isLoading, isError } = useQuery({
    queryKey: ["admin-complaint-detail", complaintId],
    queryFn: () => fetchAdminComplaintDetail(complaintId),
    enabled: Boolean(complaintId),
  });

  useEffect(() => {
    if (!complaint) return;
    const timer = window.setTimeout(() => {
      setSeverity(complaint.severity || "MEDIUM");
      setMessage("");
      setSubmitAttempted(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [complaint]);

  const mutation = useMutation({
    mutationFn: updateAdminComplaint,
    onSuccess: async (updatedComplaint) => {
      setMessage("");
      setSubmitAttempted(false);
      setSeverity(updatedComplaint.severity || "MEDIUM");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-complaints"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-complaint-detail", complaintId] }),
      ]);
    },
  });

  const consultation = complaint?.consultation || {};
  const apiError = mutation.error?.response?.data;
  const fieldErrors = {
    action: firstError(apiError?.action),
    message: firstError(apiError?.message),
    severity: firstError(apiError?.severity),
  };
  const validationErrors = {
    action: fieldErrors.action,
    message: submitAttempted && !message.trim() ? "This message is required." : fieldErrors.message,
    severity: fieldErrors.severity,
  };
  const messageMissing = Boolean(validationErrors.message);
  const formError = firstError(apiError?.non_field_errors) || firstError(apiError?.detail);

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
                      <div>
                        <select className={`${inputCls} ${validationErrors.action ? invalidInputCls : ""}`} value={action} onChange={(event) => {
                          mutation.reset();
                          setAction(event.target.value);
                        }}>
                        {actionOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                        {validationErrors.action ? <p className={`mt-1.5 ${errorTextCls}`}>{validationErrors.action}</p> : null}
                      </div>
                      <div>
                        <select className={`${inputCls} ${validationErrors.severity ? invalidInputCls : ""}`} value={severity} onChange={(event) => {
                          mutation.reset();
                          setSeverity(event.target.value);
                        }}>
                        {severityOptions.map(([value, label]) => <option key={value} value={value}>{label} Severity</option>)}
                        </select>
                        {validationErrors.severity ? <p className={`mt-1.5 ${errorTextCls}`}>{validationErrors.severity}</p> : null}
                      </div>
                      <textarea
                        className={`${inputCls} min-h-[130px] resize-none ${messageMissing ? invalidInputCls : ""}`}
                        value={message}
                        onChange={(event) => {
                          mutation.reset();
                          setSubmitAttempted(false);
                          setMessage(event.target.value);
                        }}
                        placeholder={action === "resolve" ? "Resolution message shown to patient" : action === "reject" ? "Reason for rejection" : "Message to psychologist"}
                      />
                      {validationErrors.message ? <p className={errorTextCls}>{validationErrors.message}</p> : null}
                      {formError ? <p className={errorTextCls}>{formError}</p> : null}
                      {mutation.isError && !formError && !Object.values(fieldErrors).some(Boolean) ? <p className={errorTextCls}>Unable to update complaint. Please check the fields and try again.</p> : null}
                      {mutation.isSuccess ? <p className="text-sm text-emerald-400">Complaint update saved.</p> : null}
                      <button
                        type="button"
                        onClick={() => {
                          setSubmitAttempted(true);
                          if (!message.trim()) return;
                          mutation.mutate({ complaintId: complaint.id, action, message, severity });
                        }}
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

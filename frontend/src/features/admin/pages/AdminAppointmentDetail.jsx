import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { fetchAdminAppointmentDetail } from "../../../api/admin.api";
import Navbar from "../../../components/admin/Navbar/AdminNavbar";
import Sidebar from "../../../components/admin/Sidebar/AdminSidebar";

const statusStyles = {
  PENDING: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  CONFIRMED: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  COMPLETED: "bg-sky-500/15 text-sky-300 border-sky-500/25",
  CANCELLED: "bg-red-500/15 text-red-300 border-red-500/25",
};

const formatMoney = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });

const uppercaseMeridiem = (value) => value.replace(/\b(am|pm)\b/g, (match) => match.toUpperCase());

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
  const formatted = new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(date);
  return uppercaseMeridiem(formatted);
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const formatted = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
  return uppercaseMeridiem(formatted);
};

const formatCancelledBy = (appointment) => {
  const cancelledBy = appointment.cancelled_by;
  if (!cancelledBy) return "Not available";

  if (cancelledBy.role === "PATIENT") {
    return `Patient (${appointment.patient?.full_name || cancelledBy.full_name})`;
  }

  if (cancelledBy.role === "PSYCHOLOGIST") {
    return `Psychologist (${appointment.psychologist?.full_name || cancelledBy.full_name})`;
  }

  return `${cancelledBy.role || "User"} (${cancelledBy.full_name})`;
};

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${statusStyles[status] || "border-slate-600 bg-slate-700/40 text-slate-300"}`}>
      {status || "-"}
    </span>
  );
}

function Section({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-700/50 bg-[#141826] p-5">
      <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function DetailLine({ label, value }) {
  return (
    <div className="border-b border-slate-800/70 py-3 last:border-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 whitespace-pre-line text-sm font-medium text-slate-200">{value || "-"}</p>
    </div>
  );
}

function TextModal({ title, content, onClose }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-[#141826] shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-300">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm font-semibold text-slate-400 transition hover:border-admin-primary hover:text-slate-100"
          >
            Close
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5">
          <p className="whitespace-pre-line text-sm leading-6 text-slate-200">{content || "No content saved."}</p>
        </div>
      </div>
    </div>
  );
}

export default function AdminAppointmentDetail() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [modalContent, setModalContent] = useState(null);

  const { data: appointment, isLoading, isError } = useQuery({
    queryKey: ["admin-appointment-detail", appointmentId],
    queryFn: () => fetchAdminAppointmentDetail(appointmentId),
    enabled: Boolean(appointmentId),
  });

  const isUpcomingAppointment = appointment && !["COMPLETED", "CANCELLED"].includes(appointment.status);
  const isCancelledAppointment = appointment?.status === "CANCELLED";
  const sourceTab = searchParams.get("tab") || (appointment?.status === "COMPLETED" ? "past" : appointment?.status === "CANCELLED" ? "cancelled" : "upcoming");
  const backPath = sourceTab && sourceTab !== "upcoming" ? `/admin/appointments?tab=${sourceTab}` : "/admin/appointments";

  return (
    <div className="flex min-h-screen bg-admin-gradient font-['DM_Sans',sans-serif]">
      <Sidebar />
      <div className="ml-[220px] flex flex-1 flex-col">
        <Navbar />
        <main className="mt-[60px] flex-1 p-4 sm:p-6 lg:p-8">
          <button
            type="button"
            onClick={() => navigate(backPath)}
            className="mb-6 inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-[#141826] px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-admin-primary hover:text-slate-100"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to Appointments
          </button>

          {isLoading && (
            <div className="rounded-2xl border border-slate-700/50 bg-[#141826] p-10 text-center text-sm text-slate-500">
              Loading appointment details...
            </div>
          )}

          {isError && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-10 text-center text-sm text-red-300">
              Unable to load this appointment.
            </div>
          )}

          {!isLoading && !isError && appointment ? (
            <>
              <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-admin-primary">Appointment Details</p>
                  <h1 className="mt-2 break-all font-outfit text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">{appointment.id}</h1>
                  <p className="mt-2 text-sm text-slate-400">
                    {formatDate(appointment.date)} | {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                  </p>
                </div>
                <StatusBadge status={appointment.status} />
              </div>

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
                <div className="space-y-5">
                  <div className="grid gap-5 md:grid-cols-2">
                    <Section title="Patient">
                      <DetailLine label="Name" value={appointment.patient?.full_name} />
                      <DetailLine label="Patient ID" value={appointment.patient?.patient_id} />
                      <DetailLine label="Email" value={appointment.patient?.email} />
                      <DetailLine label="Phone" value={appointment.patient?.phone_number} />
                    </Section>

                    <Section title="Psychologist">
                      <DetailLine label="Name" value={appointment.psychologist?.full_name} />
                      <DetailLine label="Psychologist ID" value={appointment.psychologist?.psychologist_id} />
                      <DetailLine label="Specialization" value={appointment.psychologist?.specialization} />
                      <DetailLine label="Email" value={appointment.psychologist?.email} />
                      <DetailLine label="Phone" value={appointment.psychologist?.phone_number} />
                    </Section>
                  </div>

                  {!isCancelledAppointment ? (
                    <Section title="Consultation">
                      <div className="grid gap-4 md:grid-cols-2">
                        <DetailLine label="Consultation Status" value={appointment.consultation?.status} />
                        <DetailLine label="Room ID" value={appointment.consultation?.room_id} />
                        {!isUpcomingAppointment ? (
                          <>
                            <DetailLine label="Started At" value={formatDateTime(appointment.consultation?.started_at)} />
                            <DetailLine label="Ended At" value={formatDateTime(appointment.consultation?.ended_at)} />
                          </>
                        ) : null}
                      </div>
                      {!isUpcomingAppointment ? (
                        <div className="mt-5 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => setModalContent({ title: "Psychologist Notes", content: appointment.consultation?.psychologist_note || "No notes saved." })}
                            className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-admin-primary hover:text-white"
                          >
                            Psychologist Notes
                          </button>
                          <button
                            type="button"
                            onClick={() => setModalContent({ title: "Prescription", content: appointment.consultation?.patient_note || "No prescription saved." })}
                            className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-admin-primary hover:text-white"
                          >
                            Prescription
                          </button>
                        </div>
                      ) : null}
                    </Section>
                  ) : null}

                  {!isUpcomingAppointment && !isCancelledAppointment ? (
                    <div className="grid gap-5 lg:grid-cols-2">
                      <Section title="Review">
                        {appointment.review ? (
                          <>
                            <DetailLine label="Rating" value={`${appointment.review.rating} / 5`} />
                            <DetailLine label="Submitted At" value={formatDateTime(appointment.review.submitted_at)} />
                            <DetailLine label="Review" value={appointment.review.review || "No written review."} />
                          </>
                        ) : (
                          <p className="text-sm text-slate-500">No review submitted.</p>
                        )}
                      </Section>

                      <Section title="Complaint">
                        {appointment.complaint ? (
                          <>
                            <div className="border-b border-slate-800/70 py-3">
                              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Complaint ID</p>
                              <button
                                type="button"
                                onClick={() => navigate(`/admin/complaints/${appointment.complaint.id}`)}
                                className="mt-1 text-left text-sm font-semibold text-admin-primary transition hover:text-indigo-300 hover:underline"
                              >
                                {appointment.complaint.complaint_id}
                              </button>
                            </div>
                            <DetailLine label="Status" value={appointment.complaint.status_display} />
                          </>
                        ) : (
                          <p className="text-sm text-slate-500">No complaint raised.</p>
                        )}
                      </Section>
                    </div>
                  ) : null}
                </div>

                <aside className="space-y-5">
                  <Section title="Booking">
                    <DetailLine label="Booking Status" value={appointment.status} />
                    <DetailLine label="Payment Status" value={appointment.payment_status} />
                    <DetailLine label="Created At" value={formatDateTime(appointment.created_at)} />
                    {isCancelledAppointment ? (
                      <DetailLine label="Cancelled By" value={formatCancelledBy(appointment)} />
                    ) : null}
                    <DetailLine label="Psychologist Paid At" value={formatDateTime(appointment.psychologist_paid_at)} />
                  </Section>

                  {!isCancelledAppointment ? (
                    <Section title="Payment">
                      <DetailLine label="Total" value={formatMoney(appointment.total_amount)} />
                      <DetailLine label="GST" value={formatMoney(appointment.gst_amount)} />
                      <DetailLine label="Psychologist Amount" value={formatMoney(appointment.psychologist_payout_amount)} />
                      <DetailLine label="Platform Amount (Commission)" value={formatMoney(appointment.admin_commission_amount)} />
                    </Section>
                  ) : null}

                  {appointment.status === "CANCELLED" ? (
                    <Section title="Cancellation">
                      <DetailLine label="Reason" value={appointment.cancellation_note || "No reason added."} />
                    </Section>
                  ) : null}
                </aside>
              </div>
            </>
          ) : null}
        </main>
      </div>
      {modalContent ? <TextModal title={modalContent.title} content={modalContent.content} onClose={() => setModalContent(null)} /> : null}
    </div>
  );
}

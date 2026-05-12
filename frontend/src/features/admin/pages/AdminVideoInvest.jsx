import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { fetchConsultationRecordings } from "../../../api/admin.api";
import Navbar from "../../../components/admin/Navbar/AdminNavbar";
import Sidebar from "../../../components/admin/Sidebar/AdminSidebar";
import { useAuthStore } from "../../../store/auth.store";

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (value) => {
  if (!value) return "—";
  const [hours = "00", minutes = "00"] = value.split(":");
  return new Date(2020, 0, 1, Number(hours), Number(minutes)).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const formatDateTime = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const statusClass = {
  UPLOADED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  RECORDING: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  STARTING: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  STOPPING: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  FAILED: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  NOT_STARTED: "border-slate-700 bg-slate-800 text-slate-400",
};

function RecordingModal({ recording, onClose }) {
  if (!recording) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 px-4 py-6">
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-700 bg-[#111827] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Video Investigation</p>
            <h2 className="mt-1 text-lg font-bold text-slate-100">
              {recording.patient_name} with {recording.psychologist_name}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {formatDate(recording.date)} · {formatTime(recording.start_time)} - {formatTime(recording.end_time)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_280px]">
          <div className="overflow-hidden rounded-xl bg-black">
            {recording.recording_file_url ? (
              <video controls src={recording.recording_file_url} className="aspect-video w-full bg-black" />
            ) : (
              <div className="flex aspect-video items-center justify-center text-sm text-slate-500">
                Recording file is not available yet.
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#0f172a] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Session Details</p>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-slate-500">Room ID</dt>
                <dd className="mt-1 break-all font-mono text-xs text-slate-300">{recording.room_id}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Started</dt>
                <dd className="mt-1 text-slate-200">{formatDateTime(recording.started_at)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Completed</dt>
                <dd className="mt-1 text-slate-200">{formatDateTime(recording.ended_at)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Recording Status</dt>
                <dd className="mt-1 text-slate-200">{recording.recording_status}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminVideoInvest() {
  const { isAuthenticated, role } = useAuthStore();
  const [query, setQuery] = useState("");
  const [activeRecording, setActiveRecording] = useState(null);
  const recordingsQuery = useQuery({
    queryKey: ["admin-consultation-recordings"],
    queryFn: fetchConsultationRecordings,
    enabled: isAuthenticated && role === "ADMIN",
    refetchInterval: 30000,
  });

  const recordings = useMemo(() => {
    const list = recordingsQuery.data || [];
    if (!query.trim()) return list;
    const needle = query.toLowerCase();
    return list.filter((item) =>
      [item.patient_name, item.psychologist_name, item.room_id, item.recording_status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  }, [query, recordingsQuery.data]);

  if (!isAuthenticated || role !== "ADMIN") {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-admin-gradient font-['DM_Sans',sans-serif]">
      <Sidebar />
      <div className="ml-[220px] flex flex-1 flex-col">
        <Navbar />
        <main className="mt-[60px] flex-1 p-6 lg:p-8">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="font-outfit text-[1.4rem] font-bold tracking-tight text-slate-100">
                Video Investigation
              </h1>
              <p className="mt-0.5 text-sm text-slate-500">
                Review completed consultation recordings when a complaint requires evidence.
              </p>
            </div>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search patient, psychologist, room..."
              className="w-full rounded-xl border border-slate-800 bg-[#111827] px-4 py-3 text-sm text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-admin-primary lg:w-80"
            />
          </div>

          <section className="rounded-[14px] border border-slate-800/60 bg-[#151c2c] p-5">
            {recordingsQuery.isLoading ? (
              <div className="h-56 animate-pulse rounded-xl bg-slate-800/50" />
            ) : null}

            {recordingsQuery.isError ? (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-300">
                Unable to load consultation recordings.
              </div>
            ) : null}

            {!recordingsQuery.isLoading && !recordingsQuery.isError && recordings.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 bg-[#0f1524] px-5 py-10 text-center text-sm text-slate-500">
                No consultation recordings found.
              </div>
            ) : null}

            {!recordingsQuery.isLoading && !recordingsQuery.isError && recordings.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-[980px] w-full border-separate border-spacing-0 text-left text-sm">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-[0.08em] text-slate-500">
                      <th className="border-b border-slate-800 px-3 py-3 font-bold">Appointment</th>
                      <th className="border-b border-slate-800 px-3 py-3 font-bold">Patient</th>
                      <th className="border-b border-slate-800 px-3 py-3 font-bold">Psychologist</th>
                      <th className="border-b border-slate-800 px-3 py-3 font-bold">Consultation</th>
                      <th className="border-b border-slate-800 px-3 py-3 font-bold">Recording</th>
                      <th className="border-b border-slate-800 px-3 py-3 font-bold">Completed</th>
                      <th className="border-b border-slate-800 px-3 py-3 font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recordings.map((recording) => (
                      <tr key={recording.id} className="text-slate-300">
                        <td className="border-b border-slate-800/70 px-3 py-4">
                          <div className="font-semibold text-slate-200">{formatDate(recording.date)}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            {formatTime(recording.start_time)} - {formatTime(recording.end_time)}
                          </div>
                        </td>
                        <td className="border-b border-slate-800/70 px-3 py-4 font-semibold text-slate-200">
                          {recording.patient_name}
                        </td>
                        <td className="border-b border-slate-800/70 px-3 py-4 font-semibold text-slate-200">
                          {recording.psychologist_name}
                        </td>
                        <td className="border-b border-slate-800/70 px-3 py-4">
                          {recording.consultation_status}
                        </td>
                        <td className="border-b border-slate-800/70 px-3 py-4">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass[recording.recording_status] || statusClass.NOT_STARTED}`}>
                            {recording.recording_status}
                          </span>
                        </td>
                        <td className="border-b border-slate-800/70 px-3 py-4 text-slate-400">
                          {formatDateTime(recording.ended_at)}
                        </td>
                        <td className="border-b border-slate-800/70 px-3 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => setActiveRecording(recording)}
                            className="rounded-full border border-slate-700 px-4 py-2 text-xs font-bold text-slate-200 transition hover:border-admin-primary hover:text-admin-primary"
                          >
                            Open record
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>
        </main>
      </div>
      <RecordingModal recording={activeRecording} onClose={() => setActiveRecording(null)} />
    </div>
  );
}

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchAdminAppointments } from "../../../api/admin.api";
import Navbar from "../../../components/admin/Navbar/AdminNavbar";
import Sidebar from "../../../components/admin/Sidebar/AdminSidebar";

const tabs = [
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
  { key: "cancelled", label: "Cancelled" },
];

const validTabKeys = new Set(tabs.map((tab) => tab.key));

const inputCls = "w-full rounded-[10px] border border-slate-700/60 bg-[#141826] px-3 py-2.5 text-sm text-slate-200 outline-none transition placeholder:text-slate-500 focus:border-admin-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)]";
const thCls = "px-5 py-4 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500";
const tdCls = "px-5 py-4 text-sm text-slate-300";

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

function SummaryCard({ label, value, active }) {
  return (
    <div className={`rounded-2xl border p-4 ${active ? "border-admin-primary bg-admin-primary/10" : "border-slate-700/50 bg-[#141826]"}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-100">{Number(value || 0).toLocaleString("en-IN")}</p>
    </div>
  );
}

export default function AdminAppointments() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = validTabKeys.has(searchParams.get("tab")) ? searchParams.get("tab") : "upcoming";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");

  const queryArgs = useMemo(
    () => ({ page, pageSize, search, tab: activeTab }),
    [page, pageSize, search, activeTab]
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-appointments", queryArgs],
    queryFn: () => fetchAdminAppointments(queryArgs),
    keepPreviousData: true,
  });

  const appointments = data?.results || [];
  const summary = data?.summary || {};
  const total = data?.total || 0;
  const totalPages = data?.total_pages || 1;

  const switchTab = (tab) => {
    setActiveTab(tab);
    setPage(1);
    setSearchParams(tab === "upcoming" ? {} : { tab });
  };

  return (
    <div className="flex min-h-screen bg-admin-gradient font-['DM_Sans',sans-serif]">
      <Sidebar />
      <div className="ml-[220px] flex flex-1 flex-col">
        <Navbar />
        <main className="mt-[60px] flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mb-7">
            <h1 className="font-outfit text-2xl font-bold tracking-tight text-slate-100">Appointments</h1>
            <p className="mt-1 text-sm text-slate-400">Monitor upcoming, completed, and cancelled consultation bookings.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <SummaryCard label="Upcoming" value={summary.upcoming} active={activeTab === "upcoming"} />
            <SummaryCard label="Past Completed" value={summary.past} active={activeTab === "past"} />
            <SummaryCard label="Cancelled" value={summary.cancelled} active={activeTab === "cancelled"} />
          </div>

          <div className="mt-6 rounded-2xl border border-slate-700/50 bg-[#141826] p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => switchTab(tab.key)}
                    className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                      activeTab === tab.key
                        ? "bg-admin-primary text-white"
                        : "border border-slate-700 bg-slate-900/30 text-slate-400 hover:text-slate-100"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-[minmax(0,360px)]">
                <input
                  className={inputCls}
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search appointment, patient, psychologist"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-[14px] border border-slate-700/50 bg-[#141826]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-700/40">
                    {[
                      "Appointment",
                      "Patient",
                      "Psychologist",
                      "Slot",
                    ].map((heading) => (
                      <th key={heading} className={thCls}>{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading && <tr><td colSpan={4} className="py-16 text-center text-sm text-slate-500">Loading appointments...</td></tr>}
                  {isError && <tr><td colSpan={4} className="py-16 text-center text-sm text-red-400">Failed to load appointments.</td></tr>}
                  {!isLoading && !isError && appointments.length === 0 && <tr><td colSpan={4} className="py-16 text-center text-sm text-slate-500">No appointments found.</td></tr>}
                  {appointments.map((appointment) => (
                    <tr
                      key={appointment.id}
                      className="cursor-pointer border-b border-slate-700/30 transition hover:bg-slate-800/35"
                      onClick={() => navigate(`/admin/appointments/${appointment.id}?tab=${activeTab}`)}
                    >
                      <td className={tdCls}>
                        <p className="max-w-[180px] truncate font-semibold text-slate-100">{appointment.id}</p>
                        <p className="mt-1 text-xs text-slate-500">{formatDateTime(appointment.created_at)}</p>
                      </td>
                      <td className={tdCls}>
                        <p className="font-semibold text-slate-100">{appointment.patient?.full_name}</p>
                        <p className="mt-1 text-xs text-slate-500">{appointment.patient?.patient_id}</p>
                      </td>
                      <td className={tdCls}>
                        <p className="font-semibold text-slate-100">{appointment.psychologist?.full_name}</p>
                        <p className="mt-1 max-w-[180px] truncate text-xs text-slate-500">{appointment.psychologist?.specialization || appointment.psychologist?.psychologist_id}</p>
                      </td>
                      <td className={tdCls}>
                        <p className="font-semibold text-slate-100">{formatDate(appointment.date)}</p>
                        <p className="mt-1 text-xs text-slate-500">{formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <span>{total} appointments</span>
              <label className="flex items-center gap-2">
                <span>Count/page</span>
                <select className="rounded-lg border border-slate-700 bg-[#141826] px-3 py-2 text-slate-200 outline-none" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>
                  {[10, 25, 50].map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border border-slate-700 px-3 py-2 disabled:opacity-40">Previous</button>
              <span>Page {page} of {totalPages}</span>
              <button type="button" disabled={page === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="rounded-lg border border-slate-700 px-3 py-2 disabled:opacity-40">Next</button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

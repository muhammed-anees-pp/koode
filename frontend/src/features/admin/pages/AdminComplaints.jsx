import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { fetchAdminComplaints } from "../../../api/complaints.api";
import Navbar from "../../../components/admin/Navbar/AdminNavbar";
import Sidebar from "../../../components/admin/Sidebar/AdminSidebar";
import { uppercaseMeridiem } from "../../../utils/indiaDateTime";

const statusOptions = [
  ["OPEN", "Open"],
  ["ALL", "All Statuses"],
  ["PENDING_REVIEW", "Pending Review"],
  ["UNDER_REVIEW", "Under Review"],
  ["PSYCHOLOGIST_RESPONSE_SUBMITTED", "Psychologist Response Submitted"],
  ["RESOLVED", "Resolved"],
  ["REJECTED", "Rejected"],
];

const categoryOptions = [
  ["ALL", "All Categories"],
  ["PSYCHOLOGIST_BEHAVIOR", "Behavior"],
  ["TECHNICAL_ISSUE", "Technical"],
  ["PRIVACY_CONCERN", "Privacy"],
  ["PAYMENT_ISSUE", "Payment"],
  ["OTHER", "Other"],
];

const severityOptions = [
  ["ALL", "All Severities"],
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

const severityStyles = {
  LOW: "bg-slate-700/40 text-slate-300 border-slate-600",
  MEDIUM: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  HIGH: "bg-red-500/15 text-red-300 border-red-500/30",
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

function Badge({ children, className = "" }) {
  const isEmpty = children === null || children === undefined || children === "";
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${className}`}>
      {isEmpty ? "Not filled" : children}
    </span>
  );
}

function TableValue({ children, className = "" }) {
  const isEmpty = children === null || children === undefined || children === "";
  return (
    <span className={`block truncate ${isEmpty ? "font-semibold text-red-300" : ""} ${className}`}>
      {isEmpty ? "Not filled" : children}
    </span>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-700/50 bg-[#141826] p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-extrabold text-slate-100">{value || 0}</p>
    </div>
  );
}

export default function AdminComplaints() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState({
    search: "",
    status: "OPEN",
    category: "ALL",
    severity: "ALL",
  });

  const queryArgs = useMemo(() => ({ page, pageSize, ...filters }), [page, pageSize, filters]);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-complaints", queryArgs],
    queryFn: () => fetchAdminComplaints(queryArgs),
    keepPreviousData: true,
  });

  const complaints = data?.results || [];
  const stats = data?.stats || {};
  const total = data?.total || 0;
  const totalPages = data?.total_pages || 1;

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  return (
    <div className="flex min-h-screen bg-admin-gradient font-['DM_Sans',sans-serif]">
      <Sidebar />
      <div className="ml-[220px] flex min-w-0 flex-1 flex-col">
        <Navbar />
        <main className="mt-[60px] min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <div className="mb-7">
            <h1 className="font-outfit text-xl font-bold tracking-tight text-slate-100 sm:text-2xl">Complaint Management</h1>
            <p className="mt-1 text-sm text-slate-400">Track patient complaints, review case status, and manage follow-up actions.</p>
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
            <StatCard label="Pending Review" value={stats.pending_review} />
            <StatCard label="Open" value={stats.open} />
            <StatCard label="Under Review" value={stats.under_review} />
            <StatCard label="Response Submitted" value={stats.response_submitted} />
            <StatCard label="Resolved" value={stats.resolved} />
            <StatCard label="Rejected" value={stats.rejected} />
            <StatCard label="High Priority" value={stats.high_priority} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_180px_180px_160px]">
            <input
              className={`${inputCls} sm:col-span-2 xl:col-span-1`}
              value={filters.search}
              onChange={(event) => updateFilter("search", event.target.value)}
              placeholder="Complaint ID / Patient / Psychologist"
            />
            <select className={inputCls} value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
              {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select className={inputCls} value={filters.category} onChange={(event) => updateFilter("category", event.target.value)}>
              {categoryOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select className={inputCls} value={filters.severity} onChange={(event) => updateFilter("severity", event.target.value)}>
              {severityOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>

          <div className="mt-6 overflow-x-auto rounded-[14px] border border-slate-700/50 bg-[#141826]">
            <table className="min-w-[980px] w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-700/40">
                  {["Complaint", "Patient", "Psychologist", "Category", "Severity", "Status", "Created"].map((heading) => (
                    <th key={heading} className="px-5 py-4 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="py-16 text-center text-sm text-slate-500">Loading complaints...</td></tr>
                ) : null}
                {isError ? (
                  <tr><td colSpan={7} className="py-16 text-center text-sm text-red-400">Failed to load complaints.</td></tr>
                ) : null}
                {!isLoading && !isError && complaints.length === 0 ? (
                  <tr><td colSpan={7} className="py-16 text-center text-sm text-slate-500">No complaints found.</td></tr>
                ) : null}
                {complaints.map((complaint) => (
                  <tr
                    key={complaint.id}
                    onClick={() => navigate(`/admin/complaints/${complaint.id}`)}
                    className={`cursor-pointer border-b border-slate-700/30 transition-colors hover:bg-slate-800/35 ${complaint.severity === "HIGH" ? "border-l-4 border-l-red-500/80" : ""}`}
                  >
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-slate-100">{complaint.complaint_id}</p>
                      <p className="mt-1 max-w-[260px] truncate text-xs text-slate-500">{complaint.subject}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-300">
                      <TableValue className="max-w-[170px]">{complaint.consultation?.patient?.full_name}</TableValue>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-300">
                      <TableValue className="max-w-[170px]">{complaint.consultation?.psychologist?.full_name}</TableValue>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-400"><TableValue>{complaint.category_display}</TableValue></td>
                    <td className="px-5 py-4">
                      <Badge className={severityStyles[complaint.severity] || severityStyles.LOW}>
                        {complaint.severity_display || complaint.severity}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <Badge className={statusStyles[complaint.status] || "border-slate-600 bg-slate-700/40 text-slate-300"}>
                        {complaint.status_display || complaint.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-400">{formatDateTime(complaint.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex flex-col gap-3 text-sm text-slate-500 xl:flex-row xl:items-center xl:justify-between">
            <span>{total} complaints</span>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2">
                <span>Rows</span>
                <select
                  className="rounded-lg border border-slate-700 bg-[#141826] px-3 py-2 text-slate-200 outline-none"
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value));
                    setPage(1);
                  }}
                >
                  {[10, 25, 50].map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>
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

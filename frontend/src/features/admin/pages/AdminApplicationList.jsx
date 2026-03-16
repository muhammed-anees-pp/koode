import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { fetchAdminApplications } from "../../../api/admin.api";
import Sidebar from "../../../components/admin/Sidebar/AdminSidebar";
import Navbar from "../../../components/admin/Navbar/AdminNavbar";
import { useRef, useEffect } from "react";
import AdminInterviewRoomModal from "./AdminInterviewRoomModal";

const BASE_URL = "http://localhost:8000";

const mediaUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return `${BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
};

function AppAvatar({ name, photo, size = 38 }) {
    if (photo) {
        return (
            <img
                src={mediaUrl(photo)}
                alt={name}
                className="rounded-full object-cover flex-shrink-0"
                style={{ width: size, height: size }}
                onError={(e) => { e.target.style.display = "none"; }}
            />
        );
    }
    const initials = name ? name.charAt(0).toUpperCase() : "?";
    const colours = ["#7C3AED", "#0EA5E9", "#10B981", "#F59E0B", "#EF4444", "#EC4899", "#14B8A6", "#6366F1"];
    const colour = colours[(name?.charCodeAt(0) || 0) % colours.length];
    return (
        <div
            className="rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold"
            style={{ background: colour, width: size, height: size, fontSize: size * 0.37 }}
        >
            {initials}
        </div>
    );
}

const STATUS_CONFIG = {
    SUBMITTED: { label: "Pending", cls: "bg-[#e53e3e]/15 text-[#fc8181]", dot: "bg-[#fc8181]", dotted: true },
    INTERVIEW_SCHEDULED: { label: "Interview Scheduled", cls: "bg-[#1188d8]/15 text-[#63b3ed]", dot: null },
    INTERVIEW_COMPLETED: { label: "Review Completed", cls: "bg-[#d69e2e]/15 text-[#f6ad55]", dot: null },
    APPROVED: { label: "Approved", cls: "bg-emerald-500/15 text-emerald-400", dot: "bg-emerald-400", dotted: false },
    REJECTED: { label: "Rejected", cls: "bg-red-500/15 text-red-400", dot: "bg-red-400", dotted: false },
    DRAFT: { label: "Draft", cls: "bg-slate-500/15 text-slate-400", dot: "bg-slate-400", dotted: true },
};

const INTERVIEW_STATUS = {
    INTERVIEW_SCHEDULED: { label: "Pending", cls: "text-slate-400" },
    INTERVIEW_COMPLETED: { label: "Finished", cls: "bg-purple-500/15 text-purple-400 px-3 py-1 rounded-full text-[11px] font-semibold" },
};

function StatusBadge({ status }) {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG["SUBMITTED"];
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-full ${cfg.cls}`}>
            {cfg.dotted && cfg.dot && <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${cfg.dot}`} />}
            {!cfg.dotted && cfg.dot && <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />}
            {cfg.label}
        </span>
    );
}

function fmtDate(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

function fmtDateTime(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    const date = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
    const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }).toUpperCase();
    return { date, time };
}

function useDropdown() {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);
    return { open, setOpen, ref };
}

const FILTER_OPTIONS = [
    { label: "All Applications", value: "all" },
    { label: "Pending Review", value: "SUBMITTED" },
    { label: "Interview Scheduled", value: "INTERVIEW_SCHEDULED" },
    { label: "Interview Completed", value: "INTERVIEW_COMPLETED" },
    { label: "Approved", value: "APPROVED" },
    { label: "Rejected", value: "REJECTED" },
];

const SORT_OPTIONS = [
    { label: "Name (A → Z)", sortBy: "name", sortDir: "asc" },
    { label: "Name (Z → A)", sortBy: "name", sortDir: "desc" },
    { label: "Newest first", sortBy: "date", sortDir: "desc" },
    { label: "Oldest first", sortBy: "date", sortDir: "asc" },
    { label: "Status", sortBy: "status", sortDir: "asc" },
];

const btnOutlineCls = (active) =>
    `flex items-center gap-2 px-4 py-2.5 text-sm text-slate-400 bg-[#141826] border ${active ? "border-admin-primary text-admin-primary bg-admin-primary/10" : "border-slate-700/60"} rounded-[10px] cursor-pointer transition-all duration-200 hover:border-admin-primary hover:text-admin-primary`;
const dropdownItemCls = (active) =>
    `w-full flex items-center justify-between px-4 py-2.5 text-sm text-left border-none cursor-pointer transition-all duration-200 ${active ? "bg-admin-primary/10 text-admin-primary" : "text-slate-400 bg-transparent hover:bg-slate-800/60 hover:text-slate-200"}`;
const thCls = "px-4 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-[0.1em]";
const tdCls = "px-4 py-4 text-sm text-slate-300";

const IconBtn = ({ title, cls = "", children }) => (
    <button
        title={title}
        className={`w-8 h-8 rounded-lg border flex items-center justify-center cursor-not-allowed opacity-50 transition-all duration-200 ${cls}`}
    >
        {children}
    </button>
);

const NavIconBtn = ({ title, onClick, cls = "", children }) => (
    <button
        title={title}
        onClick={onClick}
        className={`w-8 h-8 rounded-lg border flex items-center justify-center cursor-pointer transition-all duration-200 ${cls}`}
    >
        {children}
    </button>
);

function InterviewDetailsModal({ app, onClose, navigate, onJoinRoom }) {
    const interviewDT = fmtDateTime(app.interview_date);
    const specs = (app.specializations || []).map((s) => s.name ?? s);
    const shortId = String(app.id).slice(0, 8).toUpperCase();

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-[#0f1320] border border-slate-700/50 rounded-2xl shadow-2xl w-[480px] overflow-hidden">
                <div className="px-7 pt-7 pb-5">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-outfit text-lg font-bold text-slate-100">Admin Interview Details</h3>
                        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 cursor-pointer transition-all">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="flex items-center gap-3 bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3">
                            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2">
                                    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Date</p>
                                <p className="text-sm font-semibold text-slate-200">{interviewDT?.date || "—"}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3">
                            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Time</p>
                                <p className="text-sm font-semibold text-slate-200">{interviewDT?.time || "—"} IST</p>
                            </div>
                        </div>
                    </div>

                    <p className="text-sm font-semibold text-slate-300 mb-3">Candidate Profile Summary</p>

                    <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 mb-4">
                        <div className="flex items-center gap-3 mb-4">
                            <AppAvatar name={app.full_name} photo={app.profile_picture} size={44} />
                            <div>
                                <p className="text-sm font-bold text-slate-200">{app.full_name}</p>
                                <p className="text-xs text-slate-500">Applicant ID: #{shortId}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-900/60 rounded-lg p-3">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Specialization</p>
                                <p className="text-sm text-slate-300">{specs[0] || "—"}</p>
                            </div>
                            <div className="bg-slate-900/60 rounded-lg p-3">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Experience</p>
                                <p className="text-sm text-slate-300">{app.years_of_experience ? `${app.years_of_experience} Years` : "—"}</p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => { onClose(); navigate(`/admin/applications/${app.id}`); }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-transparent border border-slate-700 text-slate-300 text-sm font-medium rounded-xl cursor-pointer hover:border-slate-500 hover:text-slate-100 transition-all"
                    >
                        Review Full Application
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                    </button>
                </div>

                <div className="px-7 pb-5">
                    <button
                        onClick={() => { onClose(); onJoinRoom(app); }}
                        className="w-full flex items-center justify-center gap-3 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl cursor-pointer border-none transition-all shadow-[0_4px_14px_rgba(99,102,241,0.4)]"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                            <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" />
                        </svg>
                        Join Interview Room
                    </button>
                    <p className="text-center text-[11px] text-slate-600 mt-2 flex items-center justify-center gap-1">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                        Session recording is enabled by default.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function AdminApplicationList() {
    const [search, setSearch] = useState("");
    const [inputVal, setInputVal] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [sortBy, setSortBy] = useState("date");
    const [sortDir, setSortDir] = useState("desc");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const filterDropdown = useDropdown();
    const sortDropdown = useDropdown();
    const navigate = useNavigate();
    const [selectedInterview, setSelectedInterview] = useState(null);
    const queryClient = useQueryClient();

    const handleSearchChange = useCallback((e) => {
        const val = e.target.value;
        setInputVal(val);
        clearTimeout(window._appSearchTimer);
        window._appSearchTimer = setTimeout(() => { setSearch(val); setPage(1); }, 350);
    }, []);

    const applyFilter = (val) => { setFilterStatus(val); setPage(1); filterDropdown.setOpen(false); };
    const applySort = (opt) => { setSortBy(opt.sortBy); setSortDir(opt.sortDir); setPage(1); sortDropdown.setOpen(false); };

    const { data: allApps = [], isLoading, isError } = useQuery({
        queryKey: ["admin-applications", search, filterStatus, sortBy, sortDir],
        queryFn: () => fetchAdminApplications({ search, filterStatus, sortBy, sortDir }),
        keepPreviousData: true,
    });

    const total = allApps.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const paged = allApps.slice((page - 1) * pageSize, page * pageSize);
    const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);

    const hasFilters = search || filterStatus !== "all" || sortBy !== "date" || sortDir !== "desc";

    return (
        <div className="flex min-h-screen bg-admin-gradient font-['DM_Sans',sans-serif]">
            <Sidebar />
            <div className="flex-1 ml-[220px] flex flex-col">
                <Navbar />
                <div className="flex-1 mt-[60px] p-6 lg:p-8">
                    <div className="mb-7">
                        <h1 className="font-outfit text-2xl font-bold text-slate-100 tracking-tight">Psychologist Applications</h1>
                        <p className="text-slate-400 text-sm mt-1">Review and manage pending psychologist registration applications.</p>
                    </div>

                    <div className="flex items-center gap-3 mb-5 flex-wrap">
                        <div className="relative w-[440px]">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none w-4 h-4" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            <input
                                className="w-full pl-10 pr-4 py-2.5 bg-[#141826] border border-slate-700/60 text-slate-200 text-sm rounded-[10px] outline-none transition-colors duration-200 placeholder:text-slate-500 focus:border-admin-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)]"
                                type="text" placeholder="Search by name, email or job title…"
                                value={inputVal} onChange={handleSearchChange}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="relative" ref={filterDropdown.ref}>
                                <button className={btnOutlineCls(filterStatus !== "all")} onClick={() => filterDropdown.setOpen((o) => !o)}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                                    </svg>
                                    {filterStatus !== "all" ? FILTER_OPTIONS.find((o) => o.value === filterStatus)?.label : "Filter"}
                                </button>
                                {filterDropdown.open && (
                                    <div className="absolute left-0 top-[calc(100%+6px)] w-[220px] bg-[#161b22] border border-slate-800 rounded-[12px] shadow-admin-card overflow-hidden z-20">
                                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.08em] px-4 py-2">Status</p>
                                        {FILTER_OPTIONS.map((opt) => (
                                            <button key={opt.value} className={dropdownItemCls(filterStatus === opt.value)} onClick={() => applyFilter(opt.value)}>
                                                {opt.label}
                                                {filterStatus === opt.value && (
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="relative" ref={sortDropdown.ref}>
                                <button className={btnOutlineCls(sortBy !== "date" || sortDir !== "desc")} onClick={() => sortDropdown.setOpen((o) => !o)}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                                        <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                                    </svg>
                                    Sort
                                </button>
                                {sortDropdown.open && (
                                    <div className="absolute left-0 top-[calc(100%+6px)] w-[200px] bg-[#161b22] border border-slate-800 rounded-[12px] shadow-admin-card overflow-hidden z-20">
                                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.08em] px-4 py-2">Sort by</p>
                                        {SORT_OPTIONS.map((opt) => (
                                            <button key={opt.label} className={dropdownItemCls(sortBy === opt.sortBy && sortDir === opt.sortDir)} onClick={() => applySort(opt)}>
                                                {opt.label}
                                                {sortBy === opt.sortBy && sortDir === opt.sortDir && (
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {hasFilters && (
                                <button
                                    className="px-3 py-2 text-sm text-slate-400 bg-transparent border-none cursor-pointer hover:text-slate-200 transition-colors"
                                    onClick={() => { setSearch(""); setInputVal(""); setFilterStatus("all"); setSortBy("date"); setSortDir("desc"); setPage(1); }}
                                >
                                    Clear All
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="bg-[#141826] border border-slate-700/50 rounded-[14px] overflow-hidden">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-slate-700/40">
                                    <th className={thCls}>Name</th>
                                    <th className={thCls}>Email</th>
                                    <th className={thCls}>Submitted Date</th>
                                    <th className={thCls}>Status</th>
                                    <th className={thCls}>Interview Date</th>
                                    <th className={thCls}>Interview Status</th>
                                    <th className={thCls}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading && (
                                    <tr><td colSpan={7} className="text-center py-16 text-slate-500 text-sm">Loading applications…</td></tr>
                                )}
                                {isError && (
                                    <tr><td colSpan={7} className="text-center py-16 text-red-400 text-sm">Failed to load. Please refresh.</td></tr>
                                )}
                                {!isLoading && !isError && paged.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="text-center py-16 text-slate-500 text-sm">
                                            {search ? `No results for "${search}"` : "No applications found."}
                                        </td>
                                    </tr>
                                )}
                                {paged.map((app) => {
                                    const interviewDT = fmtDateTime(app.interview_date);
                                    const interviewStatusCfg = INTERVIEW_STATUS[app.status];

                                    return (
                                        <tr key={app.id} className="border-b border-slate-700/30 transition-colors hover:bg-slate-800/20">
                                            <td className={tdCls}>
                                                <div className="flex items-center gap-3">
                                                    <AppAvatar name={app.full_name} photo={app.profile_picture} />
                                                    <div>
                                                        <div className="font-medium text-slate-200">{app.full_name}</div>
                                                        <div className="text-[11px] text-slate-500">
                                                            ID: #{String(app.id).slice(0, 8).toUpperCase()}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className={`${tdCls} text-slate-400`}>{app.email || "—"}</td>
                                            <td className={`${tdCls} text-slate-400`}>{fmtDate(app.submitted_at)}</td>
                                            <td className={tdCls}><StatusBadge status={app.status} /></td>

                                            <td className={tdCls}>
                                                {interviewDT ? (
                                                    <div>
                                                        <div className="text-slate-300">{interviewDT.date}</div>
                                                        <div className="text-[11px] text-slate-500">{interviewDT.time}</div>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-600">—</span>
                                                )}
                                            </td>

                                            <td className={tdCls}>
                                                {interviewStatusCfg ? (
                                                    <span className={interviewStatusCfg.cls}>{interviewStatusCfg.label}</span>
                                                ) : (
                                                    <span className="text-slate-600">—</span>
                                                )}
                                            </td>

                                            <td className={tdCls}>
                                                <div className="flex items-center gap-1.5">
                                                    <NavIconBtn
                                                        title="View Details"
                                                        onClick={() => navigate(`/admin/applications/${app.id}`)}
                                                        cls="bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200 hover:border-admin-primary"
                                                    >
                                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                                                        </svg>
                                                    </NavIconBtn>
                                                    {(app.status === "INTERVIEW_SCHEDULED" || app.status === "ONGOING") && (
                                                        <NavIconBtn
                                                            title="Interview Details"
                                                            onClick={() => setSelectedInterview(app)}
                                                            cls="bg-[#1188d8]/10 border-[#1188d8]/30 text-[#63b3ed] hover:bg-[#1188d8]/20 hover:border-[#1188d8]"
                                                        >
                                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                                                            </svg>
                                                        </NavIconBtn>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex items-center justify-between mt-4 text-sm text-slate-500 flex-wrap gap-3">
                        <div className="flex items-center gap-2">
                            <span>Rows per page:</span>
                            <select
                                className="bg-[#141826] border border-slate-700/60 text-slate-300 text-sm rounded-lg px-2 py-1 outline-none cursor-pointer focus:border-admin-primary"
                                value={pageSize}
                                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                            </select>
                        </div>
                        <span>{total > 0 ? `${start}–${end} of ${total}` : "0 results"}</span>
                        <div className="flex items-center gap-1.5">
                            <button
                                className="w-8 h-8 bg-[#141826] border border-slate-700/60 rounded-lg flex items-center justify-center text-slate-400 cursor-pointer hover:border-admin-primary hover:text-admin-primary transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                                disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
                            </button>
                            <button
                                className="w-8 h-8 bg-[#141826] border border-slate-700/60 rounded-lg flex items-center justify-center text-slate-400 cursor-pointer hover:border-admin-primary hover:text-admin-primary transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                                disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {selectedInterview && (
                <InterviewDetailsModal
                    app={selectedInterview}
                    onClose={() => setSelectedInterview(null)}
                    navigate={navigate}
                    onJoinRoom={(app) => {
                        setSelectedInterview(null);
                        navigate(`/admin/interview/${app.interview_id}`, {
                            state: {
                                applicantName: app.full_name,
                                scheduledAt: app.interview_date,
                            }
                        });
                    }}
                />
            )}
        </div>
    );
}

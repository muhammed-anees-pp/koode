import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAdminPatients, togglePatientSuspension } from "../../../api/admin.api";
import Sidebar from "../../../components/admin/Sidebar/AdminSidebar";
import Navbar from "../../../components/admin/Navbar/AdminNavbar";
import { resolveMediaUrl } from "../../../utils/url";

function PatientAvatar({ name, photo, size = 38 }) {
    const [imgError, setImgError] = useState(false);
    const initials = name ? name.charAt(0).toUpperCase() : "?";
    const colours = ["#7C3AED", "#0EA5E9", "#10B981", "#F59E0B", "#EF4444", "#EC4899", "#14B8A6", "#6366F1"];
    const colour = colours[(name?.charCodeAt(0) || 0) % colours.length];

    if (photo && !imgError) {
        return (
            <img
                src={resolveMediaUrl(photo)}
                alt={name}
                className="rounded-full object-cover flex-shrink-0"
                style={{ width: size, height: size }}
                onError={() => setImgError(true)}
            />
        );
    }
    return (
        <div className="rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold" style={{ background: colour, width: size, height: size, fontSize: size * 0.37 }}>{initials}</div>
    );
}

const overlayClasses = "fixed inset-0 bg-[rgba(0,0,0,0.75)] backdrop-blur-[4px] z-[200] flex items-center justify-center p-5 animate-fade-in";

function PatientDetailModal({ patient, onClose, onDeactivate }) {
    useEffect(() => {
        const handler = (e) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose]);

    if (!patient) return null;

    const Field = ({ label, value }) => (
        <div className="flex flex-col gap-1 py-3 border-b border-slate-800/60 last:border-0">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.08em]">{label}</span>
            <span className="text-sm text-slate-200 font-medium">{value || "—"}</span>
        </div>
    );

    return (
        <div className={overlayClasses} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="bg-[#141826] border border-slate-700/50 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.6)] w-full max-w-[480px] relative overflow-hidden animate-[pdmSlideUp_0.22s_cubic-bezier(0.22,1,0.36,1)]">

                <button
                    className="absolute top-3 right-3 w-8 h-8 bg-slate-800/60 hover:bg-slate-700 rounded-full border-none cursor-pointer text-slate-400 hover:text-slate-200 flex items-center justify-center transition-all duration-200 z-10 text-lg font-light"
                    onClick={onClose}
                    aria-label="Close"
                >
                    ×
                </button>

                <div className="flex flex-col items-center text-center pt-8 pb-5 px-6">
                    <div className="relative mb-4">
                        <div className="w-[96px] h-[96px] rounded-full border-[3px] border-white/80 flex items-center justify-center overflow-hidden">
                            <PatientAvatar name={patient.full_name} photo={patient.profile_picture} size={88} />
                        </div>
                        <span className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-[#141826] ${patient.is_active ? "bg-emerald-400" : "bg-slate-500"}`} />
                    </div>
                    <h2 className="font-outfit text-[1.15rem] font-bold text-slate-100 mb-0.5">{patient.full_name}</h2>
                    <p className="text-[12px] text-slate-400 mb-2">{patient.email}</p>
                    <p className="text-[12px] font-medium text-admin-primary mb-3">ID: #{patient.patient_id}</p>
                    <span className={`inline-flex items-center gap-1.5 px-4 py-1 text-[12px] font-semibold rounded-full ${patient.is_active
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-red-500/15 text-red-400"
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${patient.is_active ? "bg-emerald-400" : "bg-red-400"}`} />
                        {patient.is_active ? "Active" : "Suspended"}
                    </span>
                </div>

                <div className="h-px bg-slate-800/60" />

                <div className="grid grid-cols-2 px-6">
                    <Field label="Age" value={patient.age != null ? `${patient.age} Years` : "—"} />
                    <Field label="Phone" value={patient.phone_number} />
                    <Field label="Joined Date" value={patient.joined_date} />
                    <Field label="Gender" value={patient.gender} />
                </div>

                <div className="text-center py-5">
                    <button
                        className="text-slate-500 text-sm bg-transparent border-none cursor-pointer hover:text-slate-300 transition-colors"
                        onClick={onClose}
                    >
                        Dismiss View
                    </button>
                </div>
            </div>
        </div>
    );
}

function SuspendConfirmModal({ patient, onConfirm, onCancel, isLoading }) {
    useEffect(() => {
        const handler = (e) => { if (e.key === "Escape") onCancel(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onCancel]);

    const willSuspend = patient.is_active;

    return (
        <div className={overlayClasses} onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
            <div className="bg-[#141826] border border-slate-700/50 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.6)] w-full max-w-[380px] p-8 text-center animate-fade-in">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 border ${willSuspend ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"}`}>
                    {willSuspend ? (
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
                    ) : (
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="20 6 9 17 4 12" /></svg>
                    )}
                </div>
                <h3 className="font-outfit text-xl font-bold text-slate-100 mb-2">{willSuspend ? "Suspend Patient?" : "Activate Patient?"}</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                    {willSuspend
                        ? <>You are about to suspend <strong className="text-slate-200">{patient.full_name}</strong>. They will be immediately blocked from logging in.</>
                        : <>You are about to re-activate <strong className="text-slate-200">{patient.full_name}</strong>. They will regain platform access.</>
                    }
                </p>
                <div className="flex gap-3">
                    <button className="flex-1 py-2.5 text-sm font-medium text-slate-400 bg-slate-800 border border-slate-700 rounded-[10px] cursor-pointer hover:bg-slate-700 transition-all duration-200 disabled:opacity-50" onClick={onCancel} disabled={isLoading}>Cancel</button>
                    <button className={`flex-1 py-2.5 text-sm font-medium text-white border-none rounded-[10px] cursor-pointer transition-all duration-200 disabled:opacity-50 ${willSuspend ? "bg-red-500 hover:bg-red-600" : "bg-emerald-500 hover:bg-emerald-600"}`} onClick={onConfirm} disabled={isLoading}>
                        {isLoading ? (willSuspend ? "Suspending…" : "Activating…") : (willSuspend ? "Yes, Suspend" : "Yes, Activate")}
                    </button>
                </div>
            </div>
        </div>
    );
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

const SORT_OPTIONS = [
    { label: "Name (A → Z)", sortBy: "name", sortDir: "asc" },
    { label: "Name (Z → A)", sortBy: "name", sortDir: "desc" },
    { label: "Newest first", sortBy: "joined_date", sortDir: "desc" },
    { label: "Oldest first", sortBy: "joined_date", sortDir: "asc" },
    { label: "Active first", sortBy: "status", sortDir: "desc" },
    { label: "Suspended first", sortBy: "status", sortDir: "asc" },
];

const FILTER_OPTIONS = [
    { label: "All Patients", value: "all" },
    { label: "Active only", value: "active" },
    { label: "Suspended only", value: "suspended" },
];

const btnOutlineCls = (active) => `flex items-center gap-2 px-4 py-2.5 text-sm text-slate-400 bg-[#141826] border ${active ? "border-admin-primary text-admin-primary bg-admin-primary/10" : "border-slate-700/60"} rounded-[10px] cursor-pointer transition-all duration-200 hover:border-admin-primary hover:text-admin-primary`;
const dropdownItemCls = (active) => `w-full flex items-center justify-between px-4 py-2.5 text-sm text-left border-none cursor-pointer transition-all duration-200 ${active ? "bg-admin-primary/10 text-admin-primary" : "text-slate-400 bg-transparent hover:bg-slate-800/60 hover:text-slate-200"}`;
const thCls = "px-5 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-[0.1em]";
const tdCls = "px-5 py-4 text-sm text-slate-300";

export default function AdminPatientList() {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [search, setSearch] = useState("");
    const [inputVal, setInputVal] = useState("");
    const [sortBy, setSortBy] = useState("joined_date");
    const [sortDir, setSortDir] = useState("desc");
    const [filterStatus, setFilterStatus] = useState("all");
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [suspendTarget, setSuspendTarget] = useState(null);
    const filterDropdown = useDropdown();
    const sortDropdown = useDropdown();
    const queryClient = useQueryClient();

    const handleSearchChange = useCallback((e) => {
        const val = e.target.value;
        setInputVal(val);
        clearTimeout(window._aplSearchTimer);
        window._aplSearchTimer = setTimeout(() => { setSearch(val); setPage(1); }, 350);
    }, []);

    const applySort = (opt) => { setSortBy(opt.sortBy); setSortDir(opt.sortDir); setPage(1); sortDropdown.setOpen(false); };
    const applyFilter = (val) => { setFilterStatus(val); setPage(1); filterDropdown.setOpen(false); };

    const { data, isLoading, isError } = useQuery({
        queryKey: ["admin-patients", page, pageSize, search, sortBy, sortDir, filterStatus],
        queryFn: () => fetchAdminPatients({ page, pageSize, search, sortBy, sortDir, filterStatus }),
        keepPreviousData: true,
    });

    const suspendMutation = useMutation({
        mutationFn: (patientId) => togglePatientSuspension(patientId),
        onSuccess: () => { queryClient.invalidateQueries(["admin-patients"]); setSuspendTarget(null); },
    });

    const patients = data?.results || [];
    const total = data?.total || 0;
    const totalPages = data?.total_pages || 1;
    const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    const hasActiveFilters = search || filterStatus !== "all";
    const activeFilterLabel = FILTER_OPTIONS.find(o => o.value === filterStatus)?.label || "Filter";

    const StatusBadge = ({ active }) => (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[12px] font-semibold rounded-full ${active ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-400" : "bg-red-400"}`} />
            {active ? "Active" : "Suspended"}
        </span>
    );

    return (
        <div className="flex min-h-screen bg-admin-gradient font-['DM_Sans',sans-serif]">
            <Sidebar />
            <div className="flex-1 ml-[220px] flex flex-col">
                <Navbar />
                <div className="flex-1 mt-[60px] p-6 lg:p-8">
                    <div className="mb-7">
                        <h1 className="font-outfit text-2xl font-bold text-slate-100 tracking-tight">Patients</h1>
                        <p className="text-slate-400 text-sm mt-1">Manage registered patients and their account status.</p>
                    </div>

                    <div className="flex items-center gap-3 mb-5 flex-wrap">
                        <div className="relative w-[500px]">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none w-4 h-4" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                            <input className="w-full pl-10 pr-4 py-2.5 bg-[#141826] border border-slate-700/60 text-slate-200 text-sm rounded-[10px] outline-none transition-colors duration-200 placeholder:text-slate-500 focus:border-admin-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)]" type="text" placeholder="Search by name, email…" value={inputVal} onChange={handleSearchChange} />
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="relative" ref={filterDropdown.ref}>
                                <button className={btnOutlineCls(filterStatus !== "all")} onClick={() => { filterDropdown.setOpen(o => !o); sortDropdown.setOpen(false); }}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
                                    {filterStatus !== "all" ? activeFilterLabel : "Filter"}
                                </button>
                                {filterDropdown.open && (
                                    <div className="absolute right-0 top-[calc(100%+6px)] w-[180px] bg-[#161b22] border border-slate-800 rounded-[12px] shadow-admin-card overflow-hidden z-20 animate-fade-in">
                                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.08em] px-4 py-2">Status</p>
                                        {FILTER_OPTIONS.map(opt => (
                                            <button key={opt.value} className={dropdownItemCls(filterStatus === opt.value)} onClick={() => applyFilter(opt.value)}>
                                                {opt.label}
                                                {filterStatus === opt.value && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="relative" ref={sortDropdown.ref}>
                                <button className={btnOutlineCls(sortBy !== "joined_date" || sortDir !== "desc")} onClick={() => { sortDropdown.setOpen(o => !o); filterDropdown.setOpen(false); }}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
                                    Sort
                                </button>
                                {sortDropdown.open && (
                                    <div className="absolute right-0 top-[calc(100%+6px)] w-[200px] bg-[#161b22] border border-slate-800 rounded-[12px] shadow-admin-card overflow-hidden z-20 animate-fade-in">
                                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.08em] px-4 py-2">Sort by</p>
                                        {SORT_OPTIONS.map(opt => (
                                            <button key={opt.label} className={dropdownItemCls(sortBy === opt.sortBy && sortDir === opt.sortDir)} onClick={() => applySort(opt)}>
                                                {opt.label}
                                                {sortBy === opt.sortBy && sortDir === opt.sortDir && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {hasActiveFilters && (
                                <button className="px-3 py-2 text-sm text-slate-400 bg-transparent border-none cursor-pointer hover:text-slate-200 transition-colors" onClick={() => { setSearch(""); setInputVal(""); setFilterStatus("all"); setPage(1); }}>Clear</button>
                            )}
                        </div>
                    </div>

                    <div className="bg-[#141826] border border-slate-700/50 rounded-[14px] overflow-hidden">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-slate-700/40">
                                    <th className={thCls}>Name</th>
                                    <th className={thCls}>Email</th>
                                    <th className={thCls}>Status</th>
                                    <th className={thCls}>Joined Date</th>
                                    <th className={thCls}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading && <tr><td colSpan={5} className="text-center py-16 text-slate-500 text-sm">Loading patients…</td></tr>}
                                {isError && <tr><td colSpan={5} className="text-center py-16 text-red-400 text-sm">Failed to load. Please refresh.</td></tr>}
                                {!isLoading && !isError && patients.length === 0 && (
                                    <tr><td colSpan={5} className="text-center py-16 text-slate-500 text-sm">No patients found{search ? ` for "${search}"` : ""}.</td></tr>
                                )}
                                {patients.map((p) => (
                                    <tr key={p.patient_id} className="border-b border-slate-700/30 transition-colors hover:bg-slate-800/20">
                                        <td className={tdCls}>
                                            <div className="flex items-center gap-3">
                                                <PatientAvatar name={p.full_name} photo={p.profile_picture} />
                                                <div>
                                                    <div className="font-medium text-slate-200">{p.full_name}</div>
                                                    <div className="text-[11px] text-slate-500">ID: {p.patient_id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className={`${tdCls} text-slate-400`}>{p.email}</td>
                                        <td className={tdCls}><StatusBadge active={p.is_active} /></td>
                                        <td className={`${tdCls} text-slate-400`}>{p.joined_date}</td>
                                        <td className={tdCls}>
                                            <div className="flex items-center gap-1.5">
                                                <button className="w-8 h-8 bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-center text-slate-400 cursor-pointer transition-all duration-200 hover:bg-slate-700 hover:text-slate-200" title="View patient" onClick={() => setSelectedPatient(p)}>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                                </button>
                                                <button
                                                    className={`w-8 h-8 rounded-lg border flex items-center justify-center cursor-pointer transition-all duration-200 ${!p.is_active ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20" : "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"}`}
                                                    title={p.is_active ? "Suspend patient" : "Activate patient"}
                                                    onClick={() => setSuspendTarget(p)}
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <circle cx="12" cy="12" r="10" />
                                                        {p.is_active ? <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /> : <polyline points="20 6 9 17 4 12" />}
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex items-center justify-between mt-4 text-sm text-slate-500 flex-wrap gap-3">
                        <div className="flex items-center gap-2">
                            <span>Rows per page:</span>
                            <select className="bg-[#141826] border border-slate-700/60 text-slate-300 text-sm rounded-lg px-2 py-1 outline-none cursor-pointer focus:border-admin-primary" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                            </select>
                        </div>
                        <span>{total > 0 ? `${start}-${end} of ${total}` : "0 results"}</span>
                        <div className="flex items-center gap-1.5">
                            <button className="w-8 h-8 bg-[#141826] border border-slate-700/60 rounded-lg flex items-center justify-center text-slate-400 cursor-pointer hover:border-admin-primary hover:text-admin-primary transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
                            </button>
                            <button className="w-8 h-8 bg-[#141826] border border-slate-700/60 rounded-lg flex items-center justify-center text-slate-400 cursor-pointer hover:border-admin-primary hover:text-admin-primary transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {selectedPatient && (
                <PatientDetailModal
                    patient={selectedPatient}
                    onClose={() => setSelectedPatient(null)}
                    onDeactivate={(p) => setSuspendTarget(p)}
                />
            )}
            {suspendTarget && (
                <SuspendConfirmModal
                    patient={suspendTarget}
                    onConfirm={() => suspendMutation.mutate(suspendTarget.patient_id)}
                    onCancel={() => setSuspendTarget(null)}
                    isLoading={suspendMutation.isPending}
                />
            )}
        </div>
    );
}

import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { fetchApplicationDetail, updateApplication, scheduleInterview } from "../../../api/admin.api";
import Sidebar from "../../../components/admin/Sidebar/AdminSidebar";
import Navbar from "../../../components/admin/Navbar/AdminNavbar";
import { resolveMediaUrl } from "../../../utils/url";

const STATUS_CONFIG = {
    SUBMITTED: { label: "Pending Review", cls: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/25" },
    INTERVIEW_SCHEDULED: { label: "Interview Scheduled", cls: "bg-blue-500/15 text-blue-400 border border-blue-500/25" },
    INTERVIEW_COMPLETED: { label: "Interview Completed", cls: "bg-purple-500/15 text-purple-400 border border-purple-500/25" },
    APPROVED: { label: "Approved", cls: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25" },
    REJECTED: { label: "Rejected", cls: "bg-red-500/15 text-red-400 border border-red-500/25" },
    DRAFT: { label: "Draft", cls: "bg-slate-500/15 text-slate-400 border border-slate-500/25" },
};

function fmtDate(dateStr) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" });
}

function fmtDateTime(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric", timeZone: "Asia/Kolkata" }) +
        " at " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }).toUpperCase();
}

function InfoRow({ label, value }) {
    return (
        <div className="flex flex-col gap-1 py-3.5 border-b border-slate-800/60 last:border-0">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em]">{label}</span>
            <span className="text-sm text-slate-200 font-medium break-words">{value || "—"}</span>
        </div>
    );
}

function SectionCard({ title, icon, children }) {
    return (
        <div className="bg-[#141826] border border-slate-700/50 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-700/40">
                <span className="text-admin-primary">{icon}</span>
                <h3 className="font-outfit text-sm font-semibold text-slate-200 tracking-tight">{title}</h3>
            </div>
            <div className="px-5">{children}</div>
        </div>
    );
}

function AudioPlayer({ src }) {
    const audioRef = useRef(null);
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);

    const toggle = () => {
        const a = audioRef.current;
        if (!a) return;
        if (playing) { a.pause(); } else { a.play(); }
        setPlaying(!playing);
    };

    const fmt = (s) => {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, "0")}`;
    };

    const handleSeek = (e) => {
        const a = audioRef.current;
        if (!a || !a.duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const pct = (e.clientX - rect.left) / rect.width;
        a.currentTime = pct * a.duration;
    };

    return (
        <div className="flex items-center gap-4 bg-slate-800/40 border border-slate-700/40 rounded-xl px-4 py-3.5 mt-1">
            <audio
                ref={audioRef} src={src}
                onTimeUpdate={() => { const a = audioRef.current; if (a) setProgress(a.currentTime / (a.duration || 1) * 100); }}
                onLoadedMetadata={() => { if (audioRef.current) setDuration(audioRef.current.duration); }}
                onEnded={() => setPlaying(false)}
            />
            <button
                onClick={toggle}
                className="w-10 h-10 rounded-full bg-admin-primary flex items-center justify-center flex-shrink-0 border-none cursor-pointer hover:bg-indigo-500 transition-all"
            >
                {playing
                    ? <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                    : <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                }
            </button>
            <div className="flex-1 min-w-0">
                <div
                    className="relative h-1.5 bg-slate-700 rounded-full overflow-hidden cursor-pointer mb-2"
                    onClick={handleSeek}
                >
                    <div
                        className="absolute inset-y-0 left-0 bg-admin-primary rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                    <span>{fmt((progress / 100) * duration)}</span>
                    <span>{fmt(duration)}</span>
                </div>
            </div>
            <a
                href={src} download target="_blank" rel="noreferrer"
                className="flex-shrink-0 flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                title="Download audio"
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                </svg>
            </a>
        </div>
    );
}

function ProfileAvatar({ name, photo, size = 96 }) {
    if (photo) {
        return (
            <img
                src={resolveMediaUrl(photo)} alt={name}
                className="rounded-full object-cover border-4 border-slate-700/60"
                style={{ width: size, height: size }}
                onError={(e) => { e.target.style.display = "none"; }}
            />
        );
    }
    const colours = ["#7C3AED", "#0EA5E9", "#10B981", "#F59E0B", "#EF4444", "#EC4899"];
    const colour = colours[(name?.charCodeAt(0) || 0) % colours.length];
    return (
        <div
            className="rounded-full flex items-center justify-center text-white font-bold border-4 border-slate-700/60"
            style={{ background: colour, width: size, height: size, fontSize: size * 0.38 }}
        >
            {name?.charAt(0)?.toUpperCase() || "?"}
        </div>
    );
}

const ICONS = {
    user: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
    map: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>,
    briefcase: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>,
    mic: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>,
    file: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>,
    dollar: <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1 }}>₹</span>,
    calendar: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
};

function ScheduleModal({ onConfirm, onClose, loading, candidateName, shortId }) {
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [dateError, setDateError] = useState("");
    const [timeError, setTimeError] = useState("");
    const dateInputRef = useRef(null);
    const timeInputRef = useRef(null);

    const openDatePicker = () => { try { dateInputRef.current?.showPicker(); } catch { dateInputRef.current?.click(); } };
    const openTimePicker = () => { try { timeInputRef.current?.showPicker(); } catch { timeInputRef.current?.click(); } };

    const getNowIST = () => {
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        return new Date(now.getTime() + istOffset);
    };

    const todayIST = getNowIST().toISOString().split("T")[0]; 

    const validateDate = (val) => {
        if (!val) { setDateError(""); return; }
        if (val < todayIST) {
            setDateError("Interview date cannot be in the past. Please select today or a future date.");
        } else {
            setDateError("");
        }

        if (time) validateTime(val, time);
    };

    const validateTime = (d, t) => {
        if (!d || !t) { setTimeError(""); return; }
        if (d === todayIST) {
            const nowIST = getNowIST();
            const [h, m] = t.split(":").map(Number);
            const nowH = nowIST.getUTCHours();
            const nowM = nowIST.getUTCMinutes();
            if (h < nowH || (h === nowH && m <= nowM)) {
                const h12 = nowH % 12 || 12;
                const ampm = nowH >= 12 ? "PM" : "AM";
                const nowFmt = String(h12).padStart(2, "0") + ":" + String(nowM).padStart(2, "0") + " " + ampm;
                setTimeError(`For today's interview, please select a time after ${nowFmt} (current IST time).`);
            } else {
                setTimeError("");
            }
        } else {
            setTimeError("");
        }
    };

    const handleDateChange = (e) => {
        const val = e.target.value;
        setDate(val);
        validateDate(val);
    };

    const handleTimeChange = (e) => {
        const val = e.target.value;
        setTime(val);
        validateTime(date, val);
    };

    const hasError = !!dateError || !!timeError;
    const canConfirm = date && time && !hasError && !loading;

    const handleConfirm = () => {
        if (!canConfirm) return;
        onConfirm(`${date}T${time}:00+05:30`);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[#0f1320] border border-slate-700/50 rounded-2xl shadow-2xl w-[520px] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="px-7 pt-7 pb-5">
                    <h3 className="font-outfit text-xl font-bold text-slate-100 mb-4">Schedule Interview</h3>

                    <div className="flex items-center gap-2 mb-6">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                        </svg>
                        <span className="text-sm text-slate-400">Candidate:</span>
                        <span className="text-sm font-semibold text-slate-200">{candidateName}</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-sm text-slate-500">ID: <span className="text-indigo-400 font-mono">#{shortId}</span></span>
                    </div>

                    <div className="w-full h-px bg-slate-800 mb-6" />

                    <div className="grid grid-cols-2 gap-4 mb-2">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm text-slate-400">Interview Date</label>
                            <div onClick={openDatePicker} className={`relative flex items-center bg-[#161d2f] border rounded-xl px-4 py-3 transition-colors cursor-pointer ${dateError ? "border-red-500/70" : "border-slate-700/60 focus-within:border-indigo-500"}`}>
                                <input
                                    ref={dateInputRef}
                                    type="date"
                                    min={todayIST}
                                    value={date}
                                    onChange={handleDateChange}
                                    className="absolute inset-0 opacity-0 w-full h-full pointer-events-none"
                                    style={{ colorScheme: "dark" }}
                                />
                                <svg className="mr-2 flex-shrink-0 text-slate-500 pointer-events-none" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                                </svg>
                                <span className="text-sm pointer-events-none select-none flex-1 tracking-wide" style={{ color: date ? "#cbd5e1" : "#475569" }}>
                                    {date
                                        ? `${date.split("-")[2]}/${date.split("-")[1]}/${date.split("-")[0]}`
                                        : "DD/MM/YYYY"
                                    }
                                </span>
                                <svg className="flex-shrink-0 text-slate-500 pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-sm text-slate-400">Interview Time</label>
                            <div onClick={openTimePicker} className={`relative flex items-center bg-[#161d2f] border rounded-xl px-4 py-3 cursor-pointer transition-colors ${timeError ? "border-red-500/70" : "border-slate-700/60 focus-within:border-indigo-500"}`}>
                                <input
                                    ref={timeInputRef}
                                    type="time"
                                    value={time}
                                    onChange={handleTimeChange}
                                    onClick={(e) => e.stopPropagation()}
                                    className={`flex-1 bg-transparent text-sm text-slate-300 outline-none [color-scheme:dark] cursor-pointer`}
                                />
                                <svg className="flex-shrink-0 ml-2 pointer-events-none text-slate-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    
                    {dateError && (
                        <div className="flex items-start gap-2 mt-3 px-3 py-2.5 bg-red-500/10 border border-red-500/25 rounded-xl">
                            <svg className="flex-shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            <span className="text-xs text-red-400 leading-relaxed">{dateError}</span>
                        </div>
                    )}
                    {timeError && !dateError && (
                        <div className="flex items-start gap-2 mt-3 px-3 py-2.5 bg-red-500/10 border border-red-500/25 rounded-xl">
                            <svg className="flex-shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            <span className="text-xs text-red-400 leading-relaxed">{timeError}</span>
                        </div>
                    )}

                    <div className="mt-4" />
                </div>

                <div className="px-7 py-4 border-t border-slate-800/80 flex items-center justify-end gap-5">
                    <button
                        onClick={onClose}
                        className="text-sm text-slate-400 hover:text-slate-200 transition-colors cursor-pointer bg-transparent border-none"
                    >
                        Cancel
                    </button>
                    <button
                        disabled={!canConfirm}
                        onClick={handleConfirm}
                        className="flex items-center gap-2.5 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl cursor-pointer border-none transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_14px_rgba(99,102,241,0.4)]"
                    >
                        {loading
                            ? <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                            : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                        }
                        Confirm Schedule
                    </button>
                </div>
            </div>
        </div>
    );
}


function DeclineModal({ onConfirm, onClose, loading, candidateName }) {
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[#0f1320] border border-slate-700/50 rounded-2xl shadow-2xl w-[420px] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="px-7 pt-7 pb-5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-outfit text-base font-bold text-slate-100">Decline Application</h3>
                            <p className="text-xs text-slate-500 mt-0.5">{candidateName}</p>
                        </div>
                    </div>
                    <div className="w-full h-px bg-slate-800 mb-4" />
                    <p className="text-sm text-slate-400 leading-relaxed">
                        Are you sure you want to decline this application? This will set the status to <span className="text-red-400 font-semibold">Rejected</span>. The psychologist will be notified.
                    </p>
                </div>
                <div className="px-7 py-4 border-t border-slate-800/80 flex items-center justify-end gap-4">
                    <button
                        onClick={onClose}
                        className="text-sm text-slate-400 hover:text-slate-200 transition-colors cursor-pointer bg-transparent border-none"
                    >
                        Cancel
                    </button>
                    <button
                        disabled={loading}
                        onClick={onConfirm}
                        className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-xl cursor-pointer border-none transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_14px_rgba(239,68,68,0.3)]"
                    >
                        {loading
                            ? <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                        }
                        {loading ? "Declining…" : "Yes, Decline"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function AdminApplicationDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [adminNotes, setAdminNotes] = useState("");
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [showDeclineModal, setShowDeclineModal] = useState(false);
    const [declineError, setDeclineError] = useState(null);
    const [notesSuccess, setNotesSuccess] = useState(false);

    const { data: app, isLoading, isError } = useQuery({
        queryKey: ["admin-application-detail", id],
        queryFn: () => fetchApplicationDetail(id),
        enabled: !!id,
        onSuccess: (data) => {
            if (data?.admin_notes !== undefined) setAdminNotes(data.admin_notes || "");
        },
    });

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-application-detail", id] });

    const notesMutation = useMutation({
        mutationFn: (notes) => updateApplication({ id, data: { admin_notes: notes } }),
        onSuccess: () => { setNotesSuccess(true); setTimeout(() => setNotesSuccess(false), 2500); invalidate(); },
    });

    const scheduleMutation = useMutation({
        mutationFn: (datetime) => scheduleInterview({ id, interview_date: datetime, admin_notes: adminNotes }),
        onSuccess: () => { setShowScheduleModal(false); invalidate(); },
    });

    const declineMutation = useMutation({
        mutationFn: () => updateApplication({ id, data: { status: "REJECTED", admin_notes: adminNotes } }),
        onSuccess: () => { setDeclineError(null); setShowDeclineModal(false); invalidate(); },
        onError: () => setDeclineError("Failed to decline. Please try again."),
    });

    const approvalMutation = useMutation({
        mutationFn: (outcome) => updateApplication({ id, data: { status: outcome, admin_notes: adminNotes } }),
        onSuccess: () => { invalidate(); },
        onError: () => setDeclineError("Action failed. Please try again."),
    });

    if (isLoading) {
        return (
            <div className="flex min-h-screen bg-admin-gradient font-['DM_Sans',sans-serif]">
                <Sidebar />
                <div className="flex-1 ml-[220px] flex flex-col">
                    <Navbar />
                    <div className="flex-1 mt-[60px] flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3 text-slate-500">
                            <svg className="animate-spin w-8 h-8 text-admin-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                            <span className="text-sm">Loading application…</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (isError || !app) {
        return (
            <div className="flex min-h-screen bg-admin-gradient font-['DM_Sans',sans-serif]">
                <Sidebar />
                <div className="flex-1 ml-[220px] flex flex-col">
                    <Navbar />
                    <div className="flex-1 mt-[60px] flex items-center justify-center">
                        <div className="text-center">
                            <p className="text-red-400 text-sm mb-4">Failed to load application.</p>
                            <button onClick={() => navigate("/admin/applications")} className="text-admin-primary text-sm hover:underline bg-transparent border-none cursor-pointer">← Back to Applications</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const statusCfg = STATUS_CONFIG[app.status] || STATUS_CONFIG["SUBMITTED"];
    const specs = (app.specializations || []).map((s) => s.name ?? s);
    const audioUrl = app.audio_intro ? resolveMediaUrl(app.audio_intro) : null;
    const certUrl = app.certificate_document ? resolveMediaUrl(app.certificate_document) : null;
    const certName = certUrl ? certUrl.split("/").pop() : "certificate.pdf";

    const commissionRate = 0.10;
    const fee = parseFloat(app.consultation_fee) || 0;
    const commission = Math.round(fee * commissionRate);
    const earning = fee - commission;

    return (
        <div className="flex min-h-screen bg-admin-gradient font-['DM_Sans',sans-serif]">
            <Sidebar />
            <div className="flex-1 ml-[220px] flex flex-col">
                <Navbar />
                <div className="flex-1 mt-[60px] p-6 lg:p-8">

                    <div className="flex items-center justify-between mb-7">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate("/admin/applications")}
                                className="w-9 h-9 bg-[#141826] border border-slate-700/50 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-200 hover:border-admin-primary transition-all cursor-pointer"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
                            </button>
                            <div>
                                <h1 className="font-outfit text-2xl font-bold text-slate-100 tracking-tight">Application Details</h1>
                                <p className="text-slate-400 text-sm mt-0.5">ID: #{String(app.id).slice(0, 8).toUpperCase()}</p>
                            </div>
                        </div>
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-[11px] font-semibold ${statusCfg.cls}`}>
                            {statusCfg.label}
                        </span>
                    </div>

                    <div className="grid grid-cols-3 gap-6">

                        <div className="col-span-1 flex flex-col gap-6">
                            <div className="bg-[#141826] border border-slate-700/50 rounded-2xl p-6 flex flex-col items-center text-center gap-4">
                                <ProfileAvatar name={app.full_name} photo={app.profile_picture} />
                                <div>
                                    <h2 className="font-outfit text-lg font-bold text-slate-100">{app.full_name}</h2>
                                    <p className="text-sm text-admin-primary font-medium mt-0.5">{app.job_title}</p>
                                    <p className="text-xs text-slate-500 mt-1">{app.email}</p>
                                </div>
                                <div className="w-full grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/60">
                                    <div className="flex flex-col items-center gap-1 p-3 bg-slate-800/40 rounded-xl">
                                        <span className="text-lg font-bold text-slate-100">{app.years_of_experience}</span>
                                        <span className="text-[10px] text-slate-500 uppercase tracking-wide">Yrs Exp.</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-1 p-3 bg-slate-800/40 rounded-xl">
                                        <span className="text-lg font-bold text-slate-100">₹{fee.toLocaleString("en-IN")}</span>
                                        <span className="text-[10px] text-slate-500 uppercase tracking-wide">Fee / Session</span>
                                    </div>
                                </div>
                            </div>

                            {specs.length > 0 && (
                                <SectionCard title="Specializations" icon={ICONS.briefcase}>
                                    <div className="flex flex-wrap gap-2 py-4">
                                        {specs.map((s, i) => (
                                            <span key={i} className="px-2.5 py-1 bg-admin-primary/10 text-admin-primary text-xs font-medium rounded-full border border-admin-primary/20">
                                                {s}
                                            </span>
                                        ))}
                                    </div>
                                </SectionCard>
                            )}

                            <SectionCard title="Consultation Fee" icon={ICONS.dollar}>
                                <div className="py-4 flex flex-col gap-2.5 text-sm">
                                    <div className="flex justify-between text-slate-400">
                                        <span>Session Fee</span>
                                        <span className="text-slate-200 font-semibold">₹{fee.toLocaleString("en-IN")}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-400">
                                        <span>Platform (10%)</span>
                                        <span className="text-red-400">−₹{commission}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-slate-700/50 pt-2.5 text-slate-200 font-bold">
                                        <span>Psychologist Earning</span>
                                        <span className="text-emerald-400">₹{earning.toLocaleString("en-IN")}</span>
                                    </div>
                                </div>
                            </SectionCard>

                            <SectionCard title="Timeline" icon={ICONS.calendar}>
                                <InfoRow label="Submitted On" value={fmtDate(app.submitted_at)} />
                            </SectionCard>

                            {app.interview_date && (
                                <SectionCard title="Interview" icon={ICONS.calendar}>
                                    <InfoRow label="Scheduled For" value={fmtDateTime(app.interview_date)} />
                                </SectionCard>
                            )}
                        </div>

                        <div className="col-span-2 flex flex-col gap-6">

                            <SectionCard title="Personal Information" icon={ICONS.user}>
                                <div className="grid grid-cols-2">
                                    <InfoRow label="Full Name" value={app.full_name} />
                                    <InfoRow label="Email Address" value={app.email} />
                                    <InfoRow label="Phone Number" value={app.phone_number ? `+91 ${app.phone_number}` : null} />
                                    <InfoRow label="Job Title" value={app.job_title} />
                                    <InfoRow label="Years of Experience" value={app.years_of_experience != null ? `${app.years_of_experience} Years` : null} />
                                    <InfoRow label="Highest Qualification" value={app.highest_education} />
                                </div>
                            </SectionCard>

                            {audioUrl && (
                                <SectionCard title="Audio Introduction" icon={ICONS.mic}>
                                    <div className="py-4">
                                        <AudioPlayer src={audioUrl} />
                                    </div>
                                </SectionCard>
                            )}

                            {app.about && (
                                <SectionCard title="About" icon={ICONS.user}>
                                    <div className="py-4">
                                        <p className="text-sm text-slate-300 leading-relaxed">{app.about}</p>
                                    </div>
                                </SectionCard>
                            )}

                            {certUrl && (
                                <SectionCard title="Qualification Certificate" icon={ICONS.file}>
                                    <div className="py-4 flex items-center justify-between bg-slate-800/40 border border-slate-700/40 rounded-xl px-4 py-3.5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
                                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                                                    <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-200 truncate max-w-[300px]">{certName}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">PDF Document</p>
                                            </div>
                                        </div>
                                        <a
                                            href={certUrl} download target="_blank" rel="noreferrer"
                                            className="flex items-center gap-2 px-4 py-2 bg-admin-primary/10 border border-admin-primary/25 text-admin-primary text-sm font-medium rounded-xl hover:bg-admin-primary/20 transition-all"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                                            </svg>
                                            Download
                                        </a>
                                    </div>
                                </SectionCard>
                            )}

                            <SectionCard title="Office / Clinic Address" icon={ICONS.map}>
                                <div className="grid grid-cols-2">
                                    <div className="col-span-2"><InfoRow label="Street Address" value={app.street_address} /></div>
                                    <InfoRow label="City" value={app.city} />
                                    <InfoRow label="State" value={app.state} />
                                    <InfoRow label="Zip / Postal Code" value={app.pincode} />
                                    <InfoRow label="Country" value={app.country} />
                                </div>
                            </SectionCard>
                        </div>
                    </div>

                    
                    {app.interview_status === "COMPLETED" && !["APPROVED", "REJECTED"].includes(app.status) && (
                        <div className="mt-6 bg-[#141826] border border-purple-500/30 rounded-2xl overflow-hidden">
                            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-purple-500/20">
                                <span className="text-purple-400">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                                    </svg>
                                </span>
                                <h3 className="font-outfit text-sm font-semibold text-slate-200 tracking-tight">Psychologist Approval</h3>
                                <span className="ml-auto text-[11px] px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-400 font-semibold border border-purple-500/25">Interview Completed</span>
                            </div>
                            <div className="px-5 py-5">
                                <p className="text-sm text-slate-400 mb-5 leading-relaxed">
                                    The interview has been completed. Review the candidate's profile and make your final decision.
                                </p>
                                <div className="flex gap-6 items-start">
                                    <div className="flex-1 flex flex-col gap-2">
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                            Admin Notes (visible in decision record)
                                        </label>
                                        <textarea
                                            rows={4}
                                            value={adminNotes}
                                            onChange={(e) => setAdminNotes(e.target.value)}
                                            placeholder="Add notes about this candidate's interview performance…"
                                            className="w-full bg-[#0B0E14] border border-slate-700/60 rounded-xl px-4 py-3 text-sm text-slate-300 placeholder:text-slate-600 outline-none resize-none focus:border-admin-primary transition-colors"
                                        />
                                        {declineError && <span className="text-xs text-red-400">{declineError}</span>}
                                    </div>
                                    <div className="flex flex-col gap-3 min-w-[200px]">
                                        <button
                                            onClick={() => approvalMutation.mutate("APPROVED")}
                                            disabled={approvalMutation.isPending}
                                            className="flex items-center justify-center gap-2.5 px-5 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl cursor-pointer border-none transition-all shadow-[0_4px_14px_rgba(16,185,129,0.3)] disabled:opacity-60"
                                        >
                                            {approvalMutation.isPending && approvalMutation.variables === "APPROVED"
                                                ? <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                                                : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                            }
                                            Approve Psychologist
                                        </button>
                                        <button
                                            onClick={() => approvalMutation.mutate("REJECTED")}
                                            disabled={approvalMutation.isPending}
                                            className="flex items-center justify-center gap-2.5 px-5 py-3.5 bg-red-600 hover:bg-red-500 text-white text-sm font-bold rounded-xl cursor-pointer border-none transition-all shadow-[0_4px_14px_rgba(239,68,68,0.3)] disabled:opacity-60"
                                        >
                                            {approvalMutation.isPending && approvalMutation.variables === "REJECTED"
                                                ? <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                                                : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                                            }
                                            Reject Application
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    
                    {!app.interview_status || (app.interview_status !== "COMPLETED" && !["INTERVIEW_SCHEDULED", "REJECTED", "APPROVED"].includes(app.status)) ? (
                        !["INTERVIEW_SCHEDULED", "REJECTED", "APPROVED"].includes(app.status) && (
                            <div className="mt-6 bg-[#141826] border border-slate-700/50 rounded-2xl overflow-hidden">
                                <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-700/40">
                                    <span className="text-admin-primary">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                                        </svg>
                                    </span>
                                    <h3 className="font-outfit text-sm font-semibold text-slate-200 tracking-tight">Admin Decision</h3>
                                </div>
                                <div className="px-5 py-5">
                                    <div className="flex gap-6 items-start">
                                        <div className="flex-1 flex flex-col gap-2">
                                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                                Admin Notes (Internal Use / Rejection Reason)
                                            </label>
                                            <textarea
                                                rows={5}
                                                value={adminNotes}
                                                onChange={(e) => setAdminNotes(e.target.value)}
                                                placeholder="Enter feedback for the applicant or internal notes regarding this approval…"
                                                className="w-full bg-[#0B0E14] border border-slate-700/60 rounded-xl px-4 py-3 text-sm text-slate-300 placeholder:text-slate-600 outline-none resize-none focus:border-admin-primary transition-colors"
                                            />
                                            {declineError && <span className="text-xs text-red-400">{declineError}</span>}
                                        </div>
                                        <div className="flex flex-col gap-3 min-w-[200px]">
                                            <button
                                                onClick={() => setShowScheduleModal(true)}
                                                className="flex items-center justify-center gap-2.5 px-5 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl cursor-pointer border-none transition-all shadow-[0_4px_14px_rgba(16,185,129,0.3)]"
                                            >
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                                Schedule Interview
                                            </button>
                                            <button
                                                onClick={() => setShowDeclineModal(true)}
                                                disabled={declineMutation.isPending}
                                                className="flex items-center justify-center gap-2.5 px-5 py-3.5 bg-red-600 hover:bg-red-500 text-white text-sm font-bold rounded-xl cursor-pointer border-none transition-all shadow-[0_4px_14px_rgba(239,68,68,0.3)] disabled:opacity-60"
                                            >
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                    <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                                                </svg>
                                                Decline Application
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    ) : null}

                    {showScheduleModal && (
                        <ScheduleModal
                            loading={scheduleMutation.isPending}
                            onClose={() => setShowScheduleModal(false)}
                            onConfirm={(datetime) => scheduleMutation.mutate(datetime)}
                            candidateName={app.full_name}
                            shortId={String(app.id).slice(0, 8).toUpperCase()}
                        />
                    )}

                    {showDeclineModal && (
                        <DeclineModal
                            loading={declineMutation.isPending}
                            onClose={() => setShowDeclineModal(false)}
                            onConfirm={() => declineMutation.mutate()}
                            candidateName={app.full_name}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

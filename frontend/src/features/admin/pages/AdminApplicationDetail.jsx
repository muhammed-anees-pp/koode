import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { fetchApplicationDetail } from "../../../api/admin.api";
import Sidebar from "../../../components/admin/Sidebar/AdminSidebar";
import Navbar from "../../../components/admin/Navbar/AdminNavbar";

const BASE_URL = "http://localhost:8000";

const mediaUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return `${BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
};

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
    return d.toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" }) +
        " at " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
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
                src={mediaUrl(photo)} alt={name}
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

export default function AdminApplicationDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const { data: app, isLoading, isError } = useQuery({
        queryKey: ["admin-application-detail", id],
        queryFn: () => fetchApplicationDetail(id),
        enabled: !!id,
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
    const audioUrl = app.audio_intro ? mediaUrl(app.audio_intro) : null;
    const certUrl = app.certificate_document ? mediaUrl(app.certificate_document) : null;
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

                            {app.interview_date && (
                                <SectionCard title="Interview" icon={ICONS.calendar}>
                                    <InfoRow label="Scheduled For" value={fmtDateTime(app.interview_date)} />
                                </SectionCard>
                            )}

                            <SectionCard title="Timeline" icon={ICONS.calendar}>
                                <InfoRow label="Submitted On" value={fmtDate(app.submitted_at)} />
                            </SectionCard>
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
                </div>
            </div>
        </div>
    );
}

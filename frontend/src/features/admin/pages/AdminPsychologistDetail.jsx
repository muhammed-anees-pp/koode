import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { fetchAdminPsychologistDetail, togglePsychologistSuspension } from "../../../api/admin.api";
import { fetchCurrentCommissionRate } from "../../../api/finance.api";
import Sidebar from "../../../components/admin/Sidebar/AdminSidebar";
import Navbar from "../../../components/admin/Navbar/AdminNavbar";
import { resolveMediaUrl } from "../../../utils/url";
import { normalizeCommissionPreview } from "../../../utils/commission";

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
    dollar: <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1 }}>₹</span>,
    calendar: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
    shield: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    star: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>,
};

function SuspendConfirmModal({ psychologist, onConfirm, onCancel, isLoading }) {
    useEffect(() => {
        const handler = (e) => { if (e.key === "Escape") onCancel(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onCancel]);

    const willSuspend = psychologist.is_active;

    return (
        <div className="fixed inset-0 bg-[rgba(0,0,0,0.75)] backdrop-blur-[4px] z-[200] flex items-center justify-center p-5 animate-fade-in" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
            <div className="bg-[#141826] border border-slate-700/50 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.6)] w-full max-w-[380px] p-8 text-center animate-fade-in">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 border ${willSuspend ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"}`}>
                    {willSuspend ? (
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
                    ) : (
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="20 6 9 17 4 12" /></svg>
                    )}
                </div>
                <h3 className="font-outfit text-xl font-bold text-slate-100 mb-2">{willSuspend ? "Suspend Psychologist?" : "Activate Psychologist?"}</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                    {willSuspend
                        ? <><strong className="text-slate-200">{psychologist.full_name}</strong> will be immediately blocked from logging in.</>
                        : <><strong className="text-slate-200">{psychologist.full_name}</strong> will regain platform access.</>
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

export default function AdminPsychologistDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [showModal, setShowModal] = useState(false);

    const { data: profile, isLoading, isError } = useQuery({
        queryKey: ["admin-psychologist-detail", id],
        queryFn: () => fetchAdminPsychologistDetail(id),
        enabled: !!id,
    });

    const { data: commissionRate } = useQuery({
        queryKey: ["current-commission-rate"],
        queryFn: fetchCurrentCommissionRate,
        staleTime: 5 * 60 * 1000,
    });


    const suspendMutation = useMutation({
        mutationFn: () => togglePsychologistSuspension(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-psychologist-detail", id] });
            queryClient.invalidateQueries({ queryKey: ["admin-psychologists"] });
            setShowModal(false);
        },
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
                            <span className="text-sm">Loading profile…</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (isError || !profile) {
        return (
            <div className="flex min-h-screen bg-admin-gradient font-['DM_Sans',sans-serif]">
                <Sidebar />
                <div className="flex-1 ml-[220px] flex flex-col">
                    <Navbar />
                    <div className="flex-1 mt-[60px] flex items-center justify-center">
                        <div className="text-center">
                            <p className="text-red-400 text-sm mb-4">Failed to load psychologist details.</p>
                            <button onClick={() => navigate("/admin/psychologists")} className="text-admin-primary text-sm hover:underline bg-transparent border-none cursor-pointer">← Back to Psychologists</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const { is_active } = profile;
    const statusCfg = is_active 
        ? { label: "Active", cls: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25" }
        : { label: "Suspended", cls: "bg-red-500/15 text-red-400 border border-red-500/25" };

    const specs = profile.specializations || [];
    const audioUrl = profile.audio_intro ? resolveMediaUrl(profile.audio_intro) : null;
    const averageRating = profile.average_rating ? `${profile.average_rating} ★` : "No rating";
    
    const fee = parseFloat(profile.consultation_fee) || 0;
    const commissionPreview = normalizeCommissionPreview(profile.commission_preview, fee, commissionRate?.percentage ?? 10);
    const commissionPercentage = commissionPreview.percentage;
    const commission = commissionPreview.commission;
    const earning = commissionPreview.payout;

    return (
        <div className="flex min-h-screen bg-admin-gradient font-['DM_Sans',sans-serif]">
            <Sidebar />
            <div className="flex-1 ml-[220px] flex flex-col">
                <Navbar />
                <div className="flex-1 mt-[60px] p-6 lg:p-8">

                    <div className="flex items-center justify-between mb-7">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate("/admin/psychologists")}
                                className="w-9 h-9 bg-[#141826] border border-slate-700/50 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-200 hover:border-admin-primary transition-all cursor-pointer"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
                            </button>
                            <div>
                                <h1 className="font-outfit text-2xl font-bold text-slate-100 tracking-tight">Psychologist Profile</h1>
                                <p className="text-slate-400 text-sm mt-0.5">ID: #{String(profile.psychologist_id).toUpperCase()}</p>
                            </div>
                        </div>
                        <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[12px] font-semibold ${statusCfg.cls}`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${is_active ? "bg-emerald-400" : "bg-red-400"}`} />
                            {statusCfg.label}
                        </span>
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                        <div className="col-span-1 flex flex-col gap-6">
                            <div className="bg-[#141826] border border-slate-700/50 rounded-2xl p-6 flex flex-col items-center text-center gap-4">
                                <ProfileAvatar name={profile.full_name} photo={profile.profile_picture} />
                                <div>
                                    <h2 className="font-outfit text-lg font-bold text-slate-100">{profile.full_name}</h2>
                                    <p className="text-sm text-admin-primary font-medium mt-0.5">{profile.job_title}</p>
                                    <p className="text-xs text-slate-500 mt-1">{profile.email}</p>
                                </div>
                                <div className="w-full grid grid-cols-3 gap-3 pt-2 border-t border-slate-800/60">
                                    <div className="flex flex-col items-center gap-1 p-3 bg-slate-800/40 rounded-xl">
                                        <span className="text-lg font-bold text-slate-100">{profile.years_of_experience != null ? profile.years_of_experience : "—"}</span>
                                        <span className="text-[10px] text-slate-500 uppercase tracking-wide">Yrs Exp.</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-1 p-3 bg-slate-800/40 rounded-xl">
                                        <span className="text-lg font-bold text-slate-100">{fee ? `₹${fee.toLocaleString("en-IN")}` : "—"}</span>
                                        <span className="text-[10px] text-slate-500 uppercase tracking-wide">Fee / Session</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-1 p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                                        <span className="text-lg font-bold text-amber-300">{averageRating}</span>
                                        <span className="text-[10px] text-amber-200/70 uppercase tracking-wide">{profile.review_count || 0} Reviews</span>
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

                            {fee > 0 && (
                                <SectionCard title="Consultation Fee" icon={ICONS.dollar}>
                                    <div className="py-4 flex flex-col gap-2.5 text-sm">
                                        <div className="flex justify-between text-slate-400">
                                            <span>Session Fee</span>
                                            <span className="text-slate-200 font-semibold">₹{fee.toLocaleString("en-IN")}</span>
                                        </div>
                                        <div className="flex justify-between text-slate-400">
                                            <span>Platform ({commissionPercentage.toFixed(2)}%)</span>
                                            <span className="text-red-400">−₹{commission}</span>
                                        </div>
                                        <div className="flex justify-between border-t border-slate-700/50 pt-2.5 text-slate-200 font-bold">
                                            <span>Psychologist Earning</span>
                                            <span className="text-emerald-400">₹{earning.toLocaleString("en-IN")}</span>
                                        </div>
                                    </div>
                                </SectionCard>
                            )}

                            <SectionCard title="Platform Timeline" icon={ICONS.calendar}>
                                <InfoRow label="Joined Date" value={profile.joined_date} />
                            </SectionCard>

                            <SectionCard title="Ratings" icon={ICONS.star}>
                                <InfoRow label="Average Rating" value={profile.average_rating ? `${profile.average_rating} / 5` : "No ratings yet"} />
                                <InfoRow label="Total Reviews" value={String(profile.review_count ?? 0)} />
                            </SectionCard>
                        </div>

                        <div className="col-span-2 flex flex-col gap-6">

                            <SectionCard title="Personal Information" icon={ICONS.user}>
                                <div className="grid grid-cols-2">
                                    <InfoRow label="Full Name" value={profile.full_name} />
                                    <InfoRow label="Email Address" value={profile.email} />
                                    <InfoRow label="Phone Number" value={profile.phone_number ? `+91 ${profile.phone_number}` : null} />
                                    <InfoRow label="Job Title" value={profile.job_title} />
                                    <InfoRow label="Years of Experience" value={profile.years_of_experience != null ? `${profile.years_of_experience} Years` : null} />
                                    <InfoRow label="Highest Qualification" value={profile.highest_education} />
                                </div>
                            </SectionCard>

                            {audioUrl && (
                                <SectionCard title="Audio Introduction" icon={ICONS.mic}>
                                    <div className="py-4">
                                        <AudioPlayer src={audioUrl} />
                                    </div>
                                </SectionCard>
                            )}

                            {profile.about && (
                                <SectionCard title="About & Treatment Approach" icon={ICONS.user}>
                                    <div className="py-4">
                                        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{profile.about}</p>
                                    </div>
                                </SectionCard>
                            )}

                            <SectionCard title="Office / Clinic Address" icon={ICONS.map}>
                                <div className="grid grid-cols-2">
                                    <div className="col-span-2"><InfoRow label="Street Address" value={profile.street_address} /></div>
                                    <InfoRow label="City" value={profile.city} />
                                    <InfoRow label="State" value={profile.state} />
                                    <InfoRow label="Zip / Postal Code" value={profile.pincode} />
                                    <InfoRow label="Country" value={profile.country} />
                                </div>
                            </SectionCard>

                            <SectionCard title="Account Security & Access" icon={ICONS.shield}>
                                <div className="py-5">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm font-semibold text-slate-200">Account Access</h4>
                                            <p className="text-xs text-slate-500 mt-1 max-w-[400px]">
                                                {is_active 
                                                    ? "This psychologist is currently active and can access the platform, manage their schedule, and attend sessions." 
                                                    : "This psychologist is currently suspended. They cannot log into the platform or access any features until activated."}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setShowModal(true)}
                                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-[0_4px_14px_rgba(0,0,0,0.15)] ${is_active ? "bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20" : "bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20"}`}
                                        >
                                            {is_active ? (
                                                <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg> Suspend Account</>
                                            ) : (
                                                <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><polyline points="20 6 9 17 4 12" /></svg> Activate Account</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </SectionCard>

                        </div>
                    </div>

                    {showModal && (
                        <SuspendConfirmModal
                            psychologist={profile}
                            onConfirm={() => suspendMutation.mutate()}
                            onCancel={() => setShowModal(false)}
                            isLoading={suspendMutation.isPending}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAdminPatientDetail, togglePatientSuspension } from "../../../api/admin.api";
import Sidebar from "../../../components/admin/Sidebar/AdminSidebar";
import Navbar from "../../../components/admin/Navbar/AdminNavbar";
import { resolveMediaUrl } from "../../../utils/url";
import { formatIndiaDate, formatIndiaDateTime, formatIndiaTime, getIndiaTodayISO } from "../../../utils/indiaDateTime";

function PatientAvatar({ name, photo, size = 96 }) {
    const [imgError, setImgError] = useState(false);
    const initials = name ? name.charAt(0).toUpperCase() : "?";
    const colours = ["#7C3AED", "#0EA5E9", "#10B981", "#F59E0B", "#EF4444", "#EC4899", "#14B8A6", "#6366F1"];
    const colour = colours[(name?.charCodeAt(0) || 0) % colours.length];

    if (photo && !imgError) {
        return (
            <img
                src={resolveMediaUrl(photo)}
                alt={name}
                className="rounded-full object-cover border-4 border-slate-700/60"
                style={{ width: size, height: size }}
                onError={() => setImgError(true)}
            />
        );
    }

    return (
        <div
            className="rounded-full flex items-center justify-center text-white font-bold border-4 border-slate-700/60"
            style={{ background: colour, width: size, height: size, fontSize: size * 0.38 }}
        >
            {initials}
        </div>
    );
}

function InfoRow({ label, value }) {
    return (
        <div className="flex flex-col gap-1 py-3.5 border-b border-slate-800/60 last:border-0">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em]">{label}</span>
            <span className="text-sm text-slate-200 font-medium break-words">{value || "—"}</span>
        </div>
    );
}



function getAgeFromDateOfBirth(dateOfBirth) {
    if (!dateOfBirth) return null;

    const [birthYear, birthMonth, birthDay] = String(dateOfBirth).split("-").map(Number);
    const [todayYear, todayMonth, todayDay] = getIndiaTodayISO().split("-").map(Number);

    if (!birthYear || !birthMonth || !birthDay) return null;

    const age = todayYear - birthYear - (
        todayMonth < birthMonth || (todayMonth === birthMonth && todayDay < birthDay) ? 1 : 0
    );

    return age >= 0 ? age : null;
}

function formatAge(age) {
    if (age == null) return null;
    return `${age} ${age === 1 ? "Year" : "Years"}`;
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

function OverlayModal({ title, subtitle, children, onClose, maxWidth = "max-w-3xl" }) {
    useEffect(() => {
        const handler = (event) => {
            if (event.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className={`flex max-h-[88vh] w-full ${maxWidth} flex-col rounded-2xl border border-slate-700/60 bg-[#141826] shadow-[0_24px_80px_rgba(0,0,0,0.6)]`}
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-4 border-b border-slate-700/50 px-6 py-5">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-admin-primary">{title}</p>
                        {subtitle ? <h2 className="mt-2 text-xl font-bold text-slate-100">{subtitle}</h2> : null}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-2 text-slate-500 transition hover:bg-slate-800 hover:text-slate-200"
                        aria-label="Close modal"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
            </div>
        </div>
    );
}

function SuspendConfirmModal({ patient, onConfirm, onCancel, isLoading }) {
    useEffect(() => {
        const handler = (event) => {
            if (event.key === "Escape") onCancel();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onCancel]);

    const willDeactivate = patient.is_active;

    return (
        <div className="fixed inset-0 bg-[rgba(0,0,0,0.75)] backdrop-blur-[4px] z-[1300] flex items-center justify-center p-5 animate-fade-in" onClick={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
            <div className="bg-[#141826] border border-slate-700/50 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.6)] w-full max-w-[380px] p-8 text-center animate-fade-in">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 border ${willDeactivate ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"}`}>
                    {willDeactivate ? (
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
                    ) : (
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="20 6 9 17 4 12" /></svg>
                    )}
                </div>
                <h3 className="font-outfit text-xl font-bold text-slate-100 mb-2">{willDeactivate ? "Deactivate Patient?" : "Activate Patient?"}</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                    {willDeactivate
                        ? <><strong className="text-slate-200">{patient.full_name}</strong> will be blocked from logging in immediately.</>
                        : <><strong className="text-slate-200">{patient.full_name}</strong> will regain platform access.</>
                    }
                </p>
                <div className="flex gap-3">
                    <button className="flex-1 py-2.5 text-sm font-medium text-slate-400 bg-slate-800 border border-slate-700 rounded-[10px] cursor-pointer hover:bg-slate-700 transition-all duration-200 disabled:opacity-50" onClick={onCancel} disabled={isLoading}>Cancel</button>
                    <button className={`flex-1 py-2.5 text-sm font-medium text-white border-none rounded-[10px] cursor-pointer transition-all duration-200 disabled:opacity-50 ${willDeactivate ? "bg-red-500 hover:bg-red-600" : "bg-emerald-500 hover:bg-emerald-600"}`} onClick={onConfirm} disabled={isLoading}>
                        {isLoading ? (willDeactivate ? "Deactivating..." : "Activating...") : (willDeactivate ? "Deactivate" : "Activate")}
                    </button>
                </div>
            </div>
        </div>
    );
}

const ICONS = {
    user: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
    phone: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.77.62 2.61a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6 6l1.29-1.28a2 2 0 0 1 2.11-.45c.84.29 1.71.5 2.61.62A2 2 0 0 1 22 16.92z" /></svg>,
    file: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M8 13h8" /><path d="M8 17h5" /></svg>,
    calendar: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
    shield: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
};

const actionButtonCls = "flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/70 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-admin-primary hover:text-admin-primary";

function SummaryModal({ patient, onClose }) {
    const summary = patient?.summary?.summary || "";
    return (
        <OverlayModal title="Patient Summary" subtitle={patient.full_name} onClose={onClose} maxWidth="max-w-2xl">
            <p className="whitespace-pre-wrap rounded-2xl border border-slate-700/60 bg-slate-900/60 px-4 py-4 text-sm leading-6 text-slate-300">
                {summary || "No patient summary is available yet."}
            </p>
        </OverlayModal>
    );
}

function ConsultationHistoryModal({ patient, onClose }) {
    const consultations = patient.consultations || [];
    return (
        <OverlayModal title="Consultation History" subtitle={patient.full_name} onClose={onClose}>
            {consultations.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 px-5 py-8 text-sm text-slate-500">
                    No consultations are available for this patient.
                </div>
            ) : (
                <div className="space-y-3">
                    {consultations.map((item) => (
                        <div key={item.consultation_id} className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <p className="text-sm font-bold text-slate-100">
                                        {formatIndiaDate(item.date)} - {formatIndiaTime(item.start_time)}
                                    </p>
                                    <p className="mt-1 text-xs font-semibold text-slate-500">{item.psychologist_name}</p>
                                </div>
                                <span className="rounded-full bg-admin-primary/10 px-3 py-1 text-[11px] font-semibold text-admin-primary">
                                    {item.consultation_status}
                                </span>
                            </div>
                            <p className="mt-3 whitespace-pre-wrap rounded-xl bg-[#141826] px-4 py-3 text-sm leading-6 text-slate-300">
                                {item.consultation_note || "No consultation note saved for this consultation."}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </OverlayModal>
    );
}

function PrescriptionModal({ patient, onClose }) {
    const consultations = patient.consultations || [];
    return (
        <OverlayModal title="Prescriptions" subtitle={patient.full_name} onClose={onClose}>
            {consultations.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 px-5 py-8 text-sm text-slate-500">
                    No prescriptions are available for this patient.
                </div>
            ) : (
                <div className="space-y-3">
                    {consultations.map((item) => (
                        <div key={`prescription-${item.consultation_id}`} className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <p className="text-sm font-bold text-slate-100">
                                        {formatIndiaDate(item.date)} - {formatIndiaTime(item.start_time)}
                                    </p>
                                    <p className="mt-1 text-xs font-semibold text-slate-500">{item.psychologist_name}</p>
                                </div>
                                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-400">
                                    Prescription
                                </span>
                            </div>
                            <p className="mt-3 whitespace-pre-wrap rounded-xl bg-[#141826] px-4 py-3 text-sm leading-6 text-slate-300">
                                {item.prescription || "No prescription saved for this consultation."}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </OverlayModal>
    );
}

export default function AdminPatientDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [activeModal, setActiveModal] = useState(null);
    const [showDeactivateModal, setShowDeactivateModal] = useState(false);

    const { data: patient, isLoading, isError } = useQuery({
        queryKey: ["admin-patient-detail", id],
        queryFn: () => fetchAdminPatientDetail(id),
        enabled: !!id,
    });

    const suspendMutation = useMutation({
        mutationFn: () => togglePatientSuspension(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-patient-detail", id] });
            queryClient.invalidateQueries({ queryKey: ["admin-patients"] });
            setShowDeactivateModal(false);
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
                            <span className="text-sm">Loading patient details...</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (isError || !patient) {
        return (
            <div className="flex min-h-screen bg-admin-gradient font-['DM_Sans',sans-serif]">
                <Sidebar />
                <div className="flex-1 ml-[220px] flex flex-col">
                    <Navbar />
                    <div className="flex-1 mt-[60px] flex items-center justify-center">
                        <div className="text-center">
                            <p className="text-red-400 text-sm mb-4">Failed to load patient details.</p>
                            <button onClick={() => navigate("/admin/patients")} className="text-admin-primary text-sm hover:underline bg-transparent border-none cursor-pointer">Back to Patients</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const statusCfg = patient.is_active
        ? { label: "Active", cls: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25" }
        : { label: "Deactivated", cls: "bg-red-500/15 text-red-400 border border-red-500/25" };
    const displayAge = getAgeFromDateOfBirth(patient.date_of_birth) ?? patient.age;

    return (
        <div className="flex min-h-screen bg-admin-gradient font-['DM_Sans',sans-serif]">
            <Sidebar />
            <div className="flex-1 ml-[220px] flex flex-col">
                <Navbar />
                <div className="flex-1 mt-[60px] p-6 lg:p-8">
                    <div className="flex items-center justify-between mb-7">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate("/admin/patients")}
                                className="w-9 h-9 bg-[#141826] border border-slate-700/50 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-200 hover:border-admin-primary transition-all cursor-pointer"
                                aria-label="Back to patients"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
                            </button>
                            <div>
                                <h1 className="font-outfit text-2xl font-bold text-slate-100 tracking-tight">Patient Details</h1>
                                <p className="text-slate-400 text-sm mt-0.5">ID: #{String(patient.patient_id).toUpperCase()}</p>
                            </div>
                        </div>
                        <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[12px] font-semibold ${statusCfg.cls}`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${patient.is_active ? "bg-emerald-400" : "bg-red-400"}`} />
                            {statusCfg.label}
                        </span>
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                        <div className="col-span-1 flex flex-col gap-6">
                            <div className="bg-[#141826] border border-slate-700/50 rounded-2xl p-6 flex flex-col items-center text-center gap-4">
                                <PatientAvatar name={patient.full_name} photo={patient.profile_picture} />
                                <div>
                                    <h2 className="font-outfit text-lg font-bold text-slate-100">{patient.full_name}</h2>
                                    <p className="text-xs text-slate-500 mt-1">{patient.email}</p>
                                </div>
                            </div>

                            <SectionCard title="Patient Records" icon={ICONS.file}>
                                <div className="grid gap-3 py-4">
                                    <button type="button" className={actionButtonCls} onClick={() => setActiveModal("summary")}>
                                        {ICONS.file}
                                        Patient Summary
                                    </button>
                                    <button type="button" className={actionButtonCls} onClick={() => setActiveModal("history")}>
                                        {ICONS.calendar}
                                        Consultation History
                                    </button>
                                    <button type="button" className={actionButtonCls} onClick={() => setActiveModal("prescriptions")}>
                                        {ICONS.file}
                                        Prescriptions
                                    </button>
                                </div>
                            </SectionCard>

                            <SectionCard title="Platform Timeline" icon={ICONS.calendar}>
                                <InfoRow label="Joined Date" value={patient.joined_date} />
                                <InfoRow label="Last Updated" value={patient.updated_date} />
                            </SectionCard>
                        </div>

                        <div className="col-span-2 flex flex-col gap-6">
                            <SectionCard title="Personal Information" icon={ICONS.user}>
                                <div className="grid grid-cols-2">
                                    <InfoRow label="Full Name" value={patient.full_name} />
                                    <InfoRow label="Email Address" value={patient.email} />
                                    <InfoRow label="Phone Number" value={patient.phone_number ? `+91 ${patient.phone_number}` : null} />
                                    <InfoRow label="Gender" value={patient.gender} />
                                    <InfoRow label="Date of Birth" value={patient.date_of_birth ? formatIndiaDate(patient.date_of_birth) : null} />
                                    <InfoRow label="Age" value={formatAge(displayAge)} />
                                </div>
                            </SectionCard>

                            <SectionCard title="Emergency Contact" icon={ICONS.phone}>
                                <div className="grid grid-cols-2">
                                    <InfoRow label="Contact Name" value={patient.emergency_contact_name} />
                                    <InfoRow label="Contact Number" value={patient.emergency_contact_number ? `+91 ${patient.emergency_contact_number}` : null} />
                                </div>
                            </SectionCard>

                            <SectionCard title="Consultation Overview" icon={ICONS.calendar}>
                                <div className="grid grid-cols-3 gap-3 py-5">
                                    <div className="rounded-xl bg-slate-800/40 p-4">
                                        <p className="text-2xl font-bold text-slate-100">{patient.stats?.total_consultations ?? 0}</p>
                                        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Total</p>
                                    </div>
                                    <div className="rounded-xl bg-slate-800/40 p-4">
                                        <p className="text-2xl font-bold text-emerald-400">{patient.stats?.completed_consultations ?? 0}</p>
                                        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Completed</p>
                                    </div>
                                    <div className="rounded-xl bg-slate-800/40 p-4">
                                        <p className="text-2xl font-bold text-admin-primary">{patient.stats?.upcoming_consultations ?? 0}</p>
                                        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Upcoming</p>
                                    </div>
                                </div>
                            </SectionCard>

                            <SectionCard title="Account Security & Access" icon={ICONS.shield}>
                                <div className="py-5">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <h4 className="text-sm font-semibold text-slate-200">Account Access</h4>
                                            <p className="text-xs text-slate-500 mt-1 max-w-[460px]">
                                                {patient.is_active
                                                    ? "This patient is currently active and can log in, book appointments, and join consultations."
                                                    : "This patient is currently deactivated and cannot log into the platform until activated."}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShowDeactivateModal(true)}
                                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-[0_4px_14px_rgba(0,0,0,0.15)] ${patient.is_active ? "bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20" : "bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20"}`}
                                        >
                                            {patient.is_active ? (
                                                <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg> Deactivate Account</>
                                            ) : (
                                                <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><polyline points="20 6 9 17 4 12" /></svg> Activate Account</>
                                            )}
                                        </button>
                                    </div>
                                    {!patient.is_active && patient.deactivated_at ? (
                                        <div className="mt-4 border-t border-slate-800/60 pt-4">
                                            <InfoRow label="Deactivated At" value={formatIndiaDateTime(patient.deactivated_at)} />
                                        </div>
                                    ) : null}
                                </div>
                            </SectionCard>
                        </div>
                    </div>

                    {activeModal === "summary" ? <SummaryModal patient={patient} onClose={() => setActiveModal(null)} /> : null}
                    {activeModal === "history" ? <ConsultationHistoryModal patient={patient} onClose={() => setActiveModal(null)} /> : null}
                    {activeModal === "prescriptions" ? <PrescriptionModal patient={patient} onClose={() => setActiveModal(null)} /> : null}
                    {showDeactivateModal ? (
                        <SuspendConfirmModal
                            patient={patient}
                            onConfirm={() => suspendMutation.mutate()}
                            onCancel={() => setShowDeactivateModal(false)}
                            isLoading={suspendMutation.isPending}
                        />
                    ) : null}
                </div>
            </div>
        </div>
    );
}

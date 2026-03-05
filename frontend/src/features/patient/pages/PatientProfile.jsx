import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { fetchPatientProfile, updatePatientProfile } from "../../../api/patient.api";
import { useAuthStore } from "../../../store/auth.store";
import { usePatientSessionGuard } from "../../../hooks/usePatientSessionGuard";
import PatientNavbar from "../../../components/patient/Navbar/PatientNavbar";
import PatientFooter from "../../../components/patient/Footer/PatientFooter";

const CROP_SIZE = 400;
const PREVIEW_SIZE = 220;

const DEFAULT_TOPICS = ["Anxiety", "Work Stress", "Depression", "Relationship Issues", "Sleep Disorders", "Trauma", "Eating Disorders"];

// Shared
const inputCls = "w-full px-4 py-3 text-sm font-['DM_Sans',sans-serif] text-ui-900 bg-ui-50 border border-ui-200 rounded-[10px] outline-none transition-all duration-200 placeholder:text-ui-400 focus:border-patient-primary focus:bg-white focus:shadow-[0_0_0_3px_rgba(26,190,170,0.1)] disabled:opacity-60 disabled:cursor-not-allowed";
const selectCls = "w-full px-4 py-3 text-sm font-['DM_Sans',sans-serif] text-ui-900 bg-ui-50 border border-ui-200 rounded-[10px] outline-none transition-all duration-200 focus:border-patient-primary focus:bg-white focus:shadow-[0_0_0_3px_rgba(26,190,170,0.1)] cursor-pointer appearance-none";
const labelCls = "block text-xs font-semibold text-ui-500 uppercase tracking-[0.06em] mb-1.5";
const cardCls = "bg-white border border-ui-200 rounded-[16px] p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04)]";
const sectionIconCls = "w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0";
const saveBtnCls = "inline-flex items-center gap-2 px-6 py-3 bg-patient-primary text-white text-sm font-semibold border-none rounded-[10px] cursor-pointer transition-all duration-200 shadow-patient-sm hover:bg-patient-hover hover:shadow-patient-md hover:-translate-y-px active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed";
const cancelBtnCls = "inline-flex items-center gap-2 px-5 py-3 text-sm font-medium text-ui-600 bg-ui-100 border-none rounded-[10px] cursor-pointer transition-all duration-200 hover:bg-ui-200 disabled:opacity-60 disabled:cursor-not-allowed";

function ViewField({ label, value, placeholder = "Not provided" }) {
    return (
        <div>
            <label className={labelCls}>{label}</label>
            <div className={`text-sm font-medium py-3 ${!value ? "text-ui-400 italic" : "text-ui-900"}`}>{value || placeholder}</div>
        </div>
    );
}

function PhotoCropModal({ file, onCrop, onCancel }) {
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const dragState = useRef(null);
    const imgRef = useRef(null);
    const [imgReady, setImgReady] = useState(false);

    const previewUrl = useRef(URL.createObjectURL(file)).current;
    useEffect(() => () => URL.revokeObjectURL(previewUrl), [previewUrl]);

    const startDrag = (clientX, clientY) => { dragState.current = { startX: clientX, startY: clientY, offsetX: offset.x, offsetY: offset.y }; };
    const moveDrag = useCallback((clientX, clientY) => {
        if (!dragState.current) return;
        setOffset({ x: dragState.current.offsetX + (clientX - dragState.current.startX), y: dragState.current.offsetY + (clientY - dragState.current.startY) });
    }, []);
    const endDrag = () => { dragState.current = null; };

    const handleZoomChange = (val) => { setZoom(val); setOffset({ x: 0, y: 0 }); };

    const handleApply = useCallback(() => {
        const img = imgRef.current;
        if (!img || !imgReady) return;
        const canvas = document.createElement("canvas");
        canvas.width = CROP_SIZE; canvas.height = CROP_SIZE;
        const ctx = canvas.getContext("2d");
        ctx.beginPath(); ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2); ctx.clip();
        const scale = CROP_SIZE / PREVIEW_SIZE;
        const nw = img.naturalWidth; const nh = img.naturalHeight;
        const coverScale = Math.max(PREVIEW_SIZE / nw, PREVIEW_SIZE / nh) * zoom;
        const drawW = nw * coverScale * scale; const drawH = nh * coverScale * scale;
        const cx = (CROP_SIZE - drawW) / 2 + offset.x * scale;
        const cy = (CROP_SIZE - drawH) / 2 + offset.y * scale;
        ctx.drawImage(img, cx, cy, drawW, drawH);
        canvas.toBlob((blob) => onCrop(blob), "image/jpeg", 0.92);
    }, [zoom, offset, onCrop, imgReady]);

    const nw = imgRef.current?.naturalWidth || 1;
    const nh = imgRef.current?.naturalHeight || 1;
    const coverScale = imgReady ? Math.max(PREVIEW_SIZE / nw, PREVIEW_SIZE / nh) * zoom : zoom;
    const imgW = imgReady ? nw * coverScale : PREVIEW_SIZE * zoom;
    const imgH = imgReady ? nh * coverScale : PREVIEW_SIZE * zoom;

    return (
        <div className="fixed inset-0 bg-[rgba(0,0,0,0.6)] backdrop-blur-[3px] z-[200] flex items-center justify-center p-6 animate-[pdmFadeIn_0.18s_ease]" onClick={onCancel}>
            <div className="bg-white rounded-[20px] shadow-[0_24px_60px_rgba(0,0,0,0.2)] w-full max-w-[400px] overflow-hidden animate-[pdmSlideUp_0.22s_cubic-bezier(0.22,1,0.36,1)]" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-ui-100">
                    <h3 className="text-base font-bold text-ui-900">Crop Photo</h3>
                    <button className="w-8 h-8 bg-ui-100 rounded-full flex items-center justify-center text-ui-500 border-none cursor-pointer transition-all duration-200 hover:bg-ui-200 hover:text-ui-900" onClick={onCancel} type="button">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                </div>

                {/* Crop area */}
                <div className="flex flex-col items-center px-6 py-6 gap-4">
                    <div
                        className="relative w-[220px] h-[220px] rounded-full overflow-hidden border-[3px] border-patient-primary shadow-patient-md cursor-grab select-none"
                        onMouseDown={(e) => { e.preventDefault(); startDrag(e.clientX, e.clientY); }}
                        onMouseMove={(e) => moveDrag(e.clientX, e.clientY)}
                        onMouseUp={endDrag} onMouseLeave={endDrag}
                        onTouchStart={(e) => { const t = e.touches[0]; startDrag(t.clientX, t.clientY); }}
                        onTouchMove={(e) => { e.preventDefault(); const t = e.touches[0]; moveDrag(t.clientX, t.clientY); }}
                        onTouchEnd={endDrag}
                    >
                        <img ref={imgRef} src={previewUrl} alt="Crop preview" draggable={false} onLoad={() => setImgReady(true)}
                            style={{ width: imgW, height: imgH, position: "absolute", top: "50%", left: "50%", transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`, pointerEvents: "none", transition: dragState.current ? "none" : "width 0.2s, height 0.2s" }}
                        />
                    </div>
                    <p className="text-xs text-ui-400 text-center">Drag to reposition · Scroll slider to zoom</p>

                    {/* Zoom slider */}
                    <div className="flex items-center gap-3 w-full">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ui-400 flex-shrink-0"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
                        <input type="range" min="1" max="3" step="0.02" value={zoom} onChange={(e) => handleZoomChange(parseFloat(e.target.value))} className="flex-1 accent-patient h-1.5 cursor-pointer" />
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ui-400 flex-shrink-0"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-ui-100">
                    <button className={cancelBtnCls} onClick={onCancel} type="button">Cancel</button>
                    <button className={saveBtnCls} onClick={handleApply} type="button">✓ Use Photo</button>
                </div>
            </div>
        </div>
    );
}

export default function PatientProfile() {
    const { isAuthenticated, role, updateUser } = useAuthStore();
    const queryClient = useQueryClient();
    const fileInputRef = useRef(null);

    usePatientSessionGuard();
    const { data: profile, isLoading, isError } = useQuery({
        queryKey: ["patient-profile"],
        queryFn: fetchPatientProfile,
        enabled: isAuthenticated && role === "PATIENT",
    });

    const [isEditing, setIsEditing] = useState(false);
    const [cropFile, setCropFile] = useState(null);
    const [pendingBlob, setPendingBlob] = useState(null);
    const [pendingPreview, setPendingPreview] = useState(null);
    const [pendingRemove, setPendingRemove] = useState(false);
    const [toast, setToast] = useState(null);
    const [form, setForm] = useState({ full_name: "", phone_number: "", date_of_birth: "", gender: "", emergency_contact_name: "", emergency_contact_number: "" });
    const [selectedTopics, setSelectedTopics] = useState(["Anxiety", "Work Stress"]);

    useEffect(() => {
        if (profile) {
            setForm({
                full_name: profile.user?.full_name || "",
                phone_number: profile.phone_number || "",
                date_of_birth: profile.date_of_birth || "",
                gender: profile.gender || "",
                emergency_contact_name: profile.emergency_contact_name || "",
                emergency_contact_number: profile.emergency_contact_number || "",
            });
        }
    }, [profile]);

    if (!isAuthenticated || role !== "PATIENT") return <Navigate to="/patient/login" replace />;

    const toggleTopic = (t) => setSelectedTopics((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
    const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };
    useEffect(() => () => { if (pendingPreview) URL.revokeObjectURL(pendingPreview); }, []);

    const clearPendingPhoto = () => {
        if (pendingPreview) URL.revokeObjectURL(pendingPreview);
        setPendingBlob(null); setPendingPreview(null); setPendingRemove(false); setCropFile(null);
    };

    const saveMutation = useMutation({
        mutationFn: updatePatientProfile,
        onSuccess: (data) => {
            queryClient.setQueryData(["patient-profile"], data);
            updateUser({ full_name: data.user?.full_name, profile_picture: data.user?.profile_picture ?? null });
            clearPendingPhoto(); setIsEditing(false);
            showToast("Profile updated successfully!");
        },
        onError: () => showToast("Failed to save changes. Please try again.", "error"),
    });

    const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    const handleCancel = () => {
        if (profile) setForm({ full_name: profile.user?.full_name || "", phone_number: profile.phone_number || "", date_of_birth: profile.date_of_birth || "", gender: profile.gender || "", emergency_contact_name: profile.emergency_contact_name || "", emergency_contact_number: profile.emergency_contact_number || "" });
        clearPendingPhoto(); setIsEditing(false);
    };
    const handleSave = (e) => {
        e.preventDefault();
        if (!form.full_name.trim()) { showToast("Full name cannot be empty.", "error"); return; }
        const fd = new FormData();
        fd.append("full_name", form.full_name.trim()); fd.append("phone_number", form.phone_number);
        fd.append("date_of_birth", form.date_of_birth); fd.append("gender", form.gender);
        fd.append("emergency_contact_name", form.emergency_contact_name); fd.append("emergency_contact_number", form.emergency_contact_number);
        if (pendingBlob) fd.append("profile_picture", pendingBlob, "avatar.jpg");
        else if (pendingRemove) fd.append("profile_picture", "");
        saveMutation.mutate(fd);
    };
    const handleFileSelect = (e) => { const file = e.target.files?.[0]; if (!file) return; e.target.value = ""; setCropFile(file); };
    const handleCropDone = useCallback((blob) => {
        if (pendingPreview) URL.revokeObjectURL(pendingPreview);
        const url = URL.createObjectURL(blob);
        setPendingBlob(blob); setPendingPreview(url); setPendingRemove(false); setCropFile(null);
    }, [pendingPreview]);

    const isSaving = saveMutation.isPending;
    const Shell = ({ children }) => (
        <div className="flex flex-col min-h-screen font-['DM_Sans',sans-serif] bg-ui-50 antialiased">
            <PatientNavbar />
            <main className="flex-1 flex flex-col pt-[66px]"><div className="max-w-[860px] mx-auto w-full px-6 py-10">{children}</div></main>
            <PatientFooter />
        </div>
    );

    if (isLoading) return <Shell><div className="text-center py-20 text-ui-500 text-sm">Loading profile…</div></Shell>;
    if (isError) return <Shell><div className="text-center py-20 text-red-500 text-sm">Failed to load profile. Please refresh.</div></Shell>;

    const userName = profile?.user?.full_name || "Patient";
    const userEmail = profile?.user?.email || "";
    const userAvatar = profile?.user?.profile_picture || null;
    const formatDate = (d) => !d ? null : new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
    const capitalize = (s) => !s ? "" : s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    const avatarSrc = pendingRemove ? null : (pendingPreview || userAvatar || null);
    const avatarInitial = userName.charAt(0).toUpperCase();

    const SectionHeader = ({ icon, label, iconBg = "bg-[rgba(26,190,170,0.1)] text-patient-primary" }) => (
        <div className="flex items-center gap-3 mb-6">
            <span className={`${sectionIconCls} ${iconBg}`}>{icon}</span>
            <h2 className="text-base font-bold text-ui-900">{label}</h2>
        </div>
    );

    return (
        <div className="flex flex-col min-h-screen font-['DM_Sans',sans-serif] bg-ui-50 antialiased">
            <PatientNavbar />
            <main className="flex-1 flex flex-col pt-[66px]">
                <div className="max-w-[860px] mx-auto w-full px-6 py-10 flex flex-col gap-6">
                    {/* Heading row */}
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h1 className="font-outfit text-[1.6rem] font-extrabold text-ui-900 tracking-tight">Profile Settings</h1>
                            <p className="text-sm text-ui-500 mt-1">Manage your personal information and health preferences.</p>
                        </div>
                        {!isEditing ? (
                            <button className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-patient-primary bg-[rgba(26,190,170,0.08)] border border-[rgba(26,190,170,0.2)] rounded-[10px] cursor-pointer transition-all duration-200 hover:bg-[rgba(26,190,170,0.14)] hover:border-patient-primary" onClick={() => setIsEditing(true)}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                Edit Profile
                            </button>
                        ) : (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-patient-primary bg-[rgba(26,190,170,0.1)] border border-[rgba(26,190,170,0.2)] rounded-full">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                Editing
                            </div>
                        )}
                    </div>

                    {/* Profile Picture Card */}
                    <div className={cardCls}>
                        <div className="flex items-center gap-6">
                            {/* Avatar */}
                            <div className="relative flex-shrink-0">
                                <div className="w-[88px] h-[88px] rounded-full overflow-hidden shadow-patient-md relative">
                                    <div className="absolute inset-0 bg-gradient-to-br from-patient-primary to-patient-dark text-white text-2xl font-bold flex items-center justify-center">
                                        {avatarInitial}
                                    </div>
                                    {avatarSrc && !pendingRemove && (
                                        <img
                                            src={avatarSrc}
                                            alt={userName}
                                            className="absolute inset-0 w-full h-full object-cover"
                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                        />
                                    )}
                                </div>
                                {isEditing && (
                                    <button className="absolute bottom-0 right-0 w-8 h-8 bg-white border-[2px] border-patient-primary rounded-full flex items-center justify-center text-patient-primary cursor-pointer shadow-sm transition-all duration-200 hover:bg-patient-primary hover:text-white" onClick={() => fileInputRef.current?.click()} title="Change photo" type="button">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                                    </button>
                                )}
                            </div>

                            {/* Info / edit controls */}
                            <div className="flex-1 min-w-0">
                                {isEditing ? (
                                    <>
                                        <p className="text-sm text-ui-500 mb-3">
                                            {pendingBlob ? "✓ Photo cropped and ready — will upload on Save Changes." : pendingRemove ? "Photo will be removed on Save Changes." : "Click the camera icon or buttons below to change your photo."}
                                        </p>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <button className="px-3 py-1.5 text-xs font-semibold text-patient-primary bg-[rgba(26,190,170,0.08)] border border-[rgba(26,190,170,0.2)] rounded-lg cursor-pointer transition-all duration-200 hover:bg-[rgba(26,190,170,0.14)]" type="button" onClick={() => fileInputRef.current?.click()}>
                                                {pendingBlob ? "Re-crop Photo" : "Update Photo"}
                                            </button>
                                            {(userAvatar || pendingBlob) && !pendingRemove && (
                                                <button className="px-3 py-1.5 text-xs font-semibold text-red-500 bg-[rgba(239,68,68,0.06)] border border-[rgba(239,68,68,0.15)] rounded-lg cursor-pointer transition-all duration-200 hover:bg-[rgba(239,68,68,0.12)]" type="button" onClick={() => { clearPendingPhoto(); setPendingRemove(true); }}>Remove Photo</button>
                                            )}
                                            {pendingRemove && (
                                                <button className="px-3 py-1.5 text-xs font-semibold text-patient-primary bg-[rgba(26,190,170,0.08)] border border-[rgba(26,190,170,0.2)] rounded-lg cursor-pointer" type="button" onClick={() => setPendingRemove(false)}>Undo Remove</button>
                                            )}
                                            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif" className="hidden" onChange={handleFileSelect} />
                                        </div>
                                    </>
                                ) : (
                                    <div>
                                        <h2 className="font-outfit text-lg font-bold text-ui-900 truncate">{userName}</h2>
                                        <span className="text-xs text-ui-400 font-medium">ID&nbsp;·&nbsp;{profile?.patient_id || "—"}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Personal Details */}
                    <div className={cardCls}>
                        <SectionHeader icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>} label="Personal Details" />
                        {isEditing ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {[{ label: "Full Name", name: "full_name", type: "text", placeholder: "Your full name" }, { label: "Phone Number", name: "phone_number", type: "tel", placeholder: "+1 (555) 000-0000" }, { label: "Date of Birth", name: "date_of_birth", type: "date", placeholder: "" }].map(({ label, name, type, placeholder }) => (
                                    <div key={name}><label className={labelCls}>{label}</label><input className={inputCls} name={name} type={type} value={form[name]} onChange={handleChange} placeholder={placeholder} /></div>
                                ))}
                                <div>
                                    <label className={labelCls}>Email Address <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" className="inline mb-0.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg></label>
                                    <input className={inputCls} type="email" value={userEmail} disabled />
                                </div>
                                <div>
                                    <label className={labelCls}>Gender</label>
                                    <select className={selectCls} name="gender" value={form.gender} onChange={handleChange}>
                                        <option value="">Select gender</option>
                                        <option value="MALE">Male</option>
                                        <option value="FEMALE">Female</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <ViewField label="Full Name" value={userName} />
                                <ViewField label="Email Address" value={userEmail} />
                                <ViewField label="Phone Number" value={profile?.phone_number} />
                                <ViewField label="Date of Birth" value={formatDate(profile?.date_of_birth)} />
                                <ViewField label="Gender" value={capitalize(profile?.gender)} />
                                <ViewField label="Member Since" value={formatDate(profile?.created_at)} />
                            </div>
                        )}
                    </div>

                    {/* Focus Areas */}
                    <div className={cardCls}>
                        <SectionHeader icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>} label="Focus Areas" />
                        <p className="text-sm text-ui-500 mb-4">Select the topics you'd like to address in your sessions.</p>
                        <div className="flex flex-wrap gap-2">
                            {DEFAULT_TOPICS.map((topic) => (
                                <button key={topic} type="button"
                                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-[20px] border transition-all duration-200 ${selectedTopics.includes(topic) ? "bg-patient-primary text-white border-patient-primary shadow-patient-sm" : "bg-ui-50 text-ui-600 border-ui-200 hover:border-patient-primary hover:text-patient-primary hover:bg-[rgba(26,190,170,0.05)]"} ${!isEditing ? "cursor-default" : "cursor-pointer"}`}
                                    onClick={() => isEditing && toggleTopic(topic)}>
                                    {selectedTopics.includes(topic) && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                                    {topic}
                                </button>
                            ))}
                            {isEditing && (
                                <button className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-ui-500 bg-ui-50 border border-dashed border-ui-300 rounded-[20px] cursor-pointer transition-all duration-200 hover:border-patient-primary hover:text-patient-primary" type="button">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                                    Add Custom
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Emergency Contact */}
                    <div className={cardCls}>
                        <SectionHeader icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91A16 16 0 0 0 13 14.82l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16.92z" /></svg>} label="Emergency Contact" iconBg="bg-[rgba(239,68,68,0.08)] text-red-500" />
                        {isEditing ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div><label className={labelCls}>Contact Name</label><input className={inputCls} name="emergency_contact_name" type="text" value={form.emergency_contact_name} onChange={handleChange} placeholder="e.g. John Doe" /></div>
                                <div><label className={labelCls}>Contact Phone</label><input className={inputCls} name="emergency_contact_number" type="tel" value={form.emergency_contact_number} onChange={handleChange} placeholder="+1 (555) 000-0000" /></div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <ViewField label="Contact Name" value={profile?.emergency_contact_name} />
                                <ViewField label="Contact Phone" value={profile?.emergency_contact_number} />
                            </div>
                        )}
                    </div>

                    {/* Action Bar */}
                    {isEditing && (
                        <form onSubmit={handleSave}>
                            <div className="flex items-center justify-between gap-4 bg-white border border-ui-200 rounded-[14px] px-6 py-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                                <span className="text-sm text-ui-500">
                                    {saveMutation.isSuccess ? "✓ All changes saved" : "Make your changes above, then click Save Changes."}
                                </span>
                                <div className="flex items-center gap-3">
                                    <button type="button" className={cancelBtnCls} onClick={handleCancel} disabled={isSaving}>Cancel</button>
                                    <button type="submit" className={saveBtnCls} disabled={isSaving}>
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
                                        {isSaving ? "Saving…" : "Save Changes"}
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}
                </div>
            </main>

            <PatientFooter />

            {cropFile && <PhotoCropModal file={cropFile} onCrop={handleCropDone} onCancel={() => setCropFile(null)} />}

            {toast && (
                <div className={`fixed bottom-6 right-6 z-[300] px-5 py-3.5 rounded-[12px] text-sm font-semibold shadow-[0_8px_24px_rgba(0,0,0,0.12)] animate-toast-slide-up ${toast.type === "success" ? "bg-[#1ABEAA] text-white" : "bg-[#ef4444] text-white"}`}>
                    {toast.msg}
                </div>
            )}
        </div>
    );
}

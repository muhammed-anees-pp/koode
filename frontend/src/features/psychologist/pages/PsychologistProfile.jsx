import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { z } from "zod";
import { fetchPsychologistProfile, updatePsychologistProfile, getSpecializations } from "../../../api/psychologist.api";
import { useAuthStore } from "../../../store/auth.store";
import { usePsychologistSessionGuard } from "../../../hooks/usePsychologistSessionGuard";
import PsychologistNavbar from "../../../components/psychologist/Navbar/PsychologistNavbar";
import { resolveMediaUrl } from "../../../utils/url";

const profileSchema = z.object({
    full_name: z.string()
        .min(2,   "Full name must be at least 2 characters")
        .max(100, "Full name must be under 100 characters")
        .regex(/^[a-zA-Z\s.'-]+$/, "Full name must contain only letters, spaces, dots, apostrophes, or hyphens"),
    phone_number: z.string()
        .min(10, "Phone number must be at least 10 digits")
        .max(15, "Phone number must be under 15 digits")
        .regex(/^\d+$/, "Phone number must contain digits only"),
    about: z.string()
        .min(50,   "About section must be at least 50 characters")
        .max(2000, "About section must be under 2000 characters"),
    street_address: z.string()
        .min(5,   "Street address must be at least 5 characters")
        .max(255, "Street address too long"),
    city: z.string()
        .min(2,   "City must be at least 2 characters")
        .max(100, "City too long")
        .regex(/^[a-zA-Z\s'-]+$/, "City must contain only letters"),
    state: z.string()
        .min(2,   "State must be at least 2 characters")
        .max(100, "State too long")
        .regex(/^[a-zA-Z\s'-]+$/, "State must contain only letters"),
    pincode: z.string()
        .min(4,  "Pincode must be at least 4 digits")
        .max(10, "Pincode too long")
        .regex(/^\d+$/, "Pincode must contain digits only"),
    country: z.string().min(1, "Country is required"),
    job_title: z.string()
        .min(3,   "Job title must be at least 3 characters")
        .max(255, "Job title too long")
        .regex(/^[a-zA-Z\s.,'()-]+$/, "Job title must not contain special characters"),
    highest_education: z.string()
        .min(3,   "Qualification must be at least 3 characters")
        .max(255, "Qualification too long"),
    years_of_experience: z.string()
        .min(1, "Experience is required")
        .refine((v) => { const n = parseInt(v, 10); return !isNaN(n) && n >= 0 && n <= 60; }, "Experience must be a number between 0 and 60"),
});

const ALLOWED_IMG_TYPES  = ["image/jpeg", "image/png", "image/gif"];
const ALLOWED_AUDIO_EXTS = [".mp3", ".m4a", ".wav", ".ogg", ".webm", ".aac"];
const MAX_IMG_MB   = 5;
const MAX_AUDIO_MB = 10;
const inputCls    = "w-full px-4 py-3 text-sm text-gray-900 bg-gray-50 border rounded-[10px] outline-none transition-all duration-200 placeholder:text-gray-400 focus:bg-white disabled:opacity-60 disabled:cursor-not-allowed";
const inputOk     = "border-gray-200 focus:border-psycho-primary focus:shadow-[0_0_0_3px_rgba(17,136,216,0.12)]";
const inputErr    = "border-red-300 bg-red-50/40 focus:border-red-400 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.10)]";
const roInputCls  = "w-full px-4 py-3 text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-[10px] outline-none cursor-not-allowed";
const labelCls    = "block text-xs font-semibold text-gray-500 uppercase tracking-[0.06em] mb-1.5";
const cardCls     = "bg-white border border-gray-200 rounded-[16px] p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04)]";
const saveBtnCls  = "inline-flex items-center gap-2 px-6 py-3 bg-psycho-primary text-white text-sm font-semibold border-none rounded-[10px] cursor-pointer transition-all duration-200 hover:bg-psycho-hover disabled:opacity-60 disabled:cursor-not-allowed";
const cancelBtnCls = "inline-flex items-center gap-2 px-5 py-3 text-sm font-medium text-gray-600 bg-gray-100 border-none rounded-[10px] cursor-pointer transition-all duration-200 hover:bg-gray-200 disabled:opacity-60 disabled:cursor-not-allowed";
const errCls      = "flex items-center gap-1.5 text-xs text-red-500 mt-1.5 font-medium";

function ErrMsg({ msg }) {
    if (!msg) return null;
    return (
        <p className={errCls}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {msg}
        </p>
    );
}

function ViewField({ label, value, placeholder = "Not provided" }) {
    return (
        <div>
            <label className={labelCls}>{label}</label>
            <div className={`text-sm font-medium py-3 ${!value ? "text-gray-400 italic" : "text-gray-900"}`}>
                {value || placeholder}
            </div>
        </div>
    );
}

const CROP_SIZE = 400; const PREVIEW_SIZE = 220;
function PhotoCropModal({ file, onCrop, onCancel }) {
    const [zoom, setZoom]     = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const dragState = useRef(null);
    const imgRef    = useRef(null);
    const [imgReady, setImgReady] = useState(false);
    const [naturalSize, setNaturalSize] = useState({ width: 1, height: 1 });
    const previewUrl = useMemo(() => URL.createObjectURL(file), [file]);
    useEffect(() => () => URL.revokeObjectURL(previewUrl), [previewUrl]);
    const startDrag = (cx, cy) => { dragState.current = { startX: cx, startY: cy, offsetX: offset.x, offsetY: offset.y }; };
    const moveDrag  = useCallback((cx, cy) => {
        if (!dragState.current) return;
        setOffset({ x: dragState.current.offsetX + (cx - dragState.current.startX), y: dragState.current.offsetY + (cy - dragState.current.startY) });
    }, []);
    const endDrag = () => { dragState.current = null; };
    const handleApply = useCallback(() => {
        const img = imgRef.current;
        if (!img || !imgReady) return;
        const canvas = document.createElement("canvas");
        canvas.width = CROP_SIZE; canvas.height = CROP_SIZE;
        const ctx = canvas.getContext("2d");
        ctx.beginPath(); ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2); ctx.clip();
        const scale = CROP_SIZE / PREVIEW_SIZE;
        const cs = Math.max(PREVIEW_SIZE / img.naturalWidth, PREVIEW_SIZE / img.naturalHeight) * zoom;
        const dw = img.naturalWidth * cs * scale; const dh = img.naturalHeight * cs * scale;
        ctx.drawImage(img, (CROP_SIZE - dw) / 2 + offset.x * scale, (CROP_SIZE - dh) / 2 + offset.y * scale, dw, dh);
        canvas.toBlob((blob) => onCrop(blob), "image/jpeg", 0.92);
    }, [zoom, offset, onCrop, imgReady]);
    const nw = naturalSize.width; const nh = naturalSize.height;
    const cs = imgReady ? Math.max(PREVIEW_SIZE / nw, PREVIEW_SIZE / nh) * zoom : zoom;
    const iw = imgReady ? nw * cs : PREVIEW_SIZE * zoom; const ih = imgReady ? nh * cs : PREVIEW_SIZE * zoom;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[3px] z-[200] flex items-center justify-center p-6" onClick={onCancel}>
            <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-[400px] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h3 className="text-base font-bold text-gray-900">Crop Photo</h3>
                    <button className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 border-none cursor-pointer hover:bg-gray-200" onClick={onCancel} type="button">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
                <div className="flex flex-col items-center px-6 py-6 gap-4">
                    <div className="relative w-[220px] h-[220px] rounded-full overflow-hidden border-[3px] border-psycho-primary cursor-grab select-none"
                        onMouseDown={(e) => { e.preventDefault(); startDrag(e.clientX, e.clientY); }}
                        onMouseMove={(e) => moveDrag(e.clientX, e.clientY)}
                        onMouseUp={endDrag} onMouseLeave={endDrag}
                        onTouchStart={(e) => { const t = e.touches[0]; startDrag(t.clientX, t.clientY); }}
                        onTouchMove={(e) => { e.preventDefault(); const t = e.touches[0]; moveDrag(t.clientX, t.clientY); }}
                        onTouchEnd={endDrag}>
                        <img ref={imgRef} src={previewUrl} alt="Crop" draggable={false} onLoad={(e) => { setNaturalSize({ width: e.currentTarget.naturalWidth || 1, height: e.currentTarget.naturalHeight || 1 }); setImgReady(true); }}
                            style={{ width: iw, height: ih, position: "absolute", top: "50%", left: "50%", transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`, pointerEvents: "none" }} />
                    </div>
                    <p className="text-xs text-gray-400 text-center">Drag to reposition · Scroll slider to zoom</p>
                    <div className="flex items-center gap-3 w-full">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 flex-shrink-0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                        <input type="range" min="1" max="3" step="0.02" value={zoom} onChange={(e) => { setZoom(parseFloat(e.target.value)); setOffset({ x: 0, y: 0 }); }} className="flex-1 h-1.5 cursor-pointer accent-psycho-primary" />
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 flex-shrink-0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                    </div>
                </div>
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
                    <button className={cancelBtnCls} onClick={onCancel} type="button">Cancel</button>
                    <button className={saveBtnCls} onClick={handleApply} type="button">✓ Use Photo</button>
                </div>
            </div>
        </div>
    );
}

function AudioPlayer({ src, label = "Audio Introduction" }) {
    const audioRef = useRef(null);
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [loaded, setLoaded] = useState(false);
    const resolvedSrc = resolveMediaUrl(src);
    const toggle = () => { const a = audioRef.current; if (!a) return; playing ? a.pause() : a.play(); setPlaying(!playing); };
    const fmt    = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
    useEffect(() => { const a = audioRef.current; if (!a) return; const onEnd = () => setPlaying(false); a.addEventListener("ended", onEnd); return () => a.removeEventListener("ended", onEnd); }, []);
    return (
        <div className="flex items-center gap-4 bg-gray-50 border border-gray-200 rounded-[12px] px-5 py-4">
            <audio ref={audioRef} src={resolvedSrc}
                onTimeUpdate={() => { const a = audioRef.current; if (a) setProgress(a.currentTime / (a.duration || 1) * 100); }}
                onLoadedMetadata={() => { if (audioRef.current) { setDuration(audioRef.current.duration); setLoaded(true); } }}
            />
            <button type="button" onClick={toggle} disabled={!loaded}
                className="w-10 h-10 rounded-full bg-psycho-primary flex items-center justify-center flex-shrink-0 border-none cursor-pointer hover:bg-psycho-hover transition-all disabled:opacity-50 shadow-sm">
                {playing
                    ? <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                    : <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>}
            </button>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">{label}</p>
                <div className="relative h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="absolute inset-y-0 left-0 bg-psycho-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
            </div>
            <span className="text-xs text-gray-400 flex-shrink-0 tabular-nums">{loaded ? fmt(duration) : "…"}</span>
        </div>
    );
}

function SectionHeader({ icon, label, iconBg = "bg-psycho-primary/10 text-psycho-primary" }) {
    return (
        <div className="flex items-center gap-3 mb-6">
            <span className={`w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 ${iconBg}`}>{icon}</span>
            <h2 className="text-base font-bold text-gray-900">{label}</h2>
        </div>
    );
}

function Field({ label, name, type = "text", value, onChange, onBlur, placeholder, error, min, rows }) {
    const cls = `${inputCls} ${error ? inputErr : inputOk}`;
    return (
        <div>
            <label className={labelCls}>{label}</label>
            {rows
                ? <textarea className={`${cls} resize-none`} name={name} rows={rows} value={value} onChange={onChange} onBlur={onBlur} placeholder={placeholder} />
                : <input className={cls} name={name} type={type} value={value} onChange={onChange} onBlur={onBlur} placeholder={placeholder} min={min} />}
            <ErrMsg msg={error} />
        </div>
    );
}

function ProfileShell({ children }) {
    return (
        <div className="flex flex-col min-h-screen bg-gray-50 font-sans antialiased">
            <PsychologistNavbar />
            <main className="flex-1 flex flex-col pt-[66px]">
                <div className="max-w-[880px] mx-auto w-full px-6 py-10">{children}</div>
            </main>
        </div>
    );
}

export default function PsychologistProfile() {
    const { isAuthenticated, role, updateUser, user: authUser } = useAuthStore();
    const queryClient = useQueryClient();
    const fileInputRef  = useRef(null);
    const audioInputRef = useRef(null);

    usePsychologistSessionGuard();

    const { data: profile, isLoading, isError } = useQuery({
        queryKey: ["psychologist-profile"],
        queryFn: fetchPsychologistProfile,
        enabled: isAuthenticated && role === "PSYCHOLOGIST",
    });

    const { data: allSpecs = [] } = useQuery({
        queryKey: ["specializations"],
        queryFn: getSpecializations,
        staleTime: 5 * 60 * 1000,
    });

    const [isEditing,      setIsEditing]      = useState(false);
    const [cropFile,       setCropFile]       = useState(null);
    const [pendingBlob,    setPendingBlob]    = useState(null);
    const [pendingPreview, setPendingPreview] = useState(null);
    const [pendingRemove,  setPendingRemove]  = useState(false);
    const [newAudioFile,   setNewAudioFile]   = useState(null);
    const [toast,          setToast]          = useState(null);
    const [editSpecIds,    setEditSpecIds]    = useState([]);
    const [errors,         setErrors]         = useState({});
    const [touched,        setTouched]        = useState({});
    const [fileErrors,     setFileErrors]     = useState({});

    const EMPTY_FORM = { full_name: "", phone_number: "", about: "", street_address: "", city: "", state: "", pincode: "", country: "", job_title: "", highest_education: "", years_of_experience: "" };
    const [form, setForm] = useState(EMPTY_FORM);

    useEffect(() => {
        if (profile) {
            // Sync the editable form once fresh profile data arrives.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setForm({
                full_name:           profile.user?.full_name           || "",
                phone_number:        profile.phone_number              || "",
                about:               profile.about                     || "",
                street_address:      profile.street_address            || "",
                city:                profile.city                      || "",
                state:               profile.state                     || "",
                pincode:             profile.pincode                   || "",
                country:             profile.country                   || "",
                job_title:           profile.job_title                 || "",
                highest_education:   profile.highest_education         || "",
                years_of_experience: profile.years_of_experience != null ? String(profile.years_of_experience) : "",
            });
            setEditSpecIds((profile.specializations || []).map((s) => s.id));
        }
    }, [profile]);

    const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };
    const clearPendingPhoto = () => {
        if (pendingPreview) URL.revokeObjectURL(pendingPreview);
        setPendingBlob(null); setPendingPreview(null); setPendingRemove(false); setCropFile(null);
    };

    const validateField = useCallback((name, value) => {
        const partial = { ...form, [name]: value };
        const result = profileSchema.safeParse(partial);
        if (result.success) {
            setErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
        } else {
            const fieldErrs = result.error.flatten().fieldErrors;
            if (fieldErrs[name]?.[0]) {
                setErrors((prev) => ({ ...prev, [name]: fieldErrs[name][0] }));
            } else {
                setErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
            }
        }
    }, [form]);

    const saveMutation = useMutation({
        mutationFn: updatePsychologistProfile,
        onSuccess: (data) => {
            queryClient.setQueryData(["psychologist-profile"], data);
            updateUser({ full_name: data.user?.full_name, profile_picture: data.user?.profile_picture ?? null });
            clearPendingPhoto(); setIsEditing(false); setNewAudioFile(null);
            setErrors({}); setTouched({}); setFileErrors({});
            showToast("Profile updated successfully!");
        },
        onError: (err) => {
            const d = err?.response?.data;
            if (d && typeof d === "object") {
                const mapped = {};
                Object.entries(d).forEach(([k, v]) => { mapped[k] = Array.isArray(v) ? v[0] : String(v); });
                if (mapped.user && typeof mapped.user === "object") {
                    Object.assign(mapped, mapped.user);
                    delete mapped.user;
                }
                setErrors(mapped);
                showToast("Please fix the errors below and try again.", "error");
            } else {
                showToast("Failed to save changes. Please try again.", "error");
            }
        },
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((p) => ({ ...p, [name]: value }));
        if (touched[name]) validateField(name, value);
    };

    const handleBlur = (e) => {
        const { name, value } = e.target;
        setTouched((p) => ({ ...p, [name]: true }));
        validateField(name, value);
    };

    const handleCancel = () => {
        if (profile) {
            setForm({
                full_name:           profile.user?.full_name     || "",
                phone_number:        profile.phone_number        || "",
                about:               profile.about               || "",
                street_address:      profile.street_address      || "",
                city:                profile.city                || "",
                state:               profile.state               || "",
                pincode:             profile.pincode             || "",
                country:             profile.country             || "",
                job_title:           profile.job_title           || "",
                highest_education:   profile.highest_education   || "",
                years_of_experience: profile.years_of_experience != null ? String(profile.years_of_experience) : "",
            });
            setEditSpecIds((profile.specializations || []).map((s) => s.id));
        }
        clearPendingPhoto(); setIsEditing(false); setNewAudioFile(null);
        setErrors({}); setTouched({}); setFileErrors({});
    };

    const toggleEditSpec = (id) => {
        setEditSpecIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
        setFileErrors((prev) => { const n = { ...prev }; delete n.specializations; return n; });
    };

    const handleSave = (e) => {
        e.preventDefault();
        const allTouched = {};
        Object.keys(form).forEach((k) => { allTouched[k] = true; });
        setTouched(allTouched);

        const result = profileSchema.safeParse(form);
        let textErrs = {};
        if (!result.success) {
            Object.entries(result.error.flatten().fieldErrors).forEach(([k, v]) => { if (v?.[0]) textErrs[k] = v[0]; });
        }
        setErrors(textErrs);

        const fileErrs = {};
        const hasPhoto = pendingBlob || (!pendingRemove && (profile?.user?.profile_picture || authUser?.profile_picture));
        if (!hasPhoto) fileErrs.profile_picture = "Profile photo is required";
        const hasAudio = newAudioFile || profile?.audio_intro;
        if (!hasAudio) fileErrs.audio_intro = "Audio introduction is required";
        if (editSpecIds.length === 0) fileErrs.specializations = "Please select at least one specialization";
        setFileErrors(fileErrs);

        const allErrs = { ...textErrs, ...fileErrs };
        const failingKeys = Object.keys(allErrs);

        if (failingKeys.length > 0) {
            showToast(allErrs[failingKeys[0]], "error");
            return;
        }

        const fd = new FormData();
        fd.append("full_name",           form.full_name.trim());
        fd.append("phone_number",        form.phone_number);
        fd.append("about",               form.about);
        fd.append("street_address",      form.street_address);
        fd.append("city",                form.city);
        fd.append("state",               form.state);
        fd.append("pincode",             form.pincode);
        fd.append("country",             form.country);
        fd.append("job_title",           form.job_title);
        fd.append("highest_education",   form.highest_education);
        fd.append("years_of_experience", form.years_of_experience);
        editSpecIds.forEach((id) => fd.append("specialization_ids", id));
        if (newAudioFile)       fd.append("audio_intro", newAudioFile);
        if (pendingBlob)        fd.append("profile_picture", pendingBlob, "avatar.jpg");
        else if (pendingRemove) fd.append("profile_picture", "");
        saveMutation.mutate(fd);
    };

    const handleFileSelect = (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        e.target.value = "";
        if (!ALLOWED_IMG_TYPES.includes(f.type)) { setFileErrors((p) => ({ ...p, profile_picture: "Only JPG, PNG, or GIF images are allowed" })); return; }
        if (f.size > MAX_IMG_MB * 1024 * 1024) { setFileErrors((p) => ({ ...p, profile_picture: `Photo must be under ${MAX_IMG_MB}MB` })); return; }
        setFileErrors((p) => { const n = { ...p }; delete n.profile_picture; return n; });
        setCropFile(f);
    };

    const handleCropDone = useCallback((blob) => {
        if (pendingPreview) URL.revokeObjectURL(pendingPreview);
        setPendingBlob(blob); setPendingPreview(URL.createObjectURL(blob)); setPendingRemove(false); setCropFile(null);
        setFileErrors((p) => { const n = { ...p }; delete n.profile_picture; return n; });
    }, [pendingPreview]);

    const handleAudioSelect = (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        e.target.value = "";
        const ext = "." + f.name.split(".").pop().toLowerCase();
        if (!ALLOWED_AUDIO_EXTS.includes(ext)) { setFileErrors((p) => ({ ...p, audio_intro: "Only MP3, M4A, WAV, OGG, or AAC files allowed" })); return; }
        if (f.size > MAX_AUDIO_MB * 1024 * 1024) { setFileErrors((p) => ({ ...p, audio_intro: `Audio must be under ${MAX_AUDIO_MB}MB` })); return; }
        setFileErrors((p) => { const n = { ...p }; delete n.audio_intro; return n; });
        setNewAudioFile(f);
    };

    const userName    = profile?.user?.full_name || "Psychologist";
    const userEmail   = profile?.user?.email     || "";
    const rawAvatar   = profile?.user?.profile_picture || authUser?.profile_picture || null;
    const userAvatar  = resolveMediaUrl(rawAvatar);
    const avatarSrc   = pendingRemove ? null : (pendingPreview || userAvatar || null);
    const avatarInit  = userName.charAt(0).toUpperCase();
    const formatDate  = (d) => !d ? null : new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
    const isSaving    = saveMutation.isPending;
    const specializations = profile?.specializations || [];

    if (!isAuthenticated || role !== "PSYCHOLOGIST") return <Navigate to="/psychologist/login" replace />;
    if (isLoading) return <ProfileShell><div className="text-center py-20 text-gray-500 text-sm">Loading profile…</div></ProfileShell>;
    if (isError)   return <ProfileShell><div className="text-center py-20 text-red-500 text-sm">Failed to load profile. Please refresh.</div></ProfileShell>;

    return (
        <div className="flex flex-col min-h-screen bg-gray-50 font-sans antialiased">
            <PsychologistNavbar />
            <main className="flex-1 flex flex-col pt-[66px]">
                <div className="max-w-[880px] mx-auto w-full px-6 py-10 flex flex-col gap-6">

                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h1 className="text-[1.6rem] font-extrabold text-gray-900 tracking-tight">Profile Settings</h1>
                            <p className="text-sm text-gray-500 mt-1">Manage your professional information and workspace details.</p>
                        </div>
                        {!isEditing ? (
                            <button className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-psycho-primary bg-psycho-primary/8 border border-psycho-primary/20 rounded-[10px] cursor-pointer transition-all duration-200 hover:bg-psycho-primary/14 hover:border-psycho-primary" onClick={() => setIsEditing(true)}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                Edit Profile
                            </button>
                        ) : (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-psycho-primary bg-psycho-primary/10 border border-psycho-primary/20 rounded-full">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                Editing
                            </div>
                        )}
                    </div>

                    <div className={cardCls}>
                        <div className="flex items-center gap-6">
                            <div className="relative flex-shrink-0">
                                <div className="w-[88px] h-[88px] rounded-full overflow-hidden shadow-md relative bg-gradient-to-br from-psycho-primary to-psycho-hover">
                                    <div className="absolute inset-0 flex items-center justify-center text-white text-2xl font-bold select-none">{avatarInit}</div>
                                    {avatarSrc && !pendingRemove && (
                                        <img src={avatarSrc} alt={userName} className="absolute inset-0 w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                                    )}
                                </div>
                                {isEditing && (
                                    <button className="absolute bottom-0 right-0 w-8 h-8 bg-white border-2 border-psycho-primary rounded-full flex items-center justify-center text-psycho-primary cursor-pointer shadow-sm hover:bg-psycho-primary hover:text-white transition-all duration-200" onClick={() => fileInputRef.current?.click()} type="button">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                                    </button>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                {isEditing ? (
                                    <>
                                        <p className="text-sm text-gray-500 mb-2">
                                            {pendingBlob ? "✓ Photo ready — will upload on Save Changes." : pendingRemove ? "Photo will be removed on Save Changes." : "Click the camera icon to change your profile photo."}
                                        </p>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <button className="px-3 py-1.5 text-xs font-semibold text-psycho-primary bg-psycho-primary/8 border border-psycho-primary/20 rounded-lg cursor-pointer hover:bg-psycho-primary/14" type="button" onClick={() => fileInputRef.current?.click()}>
                                                {pendingBlob ? "Re-crop Photo" : "Update Photo"}
                                            </button>
                                            {(userAvatar || pendingBlob) && !pendingRemove && (
                                                <button className="px-3 py-1.5 text-xs font-semibold text-red-500 bg-red-50 border border-red-100 rounded-lg cursor-pointer hover:bg-red-100" type="button" onClick={() => { clearPendingPhoto(); setPendingRemove(true); setFileErrors((p) => ({ ...p, profile_picture: "Profile photo is required" })); }}>Remove Photo</button>
                                            )}
                                            {pendingRemove && (
                                                <button className="px-3 py-1.5 text-xs font-semibold text-psycho-primary bg-psycho-primary/8 border border-psycho-primary/20 rounded-lg cursor-pointer" type="button" onClick={() => { setPendingRemove(false); setFileErrors((p) => { const n = {...p}; delete n.profile_picture; return n; }); }}>Undo Remove</button>
                                            )}
                                            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif" className="hidden" onChange={handleFileSelect} />
                                        </div>
                                        <ErrMsg msg={fileErrors.profile_picture} />
                                    </>
                                ) : (
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900 truncate">{userName}</h2>
                                        <p className="text-sm text-gray-500">{profile?.job_title || "Psychologist"}</p>
                                        <span className="text-xs text-gray-400 font-medium">ID · {profile?.psychologist_id || "—"}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className={cardCls}>
                        <SectionHeader icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>} label="Audio Introduction" />
                        {isEditing ? (
                            <div className="space-y-3">
                                {(newAudioFile || profile?.audio_intro) && (
                                    newAudioFile
                                        ? (
                                            <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-[12px] px-4 py-3">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-psycho-primary flex-shrink-0"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                                <span className="text-sm text-gray-700 truncate font-medium flex-1">{newAudioFile.name}</span>
                                                <button type="button" className="text-xs text-red-400 hover:text-red-600 bg-transparent border-none cursor-pointer flex-shrink-0" onClick={() => { setNewAudioFile(null); setFileErrors((p) => ({ ...p, audio_intro: "Audio introduction is required" })); }}>Remove</button>
                                            </div>
                                        )
                                        : <AudioPlayer src={profile.audio_intro} label="Current Audio Intro" />
                                )}
                                <div className="flex items-center gap-3 flex-wrap">
                                    <button type="button" onClick={() => audioInputRef.current?.click()}
                                        className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all ${fileErrors.audio_intro ? "text-red-600 bg-red-50 border border-red-200 hover:bg-red-100" : "text-psycho-primary bg-psycho-primary/8 border border-psycho-primary/20 hover:bg-psycho-primary/14"}`}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                        {profile?.audio_intro && !newAudioFile ? "Replace Audio" : "Upload Audio"}
                                    </button>
                                    <span className="text-xs text-gray-400">MP3, M4A, WAV, OGG · max {MAX_AUDIO_MB}MB</span>
                                    <input ref={audioInputRef} type="file" accept="audio/*,.mp3,.m4a,.wav,.ogg,.webm,.aac" className="hidden" onChange={handleAudioSelect} />
                                </div>
                                <ErrMsg msg={fileErrors.audio_intro} />
                            </div>
                        ) : profile?.audio_intro ? (
                            <AudioPlayer src={profile.audio_intro} />
                        ) : (
                            <p className="text-sm text-gray-400 italic">No audio introduction uploaded.</p>
                        )}
                    </div>

                    <div className={cardCls}>
                        <SectionHeader icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>} label="Personal & Professional Details" />
                        {isEditing ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <Field label="Full Name" name="full_name" placeholder="Dr. Jane Smith" value={form.full_name} onChange={handleChange} onBlur={handleBlur} error={errors.full_name} />
                                <Field label="Phone Number" name="phone_number" type="tel" placeholder="9876543210" value={form.phone_number} onChange={handleChange} onBlur={handleBlur} error={errors.phone_number} />
                                <Field label="Job Title" name="job_title" placeholder="Clinical Psychologist" value={form.job_title} onChange={handleChange} onBlur={handleBlur} error={errors.job_title} />
                                <Field label="Years of Experience" name="years_of_experience" type="number" placeholder="5" min="0" value={form.years_of_experience} onChange={handleChange} onBlur={handleBlur} error={errors.years_of_experience} />
                                <div>
                                    <label className={labelCls}>Email Address <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" className="inline mb-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></label>
                                    <input className={roInputCls} type="email" value={userEmail} disabled />
                                </div>
                                <div>
                                    <label className={labelCls}>Consultation Fee <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" className="inline mb-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></label>
                                    <input className={roInputCls} type="text" value={profile?.consultation_fee != null ? `₹ ${Number(profile.consultation_fee).toLocaleString("en-IN")}` : "—"} disabled />
                                </div>
                                <div className="md:col-span-2">
                                    <label className={labelCls}>About <span className="normal-case font-normal text-gray-400 ml-1">(min 50 chars)</span></label>
                                    <textarea className={`${inputCls} ${errors.about ? inputErr : inputOk} resize-none`} name="about" rows={4} value={form.about} onChange={handleChange} onBlur={handleBlur} placeholder="Tell patients about your approach, philosophy, and what makes your practice unique… (min 50 characters)" />
                                    <div className="flex items-center justify-between mt-1">
                                        <ErrMsg msg={errors.about} />
                                        <span className={`text-xs ml-auto tabular-nums ${form.about.length < 50 ? "text-gray-400" : "text-green-500"}`}>{form.about.length}/2000</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <ViewField label="Full Name"           value={userName} />
                                <ViewField label="Email Address"       value={userEmail} />
                                <ViewField label="Phone Number"        value={profile?.phone_number} />
                                <ViewField label="Job Title"           value={profile?.job_title} />
                                <ViewField label="Years of Experience" value={profile?.years_of_experience != null ? `${profile.years_of_experience} year${profile.years_of_experience !== 1 ? "s" : ""}` : null} />
                                <ViewField label="Consultation Fee"    value={profile?.consultation_fee != null ? `₹ ${Number(profile.consultation_fee).toLocaleString("en-IN")}` : null} />
                                <ViewField label="Member Since"        value={formatDate(profile?.created_at)} />
                                {profile?.about && (
                                    <div className="md:col-span-2">
                                        <label className={labelCls}>About</label>
                                        <p className="text-sm text-gray-900 whitespace-pre-line leading-relaxed py-2">{profile.about}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className={cardCls}>
                        <SectionHeader icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>} label="Specializations" iconBg="bg-purple-50 text-purple-600" />
                        {isEditing ? (
                            <div>
                                <p className="text-sm text-gray-500 mb-3">Toggle to add or remove specializations. At least one is required.</p>
                                <div className="flex flex-wrap gap-2">
                                    {allSpecs.map((spec) => {
                                        const active = editSpecIds.includes(spec.id);
                                        return (
                                            <button key={spec.id} type="button" onClick={() => toggleEditSpec(spec.id)}
                                                className={`px-3.5 py-2 text-sm font-medium rounded-full border transition-all duration-200 cursor-pointer ${active ? "bg-psycho-primary text-white border-psycho-primary shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-psycho-primary/50 hover:text-psycho-primary"}`}>
                                                {active && <span className="mr-1 opacity-80">✓</span>}
                                                {spec.name}
                                                {active && <span className="ml-1 opacity-70">×</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                                <ErrMsg msg={fileErrors.specializations} />
                            </div>
                        ) : specializations.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {specializations.map((s) => (
                                    <span key={s.id} className="inline-flex items-center px-3.5 py-2 text-sm font-medium text-psycho-primary bg-psycho-primary/10 border border-psycho-primary/20 rounded-full">{s.name}</span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400 italic">No specializations added.</p>
                        )}
                    </div>

                    <div className={cardCls}>
                        <SectionHeader icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>} label="Education" iconBg="bg-emerald-50 text-emerald-600" />
                        {isEditing ? (
                            <Field label="Highest Qualification" name="highest_education" placeholder="Ph.D. in Clinical Psychology" value={form.highest_education} onChange={handleChange} onBlur={handleBlur} error={errors.highest_education} />
                        ) : (
                            <ViewField label="Highest Qualification" value={profile?.highest_education} />
                        )}
                    </div>

                    <div className={cardCls}>
                        <SectionHeader icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>} label="Practice Address" iconBg="bg-amber-50 text-amber-600" />
                        {isEditing ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="md:col-span-2">
                                    <Field label="Street Address" name="street_address" placeholder="123 Wellness Ave" value={form.street_address} onChange={handleChange} onBlur={handleBlur} error={errors.street_address} />
                                </div>
                                <Field label="City"    name="city"    placeholder="Mumbai"       value={form.city}    onChange={handleChange} onBlur={handleBlur} error={errors.city} />
                                <Field label="State"   name="state"   placeholder="Maharashtra"  value={form.state}   onChange={handleChange} onBlur={handleBlur} error={errors.state} />
                                <Field label="Pincode" name="pincode" placeholder="400001"       value={form.pincode} onChange={handleChange} onBlur={handleBlur} error={errors.pincode} />
                                <Field label="Country" name="country" placeholder="India"        value={form.country} onChange={handleChange} onBlur={handleBlur} error={errors.country} />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <ViewField label="Street Address" value={profile?.street_address} />
                                <ViewField label="City"           value={profile?.city} />
                                <ViewField label="State"          value={profile?.state} />
                                <ViewField label="Pincode"        value={profile?.pincode} />
                                <ViewField label="Country"        value={profile?.country} />
                            </div>
                        )}
                    </div>

                    {isEditing && (
                        <form onSubmit={handleSave}>
                            <div className="flex items-center justify-between gap-4 bg-white border border-gray-200 rounded-[14px] px-6 py-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                                <span className="text-sm text-gray-500">Make your changes above, then click Save Changes.</span>
                                <div className="flex items-center gap-3">
                                    <button type="button" className={cancelBtnCls} onClick={handleCancel} disabled={isSaving}>Cancel</button>
                                    <button type="submit" className={saveBtnCls} disabled={isSaving}>
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                                        {isSaving ? "Saving…" : "Save Changes"}
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}
                </div>
            </main>

            {cropFile && <PhotoCropModal file={cropFile} onCrop={handleCropDone} onCancel={() => setCropFile(null)} />}

            {toast && (
                <div className={`fixed bottom-6 right-6 z-[300] px-5 py-3.5 rounded-[12px] text-sm font-semibold shadow-xl animate-[fadeIn_0.2s_ease] ${toast.type === "success" ? "bg-psycho-primary text-white" : "bg-red-500 text-white"}`}>
                    {toast.msg}
                </div>
            )}
        </div>
    );
}

import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { fetchPatientProfile, updatePatientProfile } from "../../../api/patient.api";
import { useAuthStore } from "../../../store/auth.store";
import PatientNavbar from "../../../components/patient/Navbar/PatientNavbar";
import PatientFooter from "../../../components/patient/Footer/PatientFooter";
import "../../../styles/patient/PatientProfile.css";

const BASE_URL = "http://localhost:8000";
const CROP_SIZE = 400;
const PREVIEW_SIZE = 220;

const fullImgUrl = (path) =>
    !path ? null : path.startsWith("http") ? path : `${BASE_URL}${path}`;

const DEFAULT_TOPICS = [
    "Anxiety", "Work Stress", "Depression",
    "Relationship Issues", "Sleep Disorders", "Trauma", "Eating Disorders",
];

// Read-only view
function ViewField({ label, value, placeholder = "Not provided" }) {
    return (
        <div className="form-group">
            <label className="form-label">{label}</label>
            <div className={`view-field-value ${!value ? "muted" : ""}`}>
                {value || placeholder}
            </div>
        </div>
    );
}

// Crop modal
function PhotoCropModal({ file, onCrop, onCancel }) {
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const dragState = useRef(null);
    const imgRef = useRef(null);
    const [imgReady, setImgReady] = useState(false);

    const previewUrl = useRef(URL.createObjectURL(file)).current;
    useEffect(() => () => URL.revokeObjectURL(previewUrl), [previewUrl]);

    const startDrag = (clientX, clientY) => {
        dragState.current = { startX: clientX, startY: clientY, offsetX: offset.x, offsetY: offset.y };
    };
    const moveDrag = useCallback((clientX, clientY) => {
        if (!dragState.current) return;
        const dx = clientX - dragState.current.startX;
        const dy = clientY - dragState.current.startY;
        setOffset({ x: dragState.current.offsetX + dx, y: dragState.current.offsetY + dy });
    }, []);
    const endDrag = () => { dragState.current = null; };

    const onMouseDown = (e) => { e.preventDefault(); startDrag(e.clientX, e.clientY); };
    const onMouseMove = (e) => moveDrag(e.clientX, e.clientY);
    const onMouseUp = endDrag;
    const onTouchStart = (e) => { const t = e.touches[0]; startDrag(t.clientX, t.clientY); };
    const onTouchMove = (e) => { e.preventDefault(); const t = e.touches[0]; moveDrag(t.clientX, t.clientY); };

    const handleZoomChange = (val) => {
        setZoom(val);
        setOffset({ x: 0, y: 0 });
    };

    const handleApply = useCallback(() => {
        const img = imgRef.current;
        if (!img || !imgReady) return;

        const canvas = document.createElement("canvas");
        canvas.width = CROP_SIZE;
        canvas.height = CROP_SIZE;
        const ctx = canvas.getContext("2d");

        ctx.beginPath();
        ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2);
        ctx.clip();

        const scale = CROP_SIZE / PREVIEW_SIZE;
        const nw = img.naturalWidth;
        const nh = img.naturalHeight;
        const coverScale = Math.max(PREVIEW_SIZE / nw, PREVIEW_SIZE / nh) * zoom;
        const drawW = nw * coverScale * scale;
        const drawH = nh * coverScale * scale;
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
        <div className="photo-modal-overlay" onClick={onCancel}>
            <div className="photo-modal" onClick={(e) => e.stopPropagation()}>
                <div className="photo-modal-header">
                    <h3>Crop Photo</h3>
                    <button className="photo-modal-close" onClick={onCancel} type="button">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <div className="photo-crop-preview">
                    <div
                        className="photo-crop-circle"
                        style={{ cursor: "grab", userSelect: "none" }}
                        onMouseDown={onMouseDown}
                        onMouseMove={onMouseMove}
                        onMouseUp={onMouseUp}
                        onMouseLeave={onMouseUp}
                        onTouchStart={onTouchStart}
                        onTouchMove={onTouchMove}
                        onTouchEnd={endDrag}
                    >
                        <img
                            ref={imgRef}
                            src={previewUrl}
                            alt="Crop preview"
                            draggable={false}
                            onLoad={() => setImgReady(true)}
                            style={{
                                width: imgW,
                                height: imgH,
                                position: "absolute",
                                top: "50%",
                                left: "50%",
                                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                                pointerEvents: "none",
                                transition: dragState.current ? "none" : "width 0.2s, height 0.2s",
                            }}
                        />
                    </div>
                    <p className="photo-modal-hint">Drag to reposition · Scroll slider to zoom</p>
                </div>

                <div className="photo-zoom-row">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "#9ca3af", flexShrink: 0 }}>
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                        <line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
                    </svg>
                    <input
                        type="range" min="1" max="3" step="0.02" value={zoom}
                        onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                        className="zoom-slider"
                    />
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "#9ca3af", flexShrink: 0 }}>
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                        <line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
                    </svg>
                </div>

                <div className="photo-modal-actions">
                    <button className="btn-cancel-settings" onClick={onCancel} type="button">Cancel</button>
                    <button className="btn-save-settings" onClick={handleApply} type="button">✓ Use Photo</button>
                </div>
            </div>
        </div>
    );
}

export default function PatientProfile() {
    const { isAuthenticated, role, updateUser } = useAuthStore();
    const queryClient = useQueryClient();
    const fileInputRef = useRef(null);

    // ── All hooks must be called unconditionally at the top ──
    const { data: profile, isLoading, isError } = useQuery({
        queryKey: ["patient-profile"],
        queryFn: fetchPatientProfile,
        enabled: isAuthenticated && role === "PATIENT",
    });

    const [isEditing, setIsEditing] = useState(false);

    // Pending photo
    const [cropFile, setCropFile] = useState(null);
    const [pendingBlob, setPendingBlob] = useState(null);
    const [pendingPreview, setPendingPreview] = useState(null);
    const [pendingRemove, setPendingRemove] = useState(false);

    const [toast, setToast] = useState(null);

    const [form, setForm] = useState({
        full_name: "", phone_number: "", date_of_birth: "",
        gender: "", emergency_contact_name: "", emergency_contact_number: "",
    });

    const [selectedTopics, setSelectedTopics] = useState(["Anxiety", "Work Stress"]);

    // Populate form when profile data loads
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

    // Auth guard — placed AFTER all hooks
    if (!isAuthenticated || role !== "PATIENT") {
        return <Navigate to="/patient/login" replace />;
    }

    const toggleTopic = (t) =>
        setSelectedTopics((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);

    const showToast = (msg, type = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    useEffect(() => () => { if (pendingPreview) URL.revokeObjectURL(pendingPreview); }, []);

    const clearPendingPhoto = () => {
        if (pendingPreview) URL.revokeObjectURL(pendingPreview);
        setPendingBlob(null);
        setPendingPreview(null);
        setPendingRemove(false);
        setCropFile(null);
    };

    const saveMutation = useMutation({
        mutationFn: updatePatientProfile,
        onSuccess: (data) => {
            queryClient.setQueryData(["patient-profile"], data);
            updateUser({
                full_name: data.user?.full_name,
                profile_picture: data.user?.profile_picture ?? null,
            });
            clearPendingPhoto();
            setIsEditing(false);
            showToast("Profile updated successfully!");
        },
        onError: () => showToast("Failed to save changes. Please try again.", "error"),
    });

    const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    const handleEditClick = () => setIsEditing(true);

    const handleCancel = () => {
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
        clearPendingPhoto();
        setIsEditing(false);
    };

    const handleSave = (e) => {
        e.preventDefault();
        if (!form.full_name.trim()) {
            showToast("Full name cannot be empty.", "error");
            return;
        }
        const fd = new FormData();
        fd.append("full_name", form.full_name.trim());
        fd.append("phone_number", form.phone_number);
        fd.append("date_of_birth", form.date_of_birth);
        fd.append("gender", form.gender);
        fd.append("emergency_contact_name", form.emergency_contact_name);
        fd.append("emergency_contact_number", form.emergency_contact_number);

        if (pendingBlob) {
            fd.append("profile_picture", pendingBlob, "avatar.jpg");
        } else if (pendingRemove) {
            fd.append("profile_picture", "");
        }
        saveMutation.mutate(fd);
    };

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = "";
        setCropFile(file);
    };

    const handleCropDone = useCallback((blob) => {
        if (pendingPreview) URL.revokeObjectURL(pendingPreview);
        const url = URL.createObjectURL(blob);
        setPendingBlob(blob);
        setPendingPreview(url);
        setPendingRemove(false);
        setCropFile(null);
    }, [pendingPreview]);

    const handleRemovePhoto = () => {
        clearPendingPhoto();
        setPendingRemove(true);
    };

    const isSaving = saveMutation.isPending;

    const Shell = ({ children }) => (
        <div className="patient-layout">
            <PatientNavbar />
            <main className="profile-page-main">
                <div className="profile-page-inner">{children}</div>
            </main>
            <PatientFooter />
        </div>
    );

    if (isLoading) return <Shell><div className="profile-loading-state">Loading profile…</div></Shell>;
    if (isError) return <Shell><div className="profile-error-state">Failed to load profile. Please refresh.</div></Shell>;

    const userName = profile?.user?.full_name || "Patient";
    const userEmail = profile?.user?.email || "";
    const userAvatar = profile?.user?.profile_picture || null;

    const formatDate = (d) =>
        !d ? null : new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
    const capitalize = (s) => !s ? "" : s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

    const avatarSrc = pendingRemove ? null : (pendingPreview || fullImgUrl(userAvatar));
    const avatarInitial = userName.charAt(0).toUpperCase();

    return (
        <div className="patient-layout">
            <PatientNavbar />

            <main className="profile-page-main">
                <div className="profile-page-inner">

                    {/* Heading row */}
                    <div className="profile-page-heading-row">
                        <div>
                            <h1 className="profile-page-title">Profile Settings</h1>
                            <p className="profile-page-subtitle">Manage your personal information and health preferences.</p>
                        </div>
                        {!isEditing ? (
                            <button className="btn-edit-profile-top" onClick={handleEditClick}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                                Edit Profile
                            </button>
                        ) : (
                            <div className="editing-mode-badge">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                                Editing
                            </div>
                        )}
                    </div>

                    {/* Profile Picture */}
                    <div className="settings-card">
                        <div className="profile-pic-row">
                            <div className="profile-pic-wrapper">
                                {avatarSrc ? (
                                    <img src={avatarSrc} alt={userName} className="profile-pic-img"
                                        style={pendingRemove ? { opacity: 0.35 } : {}} />
                                ) : (
                                    <div className="profile-pic-initials">{avatarInitial}</div>
                                )}
                                {isEditing && (
                                    <button className="profile-pic-edit-overlay"
                                        onClick={() => fileInputRef.current?.click()}
                                        title="Change photo" type="button">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                            <circle cx="12" cy="13" r="4" />
                                        </svg>
                                    </button>
                                )}
                            </div>

                            <div className="profile-pic-info">
                                {isEditing ? (
                                    <p>
                                        {pendingBlob
                                            ? "✓ Photo cropped and ready — will upload on Save Changes."
                                            : pendingRemove
                                                ? "Photo will be removed on Save Changes."
                                                : "Click the camera icon or buttons below to change your photo."}
                                    </p>
                                ) : (
                                    <div className="profile-identity">
                                        <h2 className="profile-identity-name">{userName}</h2>
                                        <span className="profile-identity-id">
                                            ID&nbsp;·&nbsp;{profile?.patient_id || "—"}
                                        </span>
                                    </div>
                                )}

                                {isEditing && (
                                    <div className="profile-pic-actions">
                                        <button className="btn-upload-new" type="button"
                                            onClick={() => fileInputRef.current?.click()}>
                                            {pendingBlob ? "Re-crop Photo" : "Update Photo"}
                                        </button>
                                        {(userAvatar || pendingBlob) && !pendingRemove && (
                                            <button className="btn-remove-photo" type="button"
                                                onClick={handleRemovePhoto}>
                                                Remove Photo
                                            </button>
                                        )}
                                        {pendingRemove && (
                                            <button className="btn-upload-new" type="button"
                                                onClick={() => setPendingRemove(false)}>
                                                Undo Remove
                                            </button>
                                        )}
                                        <input ref={fileInputRef} type="file"
                                            accept="image/jpeg,image/png,image/gif"
                                            className="avatar-hidden-input"
                                            onChange={handleFileSelect} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Personal Details */}
                    <div className="settings-card">
                        <div className="settings-section-header">
                            <span className="settings-section-icon teal">
                                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                                </svg>
                            </span>
                            <h2 className="settings-section-title">Personal Details</h2>
                        </div>
                        {isEditing ? (
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">Full Name</label>
                                    <input className="form-input" name="full_name" type="text"
                                        value={form.full_name} onChange={handleChange} placeholder="Your full name" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">
                                        Email Address&nbsp;
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10" />
                                            <line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
                                        </svg>
                                    </label>
                                    <input className="form-input" type="email" value={userEmail} disabled />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Phone Number</label>
                                    <input className="form-input" name="phone_number" type="tel"
                                        value={form.phone_number} onChange={handleChange} placeholder="+1 (555) 000-0000" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Date of Birth</label>
                                    <input className="form-input" name="date_of_birth" type="date"
                                        value={form.date_of_birth} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Gender</label>
                                    <select className="form-select" name="gender" value={form.gender} onChange={handleChange}>
                                        <option value="">Select gender</option>
                                        <option value="MALE">Male</option>
                                        <option value="FEMALE">Female</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>
                            </div>
                        ) : (
                            <div className="form-grid">
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
                    <div className="settings-card">
                        <div className="settings-section-header">
                            <span className="settings-section-icon teal">
                                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
                                </svg>
                            </span>
                            <h2 className="settings-section-title">Focus Areas</h2>
                        </div>
                        <p className="section-subtitle">Select the topics you'd like to address in your sessions.</p>
                        <div className="focus-tags-container">
                            {DEFAULT_TOPICS.map((topic) => (
                                <button key={topic} type="button"
                                    className={`focus-tag ${selectedTopics.includes(topic) ? "selected" : ""} ${!isEditing ? "no-hover" : ""}`}
                                    onClick={() => isEditing && toggleTopic(topic)}
                                    style={{ cursor: isEditing ? "pointer" : "default" }}>
                                    {selectedTopics.includes(topic) && (
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    )}
                                    {topic}
                                </button>
                            ))}
                            {isEditing && (
                                <button className="focus-tag-add" type="button">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                                    </svg>
                                    Add Custom
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Emergency Contact */}
                    <div className="settings-card">
                        <div className="settings-section-header">
                            <span className="settings-section-icon red">
                                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91A16 16 0 0 0 13 14.82l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16.92z" />
                                </svg>
                            </span>
                            <h2 className="settings-section-title">Emergency Contact</h2>
                        </div>
                        {isEditing ? (
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">Contact Name</label>
                                    <input className="form-input" name="emergency_contact_name" type="text"
                                        value={form.emergency_contact_name} onChange={handleChange} placeholder="e.g. John Doe" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Contact Phone</label>
                                    <input className="form-input" name="emergency_contact_number" type="tel"
                                        value={form.emergency_contact_number} onChange={handleChange} placeholder="+1 (555) 000-0000" />
                                </div>
                            </div>
                        ) : (
                            <div className="form-grid">
                                <ViewField label="Contact Name" value={profile?.emergency_contact_name} />
                                <ViewField label="Contact Phone" value={profile?.emergency_contact_number} />
                            </div>
                        )}
                    </div>

                    {/* Action Bar — visible in edit mode only */}
                    {isEditing && (
                        <form onSubmit={handleSave}>
                            <div className="settings-form-actions">
                                <span className="last-saved-text">
                                    {saveMutation.isSuccess
                                        ? "✓ All changes saved"
                                        : "Make your changes above, then click Save Changes."}
                                </span>
                                <div className="settings-btn-group">
                                    <button type="button" className="btn-cancel-settings"
                                        onClick={handleCancel} disabled={isSaving}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn-save-settings" disabled={isSaving}>
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                                            <polyline points="17 21 17 13 7 13 7 21" />
                                            <polyline points="7 3 7 8 15 8" />
                                        </svg>
                                        {isSaving ? "Saving…" : "Save Changes"}
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}

                </div>
            </main>

            <PatientFooter />

            {cropFile && (
                <PhotoCropModal
                    file={cropFile}
                    onCrop={handleCropDone}
                    onCancel={() => setCropFile(null)}
                />
            )}

            {toast && <div className={`profile-toast ${toast.type}`}>{toast.msg}</div>}
        </div>
    );
}

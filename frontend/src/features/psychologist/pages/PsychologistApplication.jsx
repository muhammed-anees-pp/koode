import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import PsychologistNavbar from '../../../components/psychologist/Navbar/PsychologistNavbar';
import { submitApplication, getSpecializations } from '../../../api/psychologist.api';
import { fetchCurrentCommissionRate } from '../../../api/finance.api';
import { useAuthStore } from '../../../store/auth.store';
import { usePsychologistSessionGuard } from '../../../hooks/usePsychologistSessionGuard';
import { calculateCommissionPreview } from '../../../utils/commission';

const COUNTRIES = ['India', 'United States', 'United Kingdom', 'Canada', 'Australia', 'Other'];

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png'];
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/aac', 'audio/m4a', 'audio/x-m4a'];
const ALLOWED_CERT_TYPES = ['application/pdf'];
const MAX_IMG_MB = 5;
const MAX_AUDIO_MB = 10;
const MAX_CERT_MB = 10;

const appSchema = z.object({
    full_name: z
        .string()
        .min(2, 'Full name must be at least 2 characters')
        .max(100, 'Full name must be under 100 characters')
        .regex(/^[a-zA-Z\s.'-]+$/, 'Full name must contain only letters, spaces, dots, apostrophes, or hyphens'),
    phone_number: z
        .string()
        .min(10, 'Phone number must be at least 10 digits')
        .max(15, 'Phone number must be under 15 digits')
        .regex(/^\d+$/, 'Phone number must contain digits only'),
    about: z
        .string()
        .min(50, 'About section must be at least 50 characters')
        .max(2000, 'About section must be under 2000 characters'),
    street_address: z
        .string()
        .min(5, 'Street address must be at least 5 characters')
        .max(255, 'Street address too long'),
    city: z
        .string()
        .min(2, 'City must be at least 2 characters')
        .max(100, 'City too long')
        .regex(/^[a-zA-Z\s'-]+$/, 'City must contain only letters'),
    state: z
        .string()
        .min(2, 'State must be at least 2 characters')
        .max(100, 'State too long')
        .regex(/^[a-zA-Z\s'-]+$/, 'State must contain only letters'),
    pincode: z
        .string()
        .min(4, 'Pincode must be at least 4 digits')
        .max(10, 'Pincode too long')
        .regex(/^\d+$/, 'Pincode must contain digits only'),
    country: z.string().min(1, 'Please select a country'),
    job_title: z
        .string()
        .min(3, 'Job title must be at least 3 characters')
        .max(255, 'Job title too long')
        .regex(/^[a-zA-Z\s.,'()-]+$/, 'Job title must not contain special characters'),
    years_of_experience: z
        .string()
        .min(1, 'Experience is required')
        .refine((v) => {
            const n = parseInt(v, 10);
            return !isNaN(n) && n >= 0 && n <= 60;
        }, 'Experience must be a number between 0 and 60'),
    highest_education: z
        .string()
        .min(3, 'Qualification must be at least 3 characters')
        .max(255, 'Qualification too long'),
    consultation_fee: z
        .string()
        .min(1, 'Consultation fee is required')
        .refine((v) => {
            const n = parseFloat(v);
            return !isNaN(n) && n > 0;
        }, 'Fee must be a positive number'),
});


const validateFile = (file, allowedTypes, maxMB) => {
    if (!file) return null;
    if (!allowedTypes.includes(file.type)) return `Invalid file type. Allowed: ${allowedTypes.map((t) => t.split('/')[1]).join(', ')}`;
    if (file.size > maxMB * 1024 * 1024) return `File must be under ${maxMB}MB`;
    return null;
};

const formatSubmitError = (error) => {
    const data = error?.response?.data;

    if (!data) {
        return 'Failed to submit. Please try again.';
    }

    if (typeof data === 'string') {
        return data;
    }

    if (Array.isArray(data)) {
        return data.join(', ');
    }

    if (typeof data === 'object') {
        return Object.entries(data)
            .map(([key, value]) => {
                if (Array.isArray(value)) return `${key}: ${value.join(', ')}`;
                if (value && typeof value === 'object') return `${key}: ${JSON.stringify(value)}`;
                return `${key}: ${value}`;
            })
            .join(' | ');
    }

    return 'Failed to submit. Please try again.';
};


const ErrorMsg = ({ msg }) =>
    msg ? <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>{msg}</p> : null;

const InputField = ({ label, id, type = 'text', value, onChange, onBlur, placeholder, required, prefix, error, readOnly, children }) => (
    <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-sm font-medium text-gray-700">
            {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        {children ? children : (
            <div className={`flex items-center border rounded-xl bg-white overflow-hidden transition-all ${error
                ? 'border-red-300 ring-2 ring-red-100'
                : readOnly
                    ? 'border-gray-100 bg-gray-50'
                    : 'border-gray-200 focus-within:border-psycho-primary focus-within:ring-2 focus-within:ring-psycho-primary/10'
                }`}>
                {prefix && <span className="pl-3 pr-1 text-gray-400 text-sm select-none">{prefix}</span>}
                <input
                    id={id}
                    type={type}
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    placeholder={placeholder}
                    readOnly={readOnly}
                    className="w-full py-2.5 px-3 text-sm text-gray-800 bg-transparent border-none outline-none"
                />
            </div>
        )}
        <ErrorMsg msg={error} />
    </div>
);

const SectionHeading = ({ title }) => (
    <h2 className="text-base font-semibold text-gray-900 mt-8 mb-4 pb-2 border-b border-gray-100">{title}</h2>
);


const ImageCropModal = ({ src, onConfirm, onCancel }) => {
    const canvasRef = useRef(null);
    const imgRef = useRef(null);
    const [fitZoom, setFitZoom] = useState(1);
    const [zoomMult, setZoomMult] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [ready, setReady] = useState(false);

    const SIZE = 260;
    const zoom = fitZoom * zoomMult;

    const drawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const img = imgRef.current;
        if (!canvas || !img || !ready) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, SIZE, SIZE);
        ctx.save();
        ctx.beginPath();
        ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
        ctx.clip();
        const w = img.naturalWidth * zoom;
        const h = img.naturalHeight * zoom;
        ctx.drawImage(img, SIZE / 2 - w / 2 + offset.x, SIZE / 2 - h / 2 + offset.y, w, h);
        ctx.restore();
        ctx.beginPath();
        ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 1.5, 0, Math.PI * 2);
        ctx.strokeStyle = '#1188d8';
        ctx.lineWidth = 3;
        ctx.stroke();
    }, [zoom, offset, ready]);

    useEffect(() => { drawCanvas(); }, [drawCanvas]);

    const handleImageLoad = () => {
        const img = imgRef.current;
        if (!img) return;
        const cover = Math.max(SIZE / img.naturalWidth, SIZE / img.naturalHeight);
        setFitZoom(cover);
        setZoomMult(1);
        setOffset({ x: 0, y: 0 });
        setReady(true);
    };

    const handleMouseDown = (e) => { setDragging(true); setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y }); };
    const handleMouseMove = (e) => { if (!dragging) return; setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }); };
    const handleMouseUp = () => setDragging(false);
    const handleWheel = (e) => { e.preventDefault(); setZoomMult((prev) => Math.min(3, Math.max(0.8, prev - e.deltaY * 0.001))); };

    const handleConfirm = () => {
        canvasRef.current.toBlob((blob) => {
            const file = new File([blob], `profile_pic_${Date.now()}.png`, { type: 'image/png' });
            onConfirm(file, canvasRef.current.toDataURL());
        }, 'image/png', 0.92);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl p-6 flex flex-col items-center gap-5 w-[360px]">
                <div className="w-full flex items-center justify-between">
                    <h3 className="text-base font-semibold text-gray-900">Crop Profile Photo</h3>
                    <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer p-1">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                </div>
                <img ref={imgRef} src={src} alt="" className="hidden" onLoad={handleImageLoad} />
                <div className="relative overflow-hidden rounded-full select-none" style={{ width: SIZE, height: SIZE, cursor: dragging ? 'grabbing' : 'grab' }}
                    onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel}>
                    <canvas ref={canvasRef} width={SIZE} height={SIZE} />
                    {!ready && <div className="absolute inset-0 flex items-center justify-center bg-gray-100"><svg className="animate-spin text-psycho-primary" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg></div>}
                </div>
                <div className="w-full flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs text-gray-500"><span>Zoom</span><span>{Math.round(zoomMult * 100)}%</span></div>
                    <input type="range" min="0.8" max="3" step="0.01" value={zoomMult} onChange={(e) => setZoomMult(parseFloat(e.target.value))} className="w-full accent-psycho-primary cursor-pointer" />
                </div>
                <p className="text-xs text-gray-400 -mt-2">Drag to reposition · Scroll or slider to zoom</p>
                <div className="flex gap-3 w-full">
                    <button onClick={onCancel} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 font-medium cursor-pointer hover:bg-gray-50 transition-all bg-white">Cancel</button>
                    <button onClick={handleConfirm} disabled={!ready} className="flex-1 py-2.5 bg-psycho-primary text-white rounded-xl text-sm font-semibold cursor-pointer hover:bg-psycho-hover transition-all border-none disabled:opacity-50">Use Photo</button>
                </div>
            </div>
        </div>
    );
};


const AudioPlayer = ({ file, onRemove }) => {
    const audioRef = useRef(null);
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [url] = useState(() => URL.createObjectURL(file));

    const toggle = () => { const a = audioRef.current; if (!a) return; if (playing) { a.pause(); } else { a.play(); } setPlaying(!playing); };
    const fmt = (s) => { const m = Math.floor(s / 60); const sec = Math.floor(s % 60); return `${m}:${sec.toString().padStart(2, '0')}`; };

    return (
        <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mt-2">
            <audio ref={audioRef} src={url}
                onTimeUpdate={() => { const a = audioRef.current; if (a) setProgress(a.currentTime / (a.duration || 1) * 100); }}
                onLoadedMetadata={() => { if (audioRef.current) setDuration(audioRef.current.duration); }}
                onEnded={() => setPlaying(false)} />
            <button onClick={toggle} className="w-9 h-9 rounded-full bg-psycho-primary flex items-center justify-center flex-shrink-0 border-none cursor-pointer hover:bg-psycho-hover transition-all">
                {playing ? <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                    : <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3" /></svg>}
            </button>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-700 truncate mb-1.5">{file.name}</p>
                <div className="relative h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="absolute inset-y-0 left-0 bg-psycho-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
            </div>
            <span className="text-xs text-gray-400 flex-shrink-0">{fmt(duration)}</span>
            <button onClick={onRemove} className="text-gray-400 hover:text-red-500 bg-transparent border-none cursor-pointer p-1 transition-colors flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
        </div>
    );
};


const PsychologistApplication = () => {
    const navigate = useNavigate();
    const { user: authUser, updateUser } = useAuthStore();
    usePsychologistSessionGuard();

    const fileInputRef = useRef(null);
    const audioInputRef = useRef(null);
    const certInputRef = useRef(null);

    const [form, setForm] = useState({
        full_name: authUser?.full_name || '',
        phone_number: '',
        about: '',
        street_address: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India',
        job_title: '',
        years_of_experience: '',
        highest_education: '',
        consultation_fee: '',
    });

    const [touched, setTouched] = useState({});
    const [fieldErrors, setFieldErrors] = useState({});
    const [fileErrors, setFileErrors] = useState({});

    const [profilePic, setProfilePic] = useState(null);
    const [profilePicPreview, setProfilePicPreview] = useState(null);
    const [cropSrc, setCropSrc] = useState(null);
    const [audioIntro, setAudioIntro] = useState(null);
    const [certificateDoc, setCertificateDoc] = useState(null);
    const [selectedSpecs, setSelectedSpecs] = useState([]);

    const userEmail = authUser?.email || '';

    const { data: commissionRate } = useQuery({
        queryKey: ['current-commission-rate'],
        queryFn: fetchCurrentCommissionRate,
        staleTime: 5 * 60 * 1000,
    });

    const commissionPercentage = Number(commissionRate?.percentage ?? 10);
    const fee = parseFloat(form.consultation_fee) || 0;
    const commissionPreview = calculateCommissionPreview(fee, commissionPercentage);
    const commission = commissionPreview.commission;
    const earning = commissionPreview.payout;


    const { data: specializations = [], isLoading: specsLoading } = useQuery({
        queryKey: ['specializations'],
        queryFn: getSpecializations,
        staleTime: 5 * 60 * 1000,
    });


    const validateField = useCallback((key, value) => {
        const partial = { ...form, [key]: value };
        const result = appSchema.safeParse(partial);
        if (result.success) {
            setFieldErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
        } else {
            const errs = result.error.flatten().fieldErrors;
            if (errs[key]) {
                setFieldErrors((prev) => ({ ...prev, [key]: errs[key][0] }));
            } else {
                setFieldErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
            }
        }
    }, [form]);


    const validateAll = useCallback(() => {
        const result = appSchema.safeParse(form);
        if (result.success) { setFieldErrors({}); return true; }
        const errs = result.error.flatten().fieldErrors;
        const mapped = {};
        Object.entries(errs).forEach(([k, v]) => { if (v?.[0]) mapped[k] = v[0]; });
        setFieldErrors(mapped);
        return false;
    }, [form]);

    const handleField = (key) => (e) => {
        const value = e.target.value;
        setForm((prev) => ({ ...prev, [key]: value }));
        if (touched[key]) validateField(key, value);
    };

    const handleBlur = (key) => () => {
        setTouched((prev) => ({ ...prev, [key]: true }));
        validateField(key, form[key]);
    };


    const handleImageSelect = (file) => {
        if (!file) return;
        const err = validateFile(file, ALLOWED_IMAGE_TYPES, MAX_IMG_MB);
        if (err) { setFileErrors((prev) => ({ ...prev, profile_picture: err })); return; }
        setFileErrors((prev) => { const n = { ...prev }; delete n.profile_picture; return n; });
        const reader = new FileReader();
        reader.onload = (e) => setCropSrc(e.target.result);
        reader.readAsDataURL(file);
    };

    const handleCropConfirm = (file, preview) => {
        setProfilePic(file);
        setProfilePicPreview(preview);
        setCropSrc(null);
    };

    const handleAudioSelect = (file) => {
        if (!file) return;
        const err = validateFile(file, ALLOWED_AUDIO_TYPES, MAX_AUDIO_MB);
        if (err) { setFileErrors((prev) => ({ ...prev, audio_intro: err })); return; }
        setFileErrors((prev) => { const n = { ...prev }; delete n.audio_intro; return n; });
        setAudioIntro(file);
    };

    const handleCertSelect = (file) => {
        if (!file) return;
        const err = validateFile(file, ALLOWED_CERT_TYPES, MAX_CERT_MB);
        if (err) { setFileErrors((prev) => ({ ...prev, certificate_document: err })); return; }
        setFileErrors((prev) => { const n = { ...prev }; delete n.certificate_document; return n; });
        setCertificateDoc(file);
    };

    const toggleSpec = (id) => {
        setSelectedSpecs((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
        setFileErrors((prev) => {
            const next = { ...prev };
            delete next.specializations;
            return next;
        });
    };


    const submitMutation = useMutation({
        mutationFn: submitApplication,
        onSuccess: () => {
            updateUser({ full_name: form.full_name });
            navigate('/psychologist/approval-waiting');
        },
    });


    const filledCount = [
        form.full_name, form.phone_number, form.about,
        form.street_address, form.city, form.state, form.pincode,
        form.job_title, form.years_of_experience, form.highest_education, form.consultation_fee,
        profilePic, certificateDoc,
    ].filter(Boolean).length;
    const progress = Math.min(100, Math.round((filledCount / 13) * 100));


    const handleSubmit = (e) => {
        e.preventDefault();


        const allTouched = {};
        Object.keys(form).forEach((k) => { allTouched[k] = true; });
        setTouched(allTouched);

        const textValid = validateAll();

        const newFileErrors = {};
        if (!profilePic) newFileErrors.profile_picture = 'Profile photo is required';
        if (!audioIntro) newFileErrors.audio_intro = 'Audio introduction is required';
        if (!certificateDoc) newFileErrors.certificate_document = 'Qualification certificate (PDF) is required';
        if (Object.keys(newFileErrors).length) setFileErrors((prev) => ({ ...prev, ...newFileErrors }));

        if (!textValid || Object.keys(newFileErrors).length > 0) return;
        if (selectedSpecs.length === 0) { setFileErrors((prev) => ({ ...prev, specializations: 'Please select at least one specialization' })); return; }

        const data = new FormData();
        data.append('full_name', form.full_name);
        data.append('phone_number', form.phone_number);
        data.append('about', form.about);
        data.append('street_address', form.street_address);
        data.append('city', form.city);
        data.append('state', form.state);
        data.append('pincode', form.pincode);
        data.append('country', form.country);
        data.append('job_title', form.job_title);
        data.append('years_of_experience', form.years_of_experience);
        data.append('highest_education', form.highest_education);
        data.append('consultation_fee', form.consultation_fee);
        selectedSpecs.forEach((id) => data.append('specializations', id));
        if (profilePic) data.append('profile_picture', profilePic);
        if (audioIntro) data.append('audio_intro', audioIntro);
        if (certificateDoc) data.append('certificate_document', certificateDoc);

        submitMutation.mutate(data);
    };

    const submitting = submitMutation.isPending;
    const serverError = submitMutation.error ? formatSubmitError(submitMutation.error) : null;

    return (
        <div className="min-h-screen bg-[#eef0f5]">
            <PsychologistNavbar />

            {cropSrc && (
                <ImageCropModal src={cropSrc} onConfirm={handleCropConfirm} onCancel={() => setCropSrc(null)} />
            )}

            <div className="max-w-[680px] mx-auto px-4 py-10">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Complete Your Practitioner Profile</h1>
                    <p className="text-gray-500 text-sm mt-1">Join our network of certified professionals. Please fill out your details below.</p>
                </div>


                <div className="mb-8">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                        <span className="font-medium text-gray-600">Profile Completion</span>
                        <span className="text-psycho-primary font-semibold">{progress}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-psycho-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                    </div>
                </div>

                <form onSubmit={handleSubmit} noValidate className="bg-white border border-gray-100 rounded-2xl shadow-sm p-8 flex flex-col gap-5">

                    <SectionHeading title="Basic Information" />


                    <div>
                        <p className="text-sm font-medium text-gray-700 mb-3">Profile Photo <span className="text-red-400">*</span></p>
                        <div className="flex items-start gap-5">
                            <button type="button" onClick={() => fileInputRef.current?.click()}
                                className="w-20 h-20 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 hover:border-psycho-primary hover:bg-blue-50 transition-all overflow-hidden flex-shrink-0 cursor-pointer">
                                {profilePicPreview
                                    ? <img src={profilePicPreview} alt="Profile" className="w-full h-full object-cover" />
                                    : <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                }
                            </button>
                            <div className="pt-1">
                                <p className="text-xs text-gray-500 mb-2">JPEG or PNG only. Max {MAX_IMG_MB}MB. Professional headshot recommended.</p>
                                <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png" className="hidden"
                                    onChange={(e) => handleImageSelect(e.target.files[0])} />
                                <div className="flex items-center gap-3">
                                    <button type="button" onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center gap-1.5 text-xs text-psycho-primary font-medium cursor-pointer hover:underline bg-transparent border-none p-0">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                        Upload Image
                                    </button>
                                    {profilePicPreview && (
                                        <button type="button" onClick={() => { setProfilePic(null); setProfilePicPreview(null); }}
                                            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 cursor-pointer bg-transparent border-none p-0">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                            Remove
                                        </button>
                                    )}
                                </div>
                                <ErrorMsg msg={fileErrors.profile_picture} />
                            </div>
                        </div>
                    </div>


                    <div>
                        <p className="text-sm font-medium text-gray-700 mb-1.5">Audio Introduction<span className="text-red-400 ml-0.5">*</span></p>
                        <p className="text-xs text-gray-500 mb-2">30–60 second intro about your practice (MP3, M4A, WAV, OGG, max {MAX_AUDIO_MB}MB)</p>
                        <input ref={audioInputRef} type="file" accept="audio/*" className="hidden"
                            onChange={(e) => handleAudioSelect(e.target.files[0])} />
                        {!audioIntro ? (
                            <button type="button" onClick={() => audioInputRef.current?.click()}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all cursor-pointer ${fileErrors.audio_intro ? 'border-red-300 bg-red-50 text-red-500' : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-psycho-primary/50 hover:bg-blue-50 hover:text-psycho-primary'}`}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                Upload Audio
                            </button>
                        ) : (
                            <AudioPlayer file={audioIntro} onRemove={() => { setAudioIntro(null); setFileErrors((prev) => { const n = { ...prev }; delete n.audio_intro; return n; }); }} />
                        )}
                        <ErrorMsg msg={fileErrors.audio_intro} />
                    </div>


                    <InputField label="Full Name" id="full_name" value={form.full_name} onChange={handleField('full_name')} onBlur={handleBlur('full_name')}
                        placeholder="Dr. Jane Doe" required error={fieldErrors.full_name} />


                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-gray-700">Email Address</label>
                        <div className="flex items-center border border-gray-100 rounded-xl bg-gray-50 px-3 py-2.5 gap-2">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
                            </svg>
                            <span className="text-sm text-gray-500 truncate">{userEmail}</span>
                        </div>
                    </div>


                    <InputField label="Mobile Number" id="phone" value={form.phone_number} onChange={handleField('phone_number')} onBlur={handleBlur('phone_number')}
                        placeholder="98765 43210" required prefix="+91" error={fieldErrors.phone_number} />


                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="about" className="text-sm font-medium text-gray-700">About You<span className="text-red-400 ml-0.5">*</span></label>
                        <textarea id="about" rows={4} value={form.about} onChange={handleField('about')} onBlur={handleBlur('about')}
                            placeholder="Tell patients about your approach, philosophy, and what makes your practice unique... (min 50 characters)"
                            className={`w-full py-2.5 px-3 text-sm text-gray-800 border rounded-xl bg-white outline-none resize-none transition-all ${fieldErrors.about ? 'border-red-300 ring-2 ring-red-100' : 'border-gray-200 focus:border-psycho-primary focus:ring-2 focus:ring-psycho-primary/10'}`} />
                        <div className="flex items-center justify-between">
                            <ErrorMsg msg={fieldErrors.about} />
                            <span className={`text-xs ml-auto ${form.about.length < 50 ? 'text-gray-400' : 'text-green-500'}`}>{form.about.length}/2000</span>
                        </div>
                    </div>

                    <SectionHeading title="Clinic / Office Address" />

                    <InputField label="Street Address" id="street" value={form.street_address} onChange={handleField('street_address')} onBlur={handleBlur('street_address')}
                        placeholder="123 Wellness Blvd, Suite 404" required error={fieldErrors.street_address} />

                    <div className="grid grid-cols-2 gap-4">
                        <InputField label="City" id="city" value={form.city} onChange={handleField('city')} onBlur={handleBlur('city')}
                            placeholder="Mumbai" required error={fieldErrors.city} />
                        <InputField label="State" id="state" value={form.state} onChange={handleField('state')} onBlur={handleBlur('state')}
                            placeholder="Maharashtra" required error={fieldErrors.state} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <InputField label="Zip / Postal Code" id="pincode" value={form.pincode} onChange={handleField('pincode')} onBlur={handleBlur('pincode')}
                            placeholder="400001" required error={fieldErrors.pincode} />
                        <InputField label="Country" id="country" value={form.country} onChange={handleField('country')} required error={fieldErrors.country}>
                            <select id="country" value={form.country} onChange={handleField('country')} onBlur={handleBlur('country')}
                                className={`w-full py-2.5 px-3 text-sm text-gray-800 border rounded-xl bg-white outline-none transition-all appearance-none cursor-pointer ${fieldErrors.country ? 'border-red-300' : 'border-gray-200 focus:border-psycho-primary'}`}>
                                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </InputField>
                    </div>

                    <SectionHeading title="Professional Profile" />

                    <div className="grid grid-cols-2 gap-4">
                        <InputField label="Job Title" id="job_title" value={form.job_title} onChange={handleField('job_title')} onBlur={handleBlur('job_title')}
                            placeholder="Clinical Psychologist" required error={fieldErrors.job_title} />
                        <InputField label="Experience (Years)" id="exp" type="number" value={form.years_of_experience} onChange={handleField('years_of_experience')} onBlur={handleBlur('years_of_experience')}
                            placeholder="e.g. 8" required error={fieldErrors.years_of_experience} />
                    </div>

                    <InputField label="Highest Qualification" id="edu" value={form.highest_education} onChange={handleField('highest_education')} onBlur={handleBlur('highest_education')}
                        placeholder="Ph.D. in Clinical Psychology" required error={fieldErrors.highest_education} />


                    <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Specializations<span className="text-red-400 ml-0.5">*</span></p>
                        {specsLoading ? (
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                                Loading specializations…
                            </div>
                        ) : specializations.length === 0 ? (
                            <p className="text-xs text-gray-400">No specializations available.</p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {specializations.map((spec) => (
                                    <button key={spec.id} type="button" onClick={() => toggleSpec(spec.id)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${selectedSpecs.includes(spec.id) ? 'bg-psycho-primary text-white border-psycho-primary' : 'bg-white text-gray-600 border-gray-200 hover:border-psycho-primary/50 hover:text-psycho-primary'}`}>
                                        {spec.name}{selectedSpecs.includes(spec.id) && <span className="ml-1 opacity-70">×</span>}
                                    </button>
                                ))}
                            </div>
                        )}
                        <ErrorMsg msg={fileErrors.specializations} />
                        <p className="text-xs text-gray-400 mt-2">Select multiple specializations to help patients find you.</p>
                    </div>


                    <div>
                        <p className="text-sm font-medium text-gray-700 mb-1.5">Qualification Certificate<span className="text-red-400 ml-0.5">*</span></p>
                        <p className="text-xs text-gray-500 mb-2">PDF only, max {MAX_CERT_MB}MB</p>
                        <input ref={certInputRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={(e) => handleCertSelect(e.target.files[0])} />
                        <button type="button" onClick={() => certInputRef.current?.click()}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all cursor-pointer ${certificateDoc ? 'border-green-300 bg-green-50 text-green-700' : fileErrors.certificate_document ? 'border-red-300 bg-red-50 text-red-500' : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-psycho-primary/50 hover:bg-blue-50 hover:text-psycho-primary'}`}>
                            {certificateDoc ? (
                                <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>{certificateDoc.name}</>
                            ) : (
                                <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>Choose PDF File</>
                            )}
                        </button>
                        <ErrorMsg msg={fileErrors.certificate_document} />
                    </div>

                    <SectionHeading title="Consultation Fee & Earnings" />

                    <div className="grid grid-cols-2 gap-6 items-start">
                        <div>
                            <InputField label="Your Fee per Session (₹)" id="fee" type="number" value={form.consultation_fee} onChange={handleField('consultation_fee')} onBlur={handleBlur('consultation_fee')}
                                placeholder="e.g. 1500" required error={fieldErrors.consultation_fee} />
                            <p className="text-xs text-gray-400 mt-1.5">Set your own rates. We believe in transparency.</p>
                        </div>
                        <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex flex-col gap-2 text-sm">
                            <div className="flex justify-between text-gray-500">
                                <span>Platform Commission ({commissionPercentage.toFixed(2)}%)</span>
                                <span className="text-red-400">-₹{commission.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-200 pt-2 mt-1">
                                <span>Your Estimated Earning</span>
                                <span className="text-psycho-primary">₹{earning.toLocaleString('en-IN')} <span className="text-xs font-normal text-gray-500">/ session</span></span>
                            </div>
                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                                We don't charge patients extra.
                            </p>
                        </div>
                    </div>

                    {serverError && (
                        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{serverError}</div>
                    )}

                    <button type="submit" disabled={submitting}
                        className="w-full flex items-center justify-center gap-2 py-3.5 bg-psycho-primary text-white font-semibold text-sm rounded-xl border-none cursor-pointer transition-all hover:bg-psycho-hover disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_4px_16px_rgba(17,136,216,0.3)] mt-2">
                        {submitting ? (
                            <><svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>Submitting...</>
                        ) : (
                            <>Submit Profile for Verification<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg></>
                        )}
                    </button>

                    <p className="text-center text-xs text-gray-400">
                        By submitting, you agree to our{' '}
                        <a href="#" className="text-psycho-primary hover:underline">Terms of Service</a>{' '}and{' '}
                        <a href="#" className="text-psycho-primary hover:underline">Privacy Policy</a>
                    </p>
                </form>
            </div>
        </div>
    );
};

export default PsychologistApplication;

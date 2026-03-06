import React, { useEffect, useRef, useState } from 'react';
import PsychologistNavbar from '../../../components/psychologist/Navbar/PsychologistNavbar';
import { getMyApplication } from '../../../api/psychologist.api';

const BASE_URL = 'http://localhost:8000';

const mediaUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

const STEPS = [
    {
        key: 'SUBMITTED', label: 'Application\nSubmitted', icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
        )
    },
    {
        key: 'INTERVIEW_SCHEDULED', label: 'Interview\nScheduled', icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
        )
    },
    {
        key: 'INTERVIEW_COMPLETED', label: 'Interview\nCompleted', icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
        )
    },
    {
        key: 'APPROVED', label: 'Approved', icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><polyline points="23 11 17 11 17 17" />
            </svg>
        )
    },
];

const getStepIndex = (status) => {
    if (!status || status === 'SUBMITTED') return 0;
    if (status === 'INTERVIEW_SCHEDULED') return 1;
    if (status === 'INTERVIEW_COMPLETED') return 2;
    if (status === 'APPROVED') return 3;
    return 0;
};

const UrlAudioPlayer = ({ url }) => {
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
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5">
            <audio
                ref={audioRef}
                src={url}
                onTimeUpdate={() => { const a = audioRef.current; if (a) setProgress(a.currentTime / (a.duration || 1) * 100); }}
                onLoadedMetadata={() => { if (audioRef.current) setDuration(audioRef.current.duration); }}
                onEnded={() => setPlaying(false)}
            />
            <button
                onClick={toggle}
                className="w-8 h-8 rounded-full bg-psycho-primary flex items-center justify-center flex-shrink-0 border-none cursor-pointer hover:bg-psycho-hover transition-all"
            >
                {playing
                    ? <svg width="11" height="11" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                    : <svg width="11" height="11" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                }
            </button>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-600 mb-1.5">Intro Audio</p>
                <div className="relative h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div className="absolute inset-y-0 left-0 bg-psycho-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
            </div>
            {duration > 0 && <span className="text-xs text-gray-400 flex-shrink-0">{fmt(duration)}</span>}
        </div>
    );
};

const fmtDateTime = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }) +
        ' at ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }).toUpperCase();
};

const PsychologistApprovalWaiting = () => {
    const [application, setApplication] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getMyApplication()
            .then((data) => setApplication(data))
            .catch(() => setApplication(null))
            .finally(() => setLoading(false));
    }, []);

    const status = application?.status || 'SUBMITTED';
    const isRejected = status === 'REJECTED';
    const currentStep = getStepIndex(status);

    const fullName = application?.full_name || 'Dr. —';
    const email = application?.email || '—';
    const fee = application?.consultation_fee ? `₹${parseFloat(application.consultation_fee).toLocaleString('en-IN')}` : '—';
    const earning = application?.consultation_fee
        ? `₹${Math.round(parseFloat(application.consultation_fee) * 0.90).toLocaleString('en-IN')}`
        : '—';

    const address = [application?.street_address, application?.city, application?.state, application?.pincode]
        .filter(Boolean).join(', ');

    const profileImgUrl = mediaUrl(application?.profile_picture);
    const audioUrl = mediaUrl(application?.audio_intro);
    const specs = application?.specializations || [];

    return (
        <div className="min-h-screen bg-[#eef0f5]">
            <PsychologistNavbar />

            <div className="max-w-[760px] mx-auto px-4 py-10">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Verification Status</h1>
                    <p className="text-gray-500 text-sm mt-1">Track the approval progress of your practitioner profile.</p>
                </div>

                {/* Step tracker — hidden when rejected */}
                {!isRejected && (
                    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 mb-5">
                        <div className="flex items-start justify-between relative">
                            <div className="absolute top-[22px] left-[40px] right-[40px] h-0.5 bg-gray-100 z-0" />
                            {STEPS.map((step, idx) => {
                                const done = idx < currentStep;
                                const active = idx === currentStep;
                                return (
                                    <div key={step.key} className="flex flex-col items-center z-10 flex-1">
                                        <div className={`w-11 h-11 rounded-full flex items-center justify-center border-2 transition-all ${done ? 'bg-psycho-primary border-psycho-primary text-white'
                                            : active ? 'bg-psycho-primary border-psycho-primary text-white shadow-[0_0_0_4px_rgba(17,136,216,0.15)]'
                                                : 'bg-white border-gray-200 text-gray-400'
                                            }`}>
                                            {done ? (
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                            ) : step.icon}
                                        </div>
                                        <p className={`text-[10px] font-medium mt-2 text-center leading-tight whitespace-pre-line ${done || active ? 'text-psycho-primary' : 'text-gray-400'}`}>
                                            {step.label}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Rejected state card */}
                {!loading && isRejected && (
                    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 mb-5 border-l-4 border-l-red-400">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-500 flex-shrink-0">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                    <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <h3 className="text-base font-semibold text-gray-900">Application Not Approved</h3>
                                    <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full border bg-red-50 text-red-600 border-red-200">Rejected</span>
                                </div>
                                <p className="text-sm text-gray-500 leading-relaxed">
                                    Unfortunately, your application was not approved at this time.
                                </p>
                                {application?.admin_notes && (
                                    <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-xl">
                                        <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-1">Reason</p>
                                        <p className="text-sm text-gray-700 leading-relaxed">{application.admin_notes}</p>
                                    </div>
                                )}
                                <p className="text-xs text-gray-400 mt-3">
                                    Please contact <a href="mailto:support@koode.in" className="text-psycho-primary hover:underline">support@koode.in</a> for further information.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Submitted — pending review card */}
                {!loading && status === 'SUBMITTED' && (
                    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 mb-5 border-l-4 border-l-psycho-primary">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-psycho-primary flex-shrink-0">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <h3 className="text-base font-semibold text-gray-900">Application Under Review</h3>
                                    <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full border bg-blue-50 text-psycho-primary border-blue-200">In Progress</span>
                                </div>
                                <p className="text-sm text-gray-500 leading-relaxed">
                                    Your application has been received and is currently being reviewed by our team. We'll notify you once a decision has been made.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Interview scheduled card — styled from Figma */}
                {!loading && status === 'INTERVIEW_SCHEDULED' && (
                    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 mb-5 border-l-4 border-l-psycho-primary">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-psycho-primary flex-shrink-0">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <h3 className="text-base font-semibold text-gray-900">Interview Scheduled</h3>
                                    <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">Action Required</span>
                                </div>
                                <p className="text-sm text-gray-500 leading-relaxed mb-3">
                                    Your clinical interview has been scheduled. Please be prepared with your credentials and case study materials. The interview link will be active 10 minutes before the scheduled time.
                                </p>
                                {application?.interview_date && (
                                    <div className="flex items-center gap-2 mb-4 text-sm text-gray-700 font-medium">
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-psycho-primary">
                                            <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                                        </svg>
                                        {fmtDateTime(application.interview_date)}
                                    </div>
                                )}
                                <button className="flex items-center gap-2 px-4 py-2 bg-psycho-primary text-white text-sm font-medium rounded-xl border-none cursor-pointer hover:bg-psycho-hover transition-all">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" />
                                    </svg>
                                    View Interview Details
                                </button>
                                <p className="text-xs text-gray-400 flex items-center gap-1 mt-3">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </svg>
                                    All interviews are conducted securely within our platform.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Profile summary */}
                {!loading && application && (
                    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-base font-semibold text-gray-900">Profile Summary</h3>
                            <span className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-full">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                                Read Only
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                            <div>
                                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Full Name</p>
                                <div className="flex items-center gap-3">
                                    {profileImgUrl ? (
                                        <img
                                            src={profileImgUrl}
                                            alt={fullName}
                                            className="w-10 h-10 rounded-full object-cover border border-gray-200 flex-shrink-0"
                                            onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-psycho-primary/10 border border-psycho-primary/20 flex items-center justify-center text-psycho-primary font-bold text-sm flex-shrink-0">
                                            {fullName.charAt(0)}
                                        </div>
                                    )}
                                    <span className="text-sm font-semibold text-gray-900">{fullName}</span>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Audio Introduction</p>
                                {audioUrl ? (
                                    <UrlAudioPlayer url={audioUrl} />
                                ) : (
                                    <span className="text-sm text-gray-400">Not uploaded</span>
                                )}
                            </div>

                            <div>
                                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Job Title</p>
                                <p className="text-sm text-gray-700">{application.job_title || '—'}</p>
                            </div>

                            <div>
                                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Contact Information</p>
                                <p className="text-sm text-gray-700">{email}</p>
                                {application.phone_number && <p className="text-sm text-gray-700">+91 {application.phone_number}</p>}
                            </div>

                            <div>
                                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Highest Qualification</p>
                                <p className="text-sm text-gray-700">{application.highest_education || '—'}</p>
                            </div>

                            <div>
                                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Clinic Address</p>
                                <p className="text-sm text-gray-700">{address || '—'}</p>
                            </div>

                            <div>
                                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Experience</p>
                                <p className="text-sm text-gray-700">
                                    {application.years_of_experience ? `${application.years_of_experience} Years` : '—'}
                                </p>
                            </div>

                            <div>
                                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Specializations</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {specs.length > 0
                                        ? specs.map((s) => (
                                            <span
                                                key={s.id ?? s}
                                                className="text-xs bg-blue-50 text-psycho-primary border border-blue-100 px-2.5 py-1 rounded-full"
                                            >
                                                {s.name ?? s}
                                            </span>
                                        ))
                                        : <span className="text-sm text-gray-400">—</span>
                                    }
                                </div>
                            </div>

                            {application.about && (
                                <div className="col-span-2">
                                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">About</p>
                                    <p className="text-sm text-gray-700 leading-relaxed">{application.about}</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-5 py-3.5">
                            <div>
                                <p className="text-xs text-gray-400 mb-0.5">Consultation Fee</p>
                                <p className="text-base font-bold text-gray-900">{fee} <span className="text-xs font-normal text-gray-400">/ session</span></p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-400 mb-0.5">Your Earning (90%)</p>
                                <p className="text-base font-bold text-psycho-primary">{earning} <span className="text-xs font-normal text-gray-400">/ session</span></p>
                            </div>
                        </div>

                        <div className="mt-6 pt-5 border-t border-gray-100 flex justify-between items-center">
                            <p className="text-sm text-gray-500">Need to update your contact details?</p>
                            <a href="mailto:support@koode.in" className="text-sm text-psycho-primary font-medium flex items-center gap-1 hover:underline">
                                Contact Support
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                                </svg>
                            </a>
                        </div>
                    </div>
                )}

                {loading && (
                    <div className="flex items-center justify-center py-16">
                        <div className="flex flex-col items-center gap-3">
                            <svg className="animate-spin text-psycho-primary" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                            </svg>
                            <p className="text-sm text-gray-400">Loading your profile…</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PsychologistApprovalWaiting;

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PsychologistNavbar from '../../../components/psychologist/Navbar/PsychologistNavbar';
import { getMyApplication, getApplicationStatus, requestJoin, getJoinStatus } from '../../../api/psychologist.api';
import { usePsychologistSessionGuard } from '../../../hooks/usePsychologistSessionGuard';

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

const getStepIndex = (status, interviewStatus) => {
    if (status === 'APPROVED') return 3;
    if (interviewStatus === 'COMPLETED') return 2;
    if (status === 'INTERVIEW_COMPLETED') return 2;
    if (status === 'INTERVIEW_SCHEDULED' || interviewStatus === 'SCHEDULED' || interviewStatus === 'WAITING' || interviewStatus === 'ONGOING') return 1;
    if (!status || status === 'SUBMITTED') return 0;
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

const fmtDateOnly = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
};

const fmtTimeOnly = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }).toUpperCase() + ' (IST)';
};

const fmtCountdown = (ms) => {
    if (ms <= 0) return '00:00';
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const isWithin5Minutes = (interviewDate) => {
    if (!interviewDate) return false;
    const remaining = new Date(interviewDate) - Date.now();
    return remaining <= 5 * 60 * 1000;
};


function InterviewDetailsModal({ interviewDate, onClose, onEnterWaiting }) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-[420px] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 pt-6 pb-2">
                    <h2 className="text-lg font-bold text-gray-900">Interview Details</h2>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 border-none cursor-pointer hover:bg-gray-200 transition-all text-gray-500">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                </div>

                <div className="px-6 pb-6">
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-5 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-psycho-primary/10 border border-psycho-primary/20 flex items-center justify-center text-psycho-primary flex-shrink-0">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-psycho-primary">Interview Scheduled</p>
                            <p className="text-xs text-blue-500/80">Video call details below</p>
                        </div>
                    </div>

                    <div className="space-y-4 mb-5">
                        <div className="flex items-start gap-3">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 mt-0.5 flex-shrink-0">
                                <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            <div>
                                <p className="text-xs text-gray-400 mb-0.5">Date</p>
                                <p className="text-sm font-medium text-gray-800">{fmtDateOnly(interviewDate)}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 mt-0.5 flex-shrink-0">
                                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                            </svg>
                            <div>
                                <p className="text-xs text-gray-400 mb-0.5">Time</p>
                                <p className="text-sm font-medium text-gray-800">{fmtTimeOnly(interviewDate)}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 mt-0.5 flex-shrink-0">
                                <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" />
                            </svg>
                            <div>
                                <p className="text-xs text-gray-400 mb-0.5">Mode</p>
                                <p className="text-sm font-medium text-gray-800">Secure In-Platform Video Call</p>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 pt-4">
                        <p className="text-sm font-semibold text-gray-800 mb-3">Instructions</p>
                        <ul className="space-y-2.5">
                            {
                                [
                                    {
                                        icon: (
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1188d8" strokeWidth="2" className="flex-shrink-0 mt-0.5">
                                                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                                            </svg>
                                        ),
                                        text: 'Please be available 5 minutes before the scheduled time.',
                                    },
                                    {
                                        icon: (
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1188d8" strokeWidth="2" className="flex-shrink-0 mt-0.5">
                                                <path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><circle cx="12" cy="20" r="1" fill="#1188d8" />
                                            </svg>
                                        ),
                                        text: 'Ensure you have a stable internet connection and a working camera/microphone.',
                                    },
                                    {
                                        icon: (
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1188d8" strokeWidth="2" className="flex-shrink-0 mt-0.5">
                                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                                            </svg>
                                        ),
                                        text: 'The interview will be conducted by our Senior Clinical Reviewer.',
                                    },
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                                        {item.icon}
                                        <span>{item.text}</span>
                                    </li>
                                ))
                            }
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}


function WaitingRoomModal({ interviewDate, interviewId, onClose, onEnterRoom, navigate, profileImgUrl, nameInitial }) {
    const scheduledAt = interviewDate ? new Date(interviewDate) : null;
    const [countdown, setCountdown] = useState(0);
    const [canJoin, setCanJoin] = useState(false);
    const [micOn, setMicOn] = useState(true);
    const [camOn, setCamOn] = useState(true);
    const [joinRequested, setJoinRequested] = useState(false);
    const [waitingForAdmin, setWaitingForAdmin] = useState(false);
    const [error, setError] = useState(null);

    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const pollRef = useRef(null);
    const timerRef = useRef(null);

    useEffect(() => {
        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.warn('Camera access denied:', err);
            }
        };
        startCamera();

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }
            clearInterval(pollRef.current);
            clearInterval(timerRef.current);
        };
    }, []);

    useEffect(() => {
        const update = () => {
            if (!scheduledAt) return;
            const remaining = scheduledAt - Date.now();
            setCountdown(Math.max(0, remaining));
            setCanJoin(Date.now() >= scheduledAt.getTime());
        };
        update();
        timerRef.current = setInterval(update, 1000);
        return () => clearInterval(timerRef.current);
    }, [scheduledAt]);

    const applyStream = (s) => {
        streamRef.current = s;
        if (videoRef.current) videoRef.current.srcObject = s;
    };

    const toggleMic = () => {
        if (micOn) {
            if (streamRef.current) {
                streamRef.current.getAudioTracks().forEach(t => t.stop());
            }
            setMicOn(false);
        } else {
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then((audioStream) => {
                    const audioTrack = audioStream.getAudioTracks()[0];
                    if (!audioTrack) return;
                    const liveVideoTracks = streamRef.current
                        ? streamRef.current.getVideoTracks().filter(t => t.readyState === 'live')
                        : [];
                    applyStream(new MediaStream([audioTrack, ...liveVideoTracks]));
                    setMicOn(true);
                })
                .catch(() => {});
        }
    };

    const toggleCam = () => {
        if (camOn) {
            if (streamRef.current) {
                streamRef.current.getVideoTracks().forEach(t => t.stop());
            }
            setCamOn(false);
        } else {
            navigator.mediaDevices.getUserMedia({ video: true })
                .then((videoStream) => {
                    const videoTrack = videoStream.getVideoTracks()[0];
                    if (!videoTrack) return;
                    const liveAudioTracks = streamRef.current
                        ? streamRef.current.getAudioTracks().filter(t => t.readyState === 'live')
                        : [];
                    applyStream(new MediaStream([videoTrack, ...liveAudioTracks]));
                    setCamOn(true);
                })
                .catch(() => {});
        }
    };

    const handleJoinClick = useCallback(async () => {
        if (!canJoin || joinRequested || waitingForAdmin) return;
        try {
            setJoinRequested(true);
            await requestJoin(interviewId);
            setWaitingForAdmin(true);

            pollRef.current = setInterval(async () => {
                try {
                    const data = await getJoinStatus(interviewId);
                    if (data.approved) {
                        clearInterval(pollRef.current);
                        if (streamRef.current) {
                            streamRef.current.getTracks().forEach(t => t.stop());
                            streamRef.current = null;
                            await new Promise(r => setTimeout(r, 800));
                        }
                        // Persist mic/cam state so InterviewRoom can pick it up
                        sessionStorage.setItem('interview_micOn', micOn ? '1' : '0');
                        sessionStorage.setItem('interview_camOn', camOn ? '1' : '0');
                        onEnterRoom();
                    }
                } catch (e) {
                    console.error('Poll error:', e);
                }
            }, 3000);
        } catch (err) {
            setError('Failed to send join request. Please try again.');
            setJoinRequested(false);
        }
    }, [canJoin, joinRequested, waitingForAdmin, interviewId, navigate]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[440px] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 pt-5 pb-1">
                    <h2 className="text-base font-bold text-gray-900">Interview Waiting Room</h2>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1 rounded-full">
                            Waiting Room
                        </span>
                        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 border-none cursor-pointer hover:bg-gray-200 transition-all text-gray-500">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                    </div>
                </div>

                <div className="px-6 pb-6">
                    <div className="text-center py-3">
                        <p className="text-xs text-gray-400 mb-1">Interview Starts In</p>
                        <p className="text-4xl font-bold text-psycho-primary font-mono tracking-wide">{fmtCountdown(countdown)}</p>
                    </div>

                    <div className="relative rounded-xl overflow-hidden bg-gray-900 mb-4" style={{ aspectRatio: '4/3' }}>
                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                        />
                        {/* Camera-off overlay: show profile image or avatar */}
                        {!camOn && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
                                {profileImgUrl ? (
                                    <img
                                        src={profileImgUrl}
                                        alt="Profile"
                                        className="w-20 h-20 rounded-full object-cover border-2 border-psycho-primary/40"
                                    />
                                ) : (
                                    <div className="w-20 h-20 rounded-full bg-psycho-primary/10 border-2 border-psycho-primary/30 flex items-center justify-center">
                                        <span className="text-3xl font-bold text-psycho-primary">{nameInitial || '?'}</span>
                                    </div>
                                )}
                                <p className="text-xs text-gray-400 mt-3">Camera is off</p>
                            </div>
                        )}
                        <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-3">
                            <button
                                onClick={toggleMic}
                                className={`w-11 h-11 rounded-full flex items-center justify-center border-2 cursor-pointer transition-all ${micOn ? 'bg-white/90 border-white/50 text-gray-700' : 'bg-red-500 border-red-400 text-white'}`}
                            >
                                {micOn
                                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
                                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="1" y1="1" x2="23" y2="23" /><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" /><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
                                }
                            </button>
                            <button
                                onClick={toggleCam}
                                className={`w-11 h-11 rounded-full flex items-center justify-center border-2 cursor-pointer transition-all ${camOn ? 'bg-white/90 border-white/50 text-gray-700' : 'bg-red-500 border-red-400 text-white'}`}
                            >
                                {camOn
                                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>
                                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="1" y1="1" x2="23" y2="23" /><path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3" /><path d="M10.66 6H14a2 2 0 0 1 2 2S23 7 23 17" /></svg>
                                }
                            </button>
                        </div>
                    </div>

                    <div className="mb-4">
                        <p className="text-xs font-semibold text-gray-700 mb-2">Preparation Checklist</p>
                        <ul className="space-y-1.5">
                            {
                                [
                                    {
                                        icon: (
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1188d8" strokeWidth="2" className="flex-shrink-0 mt-0.5">
                                                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                                            </svg>
                                        ),
                                        text: 'Please remain on this screen until the timer finishes.',
                                    },
                                    {
                                        icon: (
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1188d8" strokeWidth="2" className="flex-shrink-0 mt-0.5">
                                                <path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><circle cx="12" cy="20" r="1" fill="#1188d8" />
                                            </svg>
                                        ),
                                        text: 'Ensure you have a stable internet connection and a quiet environment.',
                                    },
                                    {
                                        icon: (
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1188d8" strokeWidth="2" className="flex-shrink-0 mt-0.5">
                                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                                            </svg>
                                        ),
                                        text: 'The interview will be conducted by our Senior Clinical Reviewer.',
                                    },
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-2 text-xs text-gray-500">
                                        {item.icon}
                                        <span>{item.text}</span>
                                    </li>
                                ))
                            }
                        </ul>
                    </div>

                    {error && (
                        <p className="text-xs text-red-500 text-center mb-3 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
                    )}

                    {waitingForAdmin ? (
                        <div className="w-full flex flex-col items-center justify-center gap-2 py-3 bg-amber-50 border border-amber-200 rounded-xl">
                            <div className="flex items-center gap-2">
                                <svg className="animate-spin text-amber-600" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                </svg>
                                <span className="text-sm font-semibold text-amber-700">Waiting for admin to admit you…</span>
                            </div>
                            <p className="text-xs text-amber-600">Please stay on this screen</p>
                        </div>
                    ) : (
                        <button
                            onClick={handleJoinClick}
                            disabled={!canJoin}
                            className={`w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-sm font-bold border-none transition-all ${canJoin
                                ? 'bg-psycho-primary hover:bg-psycho-hover text-white cursor-pointer shadow-[0_4px_14px_rgba(17,136,216,0.3)]'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
                            </svg>
                            Join Interview Room
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}


const PsychologistApprovalWaiting = () => {
    const navigate = useNavigate();
    usePsychologistSessionGuard();
    const [application, setApplication] = useState(null);
    const [loading, setLoading] = useState(true);
    const [interviewId, setInterviewId] = useState(null);
    const [showInterviewDetails, setShowInterviewDetails] = useState(false);
    const [showWaitingRoom, setShowWaitingRoom] = useState(false);
    const [interviewStatus, setInterviewStatus] = useState(null);

    useEffect(() => {
        Promise.all([
            getMyApplication(),
            getApplicationStatus(),
        ])
            .then(([appData, statusData]) => {
                setApplication(appData);
                if (statusData?.interview_id) {
                    setInterviewId(statusData.interview_id);
                }
                if (statusData?.interview_status) {
                    setInterviewStatus(statusData.interview_status);
                } else if (appData?.interview_status) {
                    setInterviewStatus(appData.interview_status);
                }
            })
            .catch(() => setApplication(null))
            .finally(() => setLoading(false));
    }, []);

    const status = application?.status || 'SUBMITTED';
    const isRejected = status === 'REJECTED';
    const currentStep = getStepIndex(status, interviewStatus);

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

    const interviewStatuses = ['INTERVIEW_SCHEDULED', 'WAITING', 'ONGOING'];
    const showInterviewOption = interviewStatuses.includes(status) && interviewId && interviewStatus !== 'COMPLETED';
    const interviewCompleted = interviewStatus === 'COMPLETED' && !['APPROVED', 'REJECTED'].includes(status);

    return (
        <div className="min-h-screen bg-[#eef0f5]">
            <PsychologistNavbar />

            <div className="max-w-[760px] mx-auto px-4 py-10">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Verification Status</h1>
                    <p className="text-gray-500 text-sm mt-1">Track the approval progress of your practitioner profile.</p>
                </div>

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

                {!loading && showInterviewOption && (
                    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 mb-5 border-l-4 border-l-psycho-primary">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-psycho-primary flex-shrink-0">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <h3 className="text-base font-semibold text-gray-900">
                                        {interviewStatus === 'ONGOING' ? 'Interview In Progress' : 'Interview Scheduled'}
                                    </h3>
                                    <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${interviewStatus === 'ONGOING'
                                        ? 'bg-green-50 text-green-700 border-green-200'
                                        : 'bg-amber-50 text-amber-700 border-amber-200'
                                        }`}>
                                        {interviewStatus === 'ONGOING' ? 'Live Now' : 'Action Required'}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500 leading-relaxed mb-3">
                                    {interviewStatus === 'ONGOING'
                                        ? 'Your interview is currently in progress. You can rejoin if you were disconnected.'
                                        : 'Your clinical interview has been scheduled. Please be prepared with your credentials and case study materials. The interview link will be active 5 minutes before the scheduled time.'
                                    }
                                </p>
                                {application?.interview_date && (
                                    <div className="flex items-center gap-2 mb-4 text-sm text-gray-700 font-medium">
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-psycho-primary">
                                            <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                                        </svg>
                                        {fmtDateTime(application.interview_date)}
                                    </div>
                                )}
                                <button
                                    onClick={() => {
                                        if (isWithin5Minutes(application?.interview_date)) {
                                            setShowWaitingRoom(true);
                                        } else {
                                            setShowInterviewDetails(true);
                                        }
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-psycho-primary text-white text-sm font-medium rounded-xl border-none cursor-pointer hover:bg-psycho-hover transition-all">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" />
                                    </svg>
                                    {interviewStatus === 'ONGOING' ? 'Rejoin Interview' : 'View Interview Details'}
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

                {/* Interview completed — awaiting admin decision */}
                {!loading && interviewCompleted && (
                    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 mb-5 border-l-4 border-l-purple-400">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-500 flex-shrink-0">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                    <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <h3 className="text-base font-semibold text-gray-900">Interview Completed</h3>
                                    <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full border bg-purple-50 text-purple-600 border-purple-200">
                                        Awaiting Decision
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500 leading-relaxed">
                                    Your clinical interview has been completed successfully. Our team is currently reviewing the session and will make a decision shortly. You'll be notified once a decision has been made.
                                </p>
                                {application?.interview_date && (
                                    <div className="flex items-center gap-2 mt-3 text-xs text-gray-400 font-medium">
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                                        </svg>
                                        Conducted on {fmtDateTime(application.interview_date)}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}



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

            {showInterviewDetails && (
                <InterviewDetailsModal
                    interviewDate={application?.interview_date}
                    interviewId={interviewId}
                    onClose={() => setShowInterviewDetails(false)}
                    onEnterWaiting={() => setShowWaitingRoom(true)}
                />
            )}

            {showWaitingRoom && (
                <WaitingRoomModal
                    interviewDate={application?.interview_date}
                    interviewId={interviewId}
                    onClose={() => setShowWaitingRoom(false)}
                    onEnterRoom={() => {
                        setShowWaitingRoom(false);
                        navigate(`/psychologist/interview/${interviewId}`);
                    }}
                    navigate={navigate}
                    profileImgUrl={profileImgUrl}
                    nameInitial={fullName?.charAt(0) || '?'}
                />
            )}
        </div>
    );
};

export default PsychologistApprovalWaiting;

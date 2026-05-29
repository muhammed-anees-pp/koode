import { useEffect, useRef, useState, useCallback } from "react";
import { ZegoExpressEngine } from "zego-express-engine-webrtc";
import {
    getAdminInterviewToken,
    approveJoin,
    getPendingJoin,
    endInterview,
    getChatMessages,
    sendChatMessage,
} from "../../../api/admin.api";
import { uppercaseMeridiem } from "../../../utils/indiaDateTime";
import { resolveMediaUrl } from "../../../utils/url";

const cameraExtraInfo = (cameraOn) => JSON.stringify({ cameraOn });

const parseCameraExtraInfo = (extraInfo) => {
    if (!extraInfo) return true;
    try {
        const parsed = JSON.parse(extraInfo);
        return parsed.cameraOn !== false;
    } catch {
        return true;
    }
};

function AppAvatar({ name, photo, size = 44 }) {
    if (photo) {
        return (
            <img
                src={resolveMediaUrl(photo)} alt={name}
                className="rounded-full object-cover flex-shrink-0"
                style={{ width: size, height: size }}
                onError={(e) => { e.target.style.display = "none"; }}
            />
        );
    }
    const colours = ["#7C3AED", "#0EA5E9", "#10B981", "#F59E0B", "#EF4444", "#EC4899"];
    const colour = colours[(name?.charCodeAt(0) || 0) % colours.length];
    return (
        <div
            className="rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold"
            style={{ background: colour, width: size, height: size, fontSize: size * 0.38 }}
        >
            {name?.charAt(0)?.toUpperCase() || "?"}
        </div>
    );
}

function fmtDateTime(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return (
        d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) +
        " · " +
        d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }).toUpperCase() +
        " IST"
    );
}

function fmtCountdown(ms) {
    if (ms <= 0) return null; 
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

function ConfirmModal({ title, message, primaryLabel, primaryColor = "indigo", onPrimary, secondaryLabel, onSecondary }) {
    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-[#0f1320] border border-slate-700/50 rounded-2xl shadow-2xl w-[400px] p-7">
                <h3 className="font-outfit text-lg font-bold text-slate-100 mb-2">{title}</h3>
                <p className="text-sm text-slate-400 mb-6">{message}</p>
                <div className="flex gap-3">
                    <button
                        onClick={onPrimary}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-none cursor-pointer transition-all ${primaryColor === "red"
                            ? "bg-red-600 hover:bg-red-500 text-white"
                            : primaryColor === "green"
                                ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                                : "bg-indigo-600 hover:bg-indigo-500 text-white"
                            }`}
                    >
                        {primaryLabel}
                    </button>
                    {secondaryLabel && (
                        <button
                            onClick={onSecondary}
                            className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-slate-800 border border-slate-700 text-slate-300 hover:text-slate-100 cursor-pointer transition-all"
                        >
                            {secondaryLabel}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function ChatPanel({ messages, onSend, inputRef }) {
    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleKey = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            const val = inputRef.current?.value?.trim();
            if (val) { onSend(val); inputRef.current.value = ""; }
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#0d111d] border-l border-slate-700/60">
            <div className="px-4 py-3 border-b border-slate-700/50 flex items-center gap-2 bg-[#111827]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span className="text-xs font-semibold text-slate-300 tracking-wide">In-Call Messages</span>
                <span className="ml-1 text-[10px] text-slate-600">• Deleted when call ends</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-700">
                {messages.length === 0 && (
                    <p className="text-center text-xs text-slate-600 mt-8">Messages can only be seen by people in the call and are deleted when the call ends.</p>
                )}
                {messages.map((m) => (
                    <div key={m.id} className={`flex flex-col ${m.is_admin ? "items-end" : "items-start"}`}>
                        <span className="text-[10px] text-slate-500 mb-1">
                            {m.sender_name} · {uppercaseMeridiem(new Date(m.sent_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }))}
                        </span>
                        <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${m.is_admin
                            ? "bg-indigo-600 text-white rounded-tr-sm"
                            : "bg-slate-800 text-slate-200 rounded-tl-sm"
                            }`}>
                            {m.text}
                        </div>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>
            <div className="p-3 border-t border-slate-700/50 flex items-center gap-2 bg-[#111827]">
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Send a message…"
                    onKeyDown={handleKey}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                    onClick={() => {
                        const val = inputRef.current?.value?.trim();
                        if (val) { onSend(val); inputRef.current.value = ""; }
                    }}
                    className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center border-none cursor-pointer transition-colors flex-shrink-0"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                </button>
            </div>
        </div>
    );
}


function CtrlBtn({ onClick, active = true, danger = false, title, children }) {
    return (
        <button
            onClick={onClick}
            title={title}
            className={`w-12 h-12 rounded-full flex items-center justify-center border-none cursor-pointer transition-all focus:outline-none
                ${danger
                    ? "bg-red-600 hover:bg-red-500 text-white shadow-[0_4px_14px_rgba(239,68,68,0.4)]"
                    : active
                        ? "bg-white/10 hover:bg-white/20 text-white border border-white/10"
                        : "bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30"
                }`}
        >
            {children}
        </button>
    );
}

function WaitingCtrlBtn({ onClick, active = true, title, children }) {
    return (
        <button
            onClick={onClick}
            title={title}
            className={`w-11 h-11 rounded-full flex items-center justify-center border cursor-pointer transition-all focus:outline-none
                ${active
                    ? "bg-slate-700/60 border-slate-600 text-slate-200 hover:bg-slate-600/80"
                    : "bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30"
                }`}
        >
            {children}
        </button>
    );
}


export default function AdminInterviewRoomModal({ interviewId, applicantName, scheduledAt, app, onClose, onInterviewEnded }) {
    const [phase, setPhase] = useState("loading");
    const [tokenData, setTokenData] = useState(null);
    const [error, setError] = useState(null);
    const [countdown, setCountdown] = useState(null);
    const [timeReached, setTimeReached] = useState(false);
    const [pendingJoin, setPendingJoin] = useState(false);
    const [joined, setJoined] = useState(false);
    const [localStream, setLocalStream] = useState(null);
    const [micOn, setMicOn] = useState(true);
    const [camOn, setCamOn] = useState(true);
    const [joining, setJoining] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [chatMessages, setChatMessages] = useState([]);
    const [showEndConfirm, setShowEndConfirm] = useState(false);
    const [ending, setEnding] = useState(false);
    const [remoteStreamID, setRemoteStreamID] = useState(null);
    const [remoteCamOn, setRemoteCamOn] = useState(true);

    const [previewStream, setPreviewStream] = useState(null);
    const [previewMicOn, setPreviewMicOn] = useState(true);
    const [previewCamOn, setPreviewCamOn] = useState(true);
    const [previewError, setPreviewError] = useState(null);

    const engineRef = useRef(null);
    const localStreamIdRef = useRef(null);
    const remoteStreamIDRef = useRef(null);
    const pollRef = useRef(null);
    const timerRef = useRef(null);
    const chatPollRef = useRef(null);
    const lastMsgRef = useRef(null);
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const chatInputRef = useRef(null);
    const previewVideoRef = useRef(null);
    const previewStreamRef = useRef(null);

    const specs = (app?.specializations || []).map((s) => s.name ?? s);
    const shortId = app ? String(app.id).slice(0, 8).toUpperCase() : "";

    useEffect(() => {
        if (phase !== "waiting") return;

        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then((s) => {
                previewStreamRef.current = s;
                setPreviewStream(s);
                setPreviewError(null);
            })
            .catch((err) => {
                setPreviewError(
                    err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
                        ? "Camera/mic access denied. Please allow in browser settings."
                        : err.name === "NotFoundError"
                            ? "No camera or microphone found."
                            : "Could not access camera/microphone."
                );
            });

        return () => {
            if (previewStreamRef.current) {
                previewStreamRef.current.getTracks().forEach((t) => t.stop());
                previewStreamRef.current = null;
            }
            setPreviewStream(null);
        };
    }, [phase]);
    
    useEffect(() => {
        if (previewStream && previewVideoRef.current) {
            previewVideoRef.current.srcObject = previewStream;
        }
    }, [previewStream]);

    const applyPreviewStream = (s) => {
        previewStreamRef.current = s;
        setPreviewStream(s);
        if (previewVideoRef.current) {
            previewVideoRef.current.srcObject = s;
        }
    };

    const togglePreviewMic = () => {
        if (previewMicOn) {
            if (previewStream) {
                previewStream.getAudioTracks().forEach((t) => t.stop());
            }
            setPreviewMicOn(false);
        } else {
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then((audioStream) => {
                    const audioTrack = audioStream.getAudioTracks()[0];
                    if (!audioTrack) return;
                    const liveVideoTracks = previewStream
                        ? previewStream.getVideoTracks().filter((t) => t.readyState === "live")
                        : [];
                    const combined = new MediaStream([audioTrack, ...liveVideoTracks]);
                    applyPreviewStream(combined);
                    setPreviewMicOn(true);
                })
                .catch(() => setPreviewError("Could not re-enable microphone."));
        }
    };

    const togglePreviewCam = () => {
        if (previewCamOn) {
            if (previewStream) {
                previewStream.getVideoTracks().forEach((t) => t.stop());
            }
            setPreviewCamOn(false);
        } else {
            navigator.mediaDevices.getUserMedia({ video: true })
                .then((videoStream) => {
                    const videoTrack = videoStream.getVideoTracks()[0];
                    if (!videoTrack) return;
                    const liveAudioTracks = previewStream
                        ? previewStream.getAudioTracks().filter((t) => t.readyState === "live")
                        : [];
                    const combined = new MediaStream([videoTrack, ...liveAudioTracks]);
                    combined.getAudioTracks().forEach((t) => { t.enabled = previewMicOn; });
                    applyPreviewStream(combined);
                    setPreviewCamOn(true);
                })
                .catch(() => setPreviewError("Could not re-enable camera."));
        }
    };


    useEffect(() => {
        setError(null);
        getAdminInterviewToken(interviewId)
            .then((data) => { setTokenData(data); setPhase("waiting"); })
            .catch(() => { setError("Failed to load interview room."); setPhase("error"); });

        return () => {
            clearInterval(pollRef.current);
            clearInterval(timerRef.current);
            stopChatPoll();
        };
    }, [interviewId]);

    useEffect(() => {
        if (phase !== "waiting" && phase !== "in_call") return;
        const targetTime = scheduledAt ? new Date(scheduledAt) : null;
        const update = () => {
            if (targetTime) {
                const remaining = targetTime - Date.now();
                const ct = fmtCountdown(remaining);
                setCountdown(ct);
                setTimeReached(remaining <= 0);
            } else {
                setTimeReached(true);
                setCountdown(null);
            }
        };
        update();
        timerRef.current = setInterval(update, 1000);
        return () => clearInterval(timerRef.current);
    }, [phase, scheduledAt]);

    useEffect(() => {
        if (phase !== "waiting" && phase !== "in_call") return;
        pollRef.current = setInterval(async () => {
            try {
                const data = await getPendingJoin(interviewId);
                setPendingJoin(data.pending);
            } catch (e) { console.error("Pending join poll error:", e); }
        }, 3000);
        return () => clearInterval(pollRef.current);
    }, [phase, interviewId]);

    useEffect(() => {
        if (localStream && localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    useEffect(() => {
        if (!remoteStreamID || !engineRef.current) return;

        const attach = async () => {
            try {
                const remoteStream = await engineRef.current.startPlayingStream(remoteStreamID);
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = remoteStream;
                }
            } catch (err) {
                console.error("Error playing remote stream:", err);
            }
        };

        const t = setTimeout(attach, 150);
        return () => clearTimeout(t);
    }, [remoteStreamID]);

    const startChatPoll = useCallback(() => {
        chatPollRef.current = setInterval(async () => {
            try {
                const msgs = await getChatMessages(interviewId, lastMsgRef.current);
                if (msgs.length > 0) {
                    lastMsgRef.current = msgs[msgs.length - 1].sent_at;
                    setChatMessages((prev) => [...prev, ...msgs]);
                }
            } catch (err) {
                console.error("Chat poll error:", err);
            }
        }, 2500);
    }, [interviewId]);

    const stopChatPoll = () => clearInterval(chatPollRef.current);

    const joinRoom = useCallback(async () => {
        if (!tokenData || joined || joining) return;
        setJoining(true);
        setError(null);

        if (previewStream) {
            previewStream.getTracks().forEach((t) => t.stop());
            setPreviewStream(null);
        }

        try {
            let tempStream;
            try {
                tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            } catch (permErr) {
                if (permErr.name === "NotAllowedError" || permErr.name === "PermissionDeniedError") {
                    setError("Camera & microphone access was denied. Please allow them in your browser settings.");
                } else if (permErr.name === "NotFoundError") {
                    setError("No camera or microphone found. Please connect a device and try again.");
                } else {
                    setError("Could not access camera/microphone: " + (permErr.message || "Unknown error"));
                }
                setJoining(false);
                return;
            }
            tempStream.getTracks().forEach((t) => t.stop());

            if (engineRef.current) {
                try { engineRef.current.destroyEngine(); } catch (err) { console.warn("Engine cleanup failed:", err); }
                engineRef.current = null;
            }

            const { app_id, token, room_id, user_id } = tokenData;
            const appId = parseInt(app_id);
            const server = `wss://webliveroom${appId}-api.zegocloud.com/ws`;

            const engine = new ZegoExpressEngine(appId, server);
            engineRef.current = engine;

            engine.on("roomStateUpdate", () => {});

            engine.on("roomStreamUpdate", (roomID, updateType, streamList) => {
                if (updateType === "ADD") {
                    streamList.forEach((stream) => {
                        if (stream.streamID !== localStreamIdRef.current) {
                            remoteStreamIDRef.current = stream.streamID;
                            setRemoteStreamID(stream.streamID);
                            setRemoteCamOn(parseCameraExtraInfo(stream.extraInfo));
                        }
                    });
                }
                if (updateType === "DELETE") {
                    streamList.forEach((stream) => {
                        if (stream.streamID === remoteStreamIDRef.current) {
                            remoteStreamIDRef.current = null;
                            setRemoteStreamID(null);
                            setRemoteCamOn(true);
                        }
                    });
                }
            });

            engine.on("streamExtraInfoUpdate", (_roomID, streamList) => {
                streamList.forEach((stream) => {
                    if (stream.streamID === remoteStreamIDRef.current) {
                        setRemoteCamOn(parseCameraExtraInfo(stream.extraInfo));
                    }
                });
            });

            const loginResult = await engine.loginRoom(
                room_id, token,
                { userID: user_id, userName: tokenData.user_name || "Admin" },
                { userUpdate: true }
            );
            if (loginResult === false) throw new Error("Room login rejected.");

            const stream = await engine.createStream({ camera: { audio: true, video: true } });
            const streamID = `admin_${user_id}_${Date.now()}`;
            localStreamIdRef.current = streamID;
            await engine.startPublishingStream(streamID, stream);
            await engine.setStreamExtraInfo(streamID, cameraExtraInfo(previewCamOn)).catch((err) => console.warn("Camera state update failed:", err));

            if (!previewMicOn) engine.mutePublishStreamAudio(stream, true);
            if (!previewCamOn) engine.mutePublishStreamVideo(stream, true);
            setMicOn(previewMicOn);
            setCamOn(previewCamOn);

            const existingMsgs = await getChatMessages(interviewId);
            if (existingMsgs.length > 0) {
                lastMsgRef.current = existingMsgs[existingMsgs.length - 1].sent_at;
                setChatMessages(existingMsgs);
            }
            startChatPoll();

            setLocalStream(stream);
            setJoined(true);
            setPhase("in_call");
        } catch (err) {
            console.error("Admin join room error:", err);
            if (engineRef.current) {
                try { engineRef.current.destroyEngine(); } catch (cleanupErr) { console.warn("Engine cleanup failed:", cleanupErr); }
                engineRef.current = null;
            }
            setError("Failed to connect: " + (err?.message || "Unknown error") + ". Please try again.");
        } finally {
            setJoining(false);
        }
    }, [tokenData, joined, joining, interviewId, startChatPoll, previewStream, previewMicOn, previewCamOn]);

    const handleApproveJoin = async () => {
        try { await approveJoin(interviewId); setPendingJoin(false); }
        catch (e) { console.error("Approve join error:", e); }
    };

    const leaveRoom = async () => {
        stopChatPoll();
        const engine = engineRef.current;
        if (engine) {
            try {
                if (localStreamIdRef.current) await engine.stopPublishingStream(localStreamIdRef.current);
                if (localStream) engine.destroyStream(localStream);
                await engine.logoutRoom();
            } catch (cleanupErr) { console.warn("Room cleanup failed:", cleanupErr); }
            try { engine.destroyEngine(); } catch (destroyErr) { console.warn("Engine cleanup failed:", destroyErr); }
            engineRef.current = null;
        }
        setJoined(false);
        setPhase("waiting");
        setLocalStream(null);
        setRemoteStreamID(null);
        setRemoteCamOn(true);
        setChatMessages([]);
        lastMsgRef.current = null;
    };

    const handleEndClick = () => setShowEndConfirm(true);

    const handleNotComplete = async () => {
        setShowEndConfirm(false);
        await leaveRoom();
        onClose();
    };

    const handleCompleteYes = async () => {
        setShowEndConfirm(false);
        setEnding(true);
        try {
            await endInterview(interviewId, { complete: true });
            const engine = engineRef.current;
            if (engine) {
                try {
                    if (localStreamIdRef.current) await engine.stopPublishingStream(localStreamIdRef.current);
                    if (localStream) engine.destroyStream(localStream);
                    await engine.logoutRoom();
                } catch (cleanupErr) { console.warn("Room cleanup failed:", cleanupErr); }
                try { engine.destroyEngine(); } catch (destroyErr) { console.warn("Engine cleanup failed:", destroyErr); }
                engineRef.current = null;
            }
            stopChatPoll();
            onInterviewEnded && onInterviewEnded();
            onClose();
        } catch (e) {
            console.error("End interview error:", e);
            setEnding(false);
            setError("Failed to end interview. Please try again.");
        }
    };

    const toggleMic = () => {
        if (!localStream || !engineRef.current) return;
        engineRef.current.mutePublishStreamAudio(localStream, micOn);
        setMicOn((v) => !v);
    };

    const toggleCam = () => {
        if (!localStream || !engineRef.current) return;
        const nextCamOn = !camOn;
        engineRef.current.mutePublishStreamVideo(localStream, camOn);
        if (localStreamIdRef.current) {
            engineRef.current.setStreamExtraInfo(localStreamIdRef.current, cameraExtraInfo(nextCamOn)).catch((err) => console.warn("Camera state update failed:", err));
        }
        setCamOn(nextCamOn);
    };

    const handleSendChat = async (text) => {
        try {
            const msg = await sendChatMessage(interviewId, text);
            setChatMessages((prev) => [...prev, msg]);
            lastMsgRef.current = msg.sent_at;
        } catch (e) { console.error("Chat send error:", e); }
    };

    
    const handleBackdropClick = () => {
        if (phase === "in_call") return; 
        onClose();
    };

    if (phase === "loading") {
        return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={handleBackdropClick}>
                <div className="bg-[#0f1320] border border-slate-700/50 rounded-2xl shadow-2xl p-12 flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
                    <svg className="animate-spin text-indigo-400" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    <p className="text-sm text-slate-400">Loading interview room…</p>
                </div>
            </div>
        );
    }

    if (phase === "error") {
        return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={handleBackdropClick}>
                <div className="bg-[#0f1320] border border-slate-700/50 rounded-2xl shadow-2xl w-[420px] p-10 text-center" onClick={(e) => e.stopPropagation()}>
                    <p className="text-red-400 font-medium mb-2">Error</p>
                    <p className="text-sm text-slate-500 mb-5">{error}</p>
                    <button onClick={onClose} className="px-5 py-2 rounded-xl text-sm font-bold bg-slate-700 text-slate-200 border-none cursor-pointer hover:bg-slate-600 transition-all">Close</button>
                </div>
            </div>
        );
    }

    if (phase === "waiting" && tokenData) {
        return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/95 px-4 py-8 text-white backdrop-blur-sm" onClick={handleBackdropClick}>
                <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1fr_360px]" onClick={(e) => e.stopPropagation()}>
                    <div className="relative aspect-video overflow-hidden rounded-[28px] border border-white/10 bg-black">
                        {previewError ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center text-slate-500">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <line x1="1" y1="1" x2="23" y2="23" /><path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3" /><path d="M10.66 6H14a2 2 0 0 1 2 2S23 7 23 17" />
                                </svg>
                                <p className="text-xs">{previewError}</p>
                            </div>
                        ) : !previewStream ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <svg className="animate-spin text-indigo-400" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                </svg>
                            </div>
                        ) : !previewCamOn ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900">
                                <AppAvatar name={tokenData?.user_name || "Admin"} photo={tokenData?.user_photo || null} size={72} />
                                <p className="text-xs text-slate-400">Camera off</p>
                            </div>
                        ) : null}
                        <video ref={previewVideoRef} autoPlay muted playsInline className={`h-full w-full object-cover ${previewCamOn ? "" : "invisible"}`} />
                    </div>

                    <div className="relative rounded-[28px] border border-white/10 bg-white/10 p-6 backdrop-blur">
                        <button onClick={onClose} className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-slate-400 transition hover:text-slate-100">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Waiting Room</p>
                        <h1 className="mt-2 pr-8 text-2xl font-bold">Interview Room</h1>
                        <p className="mt-2 text-sm text-slate-300">{applicantName || "Candidate"}</p>
                        <p className="mt-1 text-sm text-slate-400">{fmtDateTime(scheduledAt)}</p>

                        <div className={`mt-5 rounded-2xl border p-4 ${timeReached ? "border-emerald-500/30 bg-emerald-500/10" : "border-amber-400/20 bg-amber-400/10"}`}>
                            <p className={`text-sm font-semibold ${timeReached ? "text-emerald-300" : "text-amber-100"}`}>
                                {timeReached ? "Ready to join" : `Join button unlocks in ${countdown}`}
                            </p>
                        </div>

                        {(specs.length > 0 || app?.years_of_experience != null || shortId) && (
                            <div className="mt-5 rounded-2xl border border-white/10 bg-slate-900/40 p-4">
                                <div className="flex items-center gap-3">
                                    <AppAvatar name={app?.full_name || applicantName} photo={app?.profile_picture} size={44} />
                                    <div>
                                        <p className="text-sm font-bold text-slate-100">{app?.full_name || applicantName}</p>
                                        {shortId ? <p className="text-xs text-slate-500">Applicant ID: #{shortId}</p> : null}
                                    </div>
                                </div>
                                {(specs.length > 0 || app?.years_of_experience != null) && (
                                    <p className="mt-3 text-xs text-slate-400">
                                        {[specs[0], app?.years_of_experience != null ? `${app.years_of_experience} Years` : null].filter(Boolean).join(" · ")}
                                    </p>
                                )}
                            </div>
                        )}

                        {pendingJoin && (
                            <div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold text-amber-300">Candidate is waiting</p>
                                        <p className="text-xs text-amber-500/80">{applicantName} has requested to join</p>
                                    </div>
                                    <button onClick={handleApproveJoin} className="rounded-xl border-none bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-500">
                                        Admit
                                    </button>
                                </div>
                            </div>
                        )}

                        {error && <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}

                        <div className="mt-6 flex gap-3">
                            <WaitingCtrlBtn onClick={togglePreviewMic} active={previewMicOn} title={previewMicOn ? "Mute mic" : "Unmute mic"}>
                                {previewMicOn
                                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
                                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="1" y1="1" x2="23" y2="23" /><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" /><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
                                }
                            </WaitingCtrlBtn>
                            <WaitingCtrlBtn onClick={togglePreviewCam} active={previewCamOn} title={previewCamOn ? "Turn off camera" : "Turn on camera"}>
                                {previewCamOn
                                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>
                                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="1" y1="1" x2="23" y2="23" /><path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3" /><path d="M10.66 6H14a2 2 0 0 1 2 2S23 7 23 17" /></svg>
                                }
                            </WaitingCtrlBtn>
                        </div>

                        <button
                            onClick={joinRoom}
                            disabled={joining || !timeReached}
                            className="mt-7 flex w-full items-center justify-center gap-2.5 rounded-2xl border-none bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-[0_4px_14px_rgba(99,102,241,0.4)] transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {joining ? "Connecting..." : "Join Interview Room"}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (phase === "in_call") {
        return (
            <div className="fixed inset-0 z-[200] flex bg-black">
                <div className="relative flex-1 bg-gray-950">
                    {remoteStreamID ? (
                        <>
                            <video
                                ref={remoteVideoRef}
                                autoPlay
                                playsInline
                                className={`absolute inset-0 w-full h-full object-cover ${remoteCamOn ? "" : "opacity-0"}`}
                            />
                            {!remoteCamOn && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-950">
                                    <AppAvatar name={app?.full_name || applicantName} photo={app?.profile_picture} size={96} />
                                    <p className="text-sm text-slate-400">Camera off</p>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-slate-500">
                            <div className="w-20 h-20 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-2xl font-bold text-indigo-400">
                                {(applicantName || "?").charAt(0).toUpperCase()}
                            </div>
                            <p className="text-sm">Waiting for {applicantName}…</p>
                        </div>
                    )}

                    <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/60 to-transparent flex items-center px-5 gap-3 pointer-events-none">
                        <div className="w-7 h-7 rounded-lg bg-indigo-500/30 border border-indigo-500/30 flex items-center justify-center">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2">
                                <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-white text-sm font-semibold leading-none">Interview</p>
                            <p className="text-slate-400 text-xs mt-0.5">Interviewer: Koode Admin Team</p>
                        </div>
                        <div className="flex-1" />
                        <span className="flex items-center gap-1.5 pointer-events-auto bg-red-600/80 px-2.5 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            <span className="text-white text-[11px] font-bold tracking-wider">LIVE</span>
                        </span>
                        <span className="text-slate-300 text-[11px] pointer-events-auto">
                            {fmtDateTime(scheduledAt)}
                        </span>
                    </div>

                    {remoteStreamID && (
                        <div className="absolute bottom-20 left-4 bg-black/60 backdrop-blur-sm text-white text-[11px] font-medium px-2.5 py-1 rounded-full pointer-events-none">
                            {applicantName || "Candidate"}
                        </div>
                    )}

                    {pendingJoin && (
                        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-amber-500/90 backdrop-blur-sm rounded-2xl px-5 py-3 flex items-center gap-4 shadow-xl z-10">
                            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                            <p className="text-white text-sm font-semibold">{applicantName} is waiting to join</p>
                            <button onClick={handleApproveJoin} className="px-4 py-1.5 bg-white text-amber-700 text-xs font-bold rounded-xl border-none cursor-pointer hover:bg-amber-50 transition-all">
                                Admit
                            </button>
                        </div>
                    )}

                    {error && (
                        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-900/80 backdrop-blur-sm rounded-xl px-5 py-2.5 z-10">
                            <p className="text-red-300 text-sm">{error}</p>
                        </div>
                    )}

                    <div className="absolute bottom-20 right-4 aspect-video w-44 rounded-xl overflow-hidden shadow-2xl border border-white/10 bg-gray-900">
                        <video ref={localVideoRef} autoPlay muted playsInline className={`h-full w-full object-cover ${camOn ? "" : "opacity-0"}`} />
                        {!camOn && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
                                <AppAvatar
                                    name={tokenData?.user_name || "Admin"}
                                    photo={tokenData?.user_photo || null}
                                    size={52}
                                />
                                <p className="text-[9px] text-slate-400">Camera off</p>
                            </div>
                        )}
                        <div className="absolute bottom-1.5 left-2 bg-black/60 text-white text-[9px] font-medium px-1.5 py-0.5 rounded-full">
                            You
                        </div>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-center gap-3 px-6">
                        <CtrlBtn onClick={toggleMic} active={micOn} title={micOn ? "Mute" : "Unmute"}>
                            {micOn
                                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
                                : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="1" y1="1" x2="23" y2="23" /><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" /><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
                            }
                        </CtrlBtn>
                        <CtrlBtn onClick={toggleCam} active={camOn} title={camOn ? "Turn off camera" : "Turn on camera"}>
                            {camOn
                                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>
                                : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="1" y1="1" x2="23" y2="23" /><path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3" /><path d="M10.66 6H14a2 2 0 0 1 2 2S23 7 23 17" /></svg>
                            }
                        </CtrlBtn>
                        <CtrlBtn onClick={() => setShowChat((v) => !v)} active={!showChat} title="Toggle Chat">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                        </CtrlBtn>
                        <CtrlBtn onClick={handleEndClick} danger title="End Interview">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07C9.44 18.32 8.48 17.36 7.7 16.32A19.79 19.79 0 0 1 4.63 7.7 2 2 0 0 1 6.6 5.5h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L10.68 13.31z" />
                            </svg>
                        </CtrlBtn>
                    </div>
                </div>

                {showChat && (
                    <div className="w-80 flex-shrink-0">
                        <ChatPanel messages={chatMessages} onSend={handleSendChat} inputRef={chatInputRef} />
                    </div>
                )}

                {showEndConfirm && (
                    <ConfirmModal
                        title="End Interview?"
                        message="Do you want to mark this interview as completed? You can review the application and make your decision afterwards."
                        primaryLabel={ending ? "Completing…" : "Yes, Mark Completed"}
                        primaryColor="indigo"
                        onPrimary={handleCompleteYes}
                        secondaryLabel="Keep Active"
                        onSecondary={handleNotComplete}
                    />
                )}
            </div>
        );
    }

    return null;
}

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ZegoExpressEngine } from "zego-express-engine-webrtc";
import { getInterviewToken, requestJoin, getJoinStatus } from "../../../api/psychologist.api";
import PsychologistNavbar from "../../../components/psychologist/Navbar/PsychologistNavbar";

function fmtDateTime(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return (
        d.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric", timeZone: "Asia/Kolkata" }) +
        " at " +
        d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }).toUpperCase()
    );
}

function VideoTile({ stream, label, muted = false, isLocal = false, noStream = false }) {
    const videoRef = useRef(null);

    useEffect(() => {
        if (!stream || !videoRef.current) return;
        if (isLocal) {
            videoRef.current.srcObject = stream;
        }
    }, [stream, isLocal]);

    return (
        <div className="relative bg-gray-900 rounded-2xl overflow-hidden aspect-video flex items-center justify-center border border-gray-700/50">
            {noStream || !stream ? (
                <div className="flex flex-col items-center gap-3 text-gray-500">
                    <div className="w-16 h-16 rounded-full bg-psycho-primary/10 border border-psycho-primary/20 flex items-center justify-center">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                        </svg>
                    </div>
                    <p className="text-sm">Waiting for {label}…</p>
                </div>
            ) : isLocal ? (
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            ) : (
                <div id={`remote-video-${stream.streamID}`} className="w-full h-full" />
            )}
            <div className="absolute bottom-3 left-3 bg-black/60 text-white text-xs font-medium px-2.5 py-1 rounded-full backdrop-blur-sm">
                {label}
            </div>
        </div>
    );
}

export default function InterviewRoom() {
    const { interviewId } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [tokenData, setTokenData] = useState(null);
    const [joined, setJoined] = useState(false);
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [micOn, setMicOn] = useState(true);
    const [camOn, setCamOn] = useState(true);

    const [joinPhase, setJoinPhase] = useState("idle");

    const engineRef = useRef(null);
    const localStreamIdRef = useRef(null);
    const pollRef = useRef(null);

    useEffect(() => {
        getInterviewToken(interviewId)
            .then((data) => {
                setTokenData(data);
                if (data.status === "ONGOING") {
                    setJoinPhase("reconnect");
                } else {
                    setJoinPhase("ready");
                }
            })
            .catch(() => setError("Failed to load interview. Please try again."))
            .finally(() => setLoading(false));
    }, [interviewId]);

    useEffect(() => () => {
        clearInterval(pollRef.current);
    }, []);

    const sendJoinRequest = useCallback(async () => {
        if (!tokenData) return;
        try {
            setJoinPhase("requesting");
            await requestJoin(interviewId);
            setJoinPhase("waiting");
            pollRef.current = setInterval(async () => {
                try {
                    const data = await getJoinStatus(interviewId);
                    if (data.approved) {
                        clearInterval(pollRef.current);
                        setJoinPhase("approved");
                    }
                } catch (e) {
                    console.error("Poll error:", e);
                }
            }, 3000);
        } catch (err) {
            setError("Failed to send join request. Please try again.");
            setJoinPhase("ready");
        }
    }, [tokenData, interviewId]);

    const joinRoom = useCallback(async () => {
        if (!tokenData || joined) return;
        clearInterval(pollRef.current);
        try {
            let tempStream;
            try {
                tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            } catch (permErr) {
                if (permErr.name === "NotAllowedError" || permErr.name === "PermissionDeniedError") {
                    setError("Camera & microphone access was denied. Please allow them in your browser settings and try again.");
                } else if (permErr.name === "NotFoundError") {
                    setError("No camera or microphone found. Please connect a device and try again.");
                } else {
                    setError("Could not access camera/microphone: " + (permErr.message || "Unknown error"));
                }
                return;
            }

            tempStream.getTracks().forEach((t) => t.stop());

            const { app_id, token, room_id, user_id } = tokenData;
            const appId = parseInt(app_id);
            const server = `wss://webliveroom${appId}-api.zegocloud.com/ws`;

            try { ZegoExpressEngine.destroyEngine(); } catch (_) { }

            const engine = new ZegoExpressEngine(appId, server);
            engineRef.current = engine;

            engine.on("roomStreamUpdate", async (roomID, updateType, streamList) => {
                if (updateType === "ADD" && streamList && streamList.length > 0) {
                    const remoteStreamID = streamList[0].streamID;
                    setRemoteStream({ streamID: remoteStreamID });
                    setTimeout(() => {
                        const el = document.getElementById(`remote-video-${remoteStreamID}`);
                        if (el && engineRef.current) {
                            engineRef.current.startPlayingStream(remoteStreamID, {
                                video: { element: el },
                            });
                        }
                    }, 300);
                }
                if (updateType === "DELETE") {
                    setRemoteStream(null);
                }
            });

            await engine.loginRoom(room_id, token, { userID: user_id, userName: tokenData.user_name || user_id });

            const stream = await engine.createStream({
                camera: { audio: true, video: true },
            });

            const streamID = `psycho_${user_id}_${Date.now()}`;
            localStreamIdRef.current = streamID;
            await engine.startPublishingStream(streamID, stream);

            setLocalStream(stream);
            setJoined(true);
            setJoinPhase("in_call");
        } catch (err) {
            console.error("Failed to join room:", err);
            try { ZegoExpressEngine.destroyEngine(); } catch (_) { }
            engineRef.current = null;
            setError("Could not connect to the interview room. Please try again.");
        }
    }, [tokenData, joined]);

    useEffect(() => {
        if (joinPhase === "approved") {
            joinRoom();
        }
    }, [joinPhase, joinRoom]);

    const leaveRoom = useCallback(async () => {
        const engine = engineRef.current;
        if (!engine) return;
        if (localStreamIdRef.current) {
            await engine.stopPublishingStream(localStreamIdRef.current);
        }
        if (localStream) {
            engine.destroyStream(localStream);
        }
        await engine.logoutRoom();
        ZegoExpressEngine.destroyEngine();
        engineRef.current = null;
        navigate(-1);
    }, [localStream, navigate]);

    const toggleMic = () => {
        if (!localStream) return;
        const engine = engineRef.current;
        if (!engine) return;
        engine.mutePublishStreamAudio(localStream, micOn);
        setMicOn((v) => !v);
    };

    const toggleCam = () => {
        if (!localStream) return;
        const engine = engineRef.current;
        if (!engine) return;
        engine.mutePublishStreamVideo(localStream, camOn);
        setCamOn((v) => !v);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#eef0f5] flex flex-col">
                <PsychologistNavbar />
                <div className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3 text-gray-400">
                        <svg className="animate-spin text-psycho-primary" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                        <p className="text-sm">Loading interview room…</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#eef0f5] flex flex-col">
                <PsychologistNavbar />
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center max-w-sm">
                        <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-4">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                            </svg>
                        </div>
                        <p className="text-gray-700 font-medium mb-1">Interview Room Error</p>
                        <p className="text-sm text-gray-500 mb-4">{error}</p>
                        <button onClick={() => navigate(-1)} className="text-sm text-psycho-primary font-medium hover:underline bg-transparent border-none cursor-pointer">
                            ← Go Back
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#eef0f5] flex flex-col">
            <PsychologistNavbar />

            <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Clinical Interview</h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {tokenData?.scheduled_at ? fmtDateTime(tokenData.scheduled_at) : ""}
                        </p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${joined ? "bg-green-50 text-green-700 border border-green-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${joined ? "bg-green-500" : "bg-amber-500"} animate-pulse`} />
                        {joined ? "Connected" : "Not Joined"}
                    </span>
                </div>

                {(joinPhase === "ready" || joinPhase === "reconnect") && (
                    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-8 mb-6 text-center">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${joinPhase === "reconnect" ? "bg-green-50 border border-green-100" : "bg-blue-50 border border-blue-100"}`}>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={joinPhase === "reconnect" ? "#22c55e" : "#1188d8"} strokeWidth="1.5">
                                <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 mb-1">
                            {joinPhase === "reconnect" ? "Interview In Progress" : "Ready to Join"}
                        </h2>
                        <p className="text-sm text-gray-500 mb-6">
                            {joinPhase === "reconnect" ? "You were disconnected. Click below to request re-admission." : "Click below to request admission to the interview room."}
                        </p>
                        <button
                            onClick={sendJoinRequest}
                            className="inline-flex items-center gap-2.5 px-8 py-3 bg-psycho-primary hover:bg-psycho-hover text-white text-sm font-semibold rounded-xl border-none cursor-pointer transition-all shadow-[0_4px_14px_rgba(17,136,216,0.3)]"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
                            </svg>
                            Request to Join
                        </button>
                    </div>
                )}

                {(joinPhase === "requesting" || joinPhase === "waiting") && (
                    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-8 mb-6 text-center">
                        <div className="flex flex-col items-center gap-4">
                            <svg className="animate-spin text-psycho-primary" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                            </svg>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 mb-1">Waiting for Admin</h2>
                                <p className="text-sm text-gray-500">Your join request has been sent. Please wait for the admin to admit you.</p>
                            </div>
                        </div>
                    </div>
                )}

                {joined && (
                    <>
                        <div className="grid grid-cols-2 gap-4 mb-5">
                            <div className="flex flex-col gap-2">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">You</p>
                                <VideoTile stream={localStream} label="You" muted isLocal noStream={!localStream} />
                            </div>
                            <div className="flex flex-col gap-2">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Interviewer</p>
                                <VideoTile stream={remoteStream} label="Interviewer" noStream={!remoteStream} />
                            </div>
                        </div>

                        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 flex items-center justify-center gap-4">
                            <button
                                onClick={toggleMic}
                                title={micOn ? "Mute" : "Unmute"}
                                className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all cursor-pointer ${micOn ? "bg-white border-gray-200 text-gray-700 hover:border-psycho-primary" : "bg-red-50 border-red-300 text-red-500"
                                    }`}
                            >
                                {micOn ? (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
                                    </svg>
                                ) : (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="1" y1="1" x2="23" y2="23" /><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" /><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
                                    </svg>
                                )}
                            </button>

                            <button
                                onClick={toggleCam}
                                title={camOn ? "Turn off camera" : "Turn on camera"}
                                className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all cursor-pointer ${camOn ? "bg-white border-gray-200 text-gray-700 hover:border-psycho-primary" : "bg-red-50 border-red-300 text-red-500"
                                    }`}
                            >
                                {camOn ? (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" />
                                    </svg>
                                ) : (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="1" y1="1" x2="23" y2="23" /><path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3" /><path d="M10.66 6H14a2 2 0 0 1 2 2S23 7 23 17" />
                                    </svg>
                                )}
                            </button>

                            <button
                                onClick={leaveRoom}
                                className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-xl border-none cursor-pointer transition-all shadow-[0_4px_14px_rgba(239,68,68,0.3)]"
                            >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                                </svg>
                                Leave
                            </button>
                        </div>

                        <p className="text-center text-xs text-gray-400 mt-4 flex items-center justify-center gap-1.5">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                            All interviews are conducted securely and end-to-end encrypted via Koode's platform.
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}

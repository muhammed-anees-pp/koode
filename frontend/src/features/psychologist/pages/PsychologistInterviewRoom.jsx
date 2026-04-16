import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ZegoExpressEngine } from "zego-express-engine-webrtc";
import { getInterviewToken, getChatMessages, sendChatMessage } from "../../../api/psychologist.api";

function ChatPanel({ messages, onSend, inputRef }) {
    const bottomRef = useRef(null);
    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

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
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && (
                    <p className="text-center text-xs text-slate-600 mt-8">Messages can only be seen by people in the call.</p>
                )}
                {messages.map((m) => (
                    <div key={m.id} className={`flex flex-col ${!m.is_admin ? "items-end" : "items-start"}`}>
                        <span className="text-[10px] text-slate-500 mb-1">
                            {m.sender_name} · {new Date(m.sent_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${!m.is_admin
                            ? "bg-[#1188d8] text-white rounded-tr-sm"
                            : "bg-slate-800 text-slate-200 rounded-tl-sm"}`}>
                            {m.text}
                        </div>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>
            <div className="p-3 border-t border-slate-700/50 flex items-center gap-2 bg-[#111827]">
                <input ref={inputRef} type="text" placeholder="Send a message…" onKeyDown={handleKey}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-[#1188d8] transition-colors" />
                <button onClick={() => { const val = inputRef.current?.value?.trim(); if (val) { onSend(val); inputRef.current.value = ""; } }}
                    className="w-9 h-9 rounded-xl bg-[#1188d8] hover:bg-[#0e75bc] flex items-center justify-center border-none cursor-pointer transition-colors flex-shrink-0">
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
        <button onClick={onClick} title={title}
            className={`w-12 h-12 rounded-full flex items-center justify-center border-none cursor-pointer transition-all focus:outline-none
                ${danger ? "bg-red-600 hover:bg-red-500 text-white shadow-[0_4px_14px_rgba(239,68,68,0.4)]"
                    : active ? "bg-white/10 hover:bg-white/20 text-white border border-white/10"
                        : "bg-red-500/20 border border-red-500/40 text-red-400"}`}>
            {children}
        </button>
    );
}

export default function PsychologistInterviewRoom() {
    const { interviewId } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [tokenData, setTokenData] = useState(null);
    const [micOn, setMicOn] = useState(true);
    const [camOn, setCamOn] = useState(true);
    const [localStream, setLocalStream] = useState(null);
    const [remoteStreamID, setRemoteStreamID] = useState(null);
    const [showChat, setShowChat] = useState(false);
    const [chatMessages, setChatMessages] = useState([]);
    const [mediaWarning, setMediaWarning] = useState(null);

    const engineRef = useRef(null);
    const localStreamIdRef = useRef(null);
    const localStreamRef = useRef(null);     
    const remoteStreamIDRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const chatPollRef = useRef(null);
    const lastMsgRef = useRef(null);
    const chatInputRef = useRef(null);
    const canvasCleanupRef = useRef(null);


    const localVideoRef = useCallback((el) => {
        if (el && localStreamRef.current) {
            el.srcObject = localStreamRef.current;
        }
    }, []);

    useEffect(() => {
        getInterviewToken(interviewId)
            .then((data) => { setTokenData(data); })
            .catch(() => { setError("Failed to load interview room."); setLoading(false); });

        return () => { clearInterval(chatPollRef.current); };
    }, [interviewId]);

    useEffect(() => { if (tokenData) joinRoom(tokenData); }, [tokenData]);

    useEffect(() => {
        localStreamRef.current = localStream;
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

    const startChatPoll = useCallback((iid) => {
        chatPollRef.current = setInterval(async () => {
            try {
                const msgs = await getChatMessages(iid, lastMsgRef.current);
                if (msgs.length > 0) {
                    lastMsgRef.current = msgs[msgs.length - 1].sent_at;
                    setChatMessages((prev) => [...prev, ...msgs]);
                }
            } catch (error) {}
        }, 2500);
    }, []);

    const createFakeStream = useCallback((userName) => {
        const canvas = document.createElement("canvas");
        canvas.width = 640; canvas.height = 360;
        const ctx = canvas.getContext("2d");
        const initial = (userName || "P").charAt(0).toUpperCase();
        let frame = 0;

        const draw = () => {
            frame++;
            const grad = ctx.createLinearGradient(0, 0, 640, 360);
            grad.addColorStop(0, "#0d1117"); grad.addColorStop(1, "#111827");
            ctx.fillStyle = grad; ctx.fillRect(0, 0, 640, 360);
            const pulse = 0.6 + 0.4 * Math.abs(Math.sin(frame * 0.05));
            ctx.strokeStyle = `rgba(17,136,216,${pulse * 0.4})`; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(320, 155, 72 + pulse * 6, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = "#1188d8"; ctx.beginPath(); ctx.arc(320, 155, 68, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#fff"; ctx.font = "bold 54px system-ui,sans-serif";
            ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(initial, 320, 158);
            ctx.fillStyle = "#94a3b8"; ctx.font = "16px system-ui,sans-serif";
            ctx.fillText(userName || "Psychologist", 320, 258);
            ctx.fillStyle = "#475569"; ctx.font = "13px system-ui,sans-serif";
            ctx.fillText("Camera not available on this device", 320, 286);
            const dotAlpha = 0.5 + 0.5 * Math.sin(frame * 0.08);
            ctx.fillStyle = `rgba(239,68,68,${dotAlpha})`; ctx.beginPath(); ctx.arc(300, 320, 5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#ef4444"; ctx.font = "bold 11px system-ui,sans-serif"; ctx.fillText("LIVE", 315, 324);
        };
        draw();
        const raf = { id: null };
        const loop = () => { draw(); raf.id = requestAnimationFrame(loop); };
        raf.id = requestAnimationFrame(loop);

        const videoTrack = canvas.captureStream(15).getVideoTracks()[0];
        const audioCtx = new AudioContext();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain(); gain.gain.value = 0.0001;
        const dest = audioCtx.createMediaStreamDestination();
        osc.connect(gain); gain.connect(dest); osc.start();
        const audioTrack = dest.stream.getAudioTracks()[0];
        const cleanup = () => { cancelAnimationFrame(raf.id); videoTrack.stop(); audioTrack.stop(); osc.stop(); audioCtx.close(); };
        return { videoTrack, audioTrack, cleanup };
    }, []);

    const joinRoom = useCallback(async (td) => {
        const { app_id, token, room_id, user_id } = td;
        const userName = td.user_name || "Psychologist";

        await new Promise((r) => setTimeout(r, 600));

        if (engineRef.current) {
            try { engineRef.current.destroyEngine(); } catch (_) {}
            engineRef.current = null;
        }

        try {
            const appId = parseInt(app_id);
            const engine = new ZegoExpressEngine(appId, `wss://webliveroom${appId}-api.zegocloud.com/ws`);
            engineRef.current = engine;

            engine.on("roomStreamUpdate", (roomID, updateType, streamList) => {
                if (updateType === "ADD") {
                    streamList.forEach((stream) => {
                        if (stream.streamID !== localStreamIdRef.current) {
                            console.log("[Psycho] Remote stream added:", stream.streamID);
                            remoteStreamIDRef.current = stream.streamID;
                            setRemoteStreamID(stream.streamID);
                        }
                    });
                }
                if (updateType === "DELETE") {
                    streamList.forEach((stream) => {
                        if (stream.streamID === remoteStreamIDRef.current) {
                            console.log("[Psycho] Remote stream removed:", stream.streamID);
                            remoteStreamIDRef.current = null;
                            setRemoteStreamID(null);
                        }
                    });
                }
            });

            await engine.loginRoom(room_id, token, { userID: user_id, userName }, { userUpdate: true });

            let zegoStream = null;
            try {
                zegoStream = await engine.createStream({ camera: { audio: true, video: true } });
            } catch (err1) {
                console.warn("Camera+mic unavailable, trying audio-only:", err1);
                try {
                    zegoStream = await engine.createStream({ camera: { audio: true, video: false } });
                    setCamOn(false);
                } catch (err2) {
                    console.warn("Mic also unavailable, building canvas avatar stream:", err2);

                    let micTrack = null;
                    try {
                        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                        micTrack = micStream.getAudioTracks()[0];
                    } catch (_) {}

                    const fake = createFakeStream(userName);
                    canvasCleanupRef.current = fake.cleanup;
                    zegoStream = await engine.createStream({
                        custom: { videoTrack: fake.videoTrack, audioTrack: micTrack || fake.audioTrack }
                    });
                    setCamOn(false);
                    if (!micTrack) setMicOn(false);
                    setMediaWarning(
                        micTrack
                            ? "Camera unavailable (in use by another browser). Showing avatar — mic is active."
                            : "Camera & mic unavailable. Showing avatar. Both sides are still connected."
                    );
                }
            }

            const streamID = `psycho_${user_id}_${Date.now()}`;
            localStreamIdRef.current = streamID;
            await engine.startPublishingStream(streamID, zegoStream);
            setLocalStream(zegoStream);

            const existingMsgs = await getChatMessages(interviewId);
            if (existingMsgs.length > 0) {
                lastMsgRef.current = existingMsgs[existingMsgs.length - 1].sent_at;
                setChatMessages(existingMsgs);
            }
            startChatPoll(interviewId);
            setLoading(false);
        } catch (err) {
            console.error("Join room error:", err);
            setError("Could not connect: " + (err?.message || "Unknown error"));
            setLoading(false);
        }
    }, [interviewId, startChatPoll, createFakeStream]);

    const leaveRoom = async () => {
        clearInterval(chatPollRef.current);
        if (canvasCleanupRef.current) { canvasCleanupRef.current(); canvasCleanupRef.current = null; }
        const engine = engineRef.current;
        if (engine) {
            try {
                if (localStreamIdRef.current) await engine.stopPublishingStream(localStreamIdRef.current);
                if (localStream) engine.destroyStream(localStream);
                await engine.logoutRoom();
            } catch (_) {}
            try { engine.destroyEngine(); } catch (_) {}
            engineRef.current = null;
        }
        navigate("/psychologist/approval-waiting");
    };

    const toggleMic = () => {
        if (!localStream || !engineRef.current) return;
        engineRef.current.mutePublishStreamAudio(localStream, micOn);
        setMicOn((v) => !v);
    };

    const toggleCam = () => {
        if (!localStream || !engineRef.current) return;
        engineRef.current.mutePublishStreamVideo(localStream, camOn);
        setCamOn((v) => !v);
    };

    const handleSendChat = async (text) => {
        try {
            const msg = await sendChatMessage(interviewId, text);
            setChatMessages((prev) => [...prev, msg]);
            lastMsgRef.current = msg.sent_at;
        } catch (e) { console.error("Chat send error:", e); }
    };

    if (loading) return (
        <div className="w-screen h-screen flex items-center justify-center bg-black">
            <div className="flex flex-col items-center gap-4 text-slate-400">
                <svg className="animate-spin text-[#1188d8]" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                <p className="text-sm">Connecting to interview room…</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="w-screen h-screen flex items-center justify-center bg-black">
            <div className="text-center">
                <p className="text-red-400 text-sm mb-4">{error}</p>
                <button onClick={() => navigate("/psychologist/approval-waiting")}
                    className="px-5 py-2.5 bg-slate-700 text-white text-sm font-medium rounded-xl border-none cursor-pointer hover:bg-slate-600 transition-all">
                    Go Back
                </button>
            </div>
        </div>
    );

    return (
        <div className="w-screen h-screen flex bg-black overflow-hidden">
            
            <div className="relative flex-1 bg-gray-950">
                {remoteStreamID ? (
    <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
    />
) 
                : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-slate-500">
                        <div className="w-20 h-20 rounded-full bg-[#1188d8]/10 border border-[#1188d8]/20 flex items-center justify-center">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1188d8" strokeWidth="1.5">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                            </svg>
                        </div>
                        <p className="text-sm">Waiting for the interviewer…</p>
                    </div>
                )}

                
                <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/60 to-transparent flex items-center px-5 gap-3 pointer-events-none">
                    <div className="w-7 h-7 rounded-lg bg-[#1188d8]/30 border border-[#1188d8]/30 flex items-center justify-center">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1188d8" strokeWidth="2">
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
                </div>

                {remoteStreamID && (
                    <div className="absolute bottom-20 left-4 bg-black/60 backdrop-blur-sm text-white text-[11px] font-medium px-2.5 py-1 rounded-full pointer-events-none">
                        Koode Admin Team
                    </div>
                )}

                
                <div className="absolute bottom-20 right-4 w-44 rounded-xl overflow-hidden shadow-2xl border border-white/10 bg-gray-900">
                    <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-auto object-cover" />
                    <div className="absolute bottom-1.5 left-2 bg-black/60 text-white text-[9px] font-medium px-1.5 py-0.5 rounded-full">You</div>
                </div>

                
                {mediaWarning && (
                    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10 bg-amber-600/90 backdrop-blur-sm rounded-xl px-5 py-2.5 flex items-center gap-3 max-w-sm">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="flex-shrink-0">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        <p className="text-white text-xs leading-tight">{mediaWarning}</p>
                        <button onClick={() => setMediaWarning(null)} className="text-white/70 hover:text-white border-none bg-transparent cursor-pointer flex-shrink-0 text-lg leading-none">×</button>
                    </div>
                )}

                
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
                    <CtrlBtn onClick={leaveRoom} danger title="Leave Interview">
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
        </div>
    );
}

import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ZegoExpressEngine } from "zego-express-engine-webrtc";
import { useAuthStore } from "../../store/auth.store";
import {
  approveConsultationJoin,
  exitConsultation,
  fetchConsultationMessages,
  getConsultationDetail,
  getConsultationToken,
  psychologistEnterConsultation,
  requestConsultationJoin,
  saveConsultationNotes,
  sendConsultationMessage,
} from "../../api/consultation.api";
import { uppercaseMeridiem } from "../../utils/indiaDateTime";
import { resolveMediaUrl } from "../../utils/url";

const formatMessageTime = (value) =>
  uppercaseMeridiem(new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value)));

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

const hasLiveTracks = (stream) =>
  Boolean(stream?.getTracks().some((track) => track.readyState === "live"));

const hasLiveTrack = (stream, kind) =>
  Boolean(stream?.getTracks().some((track) => track.kind === kind && track.readyState === "live"));

const getInitials = (name = "") => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
};

const VideoAvatar = ({ name, photo, compact = false }) => {
  const photoUrl = resolveMediaUrl(photo);
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
      <div className={`flex flex-col items-center ${compact ? "gap-2" : "gap-4"}`}>
        <div className={`${compact ? "h-16 w-16" : "h-28 w-28 md:h-36 md:w-36"} overflow-hidden rounded-full border border-white/15 bg-gradient-to-br from-emerald-500 to-sky-600 shadow-2xl`}>
          {photoUrl ? (
            <img src={photoUrl} alt={name || "Profile"} className="h-full w-full object-cover" />
          ) : (
            <div className={`${compact ? "text-xl" : "text-4xl md:text-5xl"} flex h-full w-full items-center justify-center font-bold text-white`}>
              {getInitials(name)}
            </div>
          )}
        </div>
        {!compact ? <p className="text-sm font-semibold text-slate-200">{name}</p> : null}
      </div>
    </div>
  );
};

const MediaStatus = ({ label }) => (
  <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/10 bg-black/55 px-4 py-3 text-center text-sm font-semibold text-slate-200 backdrop-blur">
    {label}
  </div>
);

const roleAccentClasses = {
  patient: {
    button: "bg-emerald-500 hover:bg-emerald-400",
    panel: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
  },
  psychologist: {
    button: "bg-sky-600 hover:bg-sky-500",
    panel: "border-sky-400/20 bg-sky-500/10 text-sky-100",
  },
};

const MicIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <path d="M12 19v3" />
  </svg>
);

const CameraIcon = () => (
  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 10l4.5-3v10L15 14v-4Z" />
    <rect x="3" y="6" width="12" height="12" rx="2" />
  </svg>
);

const ChatIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z" />
  </svg>
);

const PhoneOffIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.7 13.3a16 16 0 0 0 4 4l2.2-2.2a1.4 1.4 0 0 1 1.4-.34 11 11 0 0 0 3.5.56 1.2 1.2 0 0 1 1.2 1.2V20a2 2 0 0 1-2.18 2A19.8 19.8 0 0 1 2 3.18 2 2 0 0 1 4 1h3.5a1.2 1.2 0 0 1 1.2 1.2 11 11 0 0 0 .56 3.5 1.4 1.4 0 0 1-.34 1.4L6.7 9.3" />
    <path d="M22 2 2 22" />
  </svg>
);

const CtrlButton = ({ children, onClick, active = true, danger = false, title }) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    className={`relative flex h-11 w-11 items-center justify-center rounded-full border transition ${
      danger
        ? "border-red-500 bg-red-600 text-white hover:bg-red-500"
        : active
          ? "border-white/15 bg-white/15 text-white hover:bg-white/25"
          : "border-white/10 bg-slate-800 text-slate-400 hover:bg-slate-700"
    }`}
  >
    {children}
    {!active && !danger ? (
      <span className="pointer-events-none absolute h-[2px] w-8 rotate-45 rounded-full bg-red-500 shadow-[0_0_0_1px_rgba(0,0,0,0.25)]" />
    ) : null}
  </button>
);

const ConfirmModal = ({ role, onCancel, onConfirm, loading }) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 px-4">
    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
      <h2 className="text-lg font-bold text-slate-900">Exit consultation?</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        {role === "PSYCHOLOGIST"
          ? "Confirming will mark this appointment as completed and close the room."
          : "You will leave the consultation room. The appointment will remain active until the psychologist ends it."}
      </p>
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Exiting..." : "Confirm Exit"}
        </button>
      </div>
    </div>
  </div>
);

const ConsultationInRoomChat = ({ booking, role }) => {
  const user = useAuthStore((state) => state.user);
  const scrollRef = useRef(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const isPatient = role === "patient";
  const peerName = isPatient ? booking?.psychologist_name : booking?.patient_name;
  const accent = isPatient ? "bg-emerald-500" : "bg-sky-600";

  const messagesQuery = useQuery({
    queryKey: ["consultation-messages", booking?.id],
    queryFn: () => fetchConsultationMessages(booking.id),
    enabled: Boolean(booking?.id),
    refetchInterval: 2000,
    refetchOnWindowFocus: true,
  });

  const sendMutation = useMutation({
    mutationFn: (text) => sendConsultationMessage({ bookingId: booking.id, text }),
    onSuccess: () => {
      setDraft("");
      setError("");
      messagesQuery.refetch();
    },
    onError: (err) => {
      setError(err?.response?.data?.detail || err?.response?.data?.text || "Unable to send message.");
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesQuery.data?.results]);

  const sendMessage = () => {
    const text = draft.trim();
    if (!text || sendMutation.isPending) return;
    sendMutation.mutate(text);
  };

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Session Messages</p>
        <h2 className="mt-1 text-sm font-bold text-slate-900">{peerName}</h2>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50 px-4 py-5">
        {messagesQuery.isLoading ? (
          <p className="text-center text-sm text-slate-400">Loading messages...</p>
        ) : null}

        {!messagesQuery.isLoading && (messagesQuery.data?.results ?? []).length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-slate-400">
            No in-room messages yet.
          </div>
        ) : null}

        <div className="space-y-3">
          {(messagesQuery.data?.results ?? []).map((message) => {
            const mine = String(message.sender) === String(user?.id);
            return (
              <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                  mine
                    ? `${accent} rounded-br-sm text-white`
                    : "rounded-bl-sm border border-slate-200 bg-white text-slate-800"
                }`}>
                  {!mine ? (
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      {message.sender_name}
                    </p>
                  ) : null}
                  <p className="whitespace-pre-wrap break-words leading-relaxed">{message.text}</p>
                  <p className={`mt-1 text-right text-[10px] ${mine ? "text-white/70" : "text-slate-400"}`}>
                    {formatMessageTime(message.sent_at)}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={scrollRef} />
        </div>
      </div>

      <div className="border-t border-slate-200 bg-white px-4 py-3">
        {error ? <p className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{error}</p> : null}
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
              }
            }}
            rows={1}
            placeholder="Message in consultation..."
            className="max-h-28 flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-300 focus:bg-white"
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={!draft.trim() || sendMutation.isPending}
            className={`rounded-2xl px-4 py-3 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${accent}`}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

const ConsultationNotesPanel = ({ booking, consultation, onSaved }) => {
  const [patientNote, setPatientNote] = useState(() => consultation?.patient_note || "");
  const [psychologistNote, setPsychologistNote] = useState(() => consultation?.psychologist_note || "");
  const [statusText, setStatusText] = useState("");

  const saveMutation = useMutation({
    mutationFn: () => saveConsultationNotes({
      bookingId: booking.id,
      patientNote,
      psychologistNote,
    }),
    onSuccess: async () => {
      setStatusText("Saved");
      await onSaved?.();
      window.setTimeout(() => setStatusText(""), 1800);
    },
    onError: (err) => {
      setStatusText(err?.response?.data?.detail || "Unable to save notes.");
    },
  });

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Consultation note</p>
        <h2 className="mt-1 text-sm font-bold text-slate-900">{booking?.patient_name}</h2>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 px-4 py-5">
        <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
          <p className="text-sm font-bold text-slate-900">Prescription</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Shared with the patient after the consultation in their appointments area.
          </p>
          <textarea
            value={patientNote}
            onChange={(event) => setPatientNote(event.target.value)}
            rows={7}
            placeholder="Write prescription, care instructions, or follow-up guidance for the patient..."
            className="mt-3 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-300 focus:bg-white"
          />
        </div>

        <div className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
          <p className="text-sm font-bold text-slate-900">Consultation note</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Visible to psychologists for future sessions and continuity of care.
          </p>
          <textarea
            value={psychologistNote}
            onChange={(event) => setPsychologistNote(event.target.value)}
            rows={8}
            placeholder="Keep consultation observations, context, risk flags, or next-session reminders..."
            className="mt-3 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-sky-300 focus:bg-white"
          />
        </div>
      </div>

      <div className="border-t border-slate-200 bg-white px-4 py-3">
        {statusText ? <p className="mb-2 text-xs font-semibold text-slate-500">{statusText}</p> : null}
        <button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="w-full rounded-2xl bg-sky-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saveMutation.isPending ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
};

export default function ConsultationRoom({ role }) {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const authRole = useAuthStore((s) => s.role);
  const authUser = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const mediaDevicesSupported = typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
  const [previewStream, setPreviewStream] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const localStreamRef = useRef(null);
  const [remoteStreamID, setRemoteStreamID] = useState(null);
  const remoteStreamIDRef = useRef(null);
  const [remoteCamOn, setRemoteCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [phase, setPhase] = useState("preview");
  const [error, setError] = useState(() =>
    mediaDevicesSupported ? "" : "Camera or microphone access is not supported in this browser."
  );
  const [showChat, setShowChat] = useState(true);
  const [sidePanel, setSidePanel] = useState("messages");
  const [showExit, setShowExit] = useState(false);
  const engineRef = useRef(null);
  const localStreamIdRef = useRef(null);
  const previewStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const previewVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const joiningAfterAdmissionRef = useRef(false);

  const detailQuery = useQuery({
    queryKey: ["consultation", bookingId],
    queryFn: () => getConsultationDetail(bookingId),
    refetchInterval: phase === "ended" ? false : 2500,
  });

  const booking = detailQuery.data?.booking;
  const consultation = detailQuery.data?.consultation;
  const expectedRole = role === "patient" ? "PATIENT" : "PSYCHOLOGIST";
  const localName = authUser?.full_name || (role === "patient" ? booking?.patient_name : booking?.psychologist_name) || "You";
  const localPhoto = authUser?.profile_picture || (role === "psychologist" ? booking?.psychologist_photo : booking?.patient_photo);
  const remoteName = role === "patient" ? booking?.psychologist_name : booking?.patient_name;
  const remotePhoto = role === "patient" ? booking?.psychologist_photo : booking?.patient_photo;
  const previewHasVideo = hasLiveTrack(previewStream, "video");
  const previewHasAudio = hasLiveTrack(previewStream, "audio");
  const showPreviewVideo = camOn;
  const previewStatus = !mediaDevicesSupported
    ? "Camera or microphone is not supported in this browser."
    : !previewStream
      ? "Starting camera and microphone..."
      : camOn && previewHasVideo
        ? ""
        : camOn
          ? "Camera is unavailable"
          : "Camera is off";
  const accent = roleAccentClasses[role] ?? roleAccentClasses.patient;

  const stopPreviewStream = useCallback(() => {
    previewStreamRef.current?.getTracks().forEach((track) => track.stop());
    previewStreamRef.current = null;
    setPreviewStream(null);
  }, []);

  const attachPreviewVideo = useCallback((stream) => {
    const video = previewVideoRef.current;
    if (!video || !stream) return;
    if (video.srcObject !== stream) video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    video.play().catch(() => {});
  }, []);

  const startPreviewStream = useCallback(async () => {
    if (!mediaDevicesSupported) return null;
    if (hasLiveTracks(previewStreamRef.current)) {
      attachPreviewVideo(previewStreamRef.current);
      return previewStreamRef.current;
    }

    let stream = null;
    let cameraError = null;
    let micError = null;

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      setError("");
    } catch (combinedError) {
      const tracks = [];

      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        tracks.push(...videoStream.getVideoTracks());
      } catch (err) {
        cameraError = err;
      }

      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        tracks.push(...audioStream.getAudioTracks());
      } catch (err) {
        micError = err;
      }

      if (tracks.length === 0) throw combinedError;

      stream = new MediaStream(tracks);
      if (cameraError && !micError) setError("Camera access is unavailable. You can still join with microphone.");
      if (!cameraError && micError) setError("Microphone access is unavailable. You can still join with camera.");
      if (cameraError && micError) setError("Camera and microphone access are unavailable.");
    }

    const existing = previewStreamRef.current;
    if (existing && existing !== stream) {
      existing.getTracks().forEach((track) => track.stop());
    }

    previewStreamRef.current = stream;
    setPreviewStream(stream);
    attachPreviewVideo(stream);
    return stream;
  }, [attachPreviewVideo, mediaDevicesSupported]);

  useEffect(() => {
    if (phase === "call" || phase === "ended") return () => {};

    const timer = window.setTimeout(() => {
      startPreviewStream()
        .then(() => {})
        .catch(() => setError("Camera or microphone permission is required before joining."));
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [phase, startPreviewStream]);

  useEffect(() => () => stopPreviewStream(), [stopPreviewStream]);

  useEffect(() => {
    attachPreviewVideo(previewStream);
  }, [attachPreviewVideo, previewStream]);

  useEffect(() => {
    localStreamRef.current = localStream;
    if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    remoteStreamIDRef.current = remoteStreamID;
  }, [remoteStreamID]);

  useEffect(() => {
    if (!remoteStreamID || !engineRef.current) return;
    const attach = async () => {
      const stream = await engineRef.current.startPlayingStream(remoteStreamID);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
    };
    attach().catch((err) => setError(err?.message || "Unable to play remote stream."));
  }, [remoteStreamID]);

  const updateLocalCameraExtraInfo = useCallback((cameraOn) => {
    const engine = engineRef.current;
    const streamID = localStreamIdRef.current;
    if (!engine || !streamID) return;
    engine.setStreamExtraInfo(streamID, cameraExtraInfo(cameraOn)).catch(() => {});
  }, []);

  const cleanupRoom = useCallback(async () => {
    const engine = engineRef.current;
    if (engine) {
      try {
        if (localStreamIdRef.current) await engine.stopPublishingStream(localStreamIdRef.current);
        if (localStreamRef.current) engine.destroyStream(localStreamRef.current);
        await engine.logoutRoom();
      } catch (cleanupError) { void cleanupError; }
      try { ZegoExpressEngine.destroyEngine(); } catch (destroyError) { void destroyError; }
      engineRef.current = null;
    }
    localStreamIdRef.current = null;
    localStreamRef.current = null;
    remoteStreamIDRef.current = null;
    setLocalStream(null);
    setRemoteStreamID(null);
    setRemoteCamOn(true);
    joiningAfterAdmissionRef.current = false;
  }, []);

  useEffect(() => () => { cleanupRoom(); }, [cleanupRoom]);

  const loginAndPublish = useCallback(async () => {
    setError("");
    setPhase("connecting");
    const tokenData = await getConsultationToken(bookingId);
    const appId = parseInt(tokenData.app_id, 10);
    stopPreviewStream();
    try { ZegoExpressEngine.destroyEngine(); } catch (destroyError) { void destroyError; }
    const engine = new ZegoExpressEngine(appId, `wss://webliveroom${appId}-api.zegocloud.com/ws`);
    engineRef.current = engine;
    engine.on("roomStreamUpdate", (_roomID, updateType, streamList) => {
      if (updateType === "ADD") {
        const remote = streamList.find((stream) => stream.streamID !== localStreamIdRef.current);
        if (remote) {
          remoteStreamIDRef.current = remote.streamID;
          setRemoteStreamID(remote.streamID);
          setRemoteCamOn(parseCameraExtraInfo(remote.extraInfo));
        }
      }
      if (updateType === "DELETE") {
        streamList.forEach((stream) => {
          if (remoteStreamIDRef.current === stream.streamID) {
            remoteStreamIDRef.current = null;
            setRemoteCamOn(true);
            setRemoteStreamID(null);
          }
        });
      }
    });
    engine.on("streamExtraInfoUpdate", (_roomID, streamList) => {
      streamList.forEach((stream) => {
        if (remoteStreamIDRef.current === stream.streamID) setRemoteCamOn(parseCameraExtraInfo(stream.extraInfo));
      });
    });
    engine.on("remoteCameraStatusUpdate", (streamID, status) => {
      if (remoteStreamIDRef.current === streamID) setRemoteCamOn(status === "OPEN");
    });
    const loggedIn = await engine.loginRoom(tokenData.room_id, tokenData.token, {
      userID: tokenData.user_id,
      userName: tokenData.user_name,
    }, { userUpdate: true });
    if (loggedIn === false) throw new Error("Room login rejected.");

    const zegoStream = await engine.createStream({ camera: { audio: true, video: true } });
    const streamID = `${role}_${tokenData.user_id}_${Date.now()}`;
    localStreamIdRef.current = streamID;
    await engine.startPublishingStream(streamID, zegoStream);
    if (!micOn) engine.mutePublishStreamAudio(zegoStream, true);
    if (!camOn) engine.mutePublishStreamVideo(zegoStream, true);
    await engine.setStreamExtraInfo(streamID, cameraExtraInfo(camOn)).catch(() => {});
    setLocalStream(zegoStream);
    setPhase("call");
    joiningAfterAdmissionRef.current = false;
  }, [bookingId, camOn, micOn, role, stopPreviewStream]);

  const enterMutation = useMutation({
    mutationFn: async () => {
      if (role === "psychologist") {
        await psychologistEnterConsultation(bookingId);
        await loginAndPublish();
      } else {
        joiningAfterAdmissionRef.current = false;
        if (consultation?.patient_joined) {
          await loginAndPublish();
          return;
        }
        const data = await requestConsultationJoin(bookingId);
        queryClient.setQueryData(["consultation", bookingId], (current) => ({
          ...(current ?? {}),
          consultation: data.consultation ?? current?.consultation,
        }));
        if (data?.consultation?.patient_joined) {
          await loginAndPublish();
          return;
        }
        setPhase("waiting");
      }
    },
    onError: (err) => {
      setPhase("preview");
      setError(err?.response?.data?.detail || "Unable to enter consultation.");
    },
  });

  const joinAfterAdmission = useEffectEvent(() => {
    if (joiningAfterAdmissionRef.current) return;
    joiningAfterAdmissionRef.current = true;
    loginAndPublish().catch((err) => {
      joiningAfterAdmissionRef.current = false;
      setPhase("preview");
      setError(err?.response?.data?.detail || err?.message || "Unable to join room.");
    });
  });

  const approveMutation = useMutation({
    mutationFn: () => approveConsultationJoin(bookingId),
    onSuccess: (data) => {
      queryClient.setQueryData(["consultation", bookingId], (current) => ({
        ...(current ?? {}),
        consultation: data.consultation ?? current?.consultation,
      }));
      detailQuery.refetch();
    },
    onError: (err) => {
      setError(err?.response?.data?.detail || "Unable to admit patient.");
    },
  });

  const exitMutation = useMutation({
    mutationFn: () => exitConsultation(bookingId),
    onSuccess: async () => {
      await cleanupRoom();
      setPhase("ended");
      navigate(role === "patient" ? "/patient/appointments" : "/psychologist/appointments");
    },
  });

  const leaveAfterRemoteCompletion = useEffectEvent(() => {
    cleanupRoom().finally(() => {
      setPhase("ended");
      navigate(role === "patient" ? "/patient/appointments" : "/psychologist/appointments");
    });
  });

  useEffect(() => {
    if (role !== "patient" || phase !== "waiting" || !consultation?.patient_joined) return;
    joinAfterAdmission();
  }, [consultation?.patient_joined, phase, role]);

  useEffect(() => {
    if (role === "patient" && phase === "waiting") {
      joiningAfterAdmissionRef.current = false;
    }
  }, [phase, role]);

  useEffect(() => {
    if (role !== "patient" || phase !== "waiting") return () => {};

    let stopped = false;
    const pollAdmission = async () => {
      try {
        const data = await getConsultationDetail(bookingId);
        if (stopped) return;
        queryClient.setQueryData(["consultation", bookingId], data);
        if (data?.consultation?.patient_joined) joinAfterAdmission();
      } catch (err) {
        if (!stopped) setError(err?.response?.data?.detail || "Unable to check admission status.");
      }
    };

    pollAdmission();
    const interval = window.setInterval(pollAdmission, 1000);
    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, [bookingId, phase, queryClient, role]);

  useEffect(() => {
    if (phase !== "call" || consultation?.status !== "COMPLETED" || exitMutation.isPending) return;
    leaveAfterRemoteCompletion();
  }, [consultation?.status, exitMutation.isPending, phase]);

  useEffect(() => {
    if (phase !== "call" || consultation?.is_open !== false || exitMutation.isPending) return;
    leaveAfterRemoteCompletion();
  }, [consultation?.is_open, exitMutation.isPending, phase]);

  const togglePreviewTrack = (kind) => {
    const tracks = kind === "audio" ? previewStream?.getAudioTracks() : previewStream?.getVideoTracks();
    if (!tracks?.length) {
      startPreviewStream().catch(() => setError("Camera or microphone permission is required before joining."));
      return;
    }
    tracks?.forEach((track) => { track.enabled = !track.enabled; });
    if (kind === "audio") setMicOn((value) => !value);
    if (kind === "video") setCamOn((value) => !value);
  };

  const togglePublishedTrack = (kind) => {
    if (!engineRef.current || !localStream) return;
    if (kind === "audio") {
      engineRef.current.mutePublishStreamAudio(localStream, micOn);
      setMicOn((value) => !value);
    } else {
      const nextCamOn = !camOn;
      const updated = engineRef.current.mutePublishStreamVideo(localStream, camOn);
      if (updated === false) return;
      setCamOn(nextCamOn);
      updateLocalCameraExtraInfo(nextCamOn);
    }
  };

  if (!isAuthenticated || authRole !== expectedRole) {
    return <Navigate to={role === "patient" ? "/patient/login" : "/psychologist/login"} replace />;
  }

  if (detailQuery.isLoading) {
    return <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-300">Loading consultation...</div>;
  }

  if (!consultation?.is_open && phase !== "call") {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 px-4 text-center text-white">
        <div>
          <h1 className="text-xl font-bold">Consultation room is not active</h1>
          <p className="mt-2 text-sm text-slate-400">The room opens 5 minutes before the appointment time and closes when the slot time ends.</p>
          <button onClick={() => navigate(-1)} className="mt-5 rounded-xl bg-white px-5 py-2 text-sm font-bold text-slate-950">Go back</button>
        </div>
      </div>
    );
  }

  if (phase !== "call") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8 text-white">
        <div className="grid w-full max-w-5xl items-stretch gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="relative min-h-[260px] overflow-hidden rounded-[28px] border border-white/10 bg-black sm:min-h-[360px] lg:aspect-video lg:min-h-0">
            <video
              ref={(node) => {
                previewVideoRef.current = node;
                if (node) attachPreviewVideo(previewStreamRef.current);
              }}
              autoPlay
              muted
              playsInline
              onLoadedMetadata={() => attachPreviewVideo(previewStreamRef.current)}
              onCanPlay={() => attachPreviewVideo(previewStreamRef.current)}
              className={`absolute inset-0 h-full w-full bg-black object-cover ${showPreviewVideo ? "" : "opacity-0"}`}
            />
            {!camOn ? <VideoAvatar name={localName} photo={localPhoto} /> : null}
            {previewStatus ? <MediaStatus label={previewStatus} /> : null}
          </div>
          <div className="flex min-h-[260px] flex-col rounded-[28px] border border-white/10 bg-white/10 p-6 backdrop-blur">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Waiting Room</p>
            <h1 className="mt-2 text-2xl font-bold">{role === "patient" ? booking?.psychologist_name : booking?.patient_name}</h1>
            <p className="mt-2 text-sm text-slate-300">{booking?.date} · {booking?.start_time} - {booking?.end_time}</p>
            {error ? <p className="mt-4 rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-200">{error}</p> : null}
            {phase === "waiting" ? (
              <div className={`mt-6 rounded-2xl border p-4 text-sm ${accent.panel}`}>
                Waiting for the psychologist to admit you.
              </div>
            ) : null}
            <div className="mt-auto flex gap-3 pt-6">
              <CtrlButton active={micOn} onClick={() => togglePreviewTrack("audio")} title={previewHasAudio ? "Microphone" : "Microphone unavailable"}>
                <MicIcon />
              </CtrlButton>
              <CtrlButton active={camOn} onClick={() => togglePreviewTrack("video")} title={previewHasVideo ? "Camera" : "Camera unavailable"}>
                <CameraIcon />
              </CtrlButton>
            </div>
            <button
              type="button"
              disabled={enterMutation.isPending || phase === "waiting" || phase === "connecting"}
              onClick={() => enterMutation.mutate()}
              className={`mt-7 w-full rounded-2xl px-5 py-3 text-sm font-bold text-white transition disabled:opacity-60 ${accent.button}`}
            >
              {role === "patient" ? (consultation?.patient_joined ? "Rejoin" : "Request to Join") : "Enter Consultation"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-black">
      <div className="relative flex-1 bg-slate-950">
        {remoteStreamID ? (
          <>
            <video ref={remoteVideoRef} autoPlay playsInline className={`absolute inset-0 h-full w-full object-cover ${remoteCamOn ? "" : "opacity-0"}`} />
            {!remoteCamOn ? <VideoAvatar name={remoteName} photo={remotePhoto} /> : null}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-500">
            Waiting for {role === "patient" ? "psychologist" : "patient"}...
          </div>
        )}
        <div className="absolute right-4 top-4 aspect-video w-44 overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
          <video ref={localVideoRef} autoPlay muted playsInline className={`h-full w-full object-cover ${camOn ? "" : "opacity-0"}`} />
          {!camOn ? <VideoAvatar name={localName} photo={localPhoto} compact /> : null}
          <div className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">You</div>
        </div>
        {role === "psychologist" && consultation?.patient_requested_join ? (
          <div className="absolute left-1/2 top-5 z-20 flex -translate-x-1/2 items-center gap-3 rounded-2xl bg-amber-500 px-4 py-3 text-sm font-bold text-white shadow-xl">
            Patient is waiting to join
            <button onClick={() => approveMutation.mutate()} className="rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-amber-700">
              Admit
            </button>
          </div>
        ) : null}
        <div className="absolute bottom-0 left-0 right-0 flex h-20 items-center justify-center gap-3 bg-gradient-to-t from-black/90 to-transparent">
          <CtrlButton active={micOn} onClick={() => togglePublishedTrack("audio")} title="Microphone"><MicIcon /></CtrlButton>
          <CtrlButton active={camOn} onClick={() => togglePublishedTrack("video")} title="Camera"><CameraIcon /></CtrlButton>
          <CtrlButton active={showChat} onClick={() => setShowChat((value) => !value)} title="Messages"><ChatIcon /></CtrlButton>
          <CtrlButton danger onClick={() => setShowExit(true)} title="Exit"><PhoneOffIcon /></CtrlButton>
        </div>
      </div>
      {showChat ? (
        <aside className="w-[360px] border-l border-slate-800 bg-white">
          {role === "psychologist" ? (
            <div className="flex h-full flex-col">
              <div className="grid grid-cols-2 gap-2 border-b border-slate-200 bg-white p-3">
                <button
                  type="button"
                  onClick={() => setSidePanel("messages")}
                  className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                    sidePanel === "messages"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Messages
                </button>
                <button
                  type="button"
                  onClick={() => setSidePanel("notes")}
                  className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                    sidePanel === "notes"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Consultation note
                </button>
              </div>
              <div className="min-h-0 flex-1">
                {sidePanel === "notes" ? (
                  <ConsultationNotesPanel
                    key={consultation?.id || booking?.id}
                    booking={booking}
                    consultation={consultation}
                    onSaved={() => detailQuery.refetch()}
                  />
                ) : (
                  <ConsultationInRoomChat booking={booking} role={role} />
                )}
              </div>
            </div>
          ) : (
            <ConsultationInRoomChat booking={booking} role={role} />
          )}
        </aside>
      ) : null}
      {showExit ? (
        <ConfirmModal
          role={expectedRole}
          loading={exitMutation.isPending}
          onCancel={() => setShowExit(false)}
          onConfirm={() => exitMutation.mutate()}
        />
      ) : null}
    </div>
  );
}

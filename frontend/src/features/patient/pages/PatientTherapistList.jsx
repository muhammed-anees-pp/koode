import React, { useState, useRef, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { fetchPatientTherapists, fetchSpecializations } from "../../../api/patient.api";
import PatientNavbar from "../../../components/patient/Navbar/PatientNavbar";
import PatientFooter from "../../../components/patient/Footer/PatientFooter";

const BAR_HEIGHTS = [
  34, 58, 42, 76, 52, 88, 46, 68, 38, 82, 56, 94, 48, 72, 44, 86, 60, 40,
  78, 50, 92, 62, 36, 74, 54, 84, 46, 66, 90, 52, 70, 44, 80, 58, 96, 48,
  64, 42, 76, 56, 88, 46,
];

const formatRating = (value) => {
  if (value == null) return "New";
  return Number(value).toFixed(1);
};

const formatSessionCharge = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return "Fee unavailable";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
};

function Waveform({ isPlaying, progress = 0, disabled = false }) {
  const normalizedProgress = Math.max(0, Math.min(progress, 1));
  const activeBars = Math.max(1, Math.ceil(normalizedProgress * BAR_HEIGHTS.length));

  return (
    <div
      aria-hidden="true"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 3,
        height: 36,
        width: "100%",
        minWidth: 0,
        flex: "1 1 auto",
        overflow: "hidden",
      }}
    >
      {BAR_HEIGHTS.map((h, i) => (
        <div
          key={i}
          style={{
            flex: "1 1 0",
            minWidth: 2,
            maxWidth: 6,
            height: `${h}%`,
            background: disabled
              ? "#cbd5d9"
              : i < activeBars
                ? "linear-gradient(180deg, #00897b 0%, #26c6da 100%)"
                : "#d9e6e4",
            borderRadius: 100,
            opacity: disabled ? 0.65 : 1,
            transformOrigin: "center",
            animation: isPlaying ? `waveformPulse ${0.75 + (i % 6) * 0.08}s ease-in-out infinite` : "none",
            animationDelay: `${i * 0.035}s`,
            transition: "background 0.25s ease, opacity 0.25s ease",
          }}
        />
      ))}
    </div>
  );
}

const TherapistCard = ({ therapist }) => {
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);

  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => setCurrentTime(el.currentTime);
    const onLoaded = () => setDuration(el.duration);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlay = (e) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      return;
    }
    audioRef.current.play().catch(() => setIsPlaying(false));
  };

  const handleQuickView = (e) => {
    e.stopPropagation();
    navigate(`/patient/therapists/${therapist.psychologist_id}`);
  };

  const handleBook = (e) => {
    e.stopPropagation();
    const nextSlot = therapist.next_available_slot;
    if (nextSlot?.date && nextSlot?.id) {
      navigate(`/patient/therapists/${therapist.psychologist_id}/book?date=${nextSlot.date}&slot=${nextSlot.id}`);
      return;
    }
    navigate(`/patient/therapists/${therapist.psychologist_id}`);
  };

  const years = Number(therapist.years_of_experience || 0);
  const experienceLabel = years > 0
    ? `${years} year${years === 1 ? "" : "s"} experience`
    : "Experience not listed";
  const therapyHours = Number(therapist.total_experience_hours || 0);
  const therapyHoursLabel = therapyHours > 0
    ? `${Math.round(therapyHours).toLocaleString("en-IN")} therapy hour${Math.round(therapyHours) === 1 ? "" : "s"}`
    : null;
  const rating = therapist.ratings?.average_rating;
  const nextSlot = therapist.next_available_slot;
  const hasAudioIntro = Boolean(therapist.audio_intro);
  const waveformProgress = duration ? currentTime / duration : 0;

  return (
    <div
      style={{
        background: "#f4f8f8",
        borderRadius: 20,
        padding: "24px 22px 20px",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
        border: "1px solid #e8efef",
        transition: "box-shadow 0.25s, transform 0.25s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.09)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.04)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <p style={{ fontWeight: 700, fontSize: 18, color: "#111", margin: 0, lineHeight: 1.3 }}>
            {therapist.full_name}
          </p>
          <p style={{ fontSize: 13, color: "#777", margin: "3px 0 0" }}>
            {therapist.job_title || "Consultant Psychologist"}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#fff8e1", border: "1px solid #fde68a", borderRadius: 999, padding: "3px 8px", fontSize: 12, fontWeight: 700, color: "#92400e" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
              {formatRating(rating)}
            </span>
          </div>
        </div>
        <div style={{ width: 62, height: 62, borderRadius: "50%", overflow: "hidden", flexShrink: 0, background: "#c8d8d8", border: "2.5px solid #fff", boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}>
          {therapist.profile_picture ? (
            <img src={therapist.profile_picture} alt={therapist.full_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#4db6ac", color: "#fff", fontWeight: 700, fontSize: 22 }}>
              {therapist.full_name?.charAt(0)}
            </div>
          )}
        </div>
      </div>


      <button
        onClick={handleQuickView}
        style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", border: "1.5px solid #dde4e4", borderRadius: 100, padding: "5px 14px", fontSize: 13, fontWeight: 600, color: "#222", cursor: "pointer", marginBottom: 18 }}
      >
        Quick View
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>


      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "#0f766e", fontWeight: 700 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {experienceLabel}
          </span>
          {therapyHoursLabel && (
            <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>
              {therapyHoursLabel}
            </span>
          )}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {therapist.specializations?.slice(0, 3).map((spec, idx) => (
            <span key={idx} style={{ background: "#fff", border: "1.5px solid #dde4e4", borderRadius: 100, padding: "4px 12px", fontSize: 12, fontWeight: 500, color: "#444" }}>
              {spec}
            </span>
          ))}
          {therapist.specializations?.length > 3 && (
            <span style={{ background: "#fff", border: "1.5px solid #dde4e4", borderRadius: 100, padding: "4px 12px", fontSize: 12, fontWeight: 500, color: "#888" }}>
              +{therapist.specializations.length - 3}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, background: "#ffffff", border: "1.5px solid #e3eceb", borderRadius: 16, padding: "12px 14px", marginBottom: 14 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0, fontSize: 12, color: "#64748b", fontWeight: 700 }}>
          <span style={{ width: 26, height: 26, borderRadius: "50%", background: "#ecfdf5", color: "#00897b", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 3h12" />
              <path d="M6 8h12" />
              <path d="M6 13h8" />
              <path d="M6 3c6.5 0 6.5 10 0 10" />
              <path d="M6 13l8 8" />
            </svg>
          </span>
          Session charge
        </span>
        <span style={{ color: "#111827", fontSize: 16, fontWeight: 800, whiteSpace: "nowrap" }}>
          {formatSessionCharge(therapist.consultation_fee)}
          <span style={{ color: "#94a3b8", fontSize: 12, fontWeight: 700, marginLeft: 4 }}>/ session</span>
        </span>
      </div>

      <div style={{ background: "#fff", borderRadius: 18, padding: "9px 14px 9px 9px", display: "flex", alignItems: "center", gap: 11, marginBottom: 18, border: "1.5px solid #e8efef", minWidth: 0 }}>
        <button
          onClick={togglePlay}
          disabled={!hasAudioIntro}
          aria-label={isPlaying ? "Pause audio intro" : "Play audio intro"}
          style={{ width: 38, height: 38, borderRadius: "50%", border: "1.5px solid #d7e4e2", background: hasAudioIntro ? "#111" : "#f1f5f9", color: hasAudioIntro ? "#fff" : "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", cursor: hasAudioIntro ? "pointer" : "not-allowed", flexShrink: 0 }}
        >
          {isPlaying ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
          )}
        </button>
        <Waveform isPlaying={isPlaying} progress={waveformProgress} disabled={!hasAudioIntro} />
        <span style={{ fontSize: 12, color: "#64748b", fontWeight: 700, flexShrink: 0, minWidth: 34, textAlign: "right" }}>
          {hasAudioIntro ? (duration ? fmt(Math.max(duration - currentTime, 0)) : "0:00") : "--:--"}
        </span>
        {therapist.audio_intro && (
          <audio ref={audioRef} src={therapist.audio_intro} style={{ display: "none" }} />
        )}
      </div>


      <div style={{ height: 1, background: "#e2eaea", marginBottom: 14 }} />


      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 11, color: "#aaa", margin: "0 0 2px" }}>Next available slot:</p>
          <p style={{ fontSize: 13, color: "#00897b", fontWeight: 600, margin: 0 }}>
            {nextSlot?.label || "No upcoming slots"}
          </p>
        </div>
        <button
          onClick={handleBook}
          style={{ background: "#111", color: "#fff", border: "none", borderRadius: 100, padding: "10px 20px", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", transition: "background 0.2s" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#333")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#111")}
        >
          Book
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
    </div>
  );
};

const SkeletonCard = () => (
  <div style={{ background: "#f4f8f8", borderRadius: 20, padding: "24px 22px 20px", height: 340, animation: "pulse 1.5s ease-in-out infinite" }} />
);

const SORT_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "name_asc", label: "Name: A → Z" },
  { value: "name_desc", label: "Name: Z → A" },
  { value: "fee_asc", label: "Fee: Low → High" },
  { value: "fee_desc", label: "Fee: High → Low" },
  { value: "exp_desc", label: "Experience: Most first" },
  { value: "exp_asc", label: "Experience: Least first" },
];



export default function PatientTherapistList() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["patient-therapists"],
    queryFn: fetchPatientTherapists,
  });

  const { data: specsData } = useQuery({
    queryKey: ["specializations"],
    queryFn: fetchSpecializations,
  });

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [activeSpec, setActiveSpec] = useState(null);
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const sortRef = useRef(null);
  const filterRef = useRef(null);

  const allTherapists = useMemo(() => data?.results || [], [data]);
  const allSpecs = useMemo(() => {
    if (specsData?.length) return specsData.map((s) => s.name);
    const set = new Set();
    allTherapists.forEach((t) => t.specializations?.forEach((s) => set.add(s)));
    return Array.from(set).sort();
  }, [specsData, allTherapists]);

  useEffect(() => {
    const handler = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false);
      if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const displayed = useMemo(() => {
    let list = [...allTherapists];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.full_name?.toLowerCase().includes(q) ||
          t.job_title?.toLowerCase().includes(q) ||
          t.specializations?.some((s) => s.toLowerCase().includes(q))
      );
    }

    if (activeSpec) {
      list = list.filter((t) => t.specializations?.includes(activeSpec));
    }

    switch (sortBy) {
      case "name_asc":  list.sort((a, b) => a.full_name?.localeCompare(b.full_name)); break;
      case "name_desc": list.sort((a, b) => b.full_name?.localeCompare(a.full_name)); break;
      case "fee_asc":   list.sort((a, b) => (a.consultation_fee || 0) - (b.consultation_fee || 0)); break;
      case "fee_desc":  list.sort((a, b) => (b.consultation_fee || 0) - (a.consultation_fee || 0)); break;
      case "exp_desc":  list.sort((a, b) => (b.years_of_experience || 0) - (a.years_of_experience || 0)); break;
      case "exp_asc":   list.sort((a, b) => (a.years_of_experience || 0) - (b.years_of_experience || 0)); break;
      default: break;
    }
    return list;
  }, [allTherapists, search, sortBy, activeSpec]);

  const activeSortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label || "Sort";
  const hasFilters = search.trim() || activeSpec || sortBy !== "default";
  const clearAll = () => { setSearch(""); setActiveSpec(null); setSortBy("default"); };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#fff", fontFamily: "'DM Sans', sans-serif" }}>
      <PatientNavbar />

      <main style={{ flex: 1, maxWidth: 1240, width: "100%", margin: "0 auto", padding: "7rem 24px 80px" }}>


        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: "clamp(1.8rem,3.5vw,2.6rem)", fontWeight: 800, color: "#0f172a", margin: "0 0 10px", letterSpacing: "-0.5px" }}>
            Find the right{" "}
            <span style={{ background: "linear-gradient(135deg,#00897b,#26c6da)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Therapist
            </span>{" "}
            for you
          </h1>
          <p style={{ fontSize: 16, color: "#64748b", maxWidth: 580, margin: 0, lineHeight: 1.6 }}>
            Browse our licensed, verified professionals. Search, filter by specialization, and sort to find your best match.
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 220, position: "relative" }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#aaa", pointerEvents: "none", display: "flex" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search by name, title or specialization…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", padding: "11px 40px 11px 40px", border: "1.5px solid #dde4e4", borderRadius: 12, fontSize: 14, outline: "none", background: "#f9fbfb", color: "#222", boxSizing: "border-box", transition: "border-color 0.2s" }}
              onFocus={(e) => (e.target.style.borderColor = "#00897b")}
              onBlur={(e) => (e.target.style.borderColor = "#dde4e4")}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#aaa", display: "flex", alignItems: "center" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          <div ref={filterRef} style={{ position: "relative" }}>
            <button
              onClick={() => { setFilterOpen((o) => !o); setSortOpen(false); }}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 18px", border: `1.5px solid ${activeSpec ? "#00897b" : "#dde4e4"}`, borderRadius: 12, background: activeSpec ? "#f0faf9" : "#f9fbfb", fontSize: 14, fontWeight: 500, color: activeSpec ? "#00897b" : "#555", cursor: "pointer", whiteSpace: "nowrap" }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              {activeSpec || "Specialization"}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: filterOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {filterOpen && (
              <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, background: "#fff", border: "1.5px solid #e8efef", borderRadius: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.1)", zIndex: 100, minWidth: 220, maxHeight: 280, overflowY: "auto" }}>
                <button
                  onClick={() => { setActiveSpec(null); setFilterOpen(false); }}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 16px", border: "none", background: !activeSpec ? "#f0faf9" : "transparent", color: !activeSpec ? "#00897b" : "#333", fontWeight: !activeSpec ? 600 : 400, fontSize: 14, cursor: "pointer" }}
                  onMouseEnter={(e) => { if (activeSpec) e.currentTarget.style.background = "#f9fbfb"; }}
                  onMouseLeave={(e) => { if (activeSpec) e.currentTarget.style.background = "transparent"; }}
                >
                  All
                </button>
                {allSpecs.map((spec) => (
                  <button
                    key={spec}
                    onClick={() => { setActiveSpec(spec); setFilterOpen(false); }}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 16px", border: "none", background: activeSpec === spec ? "#f0faf9" : "transparent", color: activeSpec === spec ? "#00897b" : "#333", fontWeight: activeSpec === spec ? 600 : 400, fontSize: 14, cursor: "pointer" }}
                    onMouseEnter={(e) => { if (activeSpec !== spec) e.currentTarget.style.background = "#f9fbfb"; }}
                    onMouseLeave={(e) => { if (activeSpec !== spec) e.currentTarget.style.background = "transparent"; }}
                  >
                    {spec}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div ref={sortRef} style={{ position: "relative" }}>
            <button
              onClick={() => { setSortOpen((o) => !o); setFilterOpen(false); }}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 18px", border: `1.5px solid ${sortBy !== "default" ? "#00897b" : "#dde4e4"}`, borderRadius: 12, background: sortBy !== "default" ? "#f0faf9" : "#f9fbfb", fontSize: 14, fontWeight: 500, color: sortBy !== "default" ? "#00897b" : "#555", cursor: "pointer", whiteSpace: "nowrap" }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" /><line x1="6" y1="12" x2="18" y2="12" /><line x1="9" y1="18" x2="15" y2="18" />
              </svg>
              {activeSortLabel}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: sortOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {sortOpen && (
              <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, background: "#fff", border: "1.5px solid #e8efef", borderRadius: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.1)", zIndex: 100, minWidth: 200, overflow: "hidden" }}>
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setSortBy(opt.value); setSortOpen(false); }}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 16px", border: "none", background: sortBy === opt.value ? "#f0faf9" : "transparent", color: sortBy === opt.value ? "#00897b" : "#333", fontWeight: sortBy === opt.value ? 600 : 400, fontSize: 14, cursor: "pointer" }}
                    onMouseEnter={(e) => { if (sortBy !== opt.value) e.currentTarget.style.background = "#f9fbfb"; }}
                    onMouseLeave={(e) => { if (sortBy !== opt.value) e.currentTarget.style.background = "transparent"; }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={clearAll}
            disabled={!hasFilters}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "11px 18px", borderRadius: 12, border: `1.5px solid ${hasFilters ? "#f87171" : "#e8efef"}`, background: hasFilters ? "#fff5f5" : "#fafafa", color: hasFilters ? "#dc2626" : "#ccc", fontSize: 14, fontWeight: 500, cursor: hasFilters ? "pointer" : "not-allowed", whiteSpace: "nowrap", transition: "all 0.15s" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Clear filters
          </button>
        </div>


        {!isLoading && !isError && allTherapists.length > 0 && (
          <p style={{ fontSize: 14, color: "#888", margin: "0 0 20px" }}>
            Showing <strong style={{ color: "#222" }}>{displayed.length}</strong> of {allTherapists.length} therapists
          </p>
        )}


        {isLoading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 24 }}>
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : isError ? (
          <div style={{ textAlign: "center", padding: "80px 0", background: "#fff5f5", borderRadius: 16, color: "#e53e3e" }}>
            Failed to load therapists. Please try again later.
          </div>
        ) : displayed.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", background: "#f4f8f8", borderRadius: 20 }}>
            <p style={{ fontSize: 18, fontWeight: 600, color: "#555", margin: "0 0 8px" }}>No results found</p>
            <p style={{ fontSize: 14, color: "#aaa", margin: "0 0 20px" }}>Try adjusting your search or filters.</p>
            <button
              onClick={clearAll}
              style={{ background: "#00897b", color: "#fff", border: "none", borderRadius: 100, padding: "10px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 24 }}>
            {displayed.map((therapist) => (
              <TherapistCard key={therapist.psychologist_id} therapist={therapist} />
            ))}
          </div>
        )}
      </main>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes waveformPulse { 0%, 100% { transform: scaleY(0.78); } 50% { transform: scaleY(1.08); } }
        input::placeholder { color: #bbb; }
      `}</style>

      <PatientFooter />
    </div>
  );
}

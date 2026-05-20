import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  fetchPsychologistFinderQuestions,
  submitPsychologistFinderAnswers,
} from "../../../api/patient.api";
import PatientNavbar from "../../../components/patient/Navbar/PatientNavbar";
import PatientFooter from "../../../components/patient/Footer/PatientFooter";

const assessmentSteps = [
  "Share",
  "Refine",
  "Match",
];

const starterConcerns = [
  "Stress",
  "Anxiety",
  "Mood",
  "Relationships",
  "Trauma",
  "Child care",
];

const iconPaths = {
  spark: "m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z",
  chart: "M4 19V5M8 17v-6M12 17V8M16 17v-9M20 17v-4",
  clock: "M12 6v6l4 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  star: "m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17.7 6.6 20.5l1-6.1-4.4-4.3 6.1-.9L12 3Z",
  arrow: "M5 12h14M13 5l7 7-7 7",
  user: "M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z",
  calendar: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z",
};

const Icon = ({ name, className = "h-5 w-5", strokeWidth = 2 }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill={name === "spark" || name === "star" ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={iconPaths[name]} />
  </svg>
);

const formatRating = (value) => {
  if (value == null) return "New";
  return Number(value).toFixed(1);
};

const formatFee = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return "Fee unavailable";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
};

const ChoiceButton = ({ selected, children, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`group flex w-full items-center gap-4 rounded-xl border px-4 py-4 text-left transition-all duration-200 sm:px-5 ${
      selected
        ? "border-patient-primary bg-white text-[#0f172a] shadow-[0_16px_34px_rgba(26,190,170,0.16)] ring-4 ring-patient-primary/10"
        : "border-[#dfe8ee] bg-white/80 text-[#334155] hover:-translate-y-0.5 hover:border-patient-primary/70 hover:bg-white hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)]"
    }`}
  >
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all ${
        selected
          ? "border-patient-primary bg-patient-primary text-white"
          : "border-[#cbd5e1] bg-[#f8fafc] text-transparent group-hover:border-patient-primary"
      }`}
    >
      <span className="h-2.5 w-2.5 rounded-full bg-current" />
    </span>
    <span className="min-w-0 flex-1 text-sm font-bold leading-6 sm:text-base">{children}</span>
  </button>
);

const StepBar = ({ currentStep }) => (
  <div className="rounded-xl border border-white/70 bg-white/85 p-4 shadow-[0_14px_36px_rgba(15,23,42,0.06)] backdrop-blur">
    <div className="relative grid grid-cols-3 gap-2">
      <div className="absolute left-[16.5%] right-[16.5%] top-4 h-1 rounded-full bg-[#e2e8f0]" />
      <div
        className="absolute left-[16.5%] top-4 h-1 rounded-full bg-gradient-to-r from-patient-primary to-[#8b5cf6] transition-all duration-500"
        style={{ width: currentStep === 0 ? "0%" : currentStep === 1 ? "33.5%" : "67%" }}
      />
      {assessmentSteps.map((step, index) => {
        const active = index <= currentStep;
        return (
          <div key={step} className="relative z-10 flex flex-col items-center gap-2">
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-extrabold transition-all ${
                active
                  ? "bg-patient-primary text-white shadow-[0_8px_18px_rgba(26,190,170,0.26)]"
                  : "bg-[#eef2f7] text-[#94a3b8]"
              }`}
            >
              {index + 1}
            </span>
            <span className={`text-xs font-extrabold sm:text-sm ${active ? "text-[#0f172a]" : "text-[#94a3b8]"}`}>
              {step}
            </span>
          </div>
        );
      })}
    </div>
  </div>
);

const TherapistMiniCard = ({ therapist }) => {
  const navigate = useNavigate();
  const initials = therapist.full_name?.charAt(0)?.toUpperCase() || "K";
  const nextSlot = therapist.next_available_slot?.label || "No upcoming slots";
  const rating = formatRating(therapist.ratings?.average_rating);
  const years = Number(therapist.years_of_experience || 0);

  const viewProfile = () => navigate(`/patient/therapists/${therapist.psychologist_id}`);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-[#e4edf2] bg-white shadow-[0_14px_38px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-patient-primary/40 hover:shadow-[0_22px_54px_rgba(15,23,42,0.12)]">
      <div className="h-1.5 bg-gradient-to-r from-patient-primary via-[#4aa3ff] to-[#8b5cf6]" />
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#64748b]">
              Recommended match
            </p>
            <h3 className="mt-2 truncate font-outfit text-lg font-extrabold tracking-tight text-[#0f172a]">
              {therapist.full_name}
            </h3>
            <p className="mt-1 line-clamp-1 text-sm font-medium text-[#64748b]">
              {therapist.job_title || "Consultant Psychologist"}
            </p>
          </div>
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#d9f5f1] ring-4 ring-[#effdfa]">
            {therapist.profile_picture ? (
              <img src={therapist.profile_picture} alt={therapist.full_name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-patient-primary to-[#4aa3ff] text-xl font-extrabold text-white">
                {initials}
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-[#f8fafc] p-3">
            <p className="flex items-center gap-1.5 text-xs font-bold text-[#64748b]">
              <Icon name="star" className="h-3.5 w-3.5 text-[#f59e0b]" />
              Rating
            </p>
            <p className="mt-1 text-sm font-extrabold text-[#0f172a]">
              {rating}
            </p>
          </div>
          <div className="rounded-xl bg-[#f8fafc] p-3">
            <p className="flex items-center gap-1.5 text-xs font-bold text-[#64748b]">
              <Icon name="clock" className="h-3.5 w-3.5 text-patient-primary" />
              Experience
            </p>
            <p className="mt-1 text-sm font-extrabold text-[#0f172a]">
              {years > 0 ? `${years} yr${years === 1 ? "" : "s"}` : "Listed"}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {therapist.specializations?.slice(0, 3).map((item) => (
            <span key={item} className="rounded-full bg-[#effdfa] px-3 py-1 text-xs font-bold text-[#0f766e]">
              {item}
            </span>
          ))}
          {therapist.specializations?.length > 3 && (
            <span className="rounded-full bg-[#f1f5f9] px-3 py-1 text-xs font-bold text-[#64748b]">
              +{therapist.specializations.length - 3}
            </span>
          )}
        </div>

        <div className="mt-6 space-y-3 border-t border-[#edf2f7] pt-5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#94a3b8]">Fee</span>
            <span className="text-sm font-extrabold text-[#0f172a]">{formatFee(therapist.consultation_fee)}</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#94a3b8]">Next slot</span>
            <span className="max-w-[170px] text-right text-sm font-extrabold text-patient-primary">{nextSlot}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={viewProfile}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0f172a] px-5 py-3 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-[#243044] focus:outline-none focus:ring-4 focus:ring-[#0f172a]/15"
        >
          View profile
          <Icon name="arrow" className="h-4 w-4" strokeWidth={2.4} />
        </button>
      </div>
    </article>
  );
};

export default function PatientPsychologistFinder() {
  const navigate = useNavigate();
  const [started, setStarted] = useState(false);
  const [history, setHistory] = useState(["root"]);
  const [answers, setAnswers] = useState([]);
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  const [concernText, setConcernText] = useState("");

  const { data: questionData, isLoading: isQuestionsLoading, isError: isQuestionsError } = useQuery({
    queryKey: ["psychologist-finder-questions"],
    queryFn: fetchPsychologistFinderQuestions,
  });

  const questionTree = questionData?.question_tree;
  const currentQuestionId = history[history.length - 1];
  const currentQuestion = questionTree ? questionTree[currentQuestionId] : null;
  const isFinalStep = currentQuestionId === "done";
  const currentBarStep = isFinalStep ? 1 : 0;

  const recommendationMutation = useMutation({
    mutationFn: submitPsychologistFinderAnswers,
  });

  const result = recommendationMutation.data;
  const recommendation = result?.recommendation;
  const psychologists = useMemo(() => result?.psychologists || [], [result]);

  const selectAnswer = (option) => {
    setSelectedOptionId(option.id);
  };

  const goNext = () => {
    if (!selectedOptionId || !currentQuestion?.options) return;

    const option = currentQuestion.options.find((item) => item.id === selectedOptionId);
    if (!option) return;

    setAnswers((prev) => [...prev, option.id]);
    setHistory((prev) => [...prev, option.next]);
    setSelectedOptionId(null);
  };

  const submitFinal = () => {
    recommendationMutation.mutate({ answers, concernText });
  };

  const goBack = () => {
    if (history.length === 1) {
      setStarted(false);
      return;
    }
    setHistory((prev) => prev.slice(0, -1));
    setAnswers((prev) => prev.slice(0, -1));
    setSelectedOptionId(null);
  };

  const restart = () => {
    setStarted(true);
    setHistory(["root"]);
    setAnswers([]);
    setSelectedOptionId(null);
    setConcernText("");
    recommendationMutation.reset();
  };

  return (
    <div className="min-h-screen bg-[#f5f8fb] font-['DM_Sans',sans-serif] text-[#0f172a] antialiased">
      <PatientNavbar />

      <main className="min-h-screen pt-[88px]">
        {!started && !result && (
          <section className="relative overflow-hidden border-b border-[#e5edf3] bg-[linear-gradient(135deg,#f8fffd_0%,#f6f8ff_54%,#fff7fb_100%)]">
            <div className="mx-auto grid max-w-[1180px] items-center gap-10 px-5 py-10 sm:px-6 lg:grid-cols-[1fr_0.88fr] lg:px-8 lg:py-16">
              <div className="max-w-[680px] animate-[phFadeUp_0.55s_ease_both]">
                <span className="inline-flex items-center gap-2 rounded-full border border-patient-primary/20 bg-white/80 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-patient-primary shadow-sm">
                  <Icon name="spark" className="h-4 w-4" />
                  Guided therapist matching
                </span>
                <h1 className="mt-6 font-outfit text-[clamp(2.25rem,7vw,4.6rem)] font-extrabold leading-[1.02] tracking-tight text-[#0f172a]">
                  Find the right psychologist with a calmer first step.
                </h1>
                <p className="mt-5 max-w-[600px] text-base leading-8 text-[#526070] sm:text-lg">
                  Answer a short, private assessment and Koode will suggest a relevant department with psychologists who match your needs.
                </p>

                <div className="mt-7 flex flex-wrap gap-2">
                  {starterConcerns.map((item) => (
                    <span key={item} className="rounded-full border border-white bg-white/80 px-3.5 py-2 text-xs font-extrabold text-[#475569] shadow-sm">
                      {item}
                    </span>
                  ))}
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setStarted(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-patient-primary px-6 py-4 text-sm font-extrabold text-white shadow-[0_18px_34px_rgba(26,190,170,0.28)] transition hover:-translate-y-0.5 hover:bg-patient-hover focus:outline-none focus:ring-4 focus:ring-patient-primary/20"
                  >
                    Start assessment
                    <Icon name="arrow" className="h-4 w-4" strokeWidth={2.4} />
                  </button>
                  <Link
                    to="/patient/therapists"
                    className="inline-flex items-center justify-center rounded-xl border border-[#dbe3ea] bg-white px-6 py-4 text-sm font-extrabold text-[#334155] no-underline transition hover:-translate-y-0.5 hover:border-patient-primary/40 hover:bg-[#fbfffe]"
                  >
                    Browse all psychologists
                  </Link>
                </div>
              </div>

              <div className="animate-[phFadeUp_0.55s_ease_0.1s_both] rounded-xl border border-white/80 bg-white/75 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.09)] backdrop-blur">
                <div className="rounded-xl bg-[#0f172a] p-5 text-white">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/50">Today</p>
                      <h2 className="mt-2 font-outfit text-2xl font-extrabold">Your match preview</h2>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-patient-primary">
                      <Icon name="chart" className="h-6 w-6" />
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3">
                    {assessmentSteps.map((step, index) => (
                      <div key={step} className="flex items-center gap-3 rounded-xl bg-white/[0.07] p-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-extrabold text-[#0f172a]">
                          {index + 1}
                        </span>
                        <p className="text-sm font-extrabold">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-white p-4">
                    <Icon name="shield" className="h-5 w-5 text-patient-primary" />
                    <p className="mt-3 text-sm font-extrabold">Private by design</p>
                    <p className="mt-1 text-xs leading-5 text-[#64748b]">Only matching signals are used for recommendations.</p>
                  </div>
                  <div className="rounded-xl bg-white p-4">
                    <Icon name="clock" className="h-5 w-5 text-[#8b5cf6]" />
                    <p className="mt-3 text-sm font-extrabold">Quick to finish</p>
                    <p className="mt-1 text-xs leading-5 text-[#64748b]">Most people complete it in a few taps.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {started && !result && (
          <section className="mx-auto max-w-[920px] px-5 py-8 sm:px-6 lg:px-8 lg:py-12">
            <StepBar currentStep={currentBarStep} />
            <div className="mt-6 rounded-xl border border-[#e4edf2] bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.07)] sm:p-7 lg:p-9">
              {isQuestionsLoading && (
                <div className="space-y-4">
                  <div className="h-7 w-48 animate-pulse rounded-full bg-[#e9eef4]" />
                  <div className="h-12 w-4/5 animate-pulse rounded-xl bg-[#e9eef4]" />
                  <div className="h-20 animate-pulse rounded-xl bg-[#f1f5f9]" />
                  <div className="h-20 animate-pulse rounded-xl bg-[#f1f5f9]" />
                </div>
              )}

              {isQuestionsError && (
                <div className="rounded-xl border border-red-100 bg-red-50 p-5">
                  <p className="font-extrabold text-red-700">We could not load the assessment.</p>
                  <p className="mt-2 text-sm leading-6 text-red-600">Please refresh the page or browse all psychologists for now.</p>
                </div>
              )}

              {!isQuestionsLoading && !isQuestionsError && questionTree && (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 rounded-full bg-[#effdfa] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[#0f766e]">
                      <Icon name="spark" className="h-4 w-4" />
                      Step {Math.min(history.length, 3)} of 3
                    </span>
                    <span className="text-sm font-bold text-[#94a3b8]">{answers.length} answer{answers.length === 1 ? "" : "s"} selected</span>
                  </div>

                  {!isFinalStep ? (
                    <>
                      <h2 className="mt-7 font-outfit text-[clamp(1.7rem,5vw,2.6rem)] font-extrabold leading-tight tracking-tight text-[#0f172a]">
                        {currentQuestion?.text}
                      </h2>
                      <p className="mt-3 max-w-[680px] text-sm leading-7 text-[#64748b] sm:text-base">
                        {currentQuestion?.helper}
                      </p>

                      <div className="mt-7 grid gap-3">
                        {currentQuestion?.options.map((option) => (
                          <ChoiceButton
                            key={option.id}
                            selected={selectedOptionId === option.id}
                            onClick={() => selectAnswer(option)}
                          >
                            {option.label}
                          </ChoiceButton>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <h2 className="mt-7 font-outfit text-[clamp(1.7rem,5vw,2.6rem)] font-extrabold leading-tight tracking-tight text-[#0f172a]">
                        Add anything you want your match to understand.
                      </h2>
                      <p className="mt-3 max-w-[680px] text-sm leading-7 text-[#64748b] sm:text-base">
                        This is optional, but a short note can help the recommendation better understand your situation.
                      </p>

                      <div className="mt-7 rounded-xl border border-[#dfe8ee] bg-[#f8fafc] p-3 transition focus-within:border-patient-primary focus-within:bg-white focus-within:ring-4 focus-within:ring-patient-primary/10">
                        <label htmlFor="concernText" className="sr-only">
                          Tell us more
                        </label>
                        <textarea
                          id="concernText"
                          value={concernText}
                          onChange={(event) => setConcernText(event.target.value)}
                          rows={7}
                          maxLength={2000}
                          placeholder="Example: I have been overwhelmed at work, sleeping poorly, and feeling tense most days."
                          className="min-h-[190px] w-full resize-none border-none bg-transparent px-2 py-2 text-base leading-7 text-[#0f172a] outline-none placeholder:text-[#94a3b8]"
                        />
                        <div className="flex items-center justify-between gap-3 border-t border-[#e2e8f0] px-2 pt-3">
                          <span className="text-xs font-bold text-[#64748b]">(Optional)</span>
                          <span className="text-xs font-bold text-[#94a3b8]">{concernText.length}/2000</span>
                        </div>
                      </div>
                    </>
                  )}

                  {recommendationMutation.isError && (
                    <p className="mt-6 rounded-xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-semibold text-red-600">
                      We could not generate a recommendation. Please try again or browse all psychologists.
                    </p>
                  )}

                  <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={goBack}
                      className="inline-flex items-center justify-center rounded-xl border border-[#dbe3ea] bg-white px-6 py-3 text-sm font-extrabold text-[#475569] transition hover:bg-[#f8fafc]"
                    >
                      Back
                    </button>

                    {!isFinalStep ? (
                      <button
                        type="button"
                        disabled={!selectedOptionId}
                        onClick={goNext}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-patient-primary px-7 py-3 text-sm font-extrabold text-white shadow-[0_14px_26px_rgba(26,190,170,0.22)] transition hover:-translate-y-0.5 hover:bg-patient-hover disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                      >
                        Continue
                        <Icon name="arrow" className="h-4 w-4" strokeWidth={2.4} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={recommendationMutation.isPending}
                        onClick={submitFinal}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-patient-primary px-7 py-3 text-sm font-extrabold text-white shadow-[0_14px_26px_rgba(26,190,170,0.22)] transition hover:-translate-y-0.5 hover:bg-patient-hover disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
                      >
                        {recommendationMutation.isPending ? "Finding matches..." : "Show my matches"}
                        {!recommendationMutation.isPending && <Icon name="arrow" className="h-4 w-4" strokeWidth={2.4} />}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {result && recommendation && (
          <section className="mx-auto max-w-[1180px] px-5 py-8 sm:px-6 lg:px-8 lg:py-12">
            <div className="overflow-hidden rounded-xl border border-[#dfe8ee] bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="bg-[#0f172a] p-6 text-white sm:p-8 lg:p-10">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-white/80">
                    <Icon name="spark" className="h-4 w-4 text-patient-primary" />
                    Your recommendation
                  </span>
                  <p className="mt-4 text-lg font-bold text-patient-primary">
                    {recommendation.subtitle}
                  </p>
                  <p className="mt-4 max-w-[560px] text-base leading-8 text-white/70">
                    {recommendation.explanation}
                  </p>
                </div>

                <div className="p-6 sm:p-8 lg:p-10">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl bg-[#effdfa] p-4">
                      <Icon name="user" className="h-5 w-5 text-patient-primary" />
                      <p className="mt-3 text-2xl font-extrabold text-[#0f172a]">{psychologists.length}</p>
                      <p className="text-xs font-bold text-[#64748b]">Available matches</p>
                    </div>
                    <div className="rounded-xl bg-[#f5f3ff] p-4">
                      <Icon name="chart" className="h-5 w-5 text-[#7c3aed]" />
                      <p className="mt-3 text-2xl font-extrabold text-[#0f172a]">1</p>
                      <p className="text-xs font-bold text-[#64748b]">Best department</p>
                    </div>
                    <div className="rounded-xl bg-[#fff7ed] p-4">
                      <Icon name="calendar" className="h-5 w-5 text-[#ea580c]" />
                      <p className="mt-3 text-2xl font-extrabold text-[#0f172a]">Live</p>
                      <p className="text-xs font-bold text-[#64748b]">Slot status</p>
                    </div>
                  </div>

                  <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => document.getElementById("recommended-psychologists")?.scrollIntoView({ behavior: "smooth" })}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-patient-primary px-6 py-3 text-sm font-extrabold text-white shadow-[0_14px_26px_rgba(26,190,170,0.22)] transition hover:-translate-y-0.5 hover:bg-patient-hover"
                    >
                      View psychologists
                      <Icon name="arrow" className="h-4 w-4" strokeWidth={2.4} />
                    </button>
                    <button
                      type="button"
                      onClick={restart}
                      className="inline-flex items-center justify-center rounded-xl border border-[#dbe3ea] bg-white px-6 py-3 text-sm font-extrabold text-[#334155] transition hover:bg-[#f8fafc]"
                    >
                      Retake assessment
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate("/patient/therapists")}
                      className="inline-flex items-center justify-center rounded-xl border border-[#dbe3ea] bg-white px-6 py-3 text-sm font-extrabold text-[#334155] transition hover:bg-[#f8fafc]"
                    >
                      Browse all
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div id="recommended-psychologists" className="pt-10">
              <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <span className="inline-flex rounded-full bg-[#dff8f5] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-patient-primary">
                    AI recommended
                  </span>
                  <h2 className="mt-4 font-outfit text-[clamp(1.7rem,4vw,2.7rem)] font-extrabold tracking-tight text-[#0f172a]">
                    Psychologists for {recommendation.department}
                  </h2>
                </div>
              </div>

              {psychologists.length > 0 ? (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {psychologists.map((therapist) => (
                    <TherapistMiniCard key={therapist.psychologist_id} therapist={therapist} />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-[#e4edf2] bg-white p-8 text-center shadow-[0_14px_38px_rgba(15,23,42,0.05)]">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-[#effdfa] text-patient-primary">
                    <Icon name="user" className="h-7 w-7" />
                  </div>
                  <h3 className="mt-5 font-outfit text-xl font-extrabold text-[#0f172a]">
                    No psychologists found in this department yet
                  </h3>
                  <p className="mx-auto mt-2 max-w-[520px] text-sm leading-7 text-[#64748b]">
                    You can browse all psychologists or retake the assessment with a little more context.
                  </p>
                  <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                    <Link
                      to="/patient/therapists"
                      className="inline-flex justify-center rounded-xl bg-patient-primary px-6 py-3 text-sm font-bold text-white no-underline transition hover:bg-patient-hover"
                    >
                      Browse all psychologists
                    </Link>
                    <button
                      type="button"
                      onClick={restart}
                      className="inline-flex justify-center rounded-xl border border-[#dbe3ea] bg-white px-6 py-3 text-sm font-extrabold text-[#334155] transition hover:bg-[#f8fafc]"
                    >
                      Retake assessment
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      <PatientFooter />
    </div>
  );
}

import React, { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAvailability,
  getMyAvailability,
  revokeAvailabilitySlot,
} from "../../../api/psychologist.api";
import PsychologistNavbar from "../../../components/psychologist/Navbar/PsychologistNavbar";
import PsychologistSidebar from "../../../components/psychologist/Sidebar/PsychologistSidebar";
import { usePsychologistSessionGuard } from "../../../hooks/usePsychologistSessionGuard";
import {
  addDaysToISO,
  formatIndiaDate,
  formatIndiaTime,
  getEarliestBookableDateISO,
  isIndiaSlotBeyondLeadTime,
} from "../../../utils/indiaDateTime";

const TIME_SLOTS = [
  ["09:00", "10:00"],
  ["10:00", "11:00"],
  ["11:00", "12:00"],
  ["12:00", "13:00"],
  ["13:00", "14:00"],
  ["14:00", "15:00"],
  ["15:00", "16:00"],
  ["16:00", "17:00"],
  ["17:00", "18:00"],
];

const earliestBookableDate = getEarliestBookableDateISO(TIME_SLOTS, 24);

const formatDateInputValue = (value) => {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
};

const getDatesInRange = (startDate, endDate) => {
  if (!startDate || !endDate || endDate < startDate) return [];

  const dates = [];
  let current = startDate;

  while (current <= endDate) {
    dates.push(current);
    current = addDaysToISO(current, 1);
  }

  return dates;
};

const getEligibleSlotsForDate = (date, availabilityEntry) =>
  TIME_SLOTS.filter(([startTime, endTime]) => {
    if (!isIndiaSlotBeyondLeadTime(date, startTime, 24)) return false;

    const alreadyPublished = availabilityEntry?.slots?.some(
      (slot) =>
        slot.start_time.slice(0, 5) === startTime &&
        slot.end_time.slice(0, 5) === endTime
    );

    return !alreadyPublished;
  }).map(([start_time, end_time]) => ({ start_time, end_time }));

const sortSlots = (slots) =>
  [...slots].sort((a, b) => a.start_time.localeCompare(b.start_time));

const PublishModeToggle = ({ publishMode, onChange }) => (
  <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
    <button
      type="button"
      onClick={() => onChange("single")}
      className={`rounded-[14px] px-4 py-2 text-sm font-semibold transition ${
        publishMode === "single"
          ? "bg-white text-psycho-primary shadow-sm"
          : "text-slate-600 hover:text-slate-900"
      }`}
    >
      Single Day
    </button>
    <button
      type="button"
      onClick={() => onChange("range")}
      className={`rounded-[14px] px-4 py-2 text-sm font-semibold transition ${
        publishMode === "range"
          ? "bg-white text-psycho-primary shadow-sm"
          : "text-slate-600 hover:text-slate-900"
      }`}
    >
      Date Range
    </button>
  </div>
);

const DatePickerField = ({ label, value, min, inputRef, onChange }) => (
  <label className="block">
    <span className="mb-2 block text-sm font-medium text-slate-600">{label}</span>
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          if (typeof inputRef.current?.showPicker === "function") {
            inputRef.current.showPicker();
          } else {
            inputRef.current?.focus();
            inputRef.current?.click();
          }
        }}
        className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 outline-none transition hover:border-slate-300 focus:border-psycho-primary focus:bg-white"
      >
        <span>{formatDateInputValue(value)}</span>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-slate-500"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>
      <input
        ref={inputRef}
        type="date"
        lang="en-GB"
        min={min}
        value={value}
        onChange={onChange}
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  </label>
);

const PsychologistAvailability = () => {
  usePsychologistSessionGuard();

  const dateInputRef = useRef(null);
  const startDateInputRef = useRef(null);
  const endDateInputRef = useRef(null);
  const queryClient = useQueryClient();

  const [publishMode, setPublishMode] = useState("single");
  const [date, setDate] = useState(earliestBookableDate);
  const [startDate, setStartDate] = useState(earliestBookableDate);
  const [endDate, setEndDate] = useState(earliestBookableDate);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [rangeExcludedSlots, setRangeExcludedSlots] = useState({});
  const [revokingSlotId, setRevokingSlotId] = useState(null);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const availabilityQuery = useQuery({
    queryKey: ["psychologist-availability"],
    queryFn: getMyAvailability,
  });

  const previewAvailabilityByDate = useMemo(() => {
    const map = new Map();
    (availabilityQuery.data ?? []).forEach((entry) => {
      map.set(entry.date, entry);
    });
    return map;
  }, [availabilityQuery.data]);

  const previewDates = useMemo(
    () => (publishMode === "range" ? getDatesInRange(startDate, endDate) : [date]),
    [publishMode, startDate, endDate, date]
  );

  const rangeSelectionByDate = useMemo(() => {
    const selections = {};

    previewDates.forEach((currentDate) => {
      const baseSlots = getEligibleSlotsForDate(
        currentDate,
        previewAvailabilityByDate.get(currentDate)
      );
      const excluded = new Set(rangeExcludedSlots[currentDate] ?? []);
      selections[currentDate] = baseSlots.filter(
        (slot) => !excluded.has(slot.start_time)
      );
    });

    return selections;
  }, [previewDates, previewAvailabilityByDate, rangeExcludedSlots]);

  const rangeSelectionCount = useMemo(
    () =>
      Object.values(rangeSelectionByDate).reduce(
        (total, slots) => total + slots.length,
        0
      ),
    [rangeSelectionByDate]
  );

  const upcomingAvailability = useMemo(
    () =>
      [...(availabilityQuery.data ?? [])].sort((a, b) =>
        a.date.localeCompare(b.date)
      ),
    [availabilityQuery.data]
  );

  const saveAvailabilityMutation = useMutation({
    mutationFn: createAvailability,
    onSuccess: async (_, variables) => {
      if (variables.mode === "range") {
        const publishedDays = variables.days.filter((day) => day.slots.length > 0);
        setFeedback({
          type: "success",
          message:
            publishedDays.length > 1
              ? `Availability published across ${publishedDays.length} days.`
              : "Availability published for the selected day.",
        });
        setRangeExcludedSlots({});
      } else {
        setFeedback({
          type: "success",
          message: "Availability saved. Patients can now book these slots.",
        });
        setSelectedSlots([]);
      }

      await queryClient.invalidateQueries({
        queryKey: ["psychologist-availability"],
      });
    },
    onError: (error) => {
      const apiError = error?.response?.data;
      const detail =
        apiError?.non_field_errors?.[0] ||
        apiError?.detail ||
        apiError?.end_date?.[0] ||
        apiError?.date?.[0] ||
        "Unable to save availability right now.";

      setFeedback({ type: "error", message: detail });
    },
  });

  const revokeSlotMutation = useMutation({
    mutationFn: revokeAvailabilitySlot,
    onSuccess: async () => {
      setRevokingSlotId(null);
      setFeedback({
        type: "success",
        message: "Selected slot has been revoked and is no longer bookable.",
      });
      await queryClient.invalidateQueries({
        queryKey: ["psychologist-availability"],
      });
    },
    onError: (error) => {
      setRevokingSlotId(null);
      const apiError = error?.response?.data;
      const detail =
        apiError?.slot_id?.[0] ||
        apiError?.detail ||
        "Unable to revoke this slot right now.";
      setFeedback({ type: "error", message: detail });
    },
  });

  const toggleSingleSlot = ([start_time, end_time]) => {
    setFeedback({ type: "", message: "" });
    setSelectedSlots((current) => {
      const exists = current.some((slot) => slot.start_time === start_time);
      if (exists) {
        return current.filter((slot) => slot.start_time !== start_time);
      }

      return sortSlots([...current, { start_time, end_time }]);
    });
  };

  const toggleRangeSlot = (dateKey, startTime) => {
    setFeedback({ type: "", message: "" });
    setRangeExcludedSlots((current) => {
      const currentExcluded = new Set(current[dateKey] ?? []);
      if (currentExcluded.has(startTime)) {
        currentExcluded.delete(startTime);
      } else {
        currentExcluded.add(startTime);
      }

      return {
        ...current,
        [dateKey]: [...currentExcluded].sort(),
      };
    });
  };

  const clearRangeExclusions = () => {
    setRangeExcludedSlots({});
    setFeedback({ type: "", message: "" });
  };

  const handleSubmit = () => {
    setFeedback({ type: "", message: "" });

    if (publishMode === "single" && !date) {
      setFeedback({ type: "error", message: "Choose a date first." });
      return;
    }

    if (publishMode === "range") {
      if (!startDate || !endDate) {
        setFeedback({
          type: "error",
          message: "Choose both the start date and end date.",
        });
        return;
      }

      if (endDate < startDate) {
        setFeedback({
          type: "error",
          message: "End date must be on or after the start date.",
        });
        return;
      }

      const days = previewDates.map((currentDate) => ({
        date: currentDate,
        slots: rangeSelectionByDate[currentDate] ?? [],
      }));

      const publishableDays = days.filter((day) => day.slots.length > 0);
      if (!publishableDays.length) {
        setFeedback({
          type: "error",
          message: "There are no available slots left to publish in this range.",
        });
        return;
      }

      saveAvailabilityMutation.mutate({
        mode: "range",
        days,
      });
      return;
    }

    if (!selectedSlots.length) {
      setFeedback({
        type: "error",
        message: "Select at least one slot to publish availability.",
      });
      return;
    }

    saveAvailabilityMutation.mutate({
      mode: "single",
      date,
      slots: selectedSlots,
    });
  };

  const handleRevokeSlot = (slotId) => {
    setFeedback({ type: "", message: "" });
    setRevokingSlotId(slotId);
    revokeSlotMutation.mutate(slotId);
  };

  const singleDateAvailability = previewAvailabilityByDate.get(date);

  return (
    <div className="min-h-screen bg-[#eef0f5] text-gray-900 flex flex-col">
      <PsychologistNavbar />

      <div className="flex flex-1">
        <PsychologistSidebar />

        <main className="min-w-0 flex-1 px-6 py-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-slate-900">Availability</h1>
              <p className="mt-1 text-sm text-slate-500">
                Single day mode lets you pick slots manually. Date range mode preselects all free slots for every day, then you can remove the ones you do not want.
              </p>
              <div className="mt-3 h-1 w-10 rounded-full bg-psycho-primary" />
            </div>

            <section className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-[28px] border border-white/70 bg-white p-8 shadow-sm">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-psycho-primary">
                        Add Availability
                      </p>
                      <h2 className="mt-2 text-2xl font-bold text-slate-900">
                        Choose how you want to open your schedule.
                      </h2>
                    </div>
                    <PublishModeToggle
                      publishMode={publishMode}
                      onChange={(nextMode) => {
                        setPublishMode(nextMode);
                        setSelectedSlots([]);
                        setRangeExcludedSlots({});
                        setFeedback({ type: "", message: "" });
                      }}
                    />
                  </div>

                  {publishMode === "single" ? (
                    <DatePickerField
                      label="Choose the date"
                      value={date}
                      min={earliestBookableDate}
                      inputRef={dateInputRef}
                      onChange={(event) => {
                        setDate(event.target.value);
                        setSelectedSlots([]);
                        setFeedback({ type: "", message: "" });
                      }}
                    />
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      <DatePickerField
                        label="From date"
                        value={startDate}
                        min={earliestBookableDate}
                        inputRef={startDateInputRef}
                        onChange={(event) => {
                          const nextStart = event.target.value;
                          setStartDate(nextStart);
                          if (endDate < nextStart) {
                            setEndDate(nextStart);
                          }
                          setRangeExcludedSlots({});
                          setFeedback({ type: "", message: "" });
                        }}
                      />
                      <DatePickerField
                        label="To date"
                        value={endDate}
                        min={startDate}
                        inputRef={endDateInputRef}
                        onChange={(event) => {
                          setEndDate(event.target.value);
                          setRangeExcludedSlots({});
                          setFeedback({ type: "", message: "" });
                        }}
                      />
                    </div>
                  )}

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                    {publishMode === "range"
                      ? `All eligible slots from ${formatIndiaDate(startDate)} to ${formatIndiaDate(endDate)} are preselected. Remove any slot you do not want before publishing.`
                      : "Slots can only be published more than 24 hours in advance."}
                  </div>
                </div>

                {feedback.message ? (
                  <div
                    className={`mt-6 rounded-2xl border px-4 py-3 text-sm font-medium ${
                      feedback.type === "success"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-red-200 bg-red-50 text-red-700"
                    }`}
                  >
                    {feedback.message}
                  </div>
                ) : null}

                {publishMode === "single" ? (
                  <div className="mt-8">
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">
                          Select Time Slots
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          Choose slots for {formatIndiaDate(date)}.
                        </p>
                      </div>
                      <span className="text-sm text-slate-500">
                        {selectedSlots.length} selected
                      </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {TIME_SLOTS.map((slot) => {
                        const [startTime, endTime] = slot;
                        const isAllowedByLeadTime = isIndiaSlotBeyondLeadTime(
                          date,
                          startTime,
                          24
                        );
                        const selected = selectedSlots.some(
                          (item) => item.start_time === startTime
                        );
                        const hasExistingSlot = singleDateAvailability?.slots?.some(
                          (item) =>
                            item.start_time.slice(0, 5) === startTime &&
                            item.end_time.slice(0, 5) === endTime
                        );

                        return (
                          <button
                            key={startTime}
                            type="button"
                            onClick={() => toggleSingleSlot(slot)}
                            disabled={hasExistingSlot || !isAllowedByLeadTime}
                            className={`rounded-2xl border px-4 py-4 text-left transition ${
                              hasExistingSlot
                                ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                                : !isAllowedByLeadTime
                                ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                                : selected
                                ? "border-psycho-primary bg-[#e8f4fd] text-psycho-primary shadow-sm"
                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            <div className="text-sm font-semibold">
                              {formatIndiaTime(startTime)} - {formatIndiaTime(endTime)}
                            </div>
                            <div className="mt-1 text-xs">
                              {hasExistingSlot
                                ? "Already published"
                                : !isAllowedByLeadTime
                                ? "Only available 24h in advance"
                                : selected
                                ? "Ready to publish"
                                : "Tap to add"}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="mt-8">
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">
                          Review Preselected Range Slots
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          Every date starts with all free eligible slots selected. Tap a slot to remove it from the publish list, and tap again to add it back.
                        </p>
                      </div>
                      <span className="text-sm text-slate-500">
                        {rangeSelectionCount} selected
                      </span>
                    </div>

                    <div className="space-y-4">
                      {previewDates.map((currentDate) => {
                        const availableSlots = getEligibleSlotsForDate(
                          currentDate,
                          previewAvailabilityByDate.get(currentDate)
                        );
                        const selectedForDate = rangeSelectionByDate[currentDate] ?? [];

                        return (
                          <article
                            key={currentDate}
                            className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5"
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <h3 className="text-base font-semibold text-slate-900">
                                  {formatIndiaDate(currentDate)}
                                </h3>
                                <p className="mt-1 text-xs text-slate-500">
                                  {selectedForDate.length} of {availableSlots.length} slots selected
                                </p>
                              </div>
                            </div>

                            {availableSlots.length === 0 ? (
                              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-4 text-sm text-slate-500">
                                No new eligible slots are available on this date.
                              </div>
                            ) : (
                              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                {availableSlots.map((slot) => {
                                  const selected = selectedForDate.some(
                                    (item) => item.start_time === slot.start_time
                                  );

                                  return (
                                    <button
                                      key={`${currentDate}-${slot.start_time}`}
                                      type="button"
                                      onClick={() =>
                                        toggleRangeSlot(currentDate, slot.start_time)
                                      }
                                      className={`rounded-2xl border px-4 py-4 text-left transition ${
                                        selected
                                          ? "border-psycho-primary bg-[#e8f4fd] text-psycho-primary shadow-sm"
                                          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                                      }`}
                                    >
                                      <div className="text-sm font-semibold">
                                        {formatIndiaTime(slot.start_time)} -{" "}
                                        {formatIndiaTime(slot.end_time)}
                                      </div>
                                      <div className="mt-1 text-xs">
                                        {selected
                                          ? "Selected for publish"
                                          : "Excluded from publish"}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  </div>
                )}

                {((publishMode === "single" && selectedSlots.length > 0) ||
                  (publishMode === "range" && previewDates.length > 0)) && (
                  <div className="mt-8 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={
                        saveAvailabilityMutation.isPending ||
                        (publishMode === "range" && rangeSelectionCount === 0)
                      }
                      className="inline-flex items-center justify-center rounded-full bg-psycho-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-psycho-hover disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saveAvailabilityMutation.isPending
                        ? "Saving..."
                        : publishMode === "range"
                        ? "Publish Selected Range Slots"
                        : "Save Availability"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (publishMode === "range") {
                          clearRangeExclusions();
                        } else {
                          setSelectedSlots([]);
                          setFeedback({ type: "", message: "" });
                        }
                      }}
                      className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      {publishMode === "range" ? "Reset Unselected Slots" : "Clear Selection"}
                    </button>
                  </div>
                )}
              </div>

              <div className="rounded-[28px] border border-white/70 bg-white p-8 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.14em] text-psycho-primary">
                      Published Schedule
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-slate-900">
                      Review and revoke upcoming slots.
                    </h2>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {upcomingAvailability.length} days
                  </span>
                </div>

                <div className="mt-6 space-y-4">
                  {availabilityQuery.isLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <div
                          key={index}
                          className="h-24 animate-pulse rounded-2xl bg-slate-100"
                        />
                      ))}
                    </div>
                  ) : null}

                  {availabilityQuery.isError ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
                      Could not load your availability right now.
                    </div>
                  ) : null}

                  {!availabilityQuery.isLoading &&
                  !availabilityQuery.isError &&
                  !upcomingAvailability.length ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-sm text-slate-500">
                      No availability has been published yet.
                    </div>
                  ) : null}

                  {upcomingAvailability.map((entry) => (
                    <article
                      key={entry.id ?? entry.date}
                      className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <h3 className="text-base font-semibold text-slate-900">
                            {formatIndiaDate(entry.date)}
                          </h3>
                          <p className="mt-1 text-xs text-slate-500">
                            {entry.slots.length} slot
                            {entry.slots.length === 1 ? "" : "s"} published
                          </p>
                        </div>
                        {entry.date === date ? (
                          <span className="rounded-full bg-[#dff1ff] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-psycho-primary">
                            Selected
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-4 space-y-2">
                        {sortSlots(entry.slots).map((slot) => (
                          <div
                            key={slot.id}
                            className={`flex items-center justify-between gap-3 rounded-2xl px-3 py-3 ${
                              slot.is_booked ? "bg-amber-100" : "bg-white"
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-slate-800">
                                {formatIndiaTime(slot.start_time)} -{" "}
                                {formatIndiaTime(slot.end_time)}
                              </div>
                              <div className="mt-1 text-[11px] text-slate-500">
                                {slot.is_booked
                                  ? "Booked slot cannot be revoked"
                                  : "Published and available for booking"}
                              </div>
                            </div>
                            {slot.is_booked ? (
                              <span className="rounded-full bg-amber-200 px-3 py-1 text-[11px] font-semibold text-amber-800">
                                Booked
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleRevokeSlot(slot.id)}
                                disabled={revokeSlotMutation.isPending && revokingSlotId === slot.id}
                                className="inline-flex items-center justify-center rounded-full border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {revokeSlotMutation.isPending && revokingSlotId === slot.id
                                  ? "Revoking..."
                                  : "Revoke"}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};

export default PsychologistAvailability;

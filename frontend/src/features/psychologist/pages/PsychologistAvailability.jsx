import React, { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAvailability,
  getMyAvailability,
} from "../../../api/psychologist.api";
import PsychologistNavbar from "../../../components/psychologist/Navbar/PsychologistNavbar";
import PsychologistSidebar from "../../../components/psychologist/Sidebar/PsychologistSidebar";
import { usePsychologistSessionGuard } from "../../../hooks/usePsychologistSessionGuard";
import {
  getEarliestBookableDateISO,
  formatIndiaDate,
  formatIndiaTime,
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

const PsychologistAvailability = () => {
  usePsychologistSessionGuard();

  const dateInputRef = useRef(null);
  const queryClient = useQueryClient();
  const [date, setDate] = useState(earliestBookableDate);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const availabilityQuery = useQuery({
    queryKey: ["psychologist-availability"],
    queryFn: getMyAvailability,
  });

  const saveAvailabilityMutation = useMutation({
    mutationFn: createAvailability,
    onSuccess: async () => {
      setFeedback({
        type: "success",
        message: "Availability saved. Patients can now book these slots.",
      });
      setSelectedSlots([]);
      await queryClient.invalidateQueries({
        queryKey: ["psychologist-availability"],
      });
    },
    onError: (error) => {
      const apiError = error?.response?.data;
      const detail =
        apiError?.non_field_errors?.[0] ||
        apiError?.detail ||
        "Unable to save availability right now.";

      setFeedback({ type: "error", message: detail });
    },
  });

  const selectedDateAvailability = useMemo(
    () =>
      availabilityQuery.data?.find((item) => item.date === date) ?? {
        date,
        slots: [],
      },
    [availabilityQuery.data, date]
  );

  const upcomingAvailability = useMemo(
    () =>
      [...(availabilityQuery.data ?? [])].sort((a, b) =>
        a.date.localeCompare(b.date)
      ),
    [availabilityQuery.data]
  );

  const toggleSlot = ([start_time, end_time]) => {
    setFeedback({ type: "", message: "" });
    setSelectedSlots((current) => {
      const exists = current.some((slot) => slot.start_time === start_time);
      if (exists) {
        return current.filter((slot) => slot.start_time !== start_time);
      }

      return [...current, { start_time, end_time }].sort((a, b) =>
        a.start_time.localeCompare(b.start_time)
      );
    });
  };

  const handleSubmit = () => {
    if (!date) {
      setFeedback({ type: "error", message: "Choose a date first." });
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
      date,
      slots: selectedSlots,
    });
  };

  return (
    <div className="min-h-screen bg-[#eef0f5] text-gray-900 flex flex-col">
      <PsychologistNavbar />

      <div className="flex flex-1">
        <PsychologistSidebar />

        <main className="min-w-0 flex-1 px-6 py-8">
          <div className="mx-auto max-w-6xl">
                      {/* Page heading */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-slate-900">Availability</h1>
              <p className="mt-1 text-sm text-slate-500">Pick a date and publish the hours you want to offer to patients.</p>
              <div className="mt-3 h-1 w-10 rounded-full bg-psycho-primary" />
            </div>

            <section className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-[28px] border border-white/70 bg-white p-8 shadow-sm">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.14em] text-psycho-primary">
                      Add Availability
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-slate-900">
                      Choose a day and open your schedule.
                    </h2>
                  </div>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-600">
                      Choose the date
                    </span>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof dateInputRef.current?.showPicker === "function") {
                            dateInputRef.current.showPicker();
                          } else {
                            dateInputRef.current?.focus();
                            dateInputRef.current?.click();
                          }
                        }}
                        className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 outline-none transition hover:border-slate-300 focus:border-psycho-primary focus:bg-white"
                      >
                        <span>{formatDateInputValue(date)}</span>
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
                        ref={dateInputRef}
                        type="date"
                        lang="en-GB"
                        min={earliestBookableDate}
                        value={date}
                        onChange={(event) => {
                          setDate(event.target.value);
                          setSelectedSlots([]);
                          setFeedback({ type: "", message: "" });
                        }}
                        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
                        tabIndex={-1}
                        aria-hidden="true"
                      />
                    </div>
                    <span className="mt-2 block text-xs text-slate-500">
                      Slots can only be published more than 24 hours in advance.
                    </span>
                  </label>
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

                <div className="mt-8">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">
                      Select Time Slots
                    </h3>
                    <span className="text-sm text-slate-500">
                      {selectedSlots.length} selected
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {TIME_SLOTS.map((slot) => {
                      const [startTime, endTime] = slot;
                      const isAllowedByLeadTime = isIndiaSlotBeyondLeadTime(date, startTime, 24);
                      const selected = selectedSlots.some(
                        (item) => item.start_time === startTime
                      );
                      const existingSlot = selectedDateAvailability.slots.find(
                        (item) =>
                          item.start_time.slice(0, 5) === startTime &&
                          item.end_time.slice(0, 5) === endTime
                      );

                      return (
                        <button
                          key={startTime}
                          type="button"
                          onClick={() => toggleSlot(slot)}
                          disabled={Boolean(existingSlot) || !isAllowedByLeadTime}
                          className={`rounded-2xl border px-4 py-4 text-left transition ${
                            existingSlot
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
                            {existingSlot
                              ? existingSlot.is_booked
                                ? "Already booked"
                                : "Already published"
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

                {selectedSlots.length > 0 ? (
                  <div className="mt-8 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={saveAvailabilityMutation.isPending}
                      className="inline-flex items-center justify-center rounded-full bg-psycho-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-psycho-hover disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saveAvailabilityMutation.isPending
                        ? "Saving..."
                        : "Save Availability"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSlots([]);
                        setFeedback({ type: "", message: "" });
                      }}
                      className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Clear Selection
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="rounded-[28px] border border-white/70 bg-white p-8 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.14em] text-psycho-primary">
                      Published Schedule
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-slate-900">
                      Review upcoming slots.
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

                      <div className="mt-4 flex flex-wrap gap-2">
                        {entry.slots.map((slot) => (
                          <span
                            key={slot.id}
                            className={`rounded-full px-3 py-2 text-xs font-semibold ${
                              slot.is_booked
                                ? "bg-amber-100 text-amber-700"
                                : "bg-white text-slate-700"
                            }`}
                          >
                            {formatIndiaTime(slot.start_time)} -{" "}
                            {formatIndiaTime(slot.end_time)}
                            {slot.is_booked ? " • Booked" : ""}
                          </span>
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

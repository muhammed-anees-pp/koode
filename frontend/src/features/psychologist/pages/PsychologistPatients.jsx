import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import PsychologistNavbar from "../../../components/psychologist/Navbar/PsychologistNavbar";
import PsychologistSidebar from "../../../components/psychologist/Sidebar/PsychologistSidebar";
import { getPsychologistPatients } from "../../../api/psychologist.api";
import { usePsychologistSessionGuard } from "../../../hooks/usePsychologistSessionGuard";
import { formatIndiaDate, formatIndiaTime, getIndiaSlotTimestamp } from "../../../utils/indiaDateTime";

const FILTERS = ["All", "Upcoming", "Completed", "With Notes"];
const SORT_OPTIONS = [
  { value: "recent", label: "Recent appointment" },
  { value: "oldest", label: "Oldest appointment" },
  { value: "name", label: "Patient name" },
  { value: "appointments", label: "Most appointments" },
];

const getAppointmentTimestamp = (appointment) => {
  if (!appointment) return 0;
  return getIndiaSlotTimestamp(appointment.date, appointment.start_time);
};

function PatientNotesModal({ patient, activeTab, onTabChange, onClose }) {
  if (!patient) return null;

  const notes = patient.notes ?? [];
  const title = activeTab === "patient" ? "Prescriptions" : "Consultation note";
  const field = activeTab === "patient" ? "patient_note" : "psychologist_note";

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/50 px-4 py-6" onClick={onClose}>
      <div className="flex max-h-[88vh] w-full max-w-3xl flex-col rounded-[28px] bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-psycho-primary">
              Patient Details
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">{patient.name}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {patient.patient_id} - {patient.email}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close notes"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-6 pt-5">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onTabChange("clinical")}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === "clinical"
                  ? "bg-psycho-primary text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              Consultation note
            </button>
            <button
              type="button"
              onClick={() => onTabChange("patient")}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === "patient"
                  ? "bg-psycho-primary text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              Prescriptions
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">
            {title}
          </h3>

          {notes.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-sm text-slate-500">
              No completed consultation records are available for this patient.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {notes.map((note) => (
                <div key={`${activeTab}-${note.consultation_id}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-900">
                      {formatIndiaDate(note.date)} - {formatIndiaTime(note.start_time)}
                    </p>
                    <p className="text-xs font-semibold text-slate-500">
                      {note.psychologist_name}
                    </p>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap rounded-xl bg-white px-4 py-3 text-sm leading-6 text-slate-700">
                    {note[field] || `No ${title.toLowerCase()} saved for this consultation.`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PatientSummaryModal({ patient, onClose }) {
  const summary = patient?.summary?.summary || "";
  if (!patient || !summary) return null;

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/50 px-4 py-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-psycho-primary">
              Patient Summary
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">{patient.name}</h2>
            <p className="mt-2 text-sm text-slate-600">
              {patient.patient_id} - {patient.email}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close summary"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <p className="mt-6 max-h-[58vh] overflow-y-auto whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700">
          {summary}
        </p>
      </div>
    </div>
  );
}

export default function PsychologistPatients() {
  usePsychologistSessionGuard();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [sortBy, setSortBy] = useState("recent");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [summaryPatient, setSummaryPatient] = useState(null);
  const [notesTab, setNotesTab] = useState("clinical");

  const patientsQuery = useQuery({
    queryKey: ["psychologist-patients"],
    queryFn: getPsychologistPatients,
    refetchInterval: 30000,
  });

  const patients = useMemo(() => {
    let list = patientsQuery.data ?? [];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((patient) =>
        [patient.name, patient.email, patient.patient_id, patient.phone_number]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q))
      );
    }

    if (activeFilter === "Upcoming") {
      list = list.filter((patient) => patient.upcoming_count > 0);
    } else if (activeFilter === "Completed") {
      list = list.filter((patient) => patient.completed_count > 0);
    } else if (activeFilter === "With Notes") {
      list = list.filter((patient) =>
        (patient.notes ?? []).some((note) => note.patient_note || note.psychologist_note)
      );
    }

    return [...list].sort((left, right) => {
      if (sortBy === "name") return left.name.localeCompare(right.name);
      if (sortBy === "appointments") return right.appointment_count - left.appointment_count;
      const leftTime = getAppointmentTimestamp(left.last_appointment);
      const rightTime = getAppointmentTimestamp(right.last_appointment);
      return sortBy === "oldest" ? leftTime - rightTime : rightTime - leftTime;
    });
  }, [activeFilter, patientsQuery.data, searchQuery, sortBy]);

  const openNotes = (patient, tab) => {
    setSelectedPatient(patient);
    setNotesTab(tab);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#eef0f5] text-gray-900">
      <PsychologistNavbar />

      <div className="flex flex-1">
        <PsychologistSidebar />

        <main className="min-w-0 flex-1 px-6 py-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-slate-900">Patients</h1>
              <p className="mt-1 text-sm text-slate-500">
                Review patients who booked sessions with you and their consultation records.
              </p>
              <div className="mt-3 h-1 w-10 rounded-full bg-psycho-primary" />
            </div>

            <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_auto_auto]">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by name, email, patient ID, or phone..."
                  className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-700 outline-none transition focus:border-psycho-primary focus:ring-1 focus:ring-psycho-primary/20"
                />
              </div>

              <select
                value={activeFilter}
                onChange={(event) => setActiveFilter(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-psycho-primary"
              >
                {FILTERS.map((filter) => (
                  <option key={filter}>{filter}</option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-psycho-primary"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {patientsQuery.isLoading ? (
              <div className="grid gap-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-32 animate-pulse rounded-[28px] bg-white" />
                ))}
              </div>
            ) : null}

            {patientsQuery.isError ? (
              <div className="rounded-[28px] border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-700">
                Unable to load patients right now.
              </div>
            ) : null}

            {!patientsQuery.isLoading && !patientsQuery.isError && patients.length === 0 ? (
              <div className="rounded-[32px] border border-dashed border-slate-200 bg-white px-8 py-16 text-center">
                <h2 className="text-xl font-semibold text-slate-900">No patients found</h2>
                <p className="mt-3 text-sm text-slate-500">
                  Patients with appointments will appear here.
                </p>
              </div>
            ) : null}

            <div className="grid gap-4">
              {patients.map((patient) => (
                <article key={patient.patient_id} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        {patient.patient_id}
                      </p>
                      <h2 className="mt-2 text-xl font-bold text-slate-900">{patient.name}</h2>
                      <p className="mt-1 text-sm text-slate-500">{patient.email}</p>
                      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                          {patient.appointment_count} appointments
                        </span>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                          {patient.completed_count} completed
                        </span>
                        <span className="rounded-full bg-sky-50 px-3 py-1 text-sky-700">
                          {patient.upcoming_count} upcoming
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 lg:items-end">
                      <div className="text-sm text-slate-600 lg:text-right">
                        <p className="font-semibold text-slate-900">Last appointment</p>
                        <p className="mt-1">
                          {patient.last_appointment
                            ? `${formatIndiaDate(patient.last_appointment.date)} - ${formatIndiaTime(patient.last_appointment.start_time)}`
                            : "No appointment"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openNotes(patient, "clinical")}
                          className="rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
                        >
                          Consultation note
                        </button>
                        {patient.summary?.summary ? (
                          <button
                            type="button"
                            onClick={() => setSummaryPatient(patient)}
                            className="rounded-full border border-psycho-primary/20 bg-[#e8f4fd] px-4 py-2 text-sm font-semibold text-psycho-primary transition hover:bg-sky-100"
                          >
                            Summary
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => openNotes(patient, "patient")}
                          className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                        >
                          Prescriptions
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </main>
      </div>

      <PatientNotesModal
        patient={selectedPatient}
        activeTab={notesTab}
        onTabChange={setNotesTab}
        onClose={() => setSelectedPatient(null)}
      />
      <PatientSummaryModal
        patient={summaryPatient}
        onClose={() => setSummaryPatient(null)}
      />
    </div>
  );
}

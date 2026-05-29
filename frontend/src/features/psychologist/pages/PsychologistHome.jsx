import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import PsychologistNavbar from "../../../components/psychologist/Navbar/PsychologistNavbar";
import PsychologistSidebar from "../../../components/psychologist/Sidebar/PsychologistSidebar";
import { getPsychologistBookings } from "../../../api/psychologist.api";
import { useAuthStore } from "../../../store/auth.store";
import { usePsychologistSessionGuard } from "../../../hooks/usePsychologistSessionGuard";
import {
  calendarDateToISO,
  formatIndiaDate,
  formatIndiaDateTime,
  formatIndiaTime,
  getIndiaTodayISO,
  isoToCalendarDate,
} from "../../../utils/indiaDateTime";

const iconPaths = {
  arrow: <path d="M9 18l6-6-6-6" />,
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </>
  ),
  file: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8M8 17h5" />
    </>
  ),
  message: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  rupee: (
    <>
      <path d="M6 3h12M6 8h12M6 13h7" />
      <path d="M6 3c6 0 6 10 0 10l8 8" />
    </>
  ),
  trend: <polyline points="3 17 9 11 13 15 21 7 21 12 21 7 16 7" />,
  users: (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  video: (
    <>
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" />
    </>
  ),
};

const quickActions = [
  { title: "Set Availability", desc: "Manage your slots", to: "/psychologist/availability", icon: "calendar", color: "violet" },
  { title: "All Patients", desc: "Access full database", to: "/psychologist/patients", icon: "users", color: "pink" },
  { title: "Past Appointments", desc: "View history", to: "/psychologist/appointments?filter=Past", icon: "clock", color: "teal" },
];

function Icon({ name, className = "h-5 w-5", strokeWidth = 2 }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {iconPaths[name]}
    </svg>
  );
}

function formatMoney(value, compact = false) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: compact && amount >= 100000 ? "compact" : "standard",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

function bookingTimestamp(booking) {
  return Date.parse(`${booking.date}T${booking.start_time || "00:00"}+05:30`);
}

function sortBySlot(left, right) {
  return bookingTimestamp(left) - bookingTimestamp(right);
}

function isActiveBooking(booking) {
  return booking.status !== "COMPLETED" && booking.status !== "CANCELLED";
}

function isConsultationJoinWindowActive(booking, now) {
  if (!booking || booking.status !== "CONFIRMED") return false;
  if (booking.consultation?.is_open) return true;

  const opensAt = booking.consultation?.opens_at ? Date.parse(booking.consultation.opens_at) : NaN;
  if (!Number.isFinite(opensAt) || now.getTime() < opensAt) return false;

  const endTime = booking.end_time || booking.start_time;
  const closesAt = booking.date && endTime ? Date.parse(`${booking.date}T${endTime}+05:30`) + 60 * 60 * 1000 : NaN;
  return !Number.isFinite(closesAt) || now.getTime() <= closesAt;
}

function PatientAvatar({ src, name, className = "h-24 w-24 rounded-2xl" }) {
  if (src) {
    return <img src={src} alt={name} className={`${className} shrink-0 object-cover`} />;
  }

  return (
    <div className={`${className} flex shrink-0 items-center justify-center bg-sky-100 text-2xl font-extrabold text-psycho-primary`}>
      {name?.charAt(0)?.toUpperCase() || "P"}
    </div>
  );
}

function StatCard({ label, value, note, icon, tone = "sky" }) {
  const tones = {
    sky: "bg-sky-100 text-psycho-primary",
    emerald: "bg-emerald-100 text-emerald-600",
    violet: "bg-violet-100 text-violet-600",
  };

  return (
    <article className="rounded-[16px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <span className={`flex h-10 w-10 items-center justify-center rounded-full ${tones[tone]}`}>
          <Icon name={icon} className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-7 font-outfit text-3xl font-extrabold tracking-tight text-slate-900">{value}</p>
      <p className="mt-2 text-xs font-semibold text-emerald-600">{note}</p>
    </article>
  );
}

function TodayAppointmentCard({ booking }) {
  const [now, setNow] = useState(() => new Date());
  const navigate = useNavigate();
  const isOpen = isConsultationJoinWindowActive(booking, now);
  const opensAt = formatIndiaDateTime(booking?.consultation?.opens_at);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section>
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="font-outfit text-base font-extrabold text-slate-900">Upcoming Appointment</h2>
        <Link to="/psychologist/appointments" className="text-xs font-extrabold text-psycho-primary no-underline">View Schedule</Link>
      </div>

      <article className="rounded-[16px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-5 lg:grid-cols-[96px_1fr_auto]">
          <PatientAvatar src={booking.patient_photo} name={booking.patient_name} className="h-24 w-24 rounded-full" />

          <div className="min-w-0">
            <div className="mb-8 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-4 py-1 text-[11px] font-extrabold text-psycho-primary">
                Video Call
              </span>
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1 text-[11px] font-extrabold text-emerald-600">
                {booking.status === "CONFIRMED" ? "Confirmed" : booking.status}
              </span>
            </div>
            <h3 className="font-outfit text-xl font-extrabold text-slate-900">{booking.patient_name}</h3>
            <p className="mt-2 text-sm font-medium text-slate-500">
              {booking.specialization || "Consultation"} • {booking.patient_summary?.summary ? "Summary available" : "Follow-up Session"}
            </p>
            <div className="mt-6 h-px bg-slate-100" />

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(`/psychologist/consultation/${booking.id}`)}
                disabled={!isOpen}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] bg-psycho-primary px-7 text-sm font-extrabold text-white shadow-psycho-sm transition hover:bg-psycho-hover disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
              >
                <Icon name="video" className="h-4 w-4" />
                {isOpen ? "Join Room" : "Room Opens Soon"}
              </button>
              <button
                type="button"
                onClick={() => navigate(`/psychologist/messages?appointment=${booking.id}`)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] border border-slate-200 bg-white px-7 text-sm font-extrabold text-slate-700 transition hover:border-psycho-primary/30 hover:text-psycho-primary"
              >
                <Icon name="message" className="h-4 w-4" />
                Message
              </button>
              <p className="flex basis-full items-center gap-2 text-xs font-semibold text-slate-400">
                <Icon name="clock" className="h-4 w-4" />
                {isOpen ? "Consultation room is open now" : opensAt ? `Opens ${opensAt}` : `${formatIndiaTime(booking.start_time)} - ${formatIndiaTime(booking.end_time)}`}
              </p>
            </div>
          </div>

          <div className="text-left lg:text-right">
            <p className="font-outfit text-2xl font-extrabold text-slate-900">{formatIndiaTime(booking.start_time)}</p>
            <p className="mt-1 text-sm font-semibold text-slate-500">Today</p>
          </div>
        </div>
      </article>
    </section>
  );
}

function NoTodayAppointmentCard() {
  return (
    <section>
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="font-outfit text-base font-extrabold text-slate-900">Today&apos;s Schedule</h2>
        <Link to="/psychologist/appointments" className="text-xs font-extrabold text-psycho-primary no-underline">View Schedule</Link>
      </div>

      <article className="relative overflow-hidden rounded-[16px] border border-[#d7eefb] bg-[#eef8ff] p-6 shadow-sm sm:p-8">
        <div className="absolute right-8 top-8 h-24 w-24 rounded-full border border-white/70" />
        <div className="absolute bottom-0 left-0 h-28 w-28 rounded-tr-[80px] bg-white/50" />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_220px] lg:items-center">
          <div>
            <span className="inline-flex rounded-full bg-white px-4 py-2 text-[11px] font-extrabold uppercase tracking-wide text-psycho-primary shadow-sm">
              A steadier schedule
            </span>
            <h3 className="mt-6 max-w-2xl font-outfit text-3xl font-extrabold leading-tight tracking-tight text-slate-900">
              A quiet clinical day can still hold good care.
            </h3>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              Use the lighter pace to reset your attention, review patient context, or simply let the dashboard stay uncluttered until the next session arrives.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {[
                { label: "Review", value: "Notes", desc: "Pick one case to revisit." },
                { label: "Prepare", value: "Care plan", desc: "Shape the next session." },
                { label: "Pause", value: "5 minutes", desc: "Reset between tasks." },
              ].map((item) => (
                <div key={item.label} className="rounded-[14px] bg-white/85 p-4 shadow-[0_1px_0_rgba(15,23,42,0.03)]">
                  <p className="text-[11px] font-extrabold uppercase tracking-wide text-psycho-primary">{item.label}</p>
                  <p className="mt-2 font-outfit text-xl font-extrabold text-slate-900">{item.value}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[14px] bg-white p-5 shadow-[0_14px_35px_rgba(15,23,42,0.07)]">
            <div className="flex h-14 w-14 items-center justify-center rounded-[12px] bg-[#eef8ff] text-psycho-primary">
              <Icon name="calendar" className="h-7 w-7" />
            </div>
            <p className="mt-5 text-[11px] font-extrabold uppercase tracking-wide text-slate-400">Today&apos;s note</p>
            <h4 className="mt-3 font-outfit text-xl font-extrabold leading-tight text-slate-900">Space is part of practice.</h4>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              The next confirmed consultation will appear here with the room status and patient details.
            </p>
            <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full w-2/3 rounded-full bg-psycho-primary" />
            </div>
          </div>
        </div>
      </article>
    </section>
  );
}

function MiniCalendar({ today, markedDates }) {
  const baseDate = isoToCalendarDate(today);
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const monthName = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(firstDay);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: startOffset + daysInMonth }, (_, index) => {
    if (index < startOffset) return null;
    return index - startOffset + 1;
  });

  return (
    <section className="rounded-[16px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-outfit text-base font-extrabold text-slate-900">{monthName}</h2>
        <div className="flex gap-2 text-slate-400">
          <Icon name="arrow" className="h-4 w-4 rotate-180" />
          <Icon name="arrow" className="h-4 w-4" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-y-3 text-center text-[11px] font-bold text-slate-400">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="mt-4 grid grid-cols-7 gap-y-2 text-center text-sm font-semibold text-slate-600">
        {cells.map((day, index) => {
          const date = day ? calendarDateToISO(new Date(year, month, day)) : "";
          const active = date === today;
          const marked = markedDates.has(date);
          return (
            <span key={`${day || "blank"}-${index}`} className="relative flex h-8 items-center justify-center">
              {day ? (
                <>
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full ${active ? "bg-psycho-primary text-white" : ""}`}>
                    {day}
                  </span>
                  {marked && !active ? <span className="absolute bottom-0 h-1 w-1 rounded-full bg-psycho-primary" /> : null}
                </>
              ) : null}
            </span>
          );
        })}
      </div>
    </section>
  );
}

function QuickActions() {
  const colorMap = {
    violet: "bg-violet-100 text-violet-600",
    pink: "bg-pink-100 text-pink-600",
    teal: "bg-teal-100 text-teal-600",
  };

  return (
    <section className="rounded-[16px] border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-6 font-outfit text-base font-extrabold text-slate-900">Quick Actions</h2>
      <div className="space-y-5">
        {quickActions.map((action) => (
          <Link key={action.title} to={action.to} className="flex items-center gap-4 rounded-[10px] no-underline transition hover:bg-slate-50">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] ${colorMap[action.color]}`}>
              <Icon name={action.icon} className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-extrabold text-slate-900">{action.title}</span>
              <span className="mt-0.5 block text-xs font-semibold text-slate-500">{action.desc}</span>
            </span>
            <Icon name="arrow" className="h-4 w-4 shrink-0 text-slate-400" />
          </Link>
        ))}
      </div>
    </section>
  );
}

function RecentActivity({ bookings }) {
  const items = bookings.slice(0, 3);

  return (
    <section className="rounded-[16px] border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-5 font-outfit text-base font-extrabold text-slate-900">Recent Activity</h2>
      {items.length ? (
        <div className="space-y-4">
          {items.map((booking) => (
            <Link key={booking.id} to={`/psychologist/messages?appointment=${booking.id}`} className="flex items-center gap-4 rounded-[10px] no-underline transition hover:bg-slate-50">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-psycho-primary">
                <Icon name={booking.payment_status === "PAID" ? "rupee" : "calendar"} className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-extrabold text-slate-900">
                  {booking.status === "COMPLETED" ? "Completed session" : `Booking with ${booking.patient_name}`}
                </span>
                <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500">
                  {formatIndiaDate(booking.date)} at {formatIndiaTime(booking.start_time)}
                </span>
              </span>
              <span className="text-xs font-semibold text-slate-400">{booking.status}</span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="rounded-[12px] bg-slate-50 px-4 py-5 text-sm leading-6 text-slate-500">
          New bookings and completed consultations will appear here.
        </p>
      )}
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <PsychologistNavbar />
      <div className="flex">
        <PsychologistSidebar />
        <main className="min-w-0 flex-1 px-6 py-9">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="h-16 animate-pulse rounded-[16px] bg-slate-200" />
            <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
              <div className="space-y-6">
                <div className="grid gap-5 md:grid-cols-3">
                  <div className="h-40 animate-pulse rounded-[16px] bg-slate-200" />
                  <div className="h-40 animate-pulse rounded-[16px] bg-slate-200" />
                  <div className="h-40 animate-pulse rounded-[16px] bg-slate-200" />
                </div>
                <div className="h-64 animate-pulse rounded-[16px] bg-slate-200" />
              </div>
              <div className="h-96 animate-pulse rounded-[16px] bg-slate-200" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function PsychologistHome() {
  usePsychologistSessionGuard();
  const { user: authUser } = useAuthStore();
  const today = useMemo(() => getIndiaTodayISO(), []);

  const { data: bookings = [], isLoading, isError } = useQuery({
    queryKey: ["psychologist-home-bookings"],
    queryFn: getPsychologistBookings,
    refetchInterval: 30000,
  });

  const dashboard = useMemo(() => {
    const activeBookings = bookings.filter(isActiveBooking);
    const upcomingBookings = activeBookings.filter((booking) => booking.date >= today).sort(sortBySlot);
    const todayBookings = upcomingBookings.filter((booking) => booking.date === today);
    const todayConsultation = todayBookings.find((booking) => booking.status === "CONFIRMED") || todayBookings[0] || null;
    const completedBookings = bookings.filter((booking) => booking.status === "COMPLETED");
    const paidBookings = bookings.filter((booking) => booking.payment_status === "PAID" && booking.status !== "CANCELLED");
    const monthPrefix = today.slice(0, 7);
    const todayEarnings = paidBookings
      .filter((booking) => booking.date === today)
      .reduce((sum, booking) => sum + Number(booking.psychologist_payout_amount || booking.consultation_fee || 0), 0);
    const monthlyEarnings = paidBookings
      .filter((booking) => String(booking.date).startsWith(monthPrefix))
      .reduce((sum, booking) => sum + Number(booking.psychologist_payout_amount || booking.consultation_fee || 0), 0);
    const uniquePatientCount = new Set(bookings.map((booking) => booking.patient).filter(Boolean)).size;
    const recentBookings = [...bookings].sort((a, b) => {
      const left = Date.parse(a.created_at || `${a.date}T${a.start_time}+05:30`);
      const right = Date.parse(b.created_at || `${b.date}T${b.start_time}+05:30`);
      return right - left;
    });
    const markedDates = new Set(upcomingBookings.map((booking) => booking.date));

    return {
      activeBookings,
      completedBookings,
      markedDates,
      monthlyEarnings,
      recentBookings,
      todayBookings,
      todayConsultation,
      todayEarnings,
      uniquePatientCount,
      upcomingBookings,
    };
  }, [bookings, today]);

  const doctorName = authUser?.full_name || "Doctor";
  const displayName = doctorName.startsWith("Dr.") ? doctorName : `Dr. ${doctorName}`;
  const hasTodayConsultation = Boolean(dashboard.todayConsultation);

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <PsychologistNavbar />
      <div className="flex">
        <PsychologistSidebar />
        <main className="min-w-0 flex-1 px-6 py-9 font-['DM_Sans',sans-serif]">
          <div className="mx-auto max-w-7xl">
            <div className="mb-9">
              <h1 className="font-outfit text-2xl font-extrabold tracking-tight text-slate-900">
                Welcome back, {displayName}
              </h1>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                {hasTodayConsultation ? "Here's your overview for today." : "No consultations today. Here's your practice overview."}
              </p>
            </div>

            {isError ? (
              <div className="mb-6 rounded-[16px] border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
                Unable to load dashboard appointments right now.
              </div>
            ) : null}

            <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
              <div className="space-y-8">
                <div className="grid gap-5 md:grid-cols-3">
                  <StatCard label="Today's Appointments" value={dashboard.todayBookings.length} note={`${dashboard.upcomingBookings.length} upcoming total`} icon="calendar" tone="sky" />
                  <StatCard label="Earnings Today" value={formatMoney(dashboard.todayEarnings)} note="Updated from paid bookings" icon="rupee" tone="emerald" />
                  <StatCard label="Monthly Earnings" value={formatMoney(dashboard.monthlyEarnings, true)} note={`${dashboard.completedBookings.length} completed sessions`} icon="trend" tone="violet" />
                </div>

                {hasTodayConsultation ? (
                  <TodayAppointmentCard booking={dashboard.todayConsultation} />
                ) : (
                  <NoTodayAppointmentCard />
                )}

                <RecentActivity bookings={dashboard.recentBookings} />
              </div>

              <aside className="space-y-6">
                <MiniCalendar today={today} markedDates={dashboard.markedDates} />
                <QuickActions />
              </aside>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

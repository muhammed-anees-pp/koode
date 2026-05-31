import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { downloadAdminDashboard, fetchAdminDashboard } from "../../../api/admin.api";
import Sidebar from "../../../components/admin/Sidebar/AdminSidebar";
import Navbar from "../../../components/admin/Navbar/AdminNavbar";

const PERIODS = [
  { label: "7D", value: "7d" },
  { label: "30D", value: "30d" },
  { label: "90D", value: "90d" },
  { label: "180D", value: "180d" },
  { label: "1Y", value: "365d" },
];

const numberFormat = new Intl.NumberFormat("en-IN");
const moneyFormat = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

const formatNumber = (value) => numberFormat.format(Number(value || 0));
const formatMoney = (value) => moneyFormat.format(Number(value || 0));

const iconPath = {
  users: "M17 20C17 18.343 14.761 17 12 17S7 18.343 7 20M21 17c0-1.23-1.234-2.287-3-2.75M3 17c0-1.23 1.234-2.287 3-2.75M18 10.236A2.99 2.99 0 0 0 19 8a3 3 0 0 0-5-2.236M6 10.236A2.99 2.99 0 0 1 5 8a3 3 0 0 1 5-2.236M12 14a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  calendar: "M8 2v3M16 2v3M7 13h10M7 17h5M5 9h14M6 22h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z",
  money: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM12 6v1m0 10v1m0-11a3 3 0 0 0 0 6 3 3 0 0 1 0 6m0-12a3 3 0 0 1 3 3m-3 9a3 3 0 0 1-3-3",
  alert: "M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  star: "M12 3l2.7 5.47 6.03.88-4.36 4.25 1.03 6-5.4-2.84L6.6 19.6l1.03-6-4.36-4.25 6.03-.88L12 3Z",
  clipboard: "M9 5h6M9 12h6M9 16h4M8 3h8l1 2h2v16H5V5h2l1-2Z",
  pulse: "M3 12h4l2-6 4 12 2-6h6",
  wallet: "M4 7h16v12H4V7Zm0 0V5h13M16 13h2",
  download: "M12 3v11m0 0 4-4m-4 4-4-4M5 21h14",
};

function Icon({ name }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d={iconPath[name]} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StatCard({ title, value, detail, icon, tone = "blue", change }) {
  const tones = {
    blue: "bg-blue-500/10 text-blue-300",
    green: "bg-emerald-500/10 text-emerald-300",
    amber: "bg-amber-500/10 text-amber-300",
    red: "bg-red-500/10 text-red-300",
    violet: "bg-violet-500/10 text-violet-300",
  };
  const positive = Number(change || 0) >= 0;
  return (
    <div className="bg-[#151c2c] border border-slate-800/70 rounded-lg p-4 min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 truncate">{title}</p>
          <p className="font-outfit text-2xl font-bold text-slate-100 mt-2 truncate">{value}</p>
        </div>
        <span className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${tones[tone]}`}>
          <Icon name={icon} />
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs">
        {change !== undefined && (
          <span className={positive ? "text-emerald-400 font-semibold" : "text-red-400 font-semibold"}>
            {positive ? "+" : ""}{change}%
          </span>
        )}
        <span className="text-slate-500 truncate">{detail}</span>
      </div>
    </div>
  );
}

function LineChart({ data, color = "#38bdf8", label }) {
  const points = data?.length ? data : [];
  const w = 720;
  const h = 220;
  const pad = 18;
  const values = points.map((item) => Number(item.value || 0));
  const max = Math.max(...values, 1);
  const x = (i) => pad + (i / Math.max(points.length - 1, 1)) * (w - pad * 2);
  const y = (value) => h - pad - (Number(value || 0) / max) * (h - pad * 2);
  const path = points.map((item, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(item.value)}`).join(" ");
  const area = `${path} L${x(points.length - 1 || 0)},${h - pad} L${pad},${h - pad} Z`;

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[220px]" preserveAspectRatio="none" role="img" aria-label={label}>
        <defs>
          <linearGradient id={`${label}-gradient`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.26" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((line) => (
          <line key={line} x1="0" x2={w} y1={pad + line * 52} y2={pad + line * 52} stroke="#1e293b" strokeWidth="1" />
        ))}
        {points.length > 1 && <path d={area} fill={`url(#${label}-gradient)`} />}
        {points.length > 1 && <path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
        {points.map((item, i) => (
          <circle key={item.date} cx={x(i)} cy={y(item.value)} r="3" fill={color} />
        ))}
      </svg>
      <div className="grid grid-cols-4 text-[10px] text-slate-600 px-1">
        {points.filter((_, index) => index % Math.max(Math.ceil(points.length / 4), 1) === 0).slice(0, 4).map((item) => (
          <span key={item.date}>{item.label}</span>
        ))}
      </div>
    </div>
  );
}

function BarChart({ revenue = [], complaints = [] }) {
  const merged = revenue.map((item, index) => ({ ...item, complaints: complaints[index]?.value || 0 }));
  const visible = merged.length > 18 ? merged.filter((_, index) => index % Math.ceil(merged.length / 18) === 0) : merged;
  const max = Math.max(...visible.flatMap((item) => [item.value || 0, item.complaints || 0]), 1);
  return (
    <div className="h-[220px] flex items-end gap-2 pt-4">
      {visible.map((item) => (
        <div key={item.date} className="flex-1 min-w-0 h-full flex flex-col justify-end">
          <div className="flex items-end justify-center gap-1 h-[180px]">
            <span className="w-2.5 rounded-t bg-emerald-400/80" style={{ height: `${Math.max((item.value / max) * 100, 3)}%` }} />
            <span className="w-2.5 rounded-t bg-red-400/75" style={{ height: `${Math.max((item.complaints / max) * 100, 3)}%` }} />
          </div>
          <span className="text-[10px] text-slate-600 truncate text-center mt-2">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function BreakdownList({ title, items, color = "bg-admin-primary" }) {
  const max = Math.max(...(items || []).map((item) => item.count), 1);
  return (
    <div className="bg-[#151c2c] border border-slate-800/70 rounded-lg p-5">
      <h3 className="text-slate-100 font-semibold text-sm mb-4">{title}</h3>
      <div className="space-y-3">
        {(items || []).map((item) => (
          <div key={item.key}>
            <div className="flex justify-between gap-3 text-xs mb-1.5">
              <span className="text-slate-400 truncate">{item.label}</span>
              <span className="text-slate-200 font-semibold">{formatNumber(item.count)}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
              <div className={`h-full rounded-full ${color}`} style={{ width: `${(item.count / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const Dashboard = () => {
  const [period, setPeriod] = useState("30d");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [exporting, setExporting] = useState("");
  const [showExportChoices, setShowExportChoices] = useState(false);

  const queryParams = { period, start, end };
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-dashboard", queryParams],
    queryFn: () => fetchAdminDashboard(queryParams),
  });

  const stats = useMemo(() => {
    const summary = data?.summary || {};
    const insights = data?.insights || {};
    return [
      { title: "Total Users", value: formatNumber(summary.total_users), detail: `${formatNumber(summary.new_patients)} new patients`, icon: "users", tone: "blue" },
      { title: "Total Patients", value: formatNumber(summary.total_patients), detail: `${formatNumber(summary.active_patients)} active`, icon: "users", tone: "blue", change: insights.patient_growth },
      { title: "Psychologists", value: formatNumber(summary.total_psychologists), detail: `${formatNumber(summary.new_psychologists)} new | ${formatNumber(summary.active_psychologists)} active`, icon: "users", tone: "violet", change: insights.psychologist_growth },
      { title: "Applications", value: formatNumber(summary.pending_applications), detail: `${formatNumber(summary.approved_applications)} approved`, icon: "clipboard", tone: "violet" },
      { title: "Period Bookings", value: formatNumber(summary.period_bookings), detail: `${summary.completion_rate || 0}% completion`, icon: "calendar", tone: "amber", change: insights.booking_change },
      { title: "Gross Revenue", value: formatMoney(summary.gross_revenue), detail: "paid bookings", icon: "money", tone: "green", change: insights.revenue_change },
      { title: "Wallet Volume", value: formatMoney(summary.wallet_volume), detail: `${formatMoney(summary.wallet_credits)} credits`, icon: "wallet", tone: "green" },
      { title: "Consultations", value: formatNumber(summary.period_consultations), detail: `${formatNumber(summary.period_completed_consultations)} completed`, icon: "pulse", tone: "blue" },
      { title: "Open Complaints", value: formatNumber(summary.open_complaints), detail: `${formatNumber(summary.high_priority_complaints)} high priority`, icon: "alert", tone: "red", change: insights.complaint_change },
      { title: "Avg Rating", value: `${summary.average_rating || 0}/5`, detail: `${formatNumber(summary.total_reviews)} reviews`, icon: "star", tone: "amber" },
    ];
  }, [data]);

  const handleExport = async (format) => {
    setExporting(format);
    try {
      const response = await downloadAdminDashboard({ format, period, start, end });
      const extension = format === "pdf" ? "pdf" : "xlsx";
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `koode-dashboard.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setExporting("");
      setShowExportChoices(false);
    }
  };

  if (isLoading) return (
    <div className="flex min-h-screen bg-admin-gradient font-['DM_Sans',sans-serif]">
      <Sidebar /><Navbar />
      <div className="flex-1 ml-[220px] mt-[60px] p-8 flex items-center justify-center">
        <div className="w-10 h-10 border-[3px] border-slate-700 border-t-admin-primary rounded-full animate-spin" />
      </div>
    </div>
  );

  if (isError) return (
    <div className="flex min-h-screen bg-admin-gradient font-['DM_Sans',sans-serif]">
      <Sidebar /><Navbar />
      <div className="flex-1 ml-[220px] mt-[60px] p-8"><p className="text-red-400">Unable to load dashboard. Please sign in again or retry.</p></div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-admin-gradient font-['DM_Sans',sans-serif]">
      <Sidebar />
      <div className="flex-1 ml-[220px] flex flex-col">
        <Navbar adminData={data?.admin} />
        <main className="flex-1 mt-[60px] p-6 lg:p-8">
          <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4 mb-6">
            <div>
              <h1 className="font-outfit text-[1.45rem] font-bold text-slate-100 tracking-tight">Dashboard Overview</h1>
              <p className="text-slate-500 text-sm mt-1">Live platform health, revenue, appointments, complaints, and growth.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex bg-[#151c2c] border border-slate-800 rounded-lg p-1">
                {PERIODS.map((item) => (
                  <button key={item.value} onClick={() => setPeriod(item.value)} className={`px-3 py-1.5 text-xs font-semibold rounded-md ${period === item.value ? "bg-admin-primary text-white" : "text-slate-400 hover:text-slate-200"}`}>
                    {item.label}
                  </button>
                ))}
              </div>
              <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="bg-[#151c2c] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 outline-none focus:border-admin-primary" />
              <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="bg-[#151c2c] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 outline-none focus:border-admin-primary" />
              <div className="relative">
                <button onClick={() => setShowExportChoices((value) => !value)} disabled={!!exporting} className="px-3 py-2 text-xs font-bold rounded-lg bg-admin-primary text-white hover:bg-admin-primary/90 disabled:opacity-60 flex items-center gap-2">
                  <Icon name="download" /> {exporting ? "Exporting..." : "Export"}
                </button>
                {showExportChoices && (
                  <div className="absolute right-0 mt-2 w-44 bg-[#151c2c] border border-slate-800 rounded-lg shadow-xl z-20 p-1">
                    <button onClick={() => handleExport("pdf")} disabled={!!exporting} className="w-full text-left px-3 py-2 text-xs font-semibold rounded-md text-slate-200 hover:bg-red-500/15 hover:text-red-200 disabled:opacity-60">
                      Download PDF
                    </button>
                    <button onClick={() => handleExport("excel")} disabled={!!exporting} className="w-full text-left px-3 py-2 text-xs font-semibold rounded-md text-slate-200 hover:bg-emerald-500/15 hover:text-emerald-200 disabled:opacity-60">
                      Download Excel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
            {stats.map((stat) => <StatCard key={stat.title} {...stat} />)}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)] gap-5 mb-5">
            <section className="bg-[#151c2c] border border-slate-800/70 rounded-lg p-5 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-slate-100 font-semibold text-sm">Bookings Trend</h3>
                  <p className="text-slate-500 text-xs mt-1">{data?.filters?.start} to {data?.filters?.end}</p>
                </div>
                <span className="text-xs text-slate-400">{formatNumber(data?.summary?.today_appointments)} appointments today</span>
              </div>
              <LineChart data={data?.trends?.bookings} color="#38bdf8" label="bookings" />
            </section>

            <section className="bg-[#151c2c] border border-slate-800/70 rounded-lg p-5 min-w-0">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-slate-100 font-semibold text-sm">Revenue vs Complaints</h3>
                  <p className="text-slate-500 text-xs mt-1">Daily paid revenue and complaint load</p>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-400 rounded-sm" />Revenue</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-400 rounded-sm" />Complaints</span>
                </div>
              </div>
              <BarChart revenue={data?.trends?.revenue} complaints={data?.trends?.complaints} />
            </section>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
            <BreakdownList title="Booking Status" items={data?.breakdowns?.booking_status} color="bg-sky-400" />
            <BreakdownList title="Application Pipeline" items={data?.breakdowns?.application_status} color="bg-violet-400" />
            <BreakdownList title="Complaint Severity" items={data?.breakdowns?.complaint_severity} color="bg-red-400" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr_0.9fr] gap-5">
            <section className="bg-[#151c2c] border border-slate-800/70 rounded-lg p-5 overflow-hidden">
              <h3 className="text-slate-100 font-semibold text-sm mb-4">Top Psychologists</h3>
              <div className="space-y-3">
                {(data?.top_psychologists || []).map((item) => (
                  <div key={item.psychologist_id} className="grid grid-cols-[1fr_auto] gap-3 items-center border-b border-slate-800/70 pb-3 last:border-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-sm text-slate-200 font-medium truncate">{item.name}</p>
                      <p className="text-xs text-slate-500">{formatNumber(item.completed_sessions)} sessions | {item.average_rating || "No"} rating</p>
                    </div>
                    <span className="text-sm font-bold text-emerald-300">{formatMoney(item.revenue)}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-[#151c2c] border border-slate-800/70 rounded-lg p-5 overflow-hidden">
              <h3 className="text-slate-100 font-semibold text-sm mb-4">Upcoming Appointments</h3>
              <div className="space-y-3">
                {(data?.upcoming_appointments || []).map((item) => (
                  <div key={item.id} className="border-b border-slate-800/70 pb-3 last:border-0 last:pb-0">
                    <div className="flex justify-between gap-3">
                      <p className="text-sm text-slate-200 font-medium truncate">{item.patient}</p>
                      <span className="text-xs text-slate-500">{item.start_time}</span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{item.psychologist} | {item.date} | {item.payment_status}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-[#151c2c] border border-slate-800/70 rounded-lg p-5 overflow-hidden">
              <h3 className="text-slate-100 font-semibold text-sm mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {(data?.recent_activity || []).map((item, index) => (
                  <div key={`${item.type}-${index}`} className="flex gap-3">
                    <span className="w-2 h-2 rounded-full bg-admin-primary mt-1.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-slate-300 leading-snug">{item.title}</p>
                      <p className="text-[11px] text-slate-600 mt-1">{item.display_time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;

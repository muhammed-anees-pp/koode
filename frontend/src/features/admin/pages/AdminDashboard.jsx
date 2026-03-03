import { useQuery } from "@tanstack/react-query";
import { fetchDashboard } from "../../../api/admin.api";
import Sidebar from "../../../components/admin/Sidebar/AdminSidebar";
import Navbar from "../../../components/admin/Navbar/AdminNavbar";

// ─── SVG Sparkline Charts ────────────────────────────────────────────────────
const TREND_POINTS = [22, 30, 28, 45, 38, 52, 48, 60, 55, 70, 65, 80, 72, 85, 78, 90, 82, 75, 88, 95, 88, 100, 92, 98, 95, 105, 98, 110, 102, 115];
function AppointmentsTrendChart() {
  const w = 460, h = 120, pad = 8;
  const min = Math.min(...TREND_POINTS), max = Math.max(...TREND_POINTS);
  const xs = TREND_POINTS.map((_, i) => pad + (i / (TREND_POINTS.length - 1)) * (w - pad * 2));
  const ys = TREND_POINTS.map(v => pad + ((max - v) / (max - min)) * (h - pad * 2));
  const linePath = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x},${ys[i]}`).join(' ');
  const areaPath = `${linePath} L${xs[xs.length - 1]},${h} L${xs[0]},${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 120 }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#trendGrad)" />
      <path d={linePath} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

const MONTHS = ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const REVENUE_DATA = [40, 65, 55, 80, 60, 90, 70];
const COMPLAINT_DATA = [20, 30, 45, 25, 50, 35, 40];
function RevenueVsComplaintsChart() {
  const w = 460, h = 100, barW = 12, groupW = 40, pad = 20;
  const maxVal = Math.max(...REVENUE_DATA, ...COMPLAINT_DATA);
  return (
    <svg viewBox={`0 0 ${w} ${h + 20}`} className="w-full" style={{ height: 130 }} preserveAspectRatio="xMidYMid meet">
      {MONTHS.map((m, i) => {
        const x = pad + i * groupW;
        const rh = (REVENUE_DATA[i] / maxVal) * h;
        const ch = (COMPLAINT_DATA[i] / maxVal) * h;
        return (
          <g key={m}>
            <rect x={x} y={h - rh} width={barW} height={rh} rx="3" fill="#6366f1" opacity="0.85" />
            <rect x={x + barW + 3} y={h - ch} width={barW} height={ch} rx="3" fill="#ef4444" opacity="0.75" />
            <text x={x + barW} y={h + 14} textAnchor="middle" fontSize="9" fill="#64748b">{m}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Stat Cards ───────────────────────────────────────────────────────────────
const STAT_COLORS = {
  blue: { bg: "bg-blue-500/10", icon: "text-blue-400", dot: "bg-blue-400" },
  cyan: { bg: "bg-cyan-500/10", icon: "text-cyan-400", dot: "bg-cyan-400" },
  purple: { bg: "bg-purple-500/10", icon: "text-purple-400", dot: "bg-purple-400" },
  red: { bg: "bg-red-500/10", icon: "text-red-400", dot: "bg-red-400" },
  green: { bg: "bg-emerald-500/10", icon: "text-emerald-400", dot: "bg-emerald-400" },
};

// ─── Dashboard ───────────────────────────────────────────────────────────────
const Dashboard = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: fetchDashboard,
  });

  const statsCards = [
    {
      title: "Total Patients", value: data?.totalPatients ?? "12,450", change: "+5%", period: "vs last month", color: "blue",
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M17 20C17 18.3431 14.7614 17 12 17C9.23858 17 7 18.3431 7 20M21 17.0004C21 15.7702 19.7659 14.7129 18 14.25M3 17.0004C3 15.7702 4.2341 14.7129 6 14.25M18 10.2361C18.6137 9.68679 19 8.8885 19 8C19 6.34315 17.6569 5 16 5C15.2316 5 14.5308 5.28885 14 5.76389M6 10.2361C5.38625 9.68679 5 8.8885 5 8C5 6.34315 6.34315 5 8 5C8.76835 5 9.46924 5.28885 10 5.76389M12 14C10.3431 14 9 12.6569 9 11C9 9.34315 10.3431 8 12 8C13.6569 8 15 9.34315 15 11C15 12.6569 13.6569 14 12 14Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
    },
    {
      title: "Psychologists", value: data?.totalPsychologists ?? "480", change: "+2%", period: "vs last month", color: "cyan",
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><path d="M4 22C4 18.6863 7.58172 16 12 16C16.4183 16 20 18.6863 20 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>,
    },
    {
      title: "Today Appts", value: data?.todayAppointments ?? "134", change: "+12%", period: "vs yesterday", color: "purple",
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M8 2V5M16 2V5M7 13H17M7 17H12M5 9H19M6 22H18C19.1046 22 20 21.1046 20 20V7C20 5.89543 19.1046 5 18 5H6C4.89543 5 4 5.89543 4 7V20C4 21.1046 4.89543 22 6 22Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>,
    },
    {
      title: "Active Complaints", value: data?.activeComplaints ?? "3", status: "Needs Attention", color: "red",
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>,
    },
    {
      title: "Today Revenue", value: data?.todayRevenue ?? "$4,250", change: "+8%", period: "vs yesterday", color: "green",
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" stroke="currentColor" strokeWidth="1.5" /><path d="M12 6V7M12 6C10.3431 6 9 7.34315 9 9C9 10.6569 10.3431 12 12 12C13.6569 12 15 13.3431 15 15C15 16.6569 13.6569 18 12 18M12 6C13.6569 6 15 7.34315 15 9M12 18V19M12 18C10.3431 18 9 16.6569 9 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>,
    },
  ];

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
      <div className="flex-1 ml-[220px] mt-[60px] p-8"><p className="text-red-400">Unauthorized — please log in again.</p></div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-admin-gradient font-['DM_Sans',sans-serif]">
      <Sidebar />
      <div className="flex-1 ml-[220px] flex flex-col">
        <Navbar adminData={data} />
        <div className="flex-1 mt-[60px] p-6 lg:p-8">

          {/* Page header */}
          <div className="mb-6">
            <h1 className="font-outfit text-[1.4rem] font-bold text-slate-100 tracking-tight">Dashboard Overview</h1>
            <p className="text-slate-500 text-sm mt-0.5">Welcome back, here's what's happening with koode today.</p>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            {statsCards.map((stat) => {
              const c = STAT_COLORS[stat.color];
              return (
                <div key={stat.title} className="bg-[#151c2c] border border-slate-800/60 rounded-[14px] p-4 flex flex-col gap-3 transition-all duration-200 hover:border-slate-700">
                  <div className={`w-10 h-10 ${c.bg} rounded-[10px] flex items-center justify-center flex-shrink-0 ${c.icon}`}>
                    {stat.icon}
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.08em] mb-0.5">{stat.title}</div>
                    <div className="font-outfit text-2xl font-bold text-slate-100 tracking-tight">{stat.value}</div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {stat.change && <span className="text-emerald-400 text-[11px] font-bold">▲ {stat.change}</span>}
                      {stat.period && <span className="text-slate-600 text-[11px]">{stat.period}</span>}
                      {stat.status && <span className="text-[11px] font-semibold px-2 py-0.5 bg-red-500/15 text-red-400 rounded-full">{stat.status}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">

            {/* Left — Charts */}
            <div className="flex flex-col gap-5">
              {/* Appointments Trend */}
              <div className="bg-[#151c2c] border border-slate-800/60 rounded-[14px] p-5">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <h3 className="text-slate-100 font-semibold text-sm">Appointments Trend</h3>
                    <p className="text-slate-500 text-xs mt-0.5">Last 30 Days consultation volume</p>
                  </div>
                  <div className="flex gap-1">
                    {["30D", "7D", "24H"].map((t) => (
                      <button key={t} className={`px-2.5 py-1 text-[11px] font-semibold rounded-md border-none cursor-pointer transition-all ${t === "30D" ? "bg-admin-primary text-white" : "bg-slate-800 text-slate-400 hover:text-slate-200"}`}>{t}</button>
                    ))}
                  </div>
                </div>
                <div className="mt-3">
                  <AppointmentsTrendChart />
                </div>
                <div className="flex justify-between text-[10px] text-slate-600 mt-1 px-1">
                  {["Nov 1", "Nov 5", "Nov 10", "Nov 15", "Nov 20", "Nov 25", "Nov 30"].map(d => <span key={d}>{d}</span>)}
                </div>
              </div>

              {/* Revenue vs Complaints */}
              <div className="bg-[#151c2c] border border-slate-800/60 rounded-[14px] p-5">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <h3 className="text-slate-100 font-semibold text-sm">Revenue vs Complaints</h3>
                    <p className="text-slate-500 text-xs mt-0.5">Monthly comparison</p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1.5 text-slate-400"><span className="w-2.5 h-2.5 rounded-sm bg-admin-primary inline-block" />Revenue</span>
                    <span className="flex items-center gap-1.5 text-slate-400"><span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" />Complaints</span>
                  </div>
                </div>
                <div className="mt-3">
                  <RevenueVsComplaintsChart />
                </div>
              </div>
            </div>

            {/* Right — Quick Actions + Recent Activity */}
            <div className="flex flex-col gap-5">
              {/* Quick Actions */}
              <div className="bg-[#151c2c] border border-slate-800/60 rounded-[14px] p-5">
                <h3 className="text-slate-100 font-semibold text-sm mb-4">Quick Actions</h3>
                <div className="flex flex-col gap-3">
                  <button className="flex items-center justify-between w-full p-3.5 bg-slate-800/50 border border-slate-700/50 rounded-[10px] cursor-pointer transition-all hover:border-admin-primary/40 hover:bg-[#1e1b3a] group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-admin-primary/15 text-admin-primary rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M4 4C4 2.89543 4.89543 2 6 2H14C15.1046 2 16 2.89543 16 4V16C16 17.1046 15.1046 18 14 18H6C4.89543 18 4 17.1046 4 16V4Z" stroke="currentColor" strokeWidth="1.5" /><path d="M7 6H13M7 10H13M7 14H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-medium text-slate-200">Review Apps</div>
                        <div className="text-[11px] text-slate-500">6 pending approvals</div>
                      </div>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-slate-600 group-hover:text-slate-400 transition-colors">
                      <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button className="flex items-center justify-between w-full p-3.5 bg-slate-800/50 border border-slate-700/50 rounded-[10px] cursor-pointer transition-all hover:border-red-500/30 hover:bg-[#1f1b1b] group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-red-500/15 text-red-400 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M10 6V10M10 14H10.01M18 10C18 14.4183 14.4183 18 10 18C5.58172 18 2 14.4183 2 10C2 5.58172 5.58172 2 10 2C14.4183 2 18 5.58172 18 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-medium text-slate-200">Resolve Complaints</div>
                        <div className="text-[11px] text-slate-500">3 high priority</div>
                      </div>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-slate-600 group-hover:text-slate-400 transition-colors">
                      <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-[#151c2c] border border-slate-800/60 rounded-[14px] p-5 flex-1">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-slate-100 font-semibold text-sm">Recent Activity</h3>
                  <button className="text-admin-primary text-[12px] font-medium bg-transparent border-none cursor-pointer hover:text-admin-hover transition-colors">View All</button>
                </div>
                <div className="flex flex-col gap-4">
                  {[
                    { dot: "bg-admin-primary", text: "Dr. A. Doe submitted a new application.", time: "10 minutes ago" },
                    { dot: "bg-red-400", text: "User B. Smith reported a video quality issue.", time: "32 minutes ago" },
                    { dot: "bg-emerald-400", text: "Payout #4828 processed successfully.", time: "1 hour ago" },
                    { dot: "bg-yellow-400", text: "New coupon code \"WINTER25\" created.", time: "2 hours ago" },
                    { dot: "bg-slate-500", text: "System maintenance log.", time: "2 hours ago" },
                  ].map((a, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${a.dot}`} />
                      <div>
                        <p className="text-slate-300 text-[12px] leading-snug">{a.text}</p>
                        <p className="text-slate-600 text-[11px] mt-0.5">{a.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
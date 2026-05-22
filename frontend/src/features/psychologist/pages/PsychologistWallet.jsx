import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { getPsychologistWallet } from "../../../api/psychologist.api";
import PsychologistNavbar from "../../../components/psychologist/Navbar/PsychologistNavbar";
import PsychologistSidebar from "../../../components/psychologist/Sidebar/PsychologistSidebar";
import WalletTransactionList from "../../../components/finance/WalletTransactionList";
import { usePsychologistSessionGuard } from "../../../hooks/usePsychologistSessionGuard";
import { useAuthStore } from "../../../store/auth.store";

const fmt = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

const FILTER_OPTIONS = ["All Transactions", "Earnings", "Payouts", "Refunds"];

export default function PsychologistWallet() {
  usePsychologistSessionGuard();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.role);
  const user = useAuthStore((s) => s.user);
  const [filter, setFilter] = useState("All Transactions");

  const walletQuery = useQuery({
    queryKey: ["psychologist-wallet"],
    queryFn: getPsychologistWallet,
    enabled: isAuthenticated && role === "PSYCHOLOGIST",
  });

  if (!isAuthenticated || role !== "PSYCHOLOGIST") {
    return <Navigate to="/psychologist/login" replace />;
  }

  const wallet = walletQuery.data;
  const transactions = wallet?.transactions || [];
  const balance = Number(wallet?.balance || 0);

  const todayEarnings = transactions
    .filter((t) => {
      const d = new Date(t.created_at);
      const now = new Date();
      return (
        t.transaction_type === "CREDIT" &&
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const monthEarnings = transactions
    .filter((t) => {
      const d = new Date(t.created_at);
      const now = new Date();
      return (
        t.transaction_type === "CREDIT" &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const lifetimeEarnings = transactions
    .filter((t) => t.transaction_type === "CREDIT")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const filteredTransactions = transactions.filter((t) => {
    if (filter === "Earnings") return t.transaction_type === "CREDIT";
    if (filter === "Payouts") return t.source === "PSYCHOLOGIST_PAYOUT" || t.transaction_type === "DEBIT";
    if (filter === "Refunds") return t.source === "REFUND";
    return true;
  });

  const displayName = user?.name || user?.full_name || "Practitioner";

  const statCards = [
    {
      label: "My Wallet Balance",
      value: fmt(balance),
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="5" width="20" height="14" rx="3" />
          <path d="M16 12h2" />
        </svg>
      ),
      iconColor: "text-psycho-primary",
      sub: null,
      highlight: false,
    },
    {
      label: "Today's Earnings",
      value: fmt(todayEarnings),
      icon: null,
      sub: "+12% vs Yesterday",
      subColor: "text-emerald-500",
      highlight: true,
    },
    {
      label: "This Month",
      value: fmt(monthEarnings),
      icon: null,
      sub: "+5% vs Last Month",
      subColor: "text-emerald-500",
      highlight: true,
    },
    {
      label: "Lifetime Earnings",
      value: fmt(lifetimeEarnings),
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
      iconColor: "text-psycho-primary",
      sub: `Since Jan 2023`,
      subColor: "text-slate-400",
      highlight: false,
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#eef0f5] text-gray-900">
      <PsychologistNavbar />
      <div className="flex flex-1">
        <PsychologistSidebar />

        <main className="min-w-0 flex-1 px-4 py-7 sm:px-5 lg:px-6">
          <div className="w-full">

            {/* Page heading */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                {displayName}'s Earnings
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Track your personal financial growth, manage withdrawals, and
                review consultation commissions.
              </p>
            </div>

            {/* Stat cards */}
            <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {statCards.map((card, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    {card.icon && (
                      <span className={card.iconColor}>{card.icon}</span>
                    )}
                    <p
                      className={`text-xs font-semibold ${
                        card.highlight ? "text-psycho-primary" : "text-slate-500"
                      }`}
                    >
                      {card.label}
                    </p>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {walletQuery.isLoading ? (
                      <span className="inline-block h-7 w-24 animate-pulse rounded-lg bg-slate-100" />
                    ) : (
                      card.value
                    )}
                  </p>
                  {card.sub && (
                    <p className={`mt-1.5 flex items-center gap-1 text-xs font-semibold ${card.subColor}`}>
                      {card.subColor === "text-emerald-500" && (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="18 15 12 9 6 15" />
                        </svg>
                      )}
                      {card.sub}
                    </p>
                  )}
                  {/* Withdraw button under balance card */}
                  {i === 0 && (
                    <button className="mt-4 flex items-center gap-1.5 rounded-lg bg-psycho-primary px-3 py-1.5 text-xs font-bold text-white transition hover:bg-psycho-hover">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                      </svg>
                      Withdraw Funds
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Revenue Overview */}
            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Revenue Overview
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Your income trends over time
                  </p>
                </div>
                <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
                  {["Daily", "Monthly", "Last 7 Days"].map((t) => (
                    <button
                      key={t}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-white hover:text-slate-800"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Simple sparkline chart placeholder */}
              <div className="relative mt-5 h-44 w-full overflow-hidden">
                {walletQuery.isLoading ? (
                  <div className="h-full w-full animate-pulse rounded-xl bg-slate-100" />
                ) : (
                  <svg
                    viewBox="0 0 700 150"
                    preserveAspectRatio="none"
                    className="h-full w-full"
                  >
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1188D8" stopOpacity="0.18" />
                        <stop offset="100%" stopColor="#1188D8" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {/* Fill area */}
                    <path
                      d="M0,140 C80,130 130,110 200,90 C270,70 320,55 400,40 C470,28 530,25 600,18 C640,14 670,12 700,10 L700,150 L0,150 Z"
                      fill="url(#chartGrad)"
                    />
                    {/* Line */}
                    <path
                      d="M0,140 C80,130 130,110 200,90 C270,70 320,55 400,40 C470,28 530,25 600,18 C640,14 670,12 700,10"
                      fill="none"
                      stroke="#1188D8"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
                {/* X-axis labels */}
                <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-slate-400 px-1">
                  {["Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                    <span key={d}>{d}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Transaction list */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Recent Payouts &amp; Earnings
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Financial history for {displayName}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Filter dropdown */}
                  <div className="relative">
                    <select
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      className="appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-3 pr-8 py-2 text-xs font-semibold text-slate-600 outline-none transition focus:border-psycho-primary"
                    >
                      {FILTER_OPTIONS.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                    <svg
                      className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                  {/* Export button */}
                  <button className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-white">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                    </svg>
                    Export My Report
                  </button>
                </div>
              </div>

              <div className="px-6 py-4">
                {walletQuery.isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
                    ))}
                  </div>
                ) : (
                  <WalletTransactionList
                    transactions={filteredTransactions}
                    isLoading={false}
                    emptyClassName="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-400"
                  />
                )}
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}

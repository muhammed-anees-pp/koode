import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { getPsychologistWallet } from "../../../api/psychologist.api";
import PsychologistNavbar from "../../../components/psychologist/Navbar/PsychologistNavbar";
import PsychologistSidebar from "../../../components/psychologist/Sidebar/PsychologistSidebar";
import { usePsychologistSessionGuard } from "../../../hooks/usePsychologistSessionGuard";
import { useAuthStore } from "../../../store/auth.store";

const fmt = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

const FILTER_OPTIONS = ["All Transactions", "Earnings", "Payouts", "Refunds"];
const CHART_FILTERS = [
  { value: "7D", label: "Last 7 Days" },
  { value: "30D", label: "Last 30 Days" },
  { value: "12M", label: "This Year" },
];
const HISTORY_PER_PAGE = 6;

const formatShortDate = (value) =>
  new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(new Date(value));

const formatMonth = (date) =>
  new Intl.DateTimeFormat("en-IN", { month: "short" }).format(date);

const dateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

function buildRevenuePoints(transactions, range) {
  const earnings = transactions.filter((item) => item.transaction_type === "CREDIT");
  const now = new Date();

  if (range === "12M") {
    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date(now.getFullYear(), index, 1);
      const key = monthKey(date);
      const total = earnings
        .filter((item) => monthKey(new Date(item.created_at)) === key)
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);
      return { key, label: formatMonth(date), total };
    });
  }

  const days = range === "30D" ? 30 : 7;
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (days - 1 - index));
    const key = dateKey(date);
    const total = earnings
      .filter((item) => dateKey(new Date(item.created_at)) === key)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    return {
      key,
      label: days > 7 && index % 4 !== 0 ? "" : new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(date),
      total,
    };
  });
}

function RevenueChart({ points, isLoading }) {
  const maxValue = Math.max(...points.map((point) => point.total), 1);
  const chartHeight = 180;

  if (isLoading) {
    return <div className="mt-5 h-56 animate-pulse rounded-xl bg-slate-100" />;
  }

  return (
    <div className="mt-5">
      <div className="flex h-56 items-end gap-2 rounded-xl border border-slate-100 bg-slate-50/70 px-4 pb-8 pt-5">
        {points.map((point) => {
          const height = Math.max(6, (point.total / maxValue) * chartHeight);
          return (
            <div key={point.key} className="group relative flex h-full min-w-0 flex-1 items-end justify-center">
              <div className="absolute inset-x-0 bottom-0 border-t border-slate-100" />
              <div
                className="w-full max-w-8 rounded-t-lg bg-psycho-primary transition group-hover:bg-psycho-hover"
                style={{ height }}
              />
              <div className="pointer-events-none absolute bottom-[calc(100%+8px)] hidden rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-bold text-white shadow-lg group-hover:block">
                {fmt(point.total)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 grid text-[10px] font-semibold text-slate-400" style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}>
        {points.map((point) => (
          <span key={point.key} className="truncate text-center">{point.label}</span>
        ))}
      </div>
    </div>
  );
}

function MinimalHistory({ transactions }) {
  if (!transactions.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-400">
        No matching wallet history yet.
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {transactions.map((item) => {
        const isCredit = item.transaction_type === "CREDIT";
        const patientName = item.appointment?.patient_name;
        return (
          <div key={item.id} className="flex items-center gap-4 py-4">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isCredit ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
              {isCredit ? "+" : "-"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-900">{item.title}</p>
              <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
                {formatShortDate(item.created_at)}{patientName ? ` • ${patientName}` : ""}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className={`text-sm font-extrabold ${isCredit ? "text-emerald-600" : "text-rose-500"}`}>
                {isCredit ? "+" : "-"}{fmt(item.amount)}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-400">{item.source.replaceAll("_", " ")}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function PsychologistWallet() {
  usePsychologistSessionGuard();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.role);
  const user = useAuthStore((s) => s.user);
  const [filter, setFilter] = useState("All Transactions");
  const [chartFilter, setChartFilter] = useState("7D");
  const [historyPage, setHistoryPage] = useState(1);

  const walletQuery = useQuery({
    queryKey: ["psychologist-wallet"],
    queryFn: getPsychologistWallet,
    enabled: isAuthenticated && role === "PSYCHOLOGIST",
  });

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
    if (filter === "Refunds") return t.source === "APPOINTMENT_REFUND";
    return true;
  });

  const totalHistoryPages = Math.max(1, Math.ceil(filteredTransactions.length / HISTORY_PER_PAGE));
  const currentHistoryPage = Math.min(historyPage, totalHistoryPages);
  const paginatedTransactions = filteredTransactions.slice(
    (currentHistoryPage - 1) * HISTORY_PER_PAGE,
    currentHistoryPage * HISTORY_PER_PAGE
  );
  const revenuePoints = buildRevenuePoints(transactions, chartFilter);

  const displayName = user?.name || user?.full_name || "Practitioner";

  if (!isAuthenticated || role !== "PSYCHOLOGIST") {
    return <Navigate to="/psychologist/login" replace />;
  }

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
                Track your personal financial growth and review consultation commissions.
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
                <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
                  {CHART_FILTERS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setChartFilter(option.value)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        chartFilter === option.value
                          ? "bg-white text-psycho-primary shadow-sm"
                          : "text-slate-500 hover:bg-white hover:text-slate-800"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <RevenueChart points={revenuePoints} isLoading={walletQuery.isLoading} />
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
                      onChange={(e) => {
                        setFilter(e.target.value);
                        setHistoryPage(1);
                      }}
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
                  <>
                    <MinimalHistory transactions={paginatedTransactions} />
                    {filteredTransactions.length > HISTORY_PER_PAGE ? (
                      <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs font-medium text-slate-500">
                          Showing {(currentHistoryPage - 1) * HISTORY_PER_PAGE + 1}-
                          {Math.min(currentHistoryPage * HISTORY_PER_PAGE, filteredTransactions.length)} of{" "}
                          {filteredTransactions.length}
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setHistoryPage((page) => Math.max(1, page - 1))}
                            disabled={currentHistoryPage === 1}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-psycho-primary hover:text-psycho-primary disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Previous
                          </button>
                          <span className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
                            {currentHistoryPage} / {totalHistoryPages}
                          </span>
                          <button
                            type="button"
                            onClick={() => setHistoryPage((page) => Math.min(totalHistoryPages, page + 1))}
                            disabled={currentHistoryPage === totalHistoryPages}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-psycho-primary hover:text-psycho-primary disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}

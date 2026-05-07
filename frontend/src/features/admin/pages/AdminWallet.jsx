import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { getAdminFinance } from "../../../api/admin.api";
import Navbar from "../../../components/admin/Navbar/AdminNavbar";
import Sidebar from "../../../components/admin/Sidebar/AdminSidebar";
import { useAuthStore } from "../../../store/auth.store";

const TRANSACTIONS_PER_PAGE = 8;

const TRANSACTION_FILTERS = [
  { value: "ALL", label: "All Transactions" },
  { value: "APPOINTMENT_PAYMENT", label: "Appointment Payments" },
  { value: "APPOINTMENT_REFUND", label: "Refunds" },
  { value: "PSYCHOLOGIST_PAYOUT", label: "Psychologist Payouts" },
  { value: "CREDIT", label: "Credits" },
  { value: "DEBIT", label: "Debits" },
  { value: "PAID", label: "Paid" },
  { value: "REFUNDED", label: "Refunded" },
];

const formatAmount = (value) => `₹${Number(value || 0).toFixed(2)}`;

const formatDateTime = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const metricConfig = [
  {
    key: "total_revenue",
    title: "Total Revenue",
    description: "Total money received from patients",
  },
  {
    key: "total_consultation_revenue",
    title: "Total Consultation Revenue",
    description: "Total consultation fees collected",
  },
  {
    key: "total_gst_collected",
    title: "Total GST Collected",
    description: "Total GST collected",
  },
  {
    key: "platform_commission_earned",
    title: "Platform Commission Earned",
    description: "Total 10% commission earned",
  },
  {
    key: "total_paid_to_psychologists",
    title: "Total Paid to Psychologists",
    description: "Total settled amount",
  },
  {
    key: "pending_payouts",
    title: "Pending Payouts",
    description: "Amount yet to be credited to psychologists",
  },
  {
    key: "admin_wallet_balance",
    title: "Admin Wallet Balance",
    description: "Current admin wallet amount",
  },
  {
    key: "total_refund_amount",
    title: "Total Refund Amount",
    description: "Total refunded money",
  },
  {
    key: "todays_revenue",
    title: "Today's Revenue",
    description: "Today's earnings",
  },
  {
    key: "monthly_revenue",
    title: "Monthly Revenue",
    description: "Current month revenue",
  },
];

const statusClass = {
  PAID: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  REFUNDED: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  PENDING: "border-slate-600 bg-slate-800 text-slate-300",
  FAILED: "border-rose-500/30 bg-rose-500/10 text-rose-300",
};

const getPaymentStatus = (transaction) => {
  const appointmentStatus = transaction.appointment?.payment_status;
  if (appointmentStatus) return appointmentStatus;
  if (transaction.source === "APPOINTMENT_REFUND") return "REFUNDED";
  return transaction.transaction_type === "CREDIT" ? "PAID" : "PAID";
};

const getPatientName = (transaction) => {
  if (!["APPOINTMENT_PAYMENT", "APPOINTMENT_HOLD", "APPOINTMENT_REFUND"].includes(transaction.source)) {
    return "—";
  }
  return transaction.appointment?.patient_name || transaction.payer?.name || transaction.recipient?.name || "—";
};

const getPsychologistName = (transaction) => {
  if (!["APPOINTMENT_PAYMENT", "APPOINTMENT_HOLD", "PSYCHOLOGIST_PAYOUT"].includes(transaction.source)) {
    return "—";
  }
  return transaction.appointment?.psychologist_name || transaction.recipient?.name || "—";
};

function MetricTile({ title, description, value }) {
  return (
    <div className="rounded-[14px] border border-slate-800/60 bg-[#151c2c] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.11em] text-slate-500">{title}</p>
      <p className="mt-3 text-2xl font-bold text-slate-100">{formatAmount(value)}</p>
      <p className="mt-2 min-h-[32px] text-xs leading-relaxed text-slate-500">{description}</p>
    </div>
  );
}

function AdminTransactionTable({ transactions, isLoading }) {
  if (isLoading) {
    return <div className="h-52 animate-pulse rounded-xl bg-slate-800/50" />;
  }

  if (!transactions.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 bg-[#0f1524] px-5 py-8 text-center text-sm text-slate-500">
        No transactions found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[980px] w-full border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-[0.08em] text-slate-500">
            <th className="border-b border-slate-800 px-3 py-3 font-bold">Transaction ID</th>
            <th className="border-b border-slate-800 px-3 py-3 font-bold">Patient</th>
            <th className="border-b border-slate-800 px-3 py-3 font-bold">Psychologist</th>
            <th className="border-b border-slate-800 px-3 py-3 font-bold">Amount</th>
            <th className="border-b border-slate-800 px-3 py-3 font-bold">GST</th>
            <th className="border-b border-slate-800 px-3 py-3 font-bold">Commission</th>
            <th className="border-b border-slate-800 px-3 py-3 font-bold">Status</th>
            <th className="border-b border-slate-800 px-3 py-3 font-bold">Date & Time</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => {
            const status = getPaymentStatus(transaction);
            const sign = transaction.transaction_type === "CREDIT" ? "+" : "-";
            const amountClass = transaction.transaction_type === "CREDIT" ? "text-emerald-300" : "text-rose-300";
            return (
              <tr key={transaction.id} className="text-slate-300">
                <td className="border-b border-slate-800/70 px-3 py-4">
                  <span className="font-mono text-xs text-slate-400">{transaction.id}</span>
                </td>
                <td className="border-b border-slate-800/70 px-3 py-4 font-semibold text-slate-200">
                  {getPatientName(transaction)}
                </td>
                <td className="border-b border-slate-800/70 px-3 py-4 font-semibold text-slate-200">
                  {getPsychologistName(transaction)}
                </td>
                <td className={`border-b border-slate-800/70 px-3 py-4 font-bold ${amountClass}`}>
                  {sign}{formatAmount(transaction.amount)}
                </td>
                <td className="border-b border-slate-800/70 px-3 py-4">
                  {formatAmount(transaction.appointment?.gst_amount)}
                </td>
                <td className="border-b border-slate-800/70 px-3 py-4">
                  {formatAmount(transaction.appointment?.admin_commission_amount)}
                </td>
                <td className="border-b border-slate-800/70 px-3 py-4">
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass[status] || statusClass.PENDING}`}>
                    {status}
                  </span>
                </td>
                <td className="border-b border-slate-800/70 px-3 py-4 text-slate-400">
                  {formatDateTime(transaction.created_at)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminWallet() {
  const { isAuthenticated, role } = useAuthStore();
  const [transactionFilter, setTransactionFilter] = useState("ALL");
  const [transactionPage, setTransactionPage] = useState(1);
  const financeQuery = useQuery({
    queryKey: ["admin-finance"],
    queryFn: getAdminFinance,
    enabled: isAuthenticated && role === "ADMIN",
  });

  const finance = financeQuery.data;
  const summary = finance?.finance_summary || {};
  const filteredTransactions = useMemo(() => {
    const transactions = finance?.transactions || [];
    if (transactionFilter === "ALL") return transactions;
    if (transactionFilter === "CREDIT" || transactionFilter === "DEBIT") {
      return transactions.filter((transaction) => transaction.transaction_type === transactionFilter);
    }
    if (transactionFilter === "PAID" || transactionFilter === "REFUNDED") {
      return transactions.filter((transaction) => getPaymentStatus(transaction) === transactionFilter);
    }
    return transactions.filter((transaction) => transaction.source === transactionFilter);
  }, [transactionFilter, finance?.transactions]);
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / TRANSACTIONS_PER_PAGE));
  const currentPage = Math.min(transactionPage, totalPages);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * TRANSACTIONS_PER_PAGE,
    currentPage * TRANSACTIONS_PER_PAGE
  );

  if (!isAuthenticated || role !== "ADMIN") {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-admin-gradient font-['DM_Sans',sans-serif]">
      <Sidebar />
      <div className="ml-[220px] flex flex-1 flex-col">
        <Navbar />
        <main className="mt-[60px] flex-1 p-6 lg:p-8">
          <div className="mb-6">
            <h1 className="font-outfit text-[1.4rem] font-bold tracking-tight text-slate-100">
              Admin Finance
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Revenue, GST, commission, payouts, refunds, and settlement activity.
            </p>
          </div>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {metricConfig.map((metric) => (
              <MetricTile
                key={metric.key}
                title={metric.title}
                description={metric.description}
                value={summary[metric.key]}
              />
            ))}
          </section>

          <section className="mt-6 rounded-[14px] border border-slate-800/60 bg-[#151c2c] p-5">
            <div className="flex flex-col gap-4 border-b border-slate-800 pb-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-100">Transaction History</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Appointment payments, refunds, psychologist payouts, GST, and commission details.
                </p>
              </div>
              <select
                value={transactionFilter}
                onChange={(event) => {
                  setTransactionFilter(event.target.value);
                  setTransactionPage(1);
                }}
                className="w-full rounded-lg border border-slate-700 bg-[#0f1524] px-3 py-2 text-sm font-semibold text-slate-200 outline-none transition focus:border-admin-primary lg:w-56"
                aria-label="Filter admin finance transactions"
              >
                {TRANSACTION_FILTERS.map((filter) => (
                  <option key={filter.value} value={filter.value}>
                    {filter.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4">
              <AdminTransactionTable
                transactions={paginatedTransactions}
                isLoading={financeQuery.isLoading}
              />
            </div>

            {filteredTransactions.length > TRANSACTIONS_PER_PAGE ? (
              <div className="mt-5 flex flex-col gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-medium text-slate-500">
                  Showing {(currentPage - 1) * TRANSACTIONS_PER_PAGE + 1}-
                  {Math.min(currentPage * TRANSACTIONS_PER_PAGE, filteredTransactions.length)} of{" "}
                  {filteredTransactions.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTransactionPage((page) => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                    className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-admin-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="rounded-lg bg-[#0f1524] px-3 py-2 text-xs font-bold text-slate-300">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setTransactionPage((page) => Math.min(totalPages, page + 1))}
                    disabled={currentPage === totalPages}
                    className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-admin-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        </main>
      </div>
    </div>
  );
}

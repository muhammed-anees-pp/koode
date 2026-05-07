import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createWalletTopUpOrder,
  getWallet,
  verifyWalletTopUp,
} from "../../../api/patient.api";
import PatientNavbar from "../../../components/patient/Navbar/PatientNavbar";
import PatientFooter from "../../../components/patient/Footer/PatientFooter";
import WalletTransactionList from "../../../components/finance/WalletTransactionList";
import { usePatientSessionGuard } from "../../../hooks/usePatientSessionGuard";
import { useAuthStore } from "../../../store/auth.store";
import { openRazorpayCheckout } from "../../../utils/razorpay";

const TRANSACTIONS_PER_PAGE = 5;
const TRANSACTION_FILTERS = [
  { value: "ALL", label: "All Transactions" },
  { value: "CREDIT", label: "Credits" },
  { value: "DEBIT", label: "Debits" },
  { value: "RAZORPAY", label: "Razorpay" },
  { value: "WALLET", label: "Wallet" },
];

export default function PatientWallet() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.role);
  const [amount, setAmount] = useState("");
  const [feedback, setFeedback] = useState({ type: "", text: "" });
  const [transactionFilter, setTransactionFilter] = useState("ALL");
  const [transactionPage, setTransactionPage] = useState(1);
  usePatientSessionGuard();

  const walletQuery = useQuery({
    queryKey: ["patient-wallet"],
    queryFn: getWallet,
    enabled: isAuthenticated && role === "PATIENT",
  });

  const topUpMutation = useMutation({
    mutationFn: async (value) => {
      const order = await createWalletTopUpOrder(value);
      const payment = await openRazorpayCheckout({
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        name: "Koode",
        description: "Wallet top-up",
        order_id: order.order_id,
      });
      return verifyWalletTopUp(payment);
    },
    onSuccess: async () => {
      setAmount("");
      setFeedback({ type: "success", text: "Wallet balance updated." });
      await queryClient.invalidateQueries({ queryKey: ["patient-wallet"] });
    },
    onError: (error) => {
      const message =
        error?.response?.data?.detail ||
        error?.message ||
        "Unable to add cash to wallet.";
      setFeedback({ type: "error", text: message });
    },
  });

  const wallet = walletQuery.data;
  const balance = Number(wallet?.balance || 0);
  const filteredTransactions = useMemo(() => {
    const transactions = wallet?.transactions || [];
    if (transactionFilter === "ALL") return transactions;
    if (transactionFilter === "CREDIT" || transactionFilter === "DEBIT") {
      return transactions.filter((item) => item.transaction_type === transactionFilter);
    }
    return transactions.filter(
      (item) => String(item.payment_method || "").toUpperCase().includes(transactionFilter)
    );
  }, [transactionFilter, wallet?.transactions]);
  const totalTransactionPages = Math.max(
    1,
    Math.ceil(filteredTransactions.length / TRANSACTIONS_PER_PAGE)
  );
  const currentTransactionPage = Math.min(transactionPage, totalTransactionPages);
  const paginatedTransactions = filteredTransactions.slice(
    (currentTransactionPage - 1) * TRANSACTIONS_PER_PAGE,
    currentTransactionPage * TRANSACTIONS_PER_PAGE
  );

  if (!isAuthenticated || role !== "PATIENT") {
    return <Navigate to="/patient/login" replace />;
  }

  const handleTopUp = () => {
    const value = Number(amount);
    if (!value || value < 1) {
      setFeedback({ type: "error", text: "Enter an amount of at least ₹1." });
      return;
    }
    topUpMutation.mutate(value);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f0f4f8] font-['DM_Sans',sans-serif] antialiased">
      <PatientNavbar />

      <main className="flex-1 px-4 pt-[6.5rem] pb-24 sm:px-6">
        {/* Breadcrumb */}
        <div className="mx-auto max-w-[960px]">
          <p className="mb-5 text-xs text-slate-400">
            <span className="text-slate-500">Home</span>
            <span className="mx-1.5 text-slate-300">/</span>
            <span className="font-medium text-patient-primary">Wallet</span>
          </p>

          {/* Balance Hero Card */}
          <div
            className="relative mb-6 overflow-hidden rounded-2xl px-7 py-7"
            style={{
              background: "linear-gradient(135deg, #1ABEAA 0%, #0e9c8a 100%)",
            }}
          >
            {/* Decorative circles */}
            <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -bottom-10 right-16 h-48 w-48 rounded-full bg-white/10" />

            <p className="text-sm font-semibold text-white/75">
              Total Wallet Balance
            </p>
            <p className="mt-1 text-5xl font-bold tracking-tight text-white">
              ₹{balance.toFixed(2)}
            </p>

            {/* Wallet icon */}
            <div className="absolute right-6 top-1/2 -translate-y-1/2 rounded-xl bg-white/20 p-3 text-white">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="2" y="5" width="20" height="14" rx="3" />
                <path d="M16 12h2" />
              </svg>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
            {/* ── Add Money Card ── */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">
                Add Money to Wallet
              </h2>

              {/* Current balance pill */}
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  className="text-patient-primary"
                >
                  <rect x="2" y="5" width="20" height="14" rx="3" />
                  <path d="M16 12h2" />
                </svg>
                Current Balance:&nbsp;
                <span className="text-patient-primary">
                  ₹{balance.toFixed(2)}
                </span>
              </div>

              {/* Amount label */}
              <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Enter Amount
              </p>

              {/* Big amount display */}
              <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
                <p className="text-4xl font-bold text-slate-900">
                  {amount ? `₹${amount}` : <span className="text-slate-300">₹0</span>}
                </p>
                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setFeedback({ type: "", text: "" });
                  }}
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-patient-primary focus:ring-2 focus:ring-patient-primary/20"
                  placeholder="Type custom amount…"
                />
              </div>

              {/* Payment method */}
              <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Payment Method
              </p>
              <div className="mt-2 flex items-start gap-4 rounded-xl border border-patient-primary/40 bg-patient-primary/5 px-4 py-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white text-[9px] font-black leading-tight">
                  RAZOR<br />PAY
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    Razorpay Secure
                  </p>
                  <p className="text-xs text-slate-500">
                    Cards, UPI, Netbanking, Wallets
                  </p>
                  <div className="mt-2 flex gap-2 text-slate-400">
                    {/* Card icon */}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="2" y="5" width="20" height="14" rx="2" />
                      <line x1="2" y1="10" x2="22" y2="10" />
                    </svg>
                    {/* QR icon */}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="3" y="3" width="7" height="7" rx="1" />
                      <rect x="14" y="3" width="7" height="7" rx="1" />
                      <rect x="3" y="14" width="7" height="7" rx="1" />
                      <path d="M14 14h3v3M17 14h3M14 17h3v3" />
                    </svg>
                    {/* Bank icon */}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M3 9l9-7 9 7v11H3V9z" />
                      <rect x="9" y="14" width="6" height="6" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Feedback */}
              {feedback.text ? (
                <div
                  className={`mt-4 rounded-xl border px-4 py-3 text-sm font-medium ${
                    feedback.type === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  {feedback.text}
                </div>
              ) : null}

              {/* CTA */}
              <button
                type="button"
                onClick={handleTopUp}
                disabled={topUpMutation.isPending}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-patient-primary py-3.5 text-sm font-bold text-white transition hover:bg-patient-hover disabled:opacity-60"
              >
                {topUpMutation.isPending ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Processing…
                  </>
                ) : (
                  <>
                    Proceed to Pay with Razorpay
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </>
                )}
              </button>

              {/* Security note */}
              <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <rect x="5" y="11" width="14" height="10" rx="2" />
                  <path d="M8 11V7a4 4 0 018 0v4" />
                </svg>
                100% Secure Transaction via Razorpay (SSL Encrypted)
              </p>
            </div>

            {/* ── Transaction History Card ── */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Transaction History
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Your recent wallet activity
                  </p>
                </div>
                <select
                  value={transactionFilter}
                  onChange={(event) => {
                    setTransactionFilter(event.target.value);
                    setTransactionPage(1);
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-patient-primary focus:ring-2 focus:ring-patient-primary/20 sm:w-44"
                  aria-label="Filter transactions"
                >
                  {TRANSACTION_FILTERS.map((filter) => (
                    <option key={filter.value} value={filter.value}>
                      {filter.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="px-6 py-5">
                <WalletTransactionList
                  transactions={paginatedTransactions}
                  isLoading={walletQuery.isLoading}
                  emptyClassName="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-400"
                  compact
                />
                {filteredTransactions.length > TRANSACTIONS_PER_PAGE ? (
                  <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs font-medium text-slate-500">
                      Showing {(currentTransactionPage - 1) * TRANSACTIONS_PER_PAGE + 1}-
                      {Math.min(currentTransactionPage * TRANSACTIONS_PER_PAGE, filteredTransactions.length)} of{" "}
                      {filteredTransactions.length}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setTransactionPage((page) => Math.max(1, page - 1))}
                        disabled={currentTransactionPage === 1}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-patient-primary hover:text-patient-primary disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <span className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
                        {currentTransactionPage} / {totalTransactionPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setTransactionPage((page) => Math.min(totalTransactionPages, page + 1))}
                        disabled={currentTransactionPage === totalTransactionPages}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-patient-primary hover:text-patient-primary disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </main>

      <PatientFooter />
    </div>
  );
}

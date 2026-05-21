import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import {
  createCommissionRate,
  fetchCommissionRates,
} from "../../../api/admin.api";
import Navbar from "../../../components/admin/Navbar/AdminNavbar";
import Sidebar from "../../../components/admin/Sidebar/AdminSidebar";
import { useAuthStore } from "../../../store/auth.store";
import { uppercaseMeridiem } from "../../../utils/indiaDateTime";

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) return "—";
  return uppercaseMeridiem(new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }));
};

const formatPercent = (value) => `${Number(value || 0).toFixed(2)}%`;

export default function AdminCommissions() {
  const { isAuthenticated, role } = useAuthStore();
  const queryClient = useQueryClient();
  const [percentage, setPercentage] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [note, setNote] = useState("");
  const [feedback, setFeedback] = useState({ type: "", text: "" });

  const ratesQuery = useQuery({
    queryKey: ["admin-commission-rates"],
    queryFn: fetchCommissionRates,
    enabled: isAuthenticated && role === "ADMIN",
  });

  const rates = useMemo(() => ratesQuery.data || [], [ratesQuery.data]);
  const currentRate = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return rates.find((rate) => new Date(`${rate.effective_from}T00:00:00`) <= today) || null;
  }, [rates]);
  const upcomingRates = rates.filter(
    (rate) => new Date(`${rate.effective_from}T00:00:00`) > new Date()
  );

  const mutation = useMutation({
    mutationFn: createCommissionRate,
    onSuccess: async () => {
      setPercentage("");
      setEffectiveFrom("");
      setNote("");
      setFeedback({
        type: "success",
        text: "Commission change saved. Psychologists have been notified.",
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-commission-rates"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-finance"] });
    },
    onError: (error) => {
      const data = error?.response?.data;
      const message =
        data?.percentage?.[0] ||
        data?.effective_from?.[0] ||
        data?.non_field_errors?.[0] ||
        data?.detail ||
        "Unable to save commission change.";
      setFeedback({ type: "error", text: message });
    },
  });

  if (!isAuthenticated || role !== "ADMIN") {
    return <Navigate to="/admin/login" replace />;
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    setFeedback({ type: "", text: "" });
    mutation.mutate({
      percentage,
      effective_from: effectiveFrom,
      note,
    });
  };

  return (
    <div className="flex min-h-screen bg-admin-gradient font-['DM_Sans',sans-serif]">
      <Sidebar />
      <div className="ml-[220px] flex flex-1 flex-col">
        <Navbar />
        <main className="mt-[60px] flex-1 p-6 lg:p-8">
          <div className="mb-6">
            <h1 className="font-outfit text-[1.4rem] font-bold tracking-tight text-slate-100">
              Commission Settings
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Schedule platform commission changes by effective date and notify psychologists.
            </p>
          </div>

          <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
            <section className="rounded-[14px] border border-slate-800/60 bg-[#151c2c] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.11em] text-slate-500">
                Current Commission
              </p>
              <p className="mt-3 text-4xl font-bold text-slate-100">
                {currentRate ? formatPercent(currentRate.percentage) : "10.00%"}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {currentRate
                  ? `Effective from ${formatDate(currentRate.effective_from)}`
                  : "Default commission applied until a custom rate is added."}
              </p>

              <div className="mt-5 rounded-xl border border-slate-800 bg-[#0f1524] px-4 py-3">
                <p className="text-xs font-semibold text-slate-500">Upcoming changes</p>
                <p className="mt-1 text-lg font-bold text-slate-100">{upcomingRates.length}</p>
              </div>
            </section>

            <section className="rounded-[14px] border border-slate-800/60 bg-[#151c2c] p-5">
              <h2 className="text-base font-bold text-slate-100">Schedule Commission Change</h2>
              <form onSubmit={handleSubmit} className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
                <label className="block">
                  <span className="text-xs font-semibold text-slate-500">Commission Percentage</span>
                  <input
                    type="number"
                    min="0.01"
                    max="100"
                    step="0.01"
                    value={percentage}
                    onChange={(event) => setPercentage(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-[#0f1524] px-3 py-2.5 text-sm font-semibold text-slate-100 outline-none transition focus:border-admin-primary"
                    placeholder="Example: 20"
                    required
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-500">Effective From</span>
                  <input
                    type="date"
                    value={effectiveFrom}
                    onChange={(event) => setEffectiveFrom(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-[#0f1524] px-3 py-2.5 text-sm font-semibold text-slate-100 outline-none transition focus:border-admin-primary"
                    required
                  />
                </label>
                <label className="block lg:col-span-2">
                  <span className="text-xs font-semibold text-slate-500">Note</span>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    className="mt-2 min-h-24 w-full resize-y rounded-lg border border-slate-700 bg-[#0f1524] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-admin-primary"
                    placeholder="Optional internal note"
                  />
                </label>
                {feedback.text ? (
                  <div
                    className={`rounded-lg border px-4 py-3 text-sm font-semibold lg:col-span-2 ${
                      feedback.type === "success"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : "border-rose-500/30 bg-rose-500/10 text-rose-300"
                    }`}
                  >
                    {feedback.text}
                  </div>
                ) : null}
                <div className="lg:col-span-2">
                  <button
                    type="submit"
                    disabled={mutation.isPending}
                    className="rounded-lg bg-admin-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-admin-primary/90 disabled:opacity-60"
                  >
                    {mutation.isPending ? "Saving..." : "Save Commission Change"}
                  </button>
                </div>
              </form>
            </section>
          </div>

          <section className="mt-6 rounded-[14px] border border-slate-800/60 bg-[#151c2c] p-5">
            <h2 className="text-base font-bold text-slate-100">Commission Change History</h2>
            <div className="mt-4 overflow-x-auto">
              {ratesQuery.isLoading ? (
                <div className="h-40 animate-pulse rounded-xl bg-slate-800/50" />
              ) : rates.length ? (
                <table className="min-w-[760px] w-full border-separate border-spacing-0 text-left text-sm">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-[0.08em] text-slate-500">
                      <th className="border-b border-slate-800 px-3 py-3 font-bold">Commission</th>
                      <th className="border-b border-slate-800 px-3 py-3 font-bold">Effective From</th>
                      <th className="border-b border-slate-800 px-3 py-3 font-bold">Changed By</th>
                      <th className="border-b border-slate-800 px-3 py-3 font-bold">Changed At</th>
                      <th className="border-b border-slate-800 px-3 py-3 font-bold">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rates.map((rate) => (
                      <tr key={rate.id} className="text-slate-300">
                        <td className="border-b border-slate-800/70 px-3 py-4 font-bold text-slate-100">
                          {formatPercent(rate.percentage)}
                        </td>
                        <td className="border-b border-slate-800/70 px-3 py-4">
                          {formatDate(rate.effective_from)}
                        </td>
                        <td className="border-b border-slate-800/70 px-3 py-4">
                          {rate.changed_by_name || "—"}
                        </td>
                        <td className="border-b border-slate-800/70 px-3 py-4 text-slate-400">
                          {formatDateTime(rate.created_at)}
                        </td>
                        <td className="border-b border-slate-800/70 px-3 py-4 text-slate-400">
                          {rate.note || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-700 bg-[#0f1524] px-5 py-8 text-center text-sm text-slate-500">
                  No commission changes yet. Default commission is 10%.
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

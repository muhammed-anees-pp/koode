import { uppercaseMeridiem } from "../../utils/indiaDateTime";

const formatAmount = (value) => `₹${Number(value || 0).toFixed(2)}`;

const formatCreatedAt = (value) => uppercaseMeridiem(new Date(value).toLocaleString());

const formatDateTime = (date, time) => {
  if (!date) return "";
  if (!time) return date;
  return `${date} at ${String(time).slice(0, 5)}`;
};

export default function WalletTransactionList({
  transactions,
  isLoading,
  emptyClassName,
  dark = false,
  compact = false,
}) {
  const primaryText = dark ? "text-slate-200" : "text-slate-800";
  const secondaryText = dark ? "text-slate-500" : "text-slate-500";
  const borderClass = dark ? "divide-slate-800" : "divide-slate-100";
  const chipClass = dark
    ? "border-slate-700 bg-[#0f1524] text-slate-400"
    : "border-slate-200 bg-slate-50 text-slate-500";

  if (isLoading) {
    return <div className={`h-28 animate-pulse rounded-xl ${dark ? "bg-slate-800/50" : "bg-slate-100"}`} />;
  }

  if (!transactions?.length) {
    return (
      <div className={emptyClassName}>
        No wallet transactions yet.
      </div>
    );
  }

  return (
    <div className={`divide-y ${borderClass}`}>
      {transactions.map((item) => {
        const appointment = item.appointment;
        const reference = item.payment_reference || item.reference;
        if (compact) {
          return (
            <div key={item.id} className="py-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={`text-sm font-bold ${primaryText}`}>{item.title}</p>
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${chipClass}`}>
                      {item.payment_method || "Wallet"}
                    </span>
                  </div>
                  <div className={`mt-2 grid gap-1 text-xs ${secondaryText}`}>
                    <p>Date & Time: <span className={primaryText}>{formatCreatedAt(item.created_at)}</span></p>
                    {reference ? <p>Reference: <span className={primaryText}>{reference}</span></p> : null}
                    <p>Method: <span className={primaryText}>{item.payment_method || "Wallet"}</span></p>
                  </div>
                </div>
                <div className="text-left md:text-right">
                  <p className={`text-base font-bold ${item.transaction_type === "CREDIT" ? "text-emerald-500" : "text-rose-500"}`}>
                    {item.transaction_type === "CREDIT" ? "+" : "-"}{formatAmount(item.amount)}
                  </p>
                </div>
              </div>
            </div>
          );
        }
        return (
          <div key={item.id} className="py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={`text-sm font-bold ${primaryText}`}>{item.title}</p>
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${chipClass}`}>
                    {item.payment_method}
                  </span>
                </div>
                <p className={`mt-1 text-xs leading-relaxed ${secondaryText}`}>
                  {item.description || item.note}
                </p>
                <div className={`mt-2 grid gap-1 text-xs ${secondaryText}`}>
                  {appointment ? (
                    <p>
                      Appointment: <span className={primaryText}>{appointment.patient_name}</span> with{" "}
                      <span className={primaryText}>{appointment.psychologist_name}</span>,{" "}
                      {formatDateTime(appointment.date, appointment.start_time)}
                    </p>
                  ) : null}
                  {appointment ? (
                    <p>
                      Breakdown: Fee {formatAmount(appointment.consultation_fee)}, GST {formatAmount(appointment.gst_amount)}, Total {formatAmount(appointment.total_amount)}
                    </p>
                  ) : null}
                  {appointment?.psychologist_payout_amount && item.source === "PSYCHOLOGIST_PAYOUT" ? (
                    <p>
                      Payout: <span className={primaryText}>{formatAmount(appointment.psychologist_payout_amount)}</span>, Admin retained{" "}
                      <span className={primaryText}>{formatAmount(appointment.admin_retained_amount)}</span>
                    </p>
                  ) : null}
                  {item.payment_reference ? <p>Reference: <span className={primaryText}>{item.payment_reference}</span></p> : null}
                  <p>Time: {formatCreatedAt(item.created_at)}</p>
                </div>
              </div>
              <div className="text-left md:text-right">
                <p className={`text-base font-bold ${item.transaction_type === "CREDIT" ? "text-emerald-500" : "text-rose-500"}`}>
                  {item.transaction_type === "CREDIT" ? "+" : "-"}{formatAmount(item.amount)}
                </p>
                <p className={`mt-1 text-xs ${secondaryText}`}>Balance {formatAmount(item.balance_after)}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

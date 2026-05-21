import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAdminReviews } from "../../../api/admin.api";
import Sidebar from "../../../components/admin/Sidebar/AdminSidebar";
import Navbar from "../../../components/admin/Navbar/AdminNavbar";
import { uppercaseMeridiem } from "../../../utils/indiaDateTime";

const pageSizes = [10, 25, 50];
const ratingOptions = [
  { label: "All Ratings", value: "all" },
  { label: "5 Star", value: "5" },
  { label: "4 Star", value: "4" },
  { label: "3 Star", value: "3" },
  { label: "2 Star", value: "2" },
  { label: "1 Star", value: "1" },
];

const thCls = "px-5 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-[0.1em]";
const tdCls = "px-5 py-4 text-sm text-slate-300";
const inputCls = "w-full rounded-[10px] border border-slate-700/60 bg-[#141826] px-3 py-2.5 text-sm text-slate-200 outline-none transition placeholder:text-slate-500 focus:border-admin-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)]";

const formatNumber = (value) => Number(value || 0).toLocaleString("en-IN");

const formatSlotDate = (value) => {
  if (!value) return "No date";
  const [year, month, day] = String(value).split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
};

const formatTime = (value) => {
  if (!value) return "";
  const [hours = "0", minutes = "0"] = String(value).split(":");
  const date = new Date(Date.UTC(2026, 0, 1, Number(hours), Number(minutes)));
  return uppercaseMeridiem(new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(date));
};

const stars = (rating) => "★★★★★".slice(0, Number(rating || 0)) || "No rating";

function RatingBadge({ rating }) {
  const value = Number(rating || 0);
  const styles = {
    5: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
    4: "bg-sky-500/15 text-sky-400 border-sky-500/25",
    3: "bg-yellow-500/15 text-yellow-300 border-yellow-500/25",
    2: "bg-orange-500/15 text-orange-400 border-orange-500/25",
    1: "bg-red-500/15 text-red-400 border-red-500/25",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${styles[value] || "bg-slate-700/50 text-slate-300 border-slate-600"}`}>
      {value || "-"}<span>★</span>
    </span>
  );
}

function SummaryCard({ icon, title, value, accent }) {
  return (
    <div className="rounded-2xl border border-slate-700/50 bg-[#141826] p-5">
      <div className="flex items-center justify-between gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}>
          {icon}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{title}</span>
      </div>
      <p className="mt-4 text-2xl font-bold text-slate-100">{value}</p>
    </div>
  );
}

function DetailBlock({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-700/50 bg-slate-950/20 p-5">
      <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{title}</h3>
      {children}
    </section>
  );
}

function InfoLine({ label, value }) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-800/70 py-3 last:border-0">
      <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-200">{value || "-"}</span>
    </div>
  );
}

function ReviewDetailsModal({ review, onClose }) {
  if (!review) return null;

  const summary = review.consultation?.patient_summary?.summary;

  return (
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center bg-black/75 p-5 backdrop-blur-[4px]"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-700/60 bg-[#101522] shadow-[0_24px_90px_rgba(0,0,0,0.65)]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-700/50 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-admin-primary">Review Details</p>
            <h2 className="mt-1 font-outfit text-2xl font-bold text-slate-100">{review.patient?.full_name} to {review.psychologist?.full_name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-400 transition hover:text-slate-100"
            aria-label="Close review details"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="max-h-[calc(90vh-82px)] overflow-y-auto p-6">
          <div className="grid gap-5 lg:grid-cols-2">
            <DetailBlock title="Rating & Review">
              <div className="mb-4 flex items-center gap-3">
                <RatingBadge rating={review.rating} />
                <span className="text-lg tracking-wide text-amber-300">{stars(review.rating)}</span>
              </div>
              <p className="whitespace-pre-line rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-sm leading-6 text-slate-200">
                {review.review || "No written review was provided."}
              </p>
            </DetailBlock>

            <DetailBlock title="Appointment Slot">
              <InfoLine label="Date" value={formatSlotDate(review.slot?.date)} />
              <InfoLine label="Time" value={`${formatTime(review.slot?.start_time)} - ${formatTime(review.slot?.end_time)}`} />
            </DetailBlock>

            <DetailBlock title="Patient Details">
              <InfoLine label="Patient Name" value={review.patient?.full_name} />
              <InfoLine label="Email" value={review.patient?.email} />
              <InfoLine label="Phone" value={review.patient?.phone_number} />
            </DetailBlock>

            <DetailBlock title="Psychologist Details">
              <InfoLine label="Psychologist Name" value={review.psychologist?.full_name} />
              <InfoLine label="Specialization" value={review.psychologist?.specialization} />
              <InfoLine label="Average Rating" value={review.psychologist?.average_rating ? `${review.psychologist.average_rating} / 5 (${review.psychologist.review_count || 0} reviews)` : "No ratings yet"} />
            </DetailBlock>
          </div>

          <div className="mt-5 grid gap-5">
            <DetailBlock title="Consultation Notes">
              <p className="whitespace-pre-line text-sm leading-6 text-slate-300">{review.consultation?.notes || "No consultation notes saved."}</p>
            </DetailBlock>

            <DetailBlock title="Prescription">
              <p className="whitespace-pre-line text-sm leading-6 text-slate-300">{review.consultation?.prescription || "No prescription saved."}</p>
            </DetailBlock>

            <DetailBlock title="Patient Summary">
              <p className="whitespace-pre-line text-sm leading-6 text-slate-300">{summary || "No patient summary available."}</p>
            </DetailBlock>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminReviews() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [rating, setRating] = useState("all");
  const [selectedReview, setSelectedReview] = useState(null);

  const queryArgs = useMemo(
    () => ({ page, pageSize, search, rating }),
    [page, pageSize, search, rating]
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-reviews", queryArgs],
    queryFn: () => fetchAdminReviews(queryArgs),
    keepPreviousData: true,
  });

  const reviews = data?.results || [];
  const summary = data?.summary || {};
  const total = data?.total || 0;
  const totalPages = data?.total_pages || 1;
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const resetPage = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  return (
    <div className="flex min-h-screen bg-admin-gradient font-['DM_Sans',sans-serif]">
      <Sidebar />
      <div className="ml-[220px] flex flex-1 flex-col">
        <Navbar />
        <main className="mt-[60px] flex-1 p-6 lg:p-8">
          <div className="mb-7">
            <h1 className="font-outfit text-2xl font-bold tracking-tight text-slate-100">Review & Ratings</h1>
            <p className="mt-1 text-sm text-slate-400">Monitor patient feedback, low ratings, and consultation context.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard icon="★" title="Average Rating" value={summary.average_rating ? `${summary.average_rating}` : "-"} accent="bg-amber-500/15 text-amber-300" />
            <SummaryCard icon="📝" title="Total Reviews" value={formatNumber(summary.total_reviews)} accent="bg-sky-500/15 text-sky-300" />
            <SummaryCard icon="📅" title="Reviews Today" value={`${formatNumber(summary.reviews_today)} Today`} accent="bg-emerald-500/15 text-emerald-300" />
            <SummaryCard icon="!" title="Low Ratings" value={formatNumber(summary.low_ratings)} accent="bg-red-500/15 text-red-300" />
          </div>

          <div className="mt-6 rounded-2xl border border-slate-700/50 bg-[#141826] p-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
              <input
                className={inputCls}
                value={search}
                onChange={(event) => resetPage(setSearch)(event.target.value)}
                placeholder="Search patient or psychologist"
              />
              <select className={inputCls} value={rating} onChange={(event) => resetPage(setRating)(event.target.value)}>
                {ratingOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-[14px] border border-slate-700/50 bg-[#141826]">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-700/40">
                  <th className={thCls}>Rating</th>
                  <th className={thCls}>Patient</th>
                  <th className={thCls}>Psychologist</th>
                  <th className={thCls}>Slot</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && <tr><td colSpan={4} className="py-16 text-center text-sm text-slate-500">Loading reviews...</td></tr>}
                {isError && <tr><td colSpan={4} className="py-16 text-center text-sm text-red-400">Failed to load reviews. Please refresh.</td></tr>}
                {!isLoading && !isError && reviews.length === 0 && (
                  <tr><td colSpan={4} className="py-16 text-center text-sm text-slate-500">No reviews found.</td></tr>
                )}
                {reviews.map((review) => (
                  <tr
                    key={review.id}
                    className="cursor-pointer border-b border-slate-700/30 transition-colors hover:bg-slate-800/35"
                    onClick={() => setSelectedReview(review)}
                  >
                    <td className={tdCls}><RatingBadge rating={review.rating} /></td>
                    <td className={tdCls}>
                      <div className="font-medium text-slate-200">{review.patient?.full_name}</div>
                      <div className="text-xs text-slate-500">{review.patient?.email}</div>
                    </td>
                    <td className={tdCls}>
                      <div className="font-medium text-slate-200">{review.psychologist?.full_name}</div>
                      <div className="text-xs text-slate-500">{review.psychologist?.specialization || "Psychologist"}</div>
                    </td>
                    <td className={`${tdCls} text-slate-400`}>
                      {formatSlotDate(review.slot?.date)} • {formatTime(review.slot?.start_time)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                className="rounded-lg border border-slate-700/60 bg-[#141826] px-2 py-1 text-sm text-slate-300 outline-none focus:border-admin-primary"
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
              >
                {pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
            </div>
            <span>{total > 0 ? `${start}-${end} of ${total}` : "0 results"}</span>
            <div className="flex items-center gap-1.5">
              <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700/60 bg-[#141826] text-slate-400 transition hover:border-admin-primary hover:text-admin-primary disabled:cursor-not-allowed disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700/60 bg-[#141826] text-slate-400 transition hover:border-admin-primary hover:text-admin-primary disabled:cursor-not-allowed disabled:opacity-40" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </div>
          </div>
        </main>
      </div>

      <ReviewDetailsModal review={selectedReview} onClose={() => setSelectedReview(null)} />
    </div>
  );
}

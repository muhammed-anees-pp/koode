import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { getPsychologistReviewDashboard } from "../../../api/psychologist.api";
import PsychologistNavbar from "../../../components/psychologist/Navbar/PsychologistNavbar";
import PsychologistSidebar from "../../../components/psychologist/Sidebar/PsychologistSidebar";
import { usePsychologistSessionGuard } from "../../../hooks/usePsychologistSessionGuard";
import { useAuthStore } from "../../../store/auth.store";

const FILTERS = ["All", "5 Star", "4 Star", "Low Ratings", "Recent"];
const FEEDBACKS_PER_PAGE = 10;

const formatRatingValue = (value) => {
  if (value == null) return "New";
  return Number(value).toFixed(1);
};

const formatReviewDate = (value) => {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

function StarRating({ rating, size = 16 }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${rating} star rating`}>
      {Array.from({ length: 5 }).map((_, index) => {
        const filled = index < rating;
        return (
          <svg
            key={index}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={filled ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.8"
            className={filled ? "text-amber-400" : "text-slate-300"}
            aria-hidden="true"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        );
      })}
    </div>
  );
}

function SummaryCard({ label, value, icon, tone = "blue" }) {
  const toneClasses = {
    blue: "bg-blue-50 text-psycho-primary",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-rose-50 text-rose-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">{value}</p>
        </div>
        <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${toneClasses[tone]}`}>
          {icon}
        </span>
      </div>
    </div>
  );
}

export default function PsychologistReviews() {
  usePsychologistSessionGuard();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.role);
  const [filter, setFilter] = useState("All");
  const [page, setPage] = useState(1);

  const reviewsQuery = useQuery({
    queryKey: ["psychologist-review-dashboard"],
    queryFn: getPsychologistReviewDashboard,
    enabled: isAuthenticated && role === "PSYCHOLOGIST",
  });

  const dashboard = reviewsQuery.data;
  const summary = dashboard?.summary || {};
  const reviews = dashboard?.reviews || [];
  const ratingBreakdown = dashboard?.rating_breakdown || [];
  const maxRatingCount = Math.max(...ratingBreakdown.map((item) => item.count || 0), 1);

  const filteredReviews = useMemo(() => {
    const list = [...reviews];
    if (filter === "5 Star") return list.filter((review) => review.rating === 5);
    if (filter === "4 Star") return list.filter((review) => review.rating === 4);
    if (filter === "Low Ratings") return list.filter((review) => review.rating <= 2);
    return list.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
  }, [reviews, filter]);

  useEffect(() => {
    setPage(1);
  }, [filter, reviews.length]);

  const totalPages = Math.max(1, Math.ceil(filteredReviews.length / FEEDBACKS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginatedReviews = filteredReviews.slice(
    (safePage - 1) * FEEDBACKS_PER_PAGE,
    safePage * FEEDBACKS_PER_PAGE
  );
  const showPagination = filteredReviews.length > FEEDBACKS_PER_PAGE;

  if (!isAuthenticated || role !== "PSYCHOLOGIST") {
    return <Navigate to="/psychologist/login" replace />;
  }

  return (
    <div className="min-h-screen bg-[#f6f8fb] font-['Inter',sans-serif]">
      <PsychologistNavbar />
      <div className="flex">
        <PsychologistSidebar />
        <main className="min-h-[calc(100vh-73px)] flex-1 px-5 py-8 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-7">
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-psycho-primary">
                Psychologist Dashboard
              </p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
                Reviews & Ratings
              </h1>
            </div>

            {reviewsQuery.isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-32 animate-pulse rounded-2xl bg-white" />
                ))}
              </div>
            ) : reviewsQuery.isError ? (
              <div className="rounded-2xl border border-rose-100 bg-rose-50 p-6 text-sm font-semibold text-rose-700">
                Unable to load reviews. Please try again later.
              </div>
            ) : (
              <>
                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <SummaryCard
                    label="Overall Rating"
                    value={formatRatingValue(summary.overall_rating)}
                    tone="amber"
                    icon={
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    }
                  />
                  <SummaryCard
                    label="Total Reviews"
                    value={summary.total_reviews || 0}
                    tone="blue"
                    icon={
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                        <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
                      </svg>
                    }
                  />
                  <SummaryCard
                    label="This Month Rating"
                    value={formatRatingValue(summary.this_month_rating)}
                    tone="green"
                    icon={
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    }
                  />
                  <SummaryCard
                    label="Low Ratings"
                    value={summary.low_ratings || 0}
                    tone="red"
                    icon={
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                    }
                  />
                </section>

                <section className="mt-6 grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-extrabold text-slate-900">Rating Breakdown</h2>
                        <p className="mt-1 text-sm text-slate-500">Distribution across submitted reviews.</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {ratingBreakdown.map((item) => {
                        const percentage = ((item.count || 0) / maxRatingCount) * 100;
                        return (
                          <div key={item.rating} className="grid grid-cols-[48px_minmax(0,1fr)_40px] items-center gap-3">
                            <div className="flex items-center gap-1 text-sm font-bold text-slate-700">
                              {item.rating}
                              <span className="text-amber-400">★</span>
                            </div>
                            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-psycho-primary"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <div className="text-right text-sm font-bold text-slate-700">{item.count || 0}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h2 className="text-lg font-extrabold text-slate-900">Consultation feedbacks</h2>
                        <p className="mt-1 text-sm text-slate-500">Patient identity is hidden for privacy.</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {FILTERS.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setFilter(item)}
                            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                              filter === item
                                ? "bg-psycho-primary text-white shadow-sm"
                                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5 space-y-4">
                      {filteredReviews.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
                          <p className="text-sm font-semibold text-slate-600">No feedback available for this filter.</p>
                        </div>
                      ) : (
                        paginatedReviews.map((review) => (
                          <article key={review.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <StarRating rating={review.rating} />
                              <span className="text-sm font-semibold text-slate-500">
                                {formatReviewDate(review.submitted_at)}
                              </span>
                            </div>
                            <p className="mt-4 text-base font-semibold leading-7 text-slate-800">
                              "{review.review || "No written feedback provided."}"
                            </p>
                            <p className="mt-4 text-sm font-bold text-slate-500">Anonymous Patient</p>
                          </article>
                        ))
                      )}
                    </div>

                    {showPagination ? (
                      <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-semibold text-slate-500">
                          Showing {(safePage - 1) * FEEDBACKS_PER_PAGE + 1}-
                          {Math.min(safePage * FEEDBACKS_PER_PAGE, filteredReviews.length)} of {filteredReviews.length}
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={safePage === 1}
                            onClick={() => setPage((value) => Math.max(1, value - 1))}
                            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Previous
                          </button>
                          <span className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">
                            {safePage} / {totalPages}
                          </span>
                          <button
                            type="button"
                            disabled={safePage === totalPages}
                            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </section>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { formatIndiaDate, formatIndiaDateTime, formatIndiaTime } from "../../utils/indiaDateTime";

function Stars({ value, onChange, readOnly = false, size = 28 }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, index) => {
        const rating = index + 1;
        const filled = rating <= value;
        return (
          <button
            key={rating}
            type="button"
            disabled={readOnly}
            onClick={() => onChange?.(rating)}
            className={`rounded-md p-0.5 transition ${readOnly ? "cursor-default" : "hover:scale-110"}`}
            aria-label={`${rating} star${rating === 1 ? "" : "s"}`}
          >
            <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "#f59e0b" : "none"} stroke={filled ? "#f59e0b" : "#d1d5db"} strokeWidth="1.7">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}

export default function ReviewModal({ booking, onClose, onSubmit, isPending, error }) {
  const existingReview = booking?.review;
  const readOnly = Boolean(existingReview && !existingReview.can_edit);
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [review, setReview] = useState(existingReview?.review || "");

  useEffect(() => {
    setRating(existingReview?.rating || 0);
    setReview(existingReview?.review || "");
  }, [booking?.id, existingReview?.id, existingReview?.rating, existingReview?.review]);

  if (!booking) return null;

  const title = existingReview ? (readOnly ? "Your Review" : "Edit Review") : "Rate Consultation";
  const canSubmit = rating > 0 && !readOnly && !isPending;

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-slate-950/50 px-4 py-6" onClick={onClose}>
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-patient-primary">{title}</p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">{booking.psychologist_name}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {formatIndiaDate(booking.date)} - {formatIndiaTime(booking.start_time)} to {formatIndiaTime(booking.end_time)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close review"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
          <p className="mb-3 text-sm font-bold text-slate-800">Rating</p>
          <Stars value={rating} onChange={setRating} readOnly={readOnly} />
        </div>

        <div className="mt-4">
          <label className="mb-2 block text-sm font-bold text-slate-800">Review</label>
          <textarea
            value={review}
            onChange={(event) => setReview(event.target.value)}
            disabled={readOnly}
            rows={5}
            placeholder="Share your experience from this consultation..."
            className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition focus:border-patient-primary focus:bg-white disabled:text-slate-500"
          />
        </div>

        {existingReview?.submitted_at ? (
          <p className="mt-2 text-xs text-slate-500">
            Submitted {formatIndiaDateTime(existingReview.submitted_at)}
            {existingReview.can_edit ? `, editable until ${formatIndiaDateTime(existingReview.edit_deadline)}` : ""}
          </p>
        ) : null}
        {readOnly ? (
          <p className="mt-2 text-xs font-medium text-slate-500">The 15-minute edit window has ended.</p>
        ) : null}
        {error ? <p className="mt-3 text-sm font-semibold text-rose-600">{error}</p> : null}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {readOnly ? "Close" : "Not Now"}
          </button>
          {!readOnly ? (
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => onSubmit({ rating, review: review.trim() })}
              className="rounded-xl bg-patient-primary px-5 py-2.5 text-sm font-semibold text-white shadow-patient-sm transition hover:bg-patient-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Saving..." : existingReview ? "Save Review" : "Submit Review"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export { Stars };

import { Link, Navigate } from "react-router-dom";
import PatientNavbar from "../../../components/patient/Navbar/PatientNavbar";
import PatientFooter from "../../../components/patient/Footer/PatientFooter";
import { usePatientSessionGuard } from "../../../hooks/usePatientSessionGuard";
import { useAuthStore } from "../../../store/auth.store";

export default function PatientPaymentCancelled() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.role);
  usePatientSessionGuard();

  if (!isAuthenticated || role !== "PATIENT") {
    return <Navigate to="/patient/login" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f0f4f8] font-['DM_Sans',sans-serif] antialiased">
      <PatientNavbar />

      <main className="flex flex-1 items-start justify-center px-4 pt-[7rem] pb-24 sm:px-6">
        <div className="w-full max-w-[520px]">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            {/* Header */}
            <div
              className="flex flex-col items-center pb-8 pt-10 text-center"
              style={{ background: "linear-gradient(160deg, #fff5f5 0%, #fff 60%)" }}
            >
              <div className="relative mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm">
                  <svg
                    width="30"
                    height="30"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </div>
                <span className="absolute inset-0 animate-ping rounded-full bg-rose-400/20" />
              </div>

              <h1 className="text-2xl font-bold text-slate-900">
                Payment Cancelled
              </h1>
              <p className="mt-2 max-w-[340px] text-sm leading-relaxed text-slate-500">
                The appointment was not confirmed. The selected slot was
                released, and any wallet hold was returned.
              </p>
            </div>

            {/* Info box */}
            <div className="mx-6 mb-2 rounded-xl border border-rose-100 bg-rose-50 px-5 py-4">
              <div className="flex gap-3">
                <svg
                  className="mt-0.5 flex-shrink-0 text-rose-400"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div>
                  <p className="text-xs font-bold text-rose-700">
                    What happened?
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-rose-600">
                    You cancelled or closed the payment window before completion.
                    No charges were made. Any reserved wallet balance has been
                    released back to your account.
                  </p>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mx-6 mt-5 flex flex-col gap-3 pb-6">
              <Link
                to="/patient/therapists"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-patient-primary py-3.5 text-sm font-bold text-white transition hover:bg-patient-hover"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                >
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                </svg>
                Book Again
              </Link>

              <Link
                to="/patient/wallet"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-3.5 text-sm font-bold text-slate-700 transition hover:border-patient-primary/30 hover:bg-slate-50"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="2" y="5" width="20" height="14" rx="3" />
                  <path d="M16 12h2" />
                </svg>
                View Wallet
              </Link>
            </div>
          </div>
        </div>
      </main>

      <PatientFooter />
    </div>
  );
}

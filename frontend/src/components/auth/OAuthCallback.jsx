import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { refreshAccessToken } from "../../api/auth.api";
import { useAuthStore } from "../../store/auth.store";

const OAuthCallback = ({ role }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [error, setError] = useState(searchParams.get("error") || "");

  useEffect(() => {
    if (error) return;

    let cancelled = false;

    const completeLogin = async () => {
      try {
        const data = await refreshAccessToken(role);
        if (cancelled) return;

        if (!data?.access) {
          setError("Google sign-in failed. Please try again.");
          return;
        }

        login(data, data.role || role);
        navigate(role === "PSYCHOLOGIST" ? "/psychologist/home" : "/patient/home", { replace: true });
      } catch {
        if (!cancelled) {
          setError("Google sign-in failed. Please try again.");
        }
      }
    };

    completeLogin();

    return () => {
      cancelled = true;
    };
  }, [error, login, navigate, role]);

  const loginPath = role === "PSYCHOLOGIST" ? "/psychologist/login" : "/patient/login";

  return (
    <div className="min-h-screen bg-ui-50 flex items-center justify-center px-6">
      <div className="w-full max-w-[420px] bg-white rounded-lg2 shadow-card px-8 py-8 text-center">
        {error ? (
          <>
            <h1 className="font-outfit text-xl font-bold text-ui-900 mb-2">Google sign-in failed</h1>
            <p className="text-sm text-red-500 mb-6">{error}</p>
            <Link
              to={loginPath}
              className="inline-flex min-h-[44px] px-5 items-center justify-center rounded-md2 bg-patient-primary text-white text-sm font-semibold no-underline"
            >
              Back to login
            </Link>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 h-8 w-8 rounded-full border-2 border-ui-200 border-t-patient-primary animate-spin" />
            <h1 className="font-outfit text-xl font-bold text-ui-900 mb-2">Completing Google sign-in</h1>
            <p className="text-sm text-ui-500">Please wait while we finish setting up your session.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default OAuthCallback;

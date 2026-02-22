import { useEffect } from "react";
import { useAuthStore } from "../store/auth.store";
import { refreshAccessToken } from "../api/auth.api";

const AuthInitializer = ({ children }) => {
  const login = useAuthStore((s) => s.login);
  const stopChecking = useAuthStore((s) => s.stopChecking);
  const isAuthChecking = useAuthStore((s) => s.isAuthChecking);
  const existingUser = useAuthStore((s) => s.user);
  const existingPatient = useAuthStore((s) => s.patient);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const data = await refreshAccessToken();

        if (!data?.access) {
          stopChecking();
          return;
        }

        const base64Payload = data.access.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        const payload = JSON.parse(atob(base64Payload));

        login({ access: data.access, user: existingUser || existingPatient }, payload.role);
      } catch {
        stopChecking();
      }
    };

    initAuth();
  }, []);

  if (isAuthChecking) {
    return <div>Loading...</div>;
  }

  return children;
};

export default AuthInitializer;
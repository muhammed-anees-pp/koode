import { useEffect, useRef } from "react";
import { useAuthStore } from "../store/auth.store";
import { refreshAccessToken } from "../api/auth.api";

const inferRoleFromPath = () => {
  const path = window.location.pathname;
  if (path.startsWith("/admin")) return "ADMIN";
  if (path.startsWith("/psychologist")) return "PSYCHOLOGIST";
  if (path.startsWith("/patient")) return "PATIENT";
  return null;
};

const AuthInitializer = ({ children }) => {
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);
  const stopChecking = useAuthStore((s) => s.stopChecking);
  const isAuthChecking = useAuthStore((s) => s.isAuthChecking);
  const existingUser = useAuthStore((s) => s.user);
  const existingRole = useAuthStore((s) => s.role);
  const initialUserRef = useRef(existingUser);
  const initialRoleRef = useRef(existingRole);

  useEffect(() => {
    const initAuth = async () => {
      const requestedRole = inferRoleFromPath() || initialRoleRef.current;

      try {
        const data = await refreshAccessToken(requestedRole);

        if (!data?.access) {
          logout();
          stopChecking();
          return;
        }

        const base64Payload = data.access.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        const payload = JSON.parse(atob(base64Payload));

        login({ access: data.access, user: data.user || initialUserRef.current }, data.role || payload.role);
      } catch {
        logout();
      }
    };

    initAuth();
  }, [login, logout, stopChecking]);

  if (isAuthChecking) {
    return <div>Loading...</div>;
  }

  return children;
};

export default AuthInitializer;

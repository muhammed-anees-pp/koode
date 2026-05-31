import { useEffect, useRef } from "react";
import { useAuthStore } from "../store/auth.store";
import { refreshAccessToken } from "../api/auth.api";

const CHECK_INTERVAL_MS = 15_000;

export function usePsychologistSessionGuard() {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const role = useAuthStore((s) => s.role);
    const setAccessToken = useAuthStore((s) => s.setAccessToken);
    const timerRef = useRef(null);

    useEffect(() => {
        if (!isAuthenticated || role !== "PSYCHOLOGIST") return;

        const checkSession = async () => {
            try {
                const data = await refreshAccessToken("PSYCHOLOGIST");
                if (data?.access) {
                    setAccessToken(data.access);
                }
            } catch (err) {
                const status = err?.response?.status;
                if (status === 401) {
                    useAuthStore.getState().logout();
                    localStorage.removeItem("koode-auth-storage");
                    window.location.href = "/psychologist/login";
                }
            }
        };

        checkSession();
        timerRef.current = setInterval(checkSession, CHECK_INTERVAL_MS);

        return () => clearInterval(timerRef.current);
    }, [isAuthenticated, role, setAccessToken]);
}

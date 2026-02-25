import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth.store";
import axiosInstance from "../api/axios";

const CHECK_INTERVAL_MS = 60_000; // Check every 60 seconds
export function usePatientSessionGuard() {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const role = useAuthStore((s) => s.role);
    const navigate = useNavigate();
    const timerRef = useRef(null);

    useEffect(() => {
        if (!isAuthenticated || role !== "PATIENT") return;

        const checkSession = async () => {
            try {
                await axiosInstance.get("patient/profile/");
            } catch {
                console("issue is there")
            }
        };

        checkSession();
        timerRef.current = setInterval(checkSession, CHECK_INTERVAL_MS);

        return () => clearInterval(timerRef.current);
    }, [isAuthenticated, role, navigate]);
}

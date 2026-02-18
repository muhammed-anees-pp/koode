import { useEffect } from "react";
import { useAdminStore } from "../store/admin.store";
import { refreshAccessToken } from "../api/admin.api";

const AuthInitializer = ({ children }) => {
  const login = useAdminStore((s) => s.login);
  const stopChecking = useAdminStore((s) => s.stopChecking);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const data = await refreshAccessToken();
        login({ access: data.access });
      } catch (err) {
        stopChecking();
      }
    };

    initAuth();
  }, []);

  const isAuthChecking = useAdminStore((s) => s.isAuthChecking);

  if (isAuthChecking) {
    return <div>Loading...</div>;
  }

  return children;
};

export default AuthInitializer;

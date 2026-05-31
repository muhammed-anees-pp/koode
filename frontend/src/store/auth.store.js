import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      role: null,
      isAuthenticated: false,
      isAuthChecking: true,

      login: (data, role) => {
        set({
          accessToken: data.access,
          user: data.user,
          role: role,
          isAuthenticated: true,
          isAuthChecking: false,
        });
      },

      updateUser: (data) => {
        set((state) => ({
          user: { ...state.user, ...data },
        }));
      },

      setAccessToken: (accessToken) =>
        set({
          accessToken,
        }),

      logout: () =>
        set({
          accessToken: null,
          user: null,
          role: null,
          isAuthenticated: false,
          isAuthChecking: false,
        }),

      stopChecking: () =>
        set({
          isAuthChecking: false,
        }),
    }),
    {
      name: "koode-auth-storage",
      partialize: (state) => ({
        user: state.user,
        role: state.role,
        isAuthenticated: state.isAuthenticated
      }),
    }
  )
);

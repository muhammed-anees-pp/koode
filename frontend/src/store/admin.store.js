import { create } from "zustand";

export const useAdminStore = create((set) => ({
  accessToken: null,
  isAuthenticated: false,
  isAuthChecking: true,

  login: (tokens) =>
    set({
      accessToken: tokens.access,
      isAuthenticated: true,
      isAuthChecking: false,
    }),

  logout: () =>
    set({
      accessToken: null,
      isAuthenticated: false,
      isAuthChecking: false,
    }),

  stopChecking: () =>
    set({
      isAuthChecking: false,
    }),
}));

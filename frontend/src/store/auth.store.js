import { create } from "zustand";

export const useAuthStore = create((set) => ({
  accessToken: null,
  user: null,
  role: null,
  isAuthenticated: false,
  isAuthChecking: true,
  admin: null, 

  login: (data, role) => {
    set({
      accessToken: data.access,
      role: role,
      isAuthenticated: true,
      isAuthChecking: false,
      admin: role === "ADMIN" ? data.user : null,
    });
  },

  setAdminData: (data) => {
    set({ admin: data });
  },

  logout: () =>
    set({
      accessToken: null,
      user: null,
      role: null,
      isAuthenticated: false,
      isAuthChecking: false,
      admin: null,
    }),

  stopChecking: () =>
    set({
      isAuthChecking: false,
    }),
}));
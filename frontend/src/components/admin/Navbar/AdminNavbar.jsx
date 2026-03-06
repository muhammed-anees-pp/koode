import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { adminLogout } from "../../../api/admin.api";
import { useAuthStore } from "../../../store/auth.store";

export default function Navbar() {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navigate = useNavigate();
  const menuRef = useRef(null);
  const { user, isAuthenticated, logout: logoutStore } = useAuthStore();
  const currentUser = user;

  const logoutMutation = useMutation({
    mutationFn: adminLogout,
    onSuccess: () => {
      logoutStore();
      localStorage.removeItem('rememberAdmin');
      localStorage.removeItem('rememberedAdminEmail');
      sessionStorage.clear();
      navigate("/admin/login");
    },
  });

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) setShowUserMenu(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isAuthenticated) return null;

  const displayName = currentUser?.full_name || "Admin User";
  const avatarUrl = currentUser?.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=6366f1&color=fff&size=128`;

  return (
    <nav className="fixed top-0 left-[220px] right-0 h-[60px] bg-[#0B0E14] border-b border-slate-800/40 flex items-center px-6 z-[99]">
      <div className="flex-1" />

      <div className="flex items-center gap-3">
        <button className="relative bg-transparent border-none text-slate-400 cursor-pointer flex items-center justify-center hover:text-slate-200 transition-colors p-1">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M15 6.66667C15 5.34058 14.4732 4.06881 13.5355 3.13113C12.5979 2.19345 11.3261 1.66667 10 1.66667C8.67392 1.66667 7.40215 2.19345 6.46447 3.13113C5.52678 4.06881 5 5.34058 5 6.66667C5 12.5 2.5 14.1667 2.5 14.1667H17.5C17.5 14.1667 15 12.5 15 6.66667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M11.4417 17.5C11.2952 17.7526 11.0849 17.9622 10.8319 18.1079C10.5788 18.2537 10.292 18.3304 10 18.3304C9.70802 18.3304 9.42116 18.2537 9.16814 18.1079C8.91513 17.9622 8.70484 17.7526 8.55835 17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="absolute top-0.5 right-0.5 w-[7px] h-[7px] bg-admin-primary rounded-full" />
        </button>

        <div className="relative" ref={menuRef}>
          <button
            className="flex items-center cursor-pointer bg-transparent border-none p-1"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div className="w-8 h-8 rounded-full overflow-hidden">
              <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-[calc(100%+8px)] w-[160px] bg-[#161b2e] border border-slate-700/60 rounded-[12px] shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden z-10 animate-dropdown">
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-slate-300 text-sm bg-transparent border-none cursor-pointer text-left transition-all duration-150 hover:bg-slate-700/40 hover:text-slate-100"
                onClick={() => { setShowUserMenu(false); navigate("/admin/profile"); }}
              >
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-admin-primary flex-shrink-0">
                  <path d="M10 11.6667C12.3012 11.6667 14.1667 9.80119 14.1667 7.5C14.1667 5.19881 12.3012 3.33333 10 3.33333C7.69881 3.33333 5.83333 5.19881 5.83333 7.5C5.83333 9.80119 7.69881 11.6667 10 11.6667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M17.5 17.5C17.5 15.1988 14.1421 13.3333 10 13.3333C5.85786 13.3333 2.5 15.1988 2.5 17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Profile
              </button>
              <div className="h-px bg-slate-700/40 mx-3" />
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-slate-300 text-sm bg-transparent border-none cursor-pointer text-left transition-all duration-150 hover:bg-slate-700/40 hover:text-slate-100"
                onClick={() => { setShowUserMenu(false); setShowLogoutModal(true); }}
              >
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-admin-primary flex-shrink-0">
                  <path d="M13.3333 14.1667L16.6667 10.8333L13.3333 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16.6667 10.8333H7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M7.5 4.16667H5.83333C4.91286 4.16667 4.16667 4.91286 4.16667 5.83333V15.8333C4.16667 16.7538 4.91286 17.5 5.83333 17.5H7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {showLogoutModal && (
        <div className="fixed inset-0 bg-[rgba(0,0,0,0.75)] backdrop-blur-[4px] z-[200] flex items-center justify-center p-5 animate-fade-in">
          <div className="bg-[#141826] border border-slate-700/50 rounded-2xl p-8 w-full max-w-[360px] text-center shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
            <div className="w-16 h-16 bg-[#2d2462] rounded-full flex items-center justify-center mx-auto mb-5 text-admin-primary">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                <path d="M16 17L21 12L16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="text-slate-100 text-xl font-bold mb-2">Log Out?</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-7">Are you sure you want to end your session? You will need to log in again to access the dashboard.</p>
            <div className="flex gap-3">
              <button
                className="flex-1 py-3 text-sm font-semibold text-slate-300 bg-slate-800/80 border border-slate-700/60 rounded-xl cursor-pointer transition-all duration-200 hover:bg-slate-700/80 disabled:opacity-50"
                onClick={() => setShowLogoutModal(false)}
                disabled={logoutMutation.isPending}
              >
                Cancel
              </button>
              <button
                className="flex-1 py-3 text-sm font-semibold text-white bg-admin-primary border-none rounded-xl cursor-pointer transition-all duration-200 hover:bg-admin-hover disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                {logoutMutation.isPending ? "Logging out..." : "Log Out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
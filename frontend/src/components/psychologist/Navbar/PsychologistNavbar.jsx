import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { psychologistLogout, getMyApplication } from "../../../api/psychologist.api";
import { useAuthStore } from "../../../store/auth.store";
import { resolveMediaUrl } from "../../../utils/url";
import NotificationBell from "../../notifications/NotificationBell";
import logo from "../../../assets/psychologist-logo.png";

const Avatar = ({ avatar, name, size = "sm" }) => {
  const sizeClass = size === "sm" ? "h-9 w-9" : "h-11 w-11";

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name}
        className={`${sizeClass} rounded-full border border-gray-200 object-cover`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} flex items-center justify-center rounded-full border border-psycho-primary/20 bg-psycho-primary/10 text-sm font-bold text-psycho-primary`}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
};

const DropdownItem = ({ icon, label, onClick, isLogout = false }) => (
  <button
    className={`w-full border-none bg-transparent px-4 py-2.5 text-left text-sm transition-all duration-150 ${
      isLogout
        ? "text-red-500 hover:bg-red-50"
        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
    } flex items-center gap-3 cursor-pointer`}
    onClick={onClick}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const PsychologistNavbar = () => {
  const { user: authUser, logout, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef(null);

  const { data: appData } = useQuery({
    queryKey: ["psychologist-my-application-pic"],
    queryFn: getMyApplication,
    enabled: !authUser?.profile_picture,
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (appData?.profile_picture && !authUser?.profile_picture) {
      updateUser({ profile_picture: appData.profile_picture });
    }
  }, [appData?.profile_picture, authUser?.profile_picture, updateUser]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target)
      ) {
        setIsProfileDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const user = {
    name: authUser?.full_name || "Psychologist",
    email: authUser?.email || "",
    avatar: resolveMediaUrl(authUser?.profile_picture || appData?.profile_picture),
  };

  const closeDropdown = () => setIsProfileDropdownOpen(false);

  const handleLogout = async () => {
    closeDropdown();
    try {
      await psychologistLogout();
    } catch (error) {
      console.error("Logout failed", error);
    }
    logout();
    localStorage.removeItem("koode-auth-storage");
    navigate("/psychologist/login");
  };

  const handleNavigate = (path) => {
    closeDropdown();
    navigate(path);
  };

  return (
    <div className="sticky top-0 z-50">
      <nav className="border-b border-gray-200 bg-white px-6 py-3.5 shadow-sm">
        <div className="flex w-full items-center justify-between">
          <a href="/psychologist/home" className="no-underline">
            <img src={logo} alt="Koode" className="h-8 w-auto scale-[2.5] origin-left" />
          </a>

          <div className="flex-1" />

          <div className="flex items-center gap-3">
            <NotificationBell variant="psychologist" />

            <div className="relative" ref={profileDropdownRef}>
              <button
                className="flex cursor-pointer items-center gap-2 border-none bg-transparent p-1"
                onClick={() => setIsProfileDropdownOpen((current) => !current)}
                aria-label="Profile menu"
              >
                <Avatar avatar={user.avatar} name={user.name} size="sm" />
              </button>

              {isProfileDropdownOpen ? (
                <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[240px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.10)] animate-fade-in">
                  <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-4">
                    <Avatar avatar={user.avatar} name={user.name} size="lg" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{user.name}</p>
                      <p className="truncate text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>

                  <div className="py-1.5">
                    <DropdownItem
                      icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>}
                      label="My Profile"
                      onClick={() => handleNavigate("/psychologist/profile")}
                    />
                    <DropdownItem
                      icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>}
                      label="Appointments"
                      onClick={() => handleNavigate("/psychologist/appointments")}
                    />
                    <DropdownItem
                      icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>}
                      label="Messages"
                      onClick={() => handleNavigate("/psychologist/messages")}
                    />
                    <DropdownItem
                      icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>}
                      label="Settings"
                      onClick={closeDropdown}
                    />
                  </div>

                  <div className="border-t border-gray-100 py-1.5">
                    <DropdownItem
                      icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>}
                      label="Logout"
                      onClick={handleLogout}
                      isLogout
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default PsychologistNavbar;

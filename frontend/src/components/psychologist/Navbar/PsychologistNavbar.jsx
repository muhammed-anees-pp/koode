import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/auth.store';
import { psychologistLogout } from '../../../api/psychologist.api';
import './PsychologistNavbar.css';
import logo from '../../../assets/psychologist-logo.png';

const PsychologistNavbar = () => {
    const { user: authUser, logout } = useAuthStore();
    const navigate = useNavigate();

    const user = {
        name: authUser?.full_name || 'Psychologist',
        email: authUser?.email || '',
        avatar: authUser?.profile_picture
            ? `http://localhost:8000${authUser.profile_picture}`
            : null,
    };

    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const profileDropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
                setIsProfileDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        setIsProfileDropdownOpen(false);
        try {
            await psychologistLogout();
        } catch (err) {
            console.error('Logout failed', err);
        }
        logout();
        localStorage.removeItem('koode-auth-storage');
        navigate('/psychologist/login');
    };

    return (
        <div className="psych-navbar-wrapper">
            <nav className="psych-navbar">
                <div className="psych-navbar-container">

                    {/* Logo*/}
                    <a href="/psychologist/home" className="psych-navbar-logo">
                        <img src={logo} alt="Koode" className="psych-nav-logo-img" />
                    </a>

                    {/* Center column — empty spacer */}
                    <div />

                    {/* Right column — notification + profile */}
                    <div className="psych-navbar-actions">
                        {/* Notification Bell */}
                        <button className="psych-notification-btn" aria-label="Notifications">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                            </svg>
                            <span className="psych-notification-badge">3</span>
                        </button>

                        {/* Profile Dropdown */}
                        <div className="psych-profile-dropdown" ref={profileDropdownRef}>
                            <button
                                className="psych-profile-btn"
                                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                                aria-label="Profile menu"
                            >
                                {user.avatar ? (
                                    <img src={user.avatar} alt={user.name} className="psych-profile-avatar" />
                                ) : (
                                    <div className="psych-profile-avatar-initials">
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </button>

                            {isProfileDropdownOpen && (
                                <div className="psych-profile-dropdown-menu">
                                    {/* User info header */}
                                    <div className="psych-dropdown-header">
                                        {user.avatar ? (
                                            <img src={user.avatar} alt={user.name} className="psych-dropdown-avatar" />
                                        ) : (
                                            <div className="psych-dropdown-avatar-initials">
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="psych-dropdown-user-info">
                                            <p className="psych-dropdown-name">{user.name}</p>
                                            <p className="psych-dropdown-email">{user.email}</p>
                                        </div>
                                    </div>

                                    <div className="psych-dropdown-divider" />

                                    <div className="psych-dropdown-items">
                                        <button className="psych-dropdown-item" onClick={() => { setIsProfileDropdownOpen(false); navigate('/psychologist/profile'); }}>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                                <circle cx="12" cy="7" r="4" />
                                            </svg>
                                            <span>My Profile</span>
                                        </button>

                                        <button className="psych-dropdown-item" onClick={() => { setIsProfileDropdownOpen(false); navigate('/psychologist/appointments'); }}>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="3" y="4" width="18" height="18" rx="2" />
                                                <line x1="16" y1="2" x2="16" y2="6" />
                                                <line x1="8" y1="2" x2="8" y2="6" />
                                                <line x1="3" y1="10" x2="21" y2="10" />
                                            </svg>
                                            <span>Appointments</span>
                                        </button>

                                        <button className="psych-dropdown-item" onClick={() => { setIsProfileDropdownOpen(false); }}>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                            </svg>
                                            <span>Messages</span>
                                        </button>

                                        <button className="psych-dropdown-item" onClick={() => { setIsProfileDropdownOpen(false); }}>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <circle cx="12" cy="12" r="3" />
                                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                                            </svg>
                                            <span>Settings</span>
                                        </button>
                                    </div>

                                    <div className="psych-dropdown-divider" />

                                    <button className="psych-dropdown-item psych-logout-item" onClick={handleLogout}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                            <polyline points="16 17 21 12 16 7" />
                                            <line x1="21" y1="12" x2="9" y2="12" />
                                        </svg>
                                        <span>Logout</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </nav>
        </div>
    );
};

export default PsychologistNavbar;

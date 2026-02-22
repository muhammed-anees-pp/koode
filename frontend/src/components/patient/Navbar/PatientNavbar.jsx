import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from "../../../store/auth.store";
import { patientLogout } from "../../../api/patient.api";
import "../../../styles/patient/PatientNavbar.css";
import logo from "../../../assets/patient-logo.png";

const PatientNavbar = () => {
    const { patient, logout, isAuthenticated, role } = useAuthStore();
    const navigate = useNavigate();

    const user = {
        name: patient?.full_name || 'Patient',
        email: patient?.email || '',
        avatar: patient?.profile_image ? `http://localhost:8000${patient.profile_image}` : "https://via.placeholder.com/150",
        isOnline: true
    };

    const isLoggedIn = isAuthenticated && role === "PATIENT";

    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const [isServicesDropdownOpen, setIsServicesDropdownOpen] = useState(false);
    const [isConcernDropdownOpen, setIsConcernDropdownOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [notificationCount] = useState(3);

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    const profileDropdownRef = useRef(null);
    const servicesDropdownRef = useRef(null);
    const concernDropdownRef = useRef(null);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
                setIsProfileDropdownOpen(false);
            }
            if (servicesDropdownRef.current && !servicesDropdownRef.current.contains(event.target)) {
                setIsServicesDropdownOpen(false);
            }
            if (concernDropdownRef.current && !concernDropdownRef.current.contains(event.target)) {
                setIsConcernDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleBookTherapy = () => {
        console.log('Book Therapy clicked');
    };

    const handleNotificationClick = () => {
        console.log('Notifications clicked');
    };

    const handleProfileMenuClick = async (action) => {
        setIsProfileDropdownOpen(false);

        if (action === 'Logout') {
            try {
                await patientLogout();
            } catch (error) {
                console.error("Logout failed", error);
            }
            logout();
            localStorage.removeItem('user_role');
            navigate('/patient/login');
        } else if (action === 'User Profile' || action === 'Settings') {
            navigate('#');
        }
    };

    const handleLoginClick = () => {
        navigate('/patient/login');
    };

    return (
        <div className="patient-navbar-wrapper">
            <nav className="navbar">
                <div className="navbar-container">
                    {/* Logo */}
                    <Link to="/patient/home" className="navbar-logo">
                        <img src={logo} alt="Koode" className="nav-logo-img" />
                    </Link>
                    {/* Navigation Links */}
                    <div className="navbar-menu">
                        <Link to="/patient/home" className="nav-link active">Home</Link>
                        <a href="#about" className="nav-link">About Us</a>

                        {/* Services Dropdown */}
                        <div className="nav-dropdown" ref={servicesDropdownRef}>
                            <button
                                className="nav-link dropdown-trigger"
                                onClick={() => setIsServicesDropdownOpen(!isServicesDropdownOpen)}
                            >
                                Services
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className={isServicesDropdownOpen ? 'dropdown-icon open' : 'dropdown-icon'}
                                >
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </button>
                            {isServicesDropdownOpen && (
                                <div className="dropdown-menu">
                                    <a href="#therapy" className="dropdown-item">Individual Therapy</a>
                                    <a href="#couples" className="dropdown-item">Couples Therapy</a>
                                    <a href="#family" className="dropdown-item">Family Therapy</a>
                                    <a href="#group" className="dropdown-item">Group Therapy</a>
                                </div>
                            )}
                        </div>

                        {/* Concern Dropdown */}
                        <div className="nav-dropdown" ref={concernDropdownRef}>
                            <button
                                className="nav-link dropdown-trigger"
                                onClick={() => setIsConcernDropdownOpen(!isConcernDropdownOpen)}
                            >
                                Concern
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className={isConcernDropdownOpen ? 'dropdown-icon open' : 'dropdown-icon'}
                                >
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </button>
                            {isConcernDropdownOpen && (
                                <div className="dropdown-menu">
                                    <a href="#anxiety" className="dropdown-item">Anxiety</a>
                                    <a href="#depression" className="dropdown-item">Depression</a>
                                    <a href="#stress" className="dropdown-item">Stress Management</a>
                                    <a href="#relationships" className="dropdown-item">Relationships</a>
                                    <a href="#trauma" className="dropdown-item">Trauma</a>
                                </div>
                            )}
                        </div>

                        <a href="#therapists" className="nav-link">Therapists</a>
                    </div>

                    {/* Right Side Actions */}
                    <div className="navbar-actions">
                        {/* Book Therapy Button */}
                        <button className="book-therapy-btn" onClick={handleBookTherapy}>
                            Book Therapy
                        </button>

                        {isLoggedIn ? (
                            <>
                                {/* Notification Bell */}
                                <button className="notification-btn" onClick={handleNotificationClick}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                    </svg>
                                    {notificationCount > 0 && (
                                        <span className="notification-badge">{notificationCount}</span>
                                    )}
                                </button>

                                {/* Profile Dropdown */}
                                <div className="profile-dropdown" ref={profileDropdownRef}>
                                    <button
                                        className="profile-btn"
                                        onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                                    >
                                        {user.avatar && user.avatar !== "https://via.placeholder.com/150" ? (
                                            <img src={user.avatar} alt={user.name} className="profile-avatar" />
                                        ) : (
                                            <div className="profile-avatar-initials">
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </button>

                                    {isProfileDropdownOpen && (
                                        <div className="profile-dropdown-menu">
                                            {/* User Info Header */}
                                            <div className="profile-header">
                                                {user.avatar && user.avatar !== "https://via.placeholder.com/150" ? (
                                                    <img src={user.avatar} alt={user.name} className="profile-header-avatar" />
                                                ) : (
                                                    <div className="profile-header-avatar-initials">
                                                        {user.name.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <div className="profile-info">
                                                    <h3 className="profile-name">{user.name}</h3>
                                                    <p className="profile-email">{user.email}</p>
                                                </div>
                                            </div>

                                            {/* Divider */}
                                            <div className="dropdown-divider"></div>

                                            {/* Menu Items */}
                                            <div className="profile-menu-items">
                                                <button
                                                    className="profile-menu-item"
                                                    onClick={() => handleProfileMenuClick('User Profile')}
                                                >
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                                        <circle cx="12" cy="7" r="4" />
                                                    </svg>
                                                    <span>User Profile</span>
                                                </button>

                                                <button
                                                    className="profile-menu-item"
                                                    onClick={() => handleProfileMenuClick('Appointment List')}
                                                >
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                                        <line x1="16" y1="2" x2="16" y2="6" />
                                                        <line x1="8" y1="2" x2="8" y2="6" />
                                                        <line x1="3" y1="10" x2="21" y2="10" />
                                                    </svg>
                                                    <span>Appointment List</span>
                                                </button>

                                                <button
                                                    className="profile-menu-item"
                                                    onClick={() => handleProfileMenuClick('Settings')}
                                                >
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <circle cx="12" cy="12" r="3" />
                                                        <path d="M12 1v6m0 6v6m6-12h-6m6 0h6m-12 6H1m6 0h6" />
                                                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                                                    </svg>
                                                    <span>Settings</span>
                                                </button>

                                                <button
                                                    className="profile-menu-item"
                                                    onClick={() => handleProfileMenuClick('Chat and Messaging')}
                                                >
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                                    </svg>
                                                    <span>Chat and Messaging</span>
                                                </button>

                                                <button
                                                    className="profile-menu-item"
                                                    onClick={() => handleProfileMenuClick('Wallet')}
                                                >
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                                                        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                                                        <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
                                                    </svg>
                                                    <span>Wallet</span>
                                                </button>

                                                <button
                                                    className="profile-menu-item"
                                                    onClick={() => handleProfileMenuClick('Payment History')}
                                                >
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                                                        <line x1="1" y1="10" x2="23" y2="10" />
                                                    </svg>
                                                    <span>Payment History</span>
                                                </button>

                                                <button
                                                    className="profile-menu-item"
                                                    onClick={() => handleProfileMenuClick('Complaints')}
                                                >
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                                        <line x1="12" y1="9" x2="12" y2="13" />
                                                        <line x1="12" y1="17" x2="12.01" y2="17" />
                                                    </svg>
                                                    <span>Complaints</span>
                                                </button>
                                            </div>

                                            {/* Divider */}
                                            <div className="dropdown-divider"></div>

                                            {/* Logout */}
                                            <button
                                                className="profile-menu-item logout-item"
                                                onClick={() => handleProfileMenuClick('Logout')}
                                            >
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
                            </>
                        ) : (
                            /* Login Button for non-logged in users */
                            <Link to="/patient/login" className="login-link">
                                Login
                            </Link>
                        )}
                    </div>
                    {/* Mobile Menu Toggle */}
                    <button className="mobile-menu-toggle" onClick={toggleMobileMenu}>
                        {isMobileMenuOpen ? (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        ) : (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="3" y1="12" x2="21" y2="12" />
                                <line x1="3" y1="6" x2="21" y2="6" />
                                <line x1="3" y1="18" x2="21" y2="18" />
                            </svg>
                        )}
                    </button>
                </div>

                {/* Mobile Menu Overlay */}
                <div className={`mobile-menu-overlay ${isMobileMenuOpen ? 'open' : ''}`} onClick={() => setIsMobileMenuOpen(false)}></div>

                {/* Mobile Menu */}
                <div className={`mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
                    <div className="mobile-menu-header">
                        <img src={logo} alt="Koode" className="mobile-logo" />
                        <button className="mobile-close-btn" onClick={() => setIsMobileMenuOpen(false)}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>

                    <div className="mobile-menu-content">
                        <Link to="/patient/home" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>Home</Link>
                        <a href="#about" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>About Us</a>

                        <div className="mobile-nav-section">
                            <span className="mobile-nav-subtitle">Services</span>
                            <a href="#therapy" className="mobile-nav-item" onClick={() => setIsMobileMenuOpen(false)}>Individual Therapy</a>
                            <a href="#couples" className="mobile-nav-item" onClick={() => setIsMobileMenuOpen(false)}>Couples Therapy</a>
                            <a href="#family" className="mobile-nav-item" onClick={() => setIsMobileMenuOpen(false)}>Family Therapy</a>
                            <a href="#group" className="mobile-nav-item" onClick={() => setIsMobileMenuOpen(false)}>Group Therapy</a>
                        </div>

                        <div className="mobile-nav-section">
                            <span className="mobile-nav-subtitle">Concern</span>
                            <a href="#anxiety" className="mobile-nav-item" onClick={() => setIsMobileMenuOpen(false)}>Anxiety</a>
                            <a href="#depression" className="mobile-nav-item" onClick={() => setIsMobileMenuOpen(false)}>Depression</a>
                            <a href="#stress" className="mobile-nav-item" onClick={() => setIsMobileMenuOpen(false)}>Stress Management</a>
                            <a href="#relationships" className="mobile-nav-item" onClick={() => setIsMobileMenuOpen(false)}>Relationships</a>
                        </div>

                        <a href="#therapists" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>Therapists</a>

                        <button className="mobile-book-btn" onClick={() => { handleBookTherapy(); setIsMobileMenuOpen(false); }}>
                            Book Therapy
                        </button>
                        {!isLoggedIn && (
                            <Link to="/patient/login" className="login-link" onClick={() => setIsMobileMenuOpen(false)} style={{ marginTop: '1rem', display: 'inline-block' }}>
                                Login
                            </Link>
                        )}
                    </div>
                </div>
            </nav>
        </div>
    );
};

export default PatientNavbar;

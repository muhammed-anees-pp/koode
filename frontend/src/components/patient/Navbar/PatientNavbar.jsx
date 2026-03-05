import React, { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from "../../../store/auth.store";
import { patientLogout } from "../../../api/patient.api";
import logo from "../../../assets/patient-logo.png";

// Shared
const navLinkCls = "text-[0.938rem] font-medium text-ui-600 no-underline cursor-pointer bg-transparent border-none py-1 px-0 transition-all duration-200 hover:text-patient-primary relative after:content-[''] after:absolute after:-bottom-0.5 after:left-0 after:w-0 after:h-[2px] after:bg-patient-primary after:transition-all after:duration-300 hover:after:w-full";
const activeNavCls = (isActive) => `text-[0.938rem] font-medium no-underline cursor-pointer bg-transparent border-none py-1 px-0 transition-all duration-200 relative after:content-[''] after:absolute after:-bottom-0.5 after:left-0 after:h-[2px] after:bg-patient-primary after:transition-all after:duration-300 ${isActive
    ? 'text-patient-primary after:w-full'
    : 'text-ui-600 after:w-0 hover:text-patient-primary hover:after:w-full'
    }`;
const dropdownItemCls = "block px-5 py-[10px] text-[0.875rem] font-medium text-ui-600 no-underline transition-all duration-200 hover:bg-[rgba(26,190,170,0.06)] hover:text-patient-primary hover:pl-7";
const mobileNavLinkCls = "block py-[14px] px-6 text-base font-medium text-ui-700 no-underline border-b border-ui-100 transition-all duration-200 hover:text-patient-primary hover:bg-[rgba(26,190,170,0.05)] hover:pl-9";
const mobileNavItemCls = "block py-[10px] px-8 text-[0.9rem] text-ui-500 no-underline transition-all duration-200 hover:text-patient-primary hover:bg-[rgba(26,190,170,0.05)]";
const profileMenuItemCls = "w-full flex items-center gap-3 px-5 py-[10px] text-[0.875rem] font-medium text-ui-700 bg-transparent border-none cursor-pointer text-left transition-all duration-200 hover:bg-[rgba(26,190,170,0.06)] hover:text-patient-primary";

const PatientNavbar = ({ authLink } = {}) => {
    const { user: authUser, logout, isAuthenticated, role } = useAuthStore();
    const navigate = useNavigate();

    const user = {
        name: authUser?.full_name || 'Patient',
        email: authUser?.email || '',
        avatar: authUser?.profile_picture || null,
        isOnline: true
    };

    const isLoggedIn = isAuthenticated && role === "PATIENT";
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const [isServicesDropdownOpen, setIsServicesDropdownOpen] = useState(false);
    const [isConcernDropdownOpen, setIsConcernDropdownOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [notificationCount] = useState(3);

    const profileDropdownRef = useRef(null);
    const servicesDropdownRef = useRef(null);
    const concernDropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) setIsProfileDropdownOpen(false);
            if (servicesDropdownRef.current && !servicesDropdownRef.current.contains(event.target)) setIsServicesDropdownOpen(false);
            if (concernDropdownRef.current && !concernDropdownRef.current.contains(event.target)) setIsConcernDropdownOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleProfileMenuClick = async (action) => {
        setIsProfileDropdownOpen(false);
        if (action === 'Logout') {
            try { await patientLogout(); } catch (error) { console.error("Logout failed", error); }
            logout();
            localStorage.removeItem('user_role');
            navigate('/patient/login');
        } else if (action === 'User Profile') { navigate('/patient/profile'); }
        else if (action === 'Settings') { navigate('#'); }
    };

    const hasCustomAvatar = !!user.avatar;

    const AvatarSmall = () => (
        <div className="w-full h-full relative">
            <div className="w-full h-full bg-gradient-to-br from-patient-primary to-patient-dark text-white text-sm font-bold flex items-center justify-center">
                {user.name.charAt(0).toUpperCase()}
            </div>
            {hasCustomAvatar && (
                <img
                    src={user.avatar}
                    alt={user.name}
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
            )}
        </div>
    );

    const AvatarLarge = () => (
        <div className="w-full h-full relative">
            <div className="w-full h-full bg-gradient-to-br from-patient-primary to-patient-dark text-white text-xl font-bold flex items-center justify-center">
                {user.name.charAt(0).toUpperCase()}
            </div>
            {hasCustomAvatar && (
                <img
                    src={user.avatar}
                    alt={user.name}
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
            )}
        </div>
    );

    return (
        <div className="fixed top-0 left-0 right-0 z-[1000]">
            <nav className="bg-white/[0.96] backdrop-blur-[16px] border-b border-[rgba(0,0,0,0.06)] shadow-[0_2px_20px_rgba(0,0,0,0.06)]">
                <div className="w-full pl-0 pr-6 flex items-center h-[66px]">
                    {/* Logo — left */}
                    <Link to="/patient/home" className="flex-none flex items-center no-underline -ml-3">
                        <img src={logo} alt="Koode" className="h-11 w-auto scale-[1.6] origin-left" />
                    </Link>

                    {/* Nav Links — center */}
                    <div className="flex-1 hidden md:flex items-center justify-center gap-8">
                        <NavLink to="/patient/home" className={({ isActive }) => activeNavCls(isActive)}>Home</NavLink>
                        <a href="#about" className={navLinkCls}>About Us</a>

                        {/* Services Dropdown */}
                        <div className="relative" ref={servicesDropdownRef}>
                            <button className={activeNavCls(isServicesDropdownOpen) + ' flex items-center gap-1'} onClick={() => setIsServicesDropdownOpen(!isServicesDropdownOpen)}>
                                Services
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform duration-200 ${isServicesDropdownOpen ? 'rotate-180' : ''}`}>
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </button>
                            {isServicesDropdownOpen && (
                                <div className="absolute top-[calc(100%+12px)] left-1/2 -translate-x-1/2 w-[200px] bg-white border border-ui-200 rounded-[12px] shadow-[0_8px_24px_rgba(0,0,0,0.1)] py-2 z-50 animate-dropdown overflow-hidden">
                                    <a href="#therapy" className={dropdownItemCls}>Individual Therapy</a>
                                    <a href="#couples" className={dropdownItemCls}>Couples Therapy</a>
                                    <a href="#family" className={dropdownItemCls}>Family Therapy</a>
                                    <a href="#group" className={dropdownItemCls}>Group Therapy</a>
                                </div>
                            )}
                        </div>

                        {/* Concern Dropdown */}
                        <div className="relative" ref={concernDropdownRef}>
                            <button className={activeNavCls(isConcernDropdownOpen) + ' flex items-center gap-1'} onClick={() => setIsConcernDropdownOpen(!isConcernDropdownOpen)}>
                                Concern
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform duration-200 ${isConcernDropdownOpen ? 'rotate-180' : ''}`}>
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </button>
                            {isConcernDropdownOpen && (
                                <div className="absolute top-[calc(100%+12px)] left-1/2 -translate-x-1/2 w-[200px] bg-white border border-ui-200 rounded-[12px] shadow-[0_8px_24px_rgba(0,0,0,0.1)] py-2 z-50 animate-dropdown overflow-hidden">
                                    <a href="#anxiety" className={dropdownItemCls}>Anxiety</a>
                                    <a href="#depression" className={dropdownItemCls}>Depression</a>
                                    <a href="#stress" className={dropdownItemCls}>Stress Management</a>
                                    <a href="#relationships" className={dropdownItemCls}>Relationships</a>
                                    <a href="#trauma" className={dropdownItemCls}>Trauma</a>
                                </div>
                            )}
                        </div>

                        <a href="#therapists" className={navLinkCls}>Therapists</a>
                    </div>

                    {/* Right Actions — right */}
                    <div className="flex-none flex items-center gap-3">
                        <button className="px-5 py-2.5 bg-gradient-to-r from-patient-primary to-patient-hover text-white text-[0.875rem] font-semibold border-none rounded-[10px] cursor-pointer shadow-patient-sm transition-all duration-200 hover:shadow-patient-md hover:-translate-y-px active:translate-y-0">
                            Book Therapy
                        </button>

                        {authLink ? (
                            <Link
                                to={authLink.to}
                                className="text-patient-primary font-semibold no-underline text-[0.938rem] transition-colors duration-200 hover:text-ui-900 relative after:content-[''] after:absolute after:-bottom-0.5 after:left-0 after:w-0 after:h-[2px] after:bg-ui-900 after:transition-all after:duration-300 hover:after:w-full"
                            >
                                {authLink.text}
                            </Link>
                        ) : isLoggedIn ? (
                            <>
                                {/* Notification Bell */}
                                <button className="relative w-10 h-10 bg-ui-100 rounded-full border-none cursor-pointer flex items-center justify-center text-ui-600 transition-all duration-200 hover:bg-[rgba(26,190,170,0.1)] hover:text-patient-primary" onClick={() => console.log('Notifications clicked')}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                    </svg>
                                    {notificationCount > 0 && (
                                        <span className="absolute -top-[3px] -right-[3px] w-[18px] h-[18px] bg-[#ef4444] text-white text-[10px] font-bold rounded-full flex items-center justify-center">{notificationCount}</span>
                                    )}
                                </button>

                                {/* Profile Dropdown */}
                                <div className="relative" ref={profileDropdownRef}>
                                    <button className="w-10 h-10 rounded-full border-[2px] border-transparent cursor-pointer overflow-hidden transition-all duration-200 hover:border-patient-primary hover:shadow-patient-sm bg-transparent p-0" onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}>
                                        <AvatarSmall />
                                    </button>

                                    {isProfileDropdownOpen && (
                                        <div className="absolute right-0 top-[calc(100%+12px)] w-[260px] bg-white border border-ui-200 rounded-[16px] shadow-[0_16px_40px_rgba(0,0,0,0.12)] z-50 overflow-hidden animate-dropdown">
                                            {/* Header */}
                                            <div className="flex items-center gap-3 px-5 py-4 bg-[rgba(26,190,170,0.04)]">
                                                <div className="w-[46px] h-[46px] rounded-full overflow-hidden flex-shrink-0"><AvatarLarge /></div>
                                                <div className="min-w-0">
                                                    <h3 className="text-sm font-semibold text-ui-900 truncate">{user.name}</h3>
                                                    <p className="text-xs text-ui-500 truncate">{user.email}</p>
                                                </div>
                                            </div>

                                            <div className="h-px bg-ui-100" />

                                            {/* Menu Items */}
                                            <div className="py-2">
                                                {[
                                                    { action: 'User Profile', label: 'User Profile', icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>) },
                                                    { action: 'Appointment List', label: 'Appointment List', icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>) },
                                                    { action: 'Settings', label: 'Settings', icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 4.6a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 .33 1.65 1.65 0 0 0 10.51-1.33H11a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 4.6" /></svg>) },
                                                    { action: 'Chat and Messaging', label: 'Chat and Messaging', icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>) },
                                                    { action: 'Wallet', label: 'Wallet', icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" /></svg>) },
                                                    { action: 'Payment History', label: 'Payment History', icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>) },
                                                    { action: 'Complaints', label: 'Complaints', icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>) },
                                                ].map(({ action, label, icon }) => (
                                                    <button key={action} className={profileMenuItemCls} onClick={() => handleProfileMenuClick(action)}>
                                                        <span className="text-ui-500">{icon}</span>
                                                        <span>{label}</span>
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="h-px bg-ui-100" />

                                            {/* Logout */}
                                            <button className="w-full flex items-center gap-3 px-5 py-[10px] text-[0.875rem] font-medium text-red-500 bg-transparent border-none cursor-pointer text-left transition-all duration-200 hover:bg-[rgba(239,68,68,0.05)] hover:text-red-600" onClick={() => handleProfileMenuClick('Logout')}>
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                                                <span>Logout</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : authLink ? null : (
                            <Link to="/patient/login" className="text-patient-primary font-semibold no-underline text-[0.938rem] transition-colors duration-200 hover:text-ui-900 relative after:content-[''] after:absolute after:-bottom-0.5 after:left-0 after:w-0 after:h-[2px] after:bg-ui-900 after:transition-all after:duration-300 hover:after:w-full">Login</Link>
                        )}

                        {/* Mobile Toggle */}
                        <button className="md:hidden w-10 h-10 bg-ui-100 rounded-[10px] border-none cursor-pointer flex items-center justify-center text-ui-700 transition-all duration-200 hover:bg-[rgba(26,190,170,0.1)] hover:text-patient-primary" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                            {isMobileMenuOpen ? (
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            ) : (
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu Overlay */}
                {isMobileMenuOpen && <div className="fixed inset-0 bg-[rgba(0,0,0,0.5)] z-[998] md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}

                {/* Mobile Menu */}
                <div className={`fixed top-0 left-0 h-full w-[300px] bg-white shadow-[4px_0_20px_rgba(0,0,0,0.15)] z-[999] flex flex-col transition-transform duration-300 ease-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="flex items-center justify-between px-6 py-5 border-b border-ui-100">
                        <img src={logo} alt="Koode" className="h-10 w-auto" />
                        <button className="w-9 h-9 bg-ui-100 rounded-full border-none cursor-pointer flex items-center justify-center text-ui-600 transition-all duration-200 hover:bg-ui-200" onClick={() => setIsMobileMenuOpen(false)}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto py-2">
                        <Link to="/patient/home" className={mobileNavLinkCls} onClick={() => setIsMobileMenuOpen(false)}>Home</Link>
                        <a href="#about" className={mobileNavLinkCls} onClick={() => setIsMobileMenuOpen(false)}>About Us</a>

                        <div className="px-6 pt-4 pb-1"><span className="text-[11px] font-semibold text-ui-400 uppercase tracking-[0.08em]">Services</span></div>
                        <a href="#therapy" className={mobileNavItemCls} onClick={() => setIsMobileMenuOpen(false)}>Individual Therapy</a>
                        <a href="#couples" className={mobileNavItemCls} onClick={() => setIsMobileMenuOpen(false)}>Couples Therapy</a>
                        <a href="#family" className={mobileNavItemCls} onClick={() => setIsMobileMenuOpen(false)}>Family Therapy</a>
                        <a href="#group" className={mobileNavItemCls} onClick={() => setIsMobileMenuOpen(false)}>Group Therapy</a>

                        <div className="px-6 pt-4 pb-1"><span className="text-[11px] font-semibold text-ui-400 uppercase tracking-[0.08em]">Concern</span></div>
                        <a href="#anxiety" className={mobileNavItemCls} onClick={() => setIsMobileMenuOpen(false)}>Anxiety</a>
                        <a href="#depression" className={mobileNavItemCls} onClick={() => setIsMobileMenuOpen(false)}>Depression</a>
                        <a href="#stress" className={mobileNavItemCls} onClick={() => setIsMobileMenuOpen(false)}>Stress Management</a>
                        <a href="#relationships" className={mobileNavItemCls} onClick={() => setIsMobileMenuOpen(false)}>Relationships</a>

                        <a href="#therapists" className={mobileNavLinkCls} onClick={() => setIsMobileMenuOpen(false)}>Therapists</a>

                        <div className="px-6 pt-4 pb-6 flex flex-col gap-3">
                            <button className="w-full py-3 bg-gradient-to-r from-patient-primary to-patient-hover text-white font-semibold border-none rounded-[10px] cursor-pointer shadow-patient-sm">Book Therapy</button>
                            {!isLoggedIn && (
                                <Link to="/patient/login" className="w-full py-3 text-center text-patient-primary font-semibold border-[1.5px] border-patient-primary rounded-[10px] no-underline transition-all duration-200 hover:bg-[rgba(26,190,170,0.06)]" onClick={() => setIsMobileMenuOpen(false)}>Login</Link>
                            )}
                        </div>
                    </div>
                </div>
            </nav>
        </div>
    );
};

export default PatientNavbar;

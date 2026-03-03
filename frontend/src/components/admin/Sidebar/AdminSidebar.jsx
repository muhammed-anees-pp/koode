import { Link, useLocation } from "react-router-dom";
import logo from "../../../assets/admin-logo.png";

const Sidebar = () => {
  const location = useLocation();

  const menuItems = {
    management: [
      { name: "Dashboard", path: "/admin/dashboard", icon: (<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M3 4C3 3.44772 3.44772 3 4 3H7C7.55228 3 8 3.44772 8 4V7C8 7.55228 7.55228 8 7 8H4C3.44772 8 3 7.55228 3 7V4Z" stroke="currentColor" strokeWidth="1.5" /><path d="M12 4C12 3.44772 12.4477 3 13 3H16C16.5523 3 17 3.44772 17 4V7C17 7.55228 16.5523 8 16 8H13C12.4477 8 12 7.55228 12 7V4Z" stroke="currentColor" strokeWidth="1.5" /><path d="M3 13C3 12.4477 3.44772 12 4 12H7C7.55228 12 8 12.4477 8 13V16C8 16.5523 7.55228 17 7 17H4C3.44772 17 3 16.5523 3 16V13Z" stroke="currentColor" strokeWidth="1.5" /><path d="M12 13C12 12.4477 12.4477 12 13 12H16C16.5523 12 17 12.4477 17 13V16C17 16.5523 16.5523 17 16 17H13C12.4477 17 12 16.5523 12 16V13Z" stroke="currentColor" strokeWidth="1.5" /></svg>) },
      { name: "Banner Management", path: "#", icon: (<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M3 7C3 5.89543 3.89543 5 5 5H15C16.1046 5 17 5.89543 17 7V13C17 14.1046 16.1046 15 15 15H5C3.89543 15 3 14.1046 3 13V7Z" stroke="currentColor" strokeWidth="1.5" /><path d="M3 8H17" stroke="currentColor" strokeWidth="1.5" /></svg>) },
      { name: "Patients", path: "/admin/patients", icon: (<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M16 17V15C16 13.3431 14.6569 12 13 12H7C5.34315 12 4 13.3431 4 15V17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><circle cx="10" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" /></svg>) },
      { name: "Psychologists", path: "#", icon: (<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 11C12.7614 11 15 8.76142 15 6C15 3.23858 12.7614 1 10 1C7.23858 1 5 3.23858 5 6C5 8.76142 7.23858 11 10 11Z" stroke="currentColor" strokeWidth="1.5" /><path d="M3.5 18.5C3.5 15.4624 5.96243 13 9 13H11C14.0376 13 16.5 15.4624 16.5 18.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>) },
      { name: "Applications", path: "#", icon: (<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M4 4C4 2.89543 4.89543 2 6 2H14C15.1046 2 16 2.89543 16 4V16C16 17.1046 15.1046 18 14 18H6C4.89543 18 4 17.1046 4 16V4Z" stroke="currentColor" strokeWidth="1.5" /><path d="M7 6H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><path d="M7 10H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><path d="M7 14H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>) },
    ],
    monitoring: [
      { name: "Appointments", path: "#", icon: (<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M5 3V1M15 3V1M4 7H16M3 5H17C17.5523 5 18 5.44772 18 6V16C18 16.5523 17.5523 17 17 17H3C2.44772 17 2 16.5523 2 16V6C2 5.44772 2.44772 5 3 5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>) },
      { name: "Performance", path: "#", icon: (<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M3 17L7 13L10 16L17 9M17 9V13M17 9H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>) },
      { name: "Reviews", path: "#", icon: (<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 1L12.5 6.5L18.5 7.5L14.25 11.5L15.5 17.5L10 14.5L4.5 17.5L5.75 11.5L1.5 7.5L7.5 6.5L10 1Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>) },
      { name: "Logs Checking", path: "#", icon: (<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M3 5H17M3 10H17M3 15H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>) },
      { name: "Video Invest.", path: "#", icon: (<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M2 6C2 4.89543 2.89543 4 4 4H11C12.1046 4 13 4.89543 13 6V14C13 15.1046 12.1046 16 11 16H4C2.89543 16 2 15.1046 2 14V6Z" stroke="currentColor" strokeWidth="1.5" /><path d="M13 8L17 6V14L13 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>) },
      { name: "Complaints", path: "#", icon: (<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 6V10M10 14H10.01M18 10C18 14.4183 14.4183 18 10 18C5.58172 18 2 14.4183 2 10C2 5.58172 5.58172 2 10 2C14.4183 2 18 5.58172 18 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>) },
    ],
    financial: [
      { name: "Finance", path: "#", icon: (<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 1C14.9706 1 19 5.02944 19 10C19 14.9706 14.9706 19 10 19C5.02944 19 1 14.9706 1 10C1 5.02944 5.02944 1 10 1Z" stroke="currentColor" strokeWidth="1.5" /><path d="M10 5V6M10 5C8.34315 5 7 6.34315 7 8C7 9.65685 8.34315 11 10 11C11.6569 11 13 12.3431 13 14C13 15.6569 11.6569 17 10 17M10 5C11.6569 5 13 6.34315 13 8M10 17V18M10 17C8.34315 17 7 15.6569 7 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>) },
      { name: "Commissions", path: "#", icon: (<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M3 10H17M8 3L3 10L8 17M12 3L17 10L12 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>) },
    ],
  };

  const NavSection = ({ title, items }) => (
    <div className="mb-4">
      <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-[0.13em] px-3 py-2">{title}</div>
      <div className="flex flex-col gap-0.5">
        {items.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name + item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 mx-1 rounded-lg text-[13px] font-medium no-underline transition-all duration-150 ${isActive
                ? "bg-admin-primary text-white"
                : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                }`}
            >
              <span className="flex-shrink-0 opacity-90">{item.icon}</span>
              <span className="flex-1 truncate">{item.name}</span>
              {item.badge && (
                <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-tight">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );

  return (
    <aside className="fixed top-0 left-0 h-full w-[220px] bg-[#0B0E14] border-r border-slate-800/40 flex flex-col z-[100]">
      {/* Logo area — fixed 60px height matches navbar; overflow-hidden so scale doesn't push the border */}
      <div className="h-[60px] flex items-center justify-center px-4 border-b border-slate-800/40 flex-shrink-0 overflow-hidden">
        <img src={logo} alt="koode.in" className="w-28 h-auto scale-[2] origin-center" />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 scrollbar-thin">
        <NavSection title="Management" items={menuItems.management} />
        <NavSection title="Monitoring" items={menuItems.monitoring} />
        <NavSection title="Financial" items={menuItems.financial} />
      </nav>
    </aside>
  );
};

export default Sidebar;
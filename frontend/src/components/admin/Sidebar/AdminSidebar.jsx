import { Link, useLocation } from "react-router-dom";
import logo from "../../../assets/admin-logo.png";

const menuItems = {
  management: [
    { name: "Dashboard", path: "/admin/dashboard", icon: (<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M3 4C3 3.44772 3.44772 3 4 3H7C7.55228 3 8 3.44772 8 4V7C8 7.55228 7.55228 8 7 8H4C3.44772 8 3 7.55228 3 7V4Z" stroke="currentColor" strokeWidth="1.5" /><path d="M12 4C12 3.44772 12.4477 3 13 3H16C16.5523 3 17 3.44772 17 4V7C17 7.55228 16.5523 8 16 8H13C12.4477 8 12 7.55228 12 7V4Z" stroke="currentColor" strokeWidth="1.5" /><path d="M3 13C3 12.4477 3.44772 12 4 12H7C7.55228 12 8 12.4477 8 13V16C8 16.5523 7.55228 17 7 17H4C3.44772 17 3 16.5523 3 16V13Z" stroke="currentColor" strokeWidth="1.5" /><path d="M12 13C12 12.4477 12.4477 12 13 12H16C16.5523 12 17 12.4477 17 13V16C17 16.5523 16.5523 17 16 17H13C12.4477 17 12 16.5523 12 16V13Z" stroke="currentColor" strokeWidth="1.5" /></svg>) },
    { name: "Patients", path: "/admin/patients", icon: (<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M16 17V15C16 13.3431 14.6569 12 13 12H7C5.34315 12 4 13.3431 4 15V17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><circle cx="10" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" /></svg>) },
    { name: "Psychologists", path: "/admin/psychologists", icon: (<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 11C12.7614 11 15 8.76142 15 6C15 3.23858 12.7614 1 10 1C7.23858 1 5 3.23858 5 6C5 8.76142 7.23858 11 10 11Z" stroke="currentColor" strokeWidth="1.5" /><path d="M3.5 18.5C3.5 15.4624 5.96243 13 9 13H11C14.0376 13 16.5 15.4624 16.5 18.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>) },
    { name: "Applications", path: "/admin/applications", icon: (<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M4 4C4 2.89543 4.89543 2 6 2H14C15.1046 2 16 2.89543 16 4V16C16 17.1046 15.1046 18 14 18H6C4.89543 18 4 17.1046 4 16V4Z" stroke="currentColor" strokeWidth="1.5" /><path d="M7 6H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><path d="M7 10H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><path d="M7 14H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>) },
  ],
  monitoring: [
    { name: "Appointments", path: "/admin/appointments", icon: (<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M5 3V1M15 3V1M4 7H16M3 5H17C17.5523 5 18 5.44772 18 6V16C18 16.5523 17.5523 17 17 17H3C2.44772 17 2 16.5523 2 16V6C2 5.44772 2.44772 5 3 5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>) },
    { name: "Reviews", path: "/admin/reviews", icon: (<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 1L12.5 6.5L18.5 7.5L14.25 11.5L15.5 17.5L10 14.5L4.5 17.5L5.75 11.5L1.5 7.5L7.5 6.5L10 1Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>) },
    { name: "Complaints", path: "/admin/complaints", icon: (<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 6V10M10 14H10.01M18 10C18 14.4183 14.4183 18 10 18C5.58172 18 2 14.4183 2 10C2 5.58172 5.58172 2 10 2C14.4183 2 18 5.58172 18 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>) },
  ],
  financial: [
    { name: "Finance", path: "/admin/finance", icon: (<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><rect x="2" y="5" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" /><circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" /><path d="M5 8V8.01M15 12V12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>) },
    { name: "Commissions", path: "/admin/commissions", icon: (<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M3 10H17M8 3L3 10L8 17M12 3L17 10L12 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>) },
  ],
};

const NavSection = ({ title, items, pathname }) => (
  <div className="mb-4">
    <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-600">
      {title}
    </div>
    <div className="flex flex-col gap-0.5">
      {items.map((item) => {
        const isActive = item.path !== "#" && pathname.startsWith(item.path);
        return (
          <Link
            key={item.name + item.path}
            to={item.path}
            className={`mx-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium no-underline transition-all duration-150 ${
              isActive
                ? "bg-admin-primary text-white"
                : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
            }`}
          >
            <span className="flex-shrink-0 opacity-90">{item.icon}</span>
            <span className="flex-1 truncate">{item.name}</span>
            {item.badge ? (
              <span className="min-w-[18px] rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[10px] font-bold leading-tight text-white">
                {item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  </div>
);

const Sidebar = () => {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 z-[100] flex h-full w-[220px] flex-col border-r border-slate-800/40 bg-[#0B0E14]">
      <div className="flex h-[60px] flex-shrink-0 items-center justify-center overflow-hidden border-b border-slate-800/40 px-4">
        <img src={logo} alt="koode.in" className="h-auto w-28 scale-[2] origin-center" />
      </div>

      <nav className="flex-1 overflow-y-auto py-3 scrollbar-thin">
        <NavSection title="Management" items={menuItems.management} pathname={location.pathname} />
        <NavSection title="Monitoring" items={menuItems.monitoring} pathname={location.pathname} />
        <NavSection title="Financial" items={menuItems.financial} pathname={location.pathname} />
      </nav>
    </aside>
  );
};

export default Sidebar;

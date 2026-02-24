import { Link, useLocation } from "react-router-dom";
import "./AdminSidebar.css";
import logo from "../../../assets/admin-logo.png";

const Sidebar = () => {
  const location = useLocation();

  const menuItems = {
    management: [
      {
        name: "Dashboard",
        path: "/admin/dashboard",
        icon: (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M3 4C3 3.44772 3.44772 3 4 3H7C7.55228 3 8 3.44772 8 4V7C8 7.55228 7.55228 8 7 8H4C3.44772 8 3 7.55228 3 7V4Z"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M12 4C12 3.44772 12.4477 3 13 3H16C16.5523 3 17 3.44772 17 4V7C17 7.55228 16.5523 8 16 8H13C12.4477 8 12 7.55228 12 7V4Z"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M3 13C3 12.4477 3.44772 12 4 12H7C7.55228 12 8 12.4477 8 13V16C8 16.5523 7.55228 17 7 17H4C3.44772 17 3 16.5523 3 16V13Z"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M12 13C12 12.4477 12.4477 12 13 12H16C16.5523 12 17 12.4477 17 13V16C17 16.5523 16.5523 17 16 17H13C12.4477 17 12 16.5523 12 16V13Z"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
        ),
      },
      {
        name: "Banner Management",
        path: "#",
        icon: (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M3 7C3 5.89543 3.89543 5 5 5H15C16.1046 5 17 5.89543 17 7V13C17 14.1046 16.1046 15 15 15H5C3.89543 15 3 14.1046 3 13V7Z"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path d="M3 8H17" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        ),
      },
      {
        name: "Patients",
        path: "#",
        icon: (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M16 17V15C16 13.3431 14.6569 12 13 12H7C5.34315 12 4 13.3431 4 15V17"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle
              cx="10"
              cy="6"
              r="3"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
        ),
      },
      {
        name: "Psychologists",
        path: "#",
        icon: (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 11C12.7614 11 15 8.76142 15 6C15 3.23858 12.7614 1 10 1C7.23858 1 5 3.23858 5 6C5 8.76142 7.23858 11 10 11Z"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M3.5 18.5C3.5 15.4624 5.96243 13 9 13H11C14.0376 13 16.5 15.4624 16.5 18.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="10" cy="6" r="1.5" fill="currentColor" />
          </svg>
        ),
      },
      {
        name: "Applications",
        path: "#",
        icon: (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M4 4C4 2.89543 4.89543 2 6 2H14C15.1046 2 16 2.89543 16 4V16C16 17.1046 15.1046 18 14 18H6C4.89543 18 4 17.1046 4 16V4Z"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path d="M7 6H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M7 10H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M7 14H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        ),
      },
    ],
    monitoring: [
      {
        name: "Appointments",
        path: "#",
        icon: (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M5 3V1M15 3V1M4 7H16M3 5H17C17.5523 5 18 5.44772 18 6V16C18 16.5523 17.5523 17 17 17H3C2.44772 17 2 16.5523 2 16V6C2 5.44772 2.44772 5 3 5Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        ),
      },
      {
        name: "Performance",
        path: "#",
        icon: (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M3 17L7 13L10 16L17 9M17 9V13M17 9H13"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ),
      },
      {
        name: "Reviews",
        path: "#",
        icon: (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 1L12.5 6.5L18.5 7.5L14.25 11.5L15.5 17.5L10 14.5L4.5 17.5L5.75 11.5L1.5 7.5L7.5 6.5L10 1Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ),
      },
      {
        name: "Logs Checking",
        path: "#",
        icon: (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M3 5H17M3 10H17M3 15H17"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        ),
      },
      {
        name: "Video Invest",
        path: "#",
        icon: (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M2 6C2 4.89543 2.89543 4 4 4H11C12.1046 4 13 4.89543 13 6V14C13 15.1046 12.1046 16 11 16H4C2.89543 16 2 15.1046 2 14V6Z"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M13 8L17 6V14L13 12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ),
      },
      {
        name: "Complaints",
        path: "#",
        icon: (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 6V10M10 14H10.01M18 10C18 14.4183 14.4183 18 10 18C5.58172 18 2 14.4183 2 10C2 5.58172 5.58172 2 10 2C14.4183 2 18 5.58172 18 10Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        ),
      },
    ],
    financial: [
      {
        name: "Finance",
        path: "#",
        icon: (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 1C14.9706 1 19 5.02944 19 10C19 14.9706 14.9706 19 10 19C5.02944 19 1 14.9706 1 10C1 5.02944 5.02944 1 10 1Z"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M10 5V6M10 5C8.34315 5 7 6.34315 7 8C7 9.65685 8.34315 11 10 11C11.6569 11 13 12.3431 13 14C13 15.6569 11.6569 17 10 17M10 5C11.6569 5 13 6.34315 13 8M10 17V18M10 17C8.34315 17 7 15.6569 7 14"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        ),
      },
      {
        name: "Commissions",
        path: "#",
        icon: (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M3 10H17M8 3L3 10L8 17M12 3L17 10L12 17"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ),
      },
    ],
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <img src={logo} alt="koode.in" className="sidebar-logo" />
      </div>

      <nav className="sidebar-nav">
        {/* Management Section */}
        <div className="nav-section">
          <div className="nav-section-title">MANAGEMENT</div>
          {menuItems.management.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${
                location.pathname === item.path ? "active" : ""
              }`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-text">{item.name}</span>
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </Link>
          ))}
        </div>

        {/* Monitoring Section */}
        <div className="nav-section">
          <div className="nav-section-title">MONITORING</div>
          {menuItems.monitoring.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${
                location.pathname === item.path ? "active" : ""
              }`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-text">{item.name}</span>
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </Link>
          ))}
        </div>

        {/* Financial Section */}
        <div className="nav-section">
          <div className="nav-section-title">FINANCIAL</div>
          {menuItems.financial.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${
                location.pathname === item.path ? "active" : ""
              }`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-text">{item.name}</span>
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </Link>
          ))}
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;
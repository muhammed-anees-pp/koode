// AdminDashboard.jsx
import { useQuery } from "@tanstack/react-query";
import { fetchDashboard } from "../../../api/admin.api";
import Sidebar from "../../../components/admin/Sidebar/AdminSidebar";
import Navbar from "../../../components/admin/Navbar/AdminNavbar";
import "../../../styles/admin/AdminDashboard.css";

const Dashboard = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: fetchDashboard,
  });

  // Summary statistics
  const statsCards = [
    {
      title: "Total Patients",
      value: data?.totalPatients || "12,450",
      change: "+5%",
      period: "vs last month",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M17 20C17 18.3431 14.7614 17 12 17C9.23858 17 7 18.3431 7 20M21 17.0004C21 15.7702 19.7659 14.7129 18 14.25M3 17.0004C3 15.7702 4.2341 14.7129 6 14.25M18 10.2361C18.6137 9.68679 19 8.8885 19 8C19 6.34315 17.6569 5 16 5C15.2316 5 14.5308 5.28885 14 5.76389M6 10.2361C5.38625 9.68679 5 8.8885 5 8C5 6.34315 6.34315 5 8 5C8.76835 5 9.46924 5.28885 10 5.76389M12 14C10.3431 14 9 12.6569 9 11C9 9.34315 10.3431 8 12 8C13.6569 8 15 9.34315 15 11C15 12.6569 13.6569 14 12 14Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      color: "blue",
    },
    {
      title: "Psychologists",
      value: data?.totalPsychologists || "480",
      change: "+2%",
      period: "vs last month",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 6C13.66 6 15 7.34 15 9C15 10.66 13.66 12 12 12C10.34 12 9 10.66 9 9C9 7.34 10.34 6 12 6ZM12 20C9.33 20 6.98 18.62 5.55 16.5C5.58 14.33 9.67 13.14 12 13.14C14.33 13.14 18.42 14.33 18.45 16.5C17.02 18.62 14.67 20 12 20Z"
            fill="currentColor"
          />
        </svg>
      ),
      color: "cyan",
    },
    {
      title: "Today Appts",
      value: data?.todayAppointments || "134",
      change: "+12%",
      period: "vs yesterday",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M8 2V5M16 2V5M7 13H17M7 17H12M5 9H19M6 22H18C19.1046 22 20 21.1046 20 20V7C20 5.89543 19.1046 5 18 5H6C4.89543 5 4 5.89543 4 7V20C4 21.1046 4.89543 22 6 22Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ),
      color: "purple",
    },
    {
      title: "Active Complaints",
      value: data?.activeComplaints || "3",
      status: "Needs Attention",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ),
      color: "red",
    },
    {
      title: "Today Revenue",
      value: data?.todayRevenue || "$4,250",
      change: "+8%",
      period: "vs yesterday",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 6C12.55 6 13 6.45 13 7V8C14.66 8 16 9.34 16 11C16 11.55 15.55 12 15 12C14.45 12 14 11.55 14 11C14 10.45 13.55 10 13 10H11C10.45 10 10 10.45 10 11C10 11.55 10.45 12 11 12H13C14.66 12 16 13.34 16 15C16 16.66 14.66 18 13 18V19C13 19.55 12.55 20 12 20C11.45 20 11 19.55 11 19V18C9.34 18 8 16.66 8 15C8 14.45 8.45 14 9 14C9.55 14 10 14.45 10 15C10 15.55 10.45 16 11 16H13C13.55 16 14 15.55 14 15C14 14.45 13.55 14 13 14H11C9.34 14 8 12.66 8 11C8 9.34 9.34 8 11 8V7C11 6.45 11.45 6 12 6Z"
            fill="currentColor"
          />
        </svg>
      ),
      color: "green",
    },
  ];

  

  if (isLoading) return <p>Loading...</p>;
  if (isError) return <p>Unauthorized</p>;

  return (
    <div className="dashboard-layout">
      {/* Sidebar navigation */}
      <Sidebar />
      
      <div className="dashboard-main">
        {/* Top navigation bar */}
        <Navbar adminData={data} />
        
        {/* Dashboard content area */}
        <div className="dashboard-content">
          {/* Page header */}
          <div className="dashboard-header">
            <div>
              <h1>Dashboard Overview</h1>
              <p>Welcome back, here's what's happening with koode</p>
              
            </div>
          </div>

          {/* Stats Cards */}
          <div className="stats-grid">
            {statsCards.map((stat, index) => (
              <div key={index} className={`stat-card stat-${stat.color}`}>
                <div className="stat-icon">{stat.icon}</div>
                <div className="stat-content">
                  <div className="stat-title">{stat.title}</div>
                  <div className="stat-value">{stat.value}</div>
                  <div className="stat-meta">
                    {stat.change && (
                      <span className="stat-change">{stat.change}</span>
                    )}
                    {stat.period && (
                      <span className="stat-period">{stat.period}</span>
                    )}
                    {stat.status && (
                      <span className="stat-status">{stat.status}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
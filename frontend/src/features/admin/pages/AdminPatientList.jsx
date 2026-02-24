import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAdminPatients } from "../../../api/admin.api";
import Sidebar from "../../../components/admin/Sidebar/AdminSidebar";
import Navbar from "../../../components/admin/Navbar/AdminNavbar";
import "../../../styles/admin/AdminPatientList.css";

const BASE_URL = "http://localhost:8000";

function PatientAvatar({ name, photo }) {
    if (photo) {
        const src = photo.startsWith("http") ? photo : `${BASE_URL}${photo}`;
        return <img src={src} alt={name} className="apl-avatar-img" />;
    }
    const initials = name ? name.charAt(0).toUpperCase() : "?";
    const colours = ["#7C3AED", "#0EA5E9", "#10B981", "#F59E0B", "#EF4444", "#EC4899", "#14B8A6", "#6366F1"];
    const colour = colours[(name?.charCodeAt(0) || 0) % colours.length];
    return (
        <div className="apl-avatar-initials" style={{ background: colour }}>
            {initials}
        </div>
    );
}

export default function AdminPatientList() {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [search, setSearch] = useState("");
    const [inputVal, setInputVal] = useState("");


    const handleSearchChange = useCallback((e) => {
        const val = e.target.value;
        setInputVal(val);
        clearTimeout(window._aplSearchTimer);
        window._aplSearchTimer = setTimeout(() => {
            setSearch(val);
            setPage(1);
        }, 350);
    }, []);

    const { data, isLoading, isError } = useQuery({
        queryKey: ["admin-patients", page, pageSize, search],
        queryFn: () => fetchAdminPatients({ page, pageSize, search }),
        keepPreviousData: true,
    });

    const patients = data?.results || [];
    const total = data?.total || 0;
    const totalPages = data?.total_pages || 1;
    const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);

    return (
        <div className="dashboard-layout">
            <Sidebar />
            <div className="dashboard-main">
                <Navbar />
                <div className="dashboard-content">

                    {/* Header */}
                    <div className="apl-header">
                        <div>
                            <h1 className="apl-title">Patients</h1>
                            <p className="apl-subtitle">Manage registered patients and their account status.</p>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="apl-controls">
                        <div className="apl-search-wrap">
                            <svg className="apl-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            <input
                                className="apl-search"
                                type="text"
                                placeholder="Search by name, email…"
                                value={inputVal}
                                onChange={handleSearchChange}
                            />
                        </div>
                        <div className="apl-control-btns">
                            <button className="apl-btn-outline">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                                </svg>
                                Filter
                            </button>
                            <button className="apl-btn-outline">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
                                    <line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" />
                                    <line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                                </svg>
                                Sort
                            </button>
                            {(search || inputVal) && (
                                <button className="apl-btn-ghost" onClick={() => { setSearch(""); setInputVal(""); setPage(1); }}>
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Table */}
                    <div className="apl-table-wrap">
                        <table className="apl-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Status</th>
                                    <th>Joined Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading && (
                                    <tr><td colSpan={5} className="apl-state-cell">Loading patients…</td></tr>
                                )}
                                {isError && (
                                    <tr><td colSpan={5} className="apl-state-cell apl-state-error">Failed to load. Please refresh.</td></tr>
                                )}
                                {!isLoading && !isError && patients.length === 0 && (
                                    <tr><td colSpan={5} className="apl-state-cell">No patients found{search ? ` for "${search}"` : ""}.</td></tr>
                                )}
                                {patients.map((p) => (
                                    <tr key={p.patient_id} className="apl-row">
                                        <td>
                                            <div className="apl-name-cell">
                                                <PatientAvatar name={p.full_name} photo={p.profile_picture} />
                                                <div>
                                                    <div className="apl-name">{p.full_name}</div>
                                                    <div className="apl-pid">ID: {p.patient_id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="apl-email">{p.email}</td>
                                        <td>
                                            <span className={`apl-badge ${p.is_active ? "apl-badge-active" : "apl-badge-suspended"}`}>
                                                <span className="apl-badge-dot" />
                                                {p.is_active ? "Active" : "Suspended"}
                                            </span>
                                        </td>
                                        <td className="apl-date">{p.joined_date}</td>
                                        <td>
                                            <div className="apl-actions">
                                                {/* View */}
                                                <button className="apl-action-btn" title="View patient">
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                        <circle cx="12" cy="12" r="3" />
                                                    </svg>
                                                </button>
                                                {/* Suspend / Activate toggle */}
                                                <button
                                                    className={`apl-action-btn ${!p.is_active ? "apl-action-active" : "apl-action-suspend"}`}
                                                    title={p.is_active ? "Suspend patient" : "Activate patient"}
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <circle cx="12" cy="12" r="10" />
                                                        {p.is_active
                                                            ? <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                                                            : <polyline points="20 6 9 17 4 12" />}
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="apl-pagination">
                        <div className="apl-page-size">
                            <span>Rows per page:</span>
                            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                            </select>
                        </div>
                        <div className="apl-page-info">
                            {total > 0 ? `${start}-${end} of ${total}` : "0 results"}
                        </div>
                        <div className="apl-page-nav">
                            <button className="apl-page-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <polyline points="15 18 9 12 15 6" />
                                </svg>
                            </button>
                            <button className="apl-page-btn" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <polyline points="9 18 15 12 9 6" />
                                </svg>
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

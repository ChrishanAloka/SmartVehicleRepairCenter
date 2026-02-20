import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    FaTachometerAlt,
    FaCalendarCheck,
    FaUsers,
    FaUserFriends,
    FaFileInvoiceDollar,
    FaWrench,
    FaClipboardList,
    FaCog,
    FaEye,
    FaSignOutAlt,
    FaBars,
    FaTimes,
    FaChevronLeft,
    FaChevronRight
} from 'react-icons/fa';
import '../Sidebar.css';

const Sidebar = ({ isCollapsed, setIsCollapsed, showMobileSidebar, setShowMobileSidebar }) => {
    const { user, logout, isAuthenticated } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    if (!isAuthenticated) return null;

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isActive = (path) => location.pathname === path;

    const navItems = [
        { path: '/dashboard', label: 'Dashboard', icon: <FaTachometerAlt />, adminOnly: true },
        { path: '/bookings', label: 'Bookings', icon: <FaCalendarCheck />, adminOnly: true },
        { path: '/technicians', label: 'Technicians', icon: <FaUsers />, adminOnly: true },
        { path: '/customers', label: 'Customers', icon: <FaUserFriends />, adminOnly: true },
        { path: '/invoices', label: 'Invoices', icon: <FaFileInvoiceDollar />, adminOnly: true },
        { path: '/technician-portal', label: 'Technician Portal', icon: <FaWrench />, adminOnly: false },
        { path: '/attendance', label: 'Attendance', icon: <FaClipboardList />, adminOnly: false },
        { path: '/settings', label: 'Settings', icon: <FaCog />, adminOnly: true },
        { path: '/public', label: 'Public View', icon: <FaEye />, adminOnly: false },
    ];

    const toggleMobileSidebar = () => setShowMobileSidebar(!showMobileSidebar);

    return (
        <>
            <div className={`sidebar ${showMobileSidebar ? 'show' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
                <div className="sidebar-header">
                    <Link to="/" className="sidebar-brand">
                        <span className="text-primary fw-extrabold">{isCollapsed ? 'V' : 'VEHICLE'}</span>
                        {!isCollapsed && <span className="sidebar-brand-text ms-1">REPAIR</span>}
                    </Link>
                </div>

                <div className="sidebar-nav">
                    {navItems.map((item) => {
                        if (item.adminOnly && user?.role !== 'admin') return null;

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`nav-item-custom ${isActive(item.path) ? 'active' : ''}`}
                                onClick={() => setShowMobileSidebar(false)}
                                title={isCollapsed ? item.label : ''}
                            >
                                <span className="nav-icon">{item.icon}</span>
                                <span className="nav-label">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>

                <div className="sidebar-footer">
                    <div className="px-3 mb-3 small text-white-50 d-flex align-items-center gap-2 text-truncate">
                        <div className="bg-success rounded-circle" style={{ width: 8, height: 8, minWidth: 8 }}></div>
                        <span className="user-info-text text-truncate">
                            {user?.username}
                        </span>
                    </div>
                    <button className="logout-btn" onClick={handleLogout} title={isCollapsed ? 'Logout' : ''}>
                        <FaSignOutAlt className="nav-icon" />
                        <span className="nav-label">Logout</span>
                    </button>
                </div>
            </div>

            {/* Overlay for mobile */}
            <div
                className={`sidebar-overlay d-lg-none ${showMobileSidebar ? 'show' : ''}`}
                onClick={toggleMobileSidebar}
            ></div>
        </>
    );
};

export default Sidebar;

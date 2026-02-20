import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaBars, FaChevronLeft, FaChevronRight, FaUserCircle } from 'react-icons/fa';

const TopNavbar = ({ onToggle, isCollapsed, onMobileToggle }) => {
    const { user } = useAuth();

    return (
        <div className="top-navbar">
            {/* Desktop Toggle */}
            <button
                className="toggle-btn-main d-none d-lg-flex"
                onClick={(e) => {
                    e.stopPropagation();
                    onToggle();
                }}
                title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
                {isCollapsed ? <FaBars size={18} /> : <FaChevronLeft size={18} />}
            </button>

            {/* Mobile Toggle */}
            <button
                className="toggle-btn-main d-flex d-lg-none"
                onClick={(e) => {
                    e.stopPropagation();
                    onMobileToggle();
                }}
            >
                <FaBars size={18} />
            </button>

            <Link to="/" className="sidebar-brand text-dark d-lg-none ms-2" style={{ fontSize: '1.1rem', textDecoration: 'none' }}>
                <span className="text-primary fw-extrabold">VEHICLE</span> REPAIR
            </Link>

            <div className="ms-auto d-flex align-items-center gap-3">
                <div className="text-end d-none d-sm-block">
                    <div className="fw-bold small text-dark">{user?.username}</div>
                    <div className="text-muted x-small text-capitalize" style={{ fontSize: '0.65rem' }}>{user?.role} Account</div>
                </div>
                <div className="bg-light p-2 rounded-circle shadow-sm">
                    <FaUserCircle size={22} className="text-primary" />
                </div>
            </div>
        </div>
    );
};

export default TopNavbar;

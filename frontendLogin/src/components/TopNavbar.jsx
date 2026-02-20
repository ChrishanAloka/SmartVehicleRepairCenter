import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Modal, Button } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import {
    FaBars, FaChevronLeft, FaUserCircle, FaSignOutAlt,
    FaDownload, FaSync, FaApple, FaChevronDown, FaBell
} from 'react-icons/fa';
import { useRegisterSW } from 'virtual:pwa-register/react';

const TopNavbar = ({ onToggle, isCollapsed, onMobileToggle, showSidebarToggles = true }) => {
    const { user, logout, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isIOS, setIsIOS] = useState(false);
    const [showIOSPrompt, setShowIOSPrompt] = useState(false);
    const dropdownRef = useRef(null);

    const {
        needRefresh: [needRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) { console.log('SW Registered:', r); },
        onRegisterError(error) { console.log('SW registration error', error); },
    });

    // Detect PWA install prompt
    useEffect(() => {
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);

        // Detect iOS
        const ua = window.navigator.userAgent.toLowerCase();
        const ios = /iphone|ipad|ipod/.test(ua);
        const isStandalone = ('standalone' in window.navigator) && window.navigator.standalone;
        if (ios && !isStandalone) setIsIOS(true);

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, []);

    const handleInstall = async () => {
        if (isIOS) {
            setShowIOSPrompt(true);
            setDropdownOpen(false);
            return;
        }
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') setDeferredPrompt(null);
        setDropdownOpen(false);
    };

    const handleUpdate = () => {
        updateServiceWorker(true);
        setDropdownOpen(false);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
        setDropdownOpen(false);
    };

    // Show a flag if there's an update or install available
    const hasNotification = needRefresh || deferredPrompt || isIOS;

    return (
        <>
            <div className="top-navbar">
                {/* Sidebar Toggles — only shown when authenticated */}
                {showSidebarToggles && isAuthenticated && (
                    <>
                        {/* Desktop Toggle */}
                        <button
                            className="toggle-btn-main d-none d-lg-flex"
                            onClick={(e) => { e.stopPropagation(); onToggle && onToggle(); }}
                            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                        >
                            {isCollapsed ? <FaBars size={18} /> : <FaChevronLeft size={18} />}
                        </button>

                        {/* Mobile Toggle */}
                        <button
                            className="toggle-btn-main d-flex d-lg-none"
                            onClick={(e) => { e.stopPropagation(); onMobileToggle && onMobileToggle(); }}
                        >
                            <FaBars size={18} />
                        </button>
                    </>
                )}

                {/* Brand — shown on mobile or on login page */}
                <Link
                    to="/"
                    className={`sidebar-brand text-dark ms-2 ${isAuthenticated ? 'd-lg-none' : ''}`}
                    style={{ fontSize: '1.1rem', textDecoration: 'none' }}
                >
                    <span className="text-primary fw-extrabold">VEHICLE</span> REPAIR
                </Link>

                {/* Right side — User dropdown */}
                <div className="ms-auto d-flex align-items-center gap-3">
                    {/* Username label on desktop (when logged in) */}
                    {isAuthenticated && (
                        <div className="text-end d-none d-sm-block">
                            <div className="fw-bold small text-dark">{user?.username}</div>
                            <div className="text-muted x-small text-capitalize" style={{ fontSize: '0.65rem' }}>
                                {user?.role} Account
                            </div>
                        </div>
                    )}

                    {/* User icon with dropdown */}
                    <div ref={dropdownRef} style={{ position: 'relative' }}>
                        <button
                            className="top-navbar-user-btn"
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            title="Account Options"
                        >
                            {/* Notification flag badge */}
                            {hasNotification && (
                                <span className="top-navbar-badge" title="Action required">
                                    <FaBell size={7} />
                                </span>
                            )}
                            <FaUserCircle size={22} className="text-primary" />
                            {isAuthenticated && (
                                <FaChevronDown
                                    size={11}
                                    className="text-muted ms-1"
                                    style={{ transition: 'transform 0.2s', transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                                />
                            )}
                        </button>

                        {/* Dropdown Panel */}
                        {dropdownOpen && (
                            <div className="top-navbar-dropdown">
                                {/* User info header */}
                                {isAuthenticated ? (
                                    <div className="top-navbar-dropdown-header">
                                        <div className="fw-bold text-dark">{user?.username}</div>
                                        <div className="text-muted x-small text-capitalize">{user?.role} Account</div>
                                    </div>
                                ) : (
                                    <div className="top-navbar-dropdown-header">
                                        <div className="fw-bold text-dark">Guest</div>
                                        <div className="text-muted x-small">Not logged in</div>
                                    </div>
                                )}

                                <div className="top-navbar-dropdown-divider" />

                                {/* Update App */}
                                {needRefresh && (
                                    <button className="top-navbar-dropdown-item update" onClick={handleUpdate}>
                                        <FaSync size={13} className="me-2 spin-anim" />
                                        <span>Update App</span>
                                        <span className="top-navbar-dropdown-badge">NEW</span>
                                    </button>
                                )}

                                {/* Install App */}
                                {(deferredPrompt || isIOS) && (
                                    <button className="top-navbar-dropdown-item install" onClick={handleInstall}>
                                        {isIOS ? <FaApple size={13} className="me-2" /> : <FaDownload size={13} className="me-2" />}
                                        <span>Install App</span>
                                        <span className="top-navbar-dropdown-badge install-badge">INSTALL</span>
                                    </button>
                                )}

                                {/* Logout / Login */}
                                {isAuthenticated ? (
                                    <>
                                        <div className="top-navbar-dropdown-divider" />
                                        <button className="top-navbar-dropdown-item logout" onClick={handleLogout}>
                                            <FaSignOutAlt size={13} className="me-2" />
                                            <span>Logout</span>
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <div className="top-navbar-dropdown-divider" />
                                        <Link
                                            to="/login"
                                            className="top-navbar-dropdown-item"
                                            onClick={() => setDropdownOpen(false)}
                                            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}
                                        >
                                            <FaUserCircle size={13} className="me-2" />
                                            <span>Login</span>
                                        </Link>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* iOS Install Modal */}
            <Modal show={showIOSPrompt} onHide={() => setShowIOSPrompt(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title className="d-flex align-items-center gap-2">
                        <FaApple size={22} /> Install on iOS
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="text-center py-4">
                    <p className="mb-4">To install this app on your iPhone or iPad:</p>
                    <div className="d-flex flex-column gap-3 align-items-center">
                        <div className="d-flex align-items-center gap-3">
                            <span className="badge bg-secondary rounded-circle p-2 fs-5" style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</span>
                            <span>Tap the <strong>Share</strong> button <span role="img" aria-label="share icon">⎋</span> in Safari</span>
                        </div>
                        <div className="d-flex align-items-center gap-3">
                            <span className="badge bg-secondary rounded-circle p-2 fs-5" style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>2</span>
                            <span>Tap <strong>Add to Home Screen</strong> <span role="img" aria-label="plus icon">➕</span></span>
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowIOSPrompt(false)}>Close</Button>
                </Modal.Footer>
            </Modal>

            <style>{`
                .top-navbar-user-btn {
                    position: relative;
                    display: flex;
                    align-items: center;
                    background: #f1f5f9;
                    border: none;
                    border-radius: 50rem;
                    padding: 7px 12px;
                    cursor: pointer;
                    transition: background 0.2s;
                    box-shadow: 0 1px 4px rgba(0,0,0,0.07);
                }
                .top-navbar-user-btn:hover {
                    background: #e2e8f0;
                }
                .top-navbar-badge {
                    position: absolute;
                    top: 2px;
                    right: 2px;
                    width: 16px;
                    height: 16px;
                    background: #ef4444;
                    border-radius: 50%;
                    border: 2px solid #fff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #fff;
                    font-size: 6px;
                    animation: badge-pulse 2s infinite;
                    z-index: 2;
                }
                @keyframes badge-pulse {
                    0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
                    50% { transform: scale(1.15); box-shadow: 0 0 0 4px rgba(239,68,68,0); }
                }
                .top-navbar-dropdown {
                    position: absolute;
                    top: calc(100% + 10px);
                    right: 0;
                    min-width: 220px;
                    background: #fff;
                    border-radius: 1rem;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.15);
                    border: 1px solid rgba(0,0,0,0.06);
                    z-index: 2000;
                    overflow: hidden;
                    animation: dropdown-in 0.18s ease;
                }
                @keyframes dropdown-in {
                    from { opacity: 0; transform: translateY(-8px) scale(0.97); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .top-navbar-dropdown-header {
                    padding: 12px 16px;
                    background: #f8fafc;
                }
                .top-navbar-dropdown-divider {
                    height: 1px;
                    background: #f0f0f0;
                    margin: 0;
                }
                .top-navbar-dropdown-item {
                    display: flex;
                    align-items: center;
                    width: 100%;
                    padding: 11px 16px;
                    border: none;
                    background: transparent;
                    cursor: pointer;
                    font-size: 0.875rem;
                    font-weight: 500;
                    color: #374151;
                    transition: background 0.15s;
                    text-align: left;
                }
                .top-navbar-dropdown-item:hover {
                    background: #f1f5f9;
                }
                .top-navbar-dropdown-item.update {
                    color: #d97706;
                }
                .top-navbar-dropdown-item.update:hover {
                    background: #fffbeb;
                }
                .top-navbar-dropdown-item.install {
                    color: #059669;
                }
                .top-navbar-dropdown-item.install:hover {
                    background: #ecfdf5;
                }
                .top-navbar-dropdown-item.logout {
                    color: #ef4444;
                }
                .top-navbar-dropdown-item.logout:hover {
                    background: #fff5f5;
                }
                .top-navbar-dropdown-badge {
                    margin-left: auto;
                    font-size: 0.6rem;
                    font-weight: 700;
                    padding: 2px 6px;
                    border-radius: 50rem;
                    background: #fef3c7;
                    color: #d97706;
                    letter-spacing: 0.5px;
                }
                .top-navbar-dropdown-badge.install-badge {
                    background: #d1fae5;
                    color: #059669;
                }
                .spin-anim {
                    animation: spin 1.2s linear infinite;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </>
    );
};

export default TopNavbar;

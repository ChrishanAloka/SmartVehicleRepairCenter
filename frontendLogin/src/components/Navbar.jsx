import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Navbar, Nav, Container, Button, Modal } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { FaUserCircle, FaSignOutAlt, FaDownload, FaSync, FaApple } from 'react-icons/fa';
import { useRegisterSW } from 'virtual:pwa-register/react';

const NavigationBar = () => {
    const { user, logout, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [expanded, setExpanded] = React.useState(false);
    const navbarRef = React.useRef(null);
    const [deferredPrompt, setDeferredPrompt] = React.useState(null);
    const [isIOS, setIsIOS] = React.useState(false);
    const [showIOSPrompt, setShowIOSPrompt] = React.useState(false);

    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('SW Registered: ' + r);
        },
        onRegisterError(error) {
            console.log('SW registration error', error);
        },
    });

    React.useEffect(() => {
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);

        // Detect iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const ios = /iphone|ipad|ipod/.test(userAgent);
        const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator.standalone);

        if (ios && !isInStandaloneMode) {
            setIsIOS(true);
        }

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (navbarRef.current && !navbarRef.current.contains(event.target)) {
                setExpanded(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, []);

    const handleInstallClick = async () => {
        if (isIOS) {
            setShowIOSPrompt(true);
            setExpanded(false);
            return;
        }

        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isPublicPage = location.pathname === '/' ||
        location.pathname === '/login' ||
        location.pathname === '/public' ||
        location.pathname === '/booking' ||
        location.pathname.startsWith('/customer');

    return (
        <>
            <Navbar
                bg="dark"
                variant="dark"
                expand="lg"
                className="shadow-sm"
                expanded={expanded}
                onToggle={setExpanded}
                ref={navbarRef}
            >
                <Container>
                    <Navbar.Brand as={Link} to={isAuthenticated ? (user?.role === 'admin' ? '/dashboard' : '/technician-portal') : '/login'} className="fw-bold">
                        Vehicle Service Center
                    </Navbar.Brand>
                    <Navbar.Toggle aria-controls="navbar-nav" />
                    <Navbar.Collapse id="navbar-nav">
                        <Nav className="me-auto">
                            <Nav.Link as={Link} to="/public" onClick={() => setExpanded(false)}>Public View</Nav.Link>
                            {isAuthenticated && (
                                <>
                                    {user?.role === 'admin' && <Nav.Link as={Link} to="/dashboard" onClick={() => setExpanded(false)}>Dashboard</Nav.Link>}
                                    <Nav.Link as={Link} to="/technician-portal" onClick={() => setExpanded(false)}>Technician Portal</Nav.Link>
                                    <Nav.Link as={Link} to="/attendance" onClick={() => setExpanded(false)}>Attendance</Nav.Link>
                                    {user?.role === 'admin' && (
                                        <>
                                            <Nav.Link as={Link} to="/bookings" onClick={() => setExpanded(false)}>Bookings</Nav.Link>
                                            <Nav.Link as={Link} to="/technicians" onClick={() => setExpanded(false)}>Technicians</Nav.Link>
                                            <Nav.Link as={Link} to="/customers" onClick={() => setExpanded(false)}>Customers</Nav.Link>
                                            <Nav.Link as={Link} to="/invoices" onClick={() => setExpanded(false)}>Invoices</Nav.Link>
                                            <Nav.Link as={Link} to="/settings" onClick={() => setExpanded(false)}>Settings</Nav.Link>
                                        </>
                                    )}
                                </>
                            )}
                        </Nav>

                        <Nav>
                            {needRefresh && (
                                <Button
                                    variant="warning"
                                    size="sm"
                                    className="me-3 d-flex align-items-center gap-2 fw-bold"
                                    onClick={() => {
                                        updateServiceWorker(true);
                                        setExpanded(false);
                                    }}
                                >
                                    <FaSync size={14} className="fa-spin" />
                                    <span>Update App</span>
                                </Button>
                            )}
                            {(deferredPrompt || isIOS) && (
                                <Button
                                    variant="outline-success"
                                    size="sm"
                                    className="me-3 d-flex align-items-center gap-2"
                                    onClick={() => {
                                        handleInstallClick();
                                        if (!isIOS) setExpanded(false);
                                    }}
                                >
                                    {isIOS ? <FaApple size={16} /> : <FaDownload size={14} />}
                                    <span>Install App</span>
                                </Button>
                            )}
                            {isAuthenticated ? (
                                <>
                                    <Nav.Item className="d-flex align-items-center me-3 text-light">
                                        <FaUserCircle className="me-2" />
                                        <span>{user?.username}</span>
                                    </Nav.Item>
                                    <Button
                                        variant="outline-light"
                                        size="sm"
                                        onClick={() => {
                                            handleLogout();
                                            setExpanded(false);
                                        }}
                                    >
                                        <FaSignOutAlt className="me-1" /> Logout
                                    </Button>
                                </>
                            ) : (
                                !isPublicPage && (
                                    <Nav.Link as={Link} to="/login" onClick={() => setExpanded(false)}>
                                        <Button variant="outline-light" size="sm">Login</Button>
                                    </Nav.Link>
                                )
                            )}
                        </Nav>
                    </Navbar.Collapse>
                </Container>
            </Navbar>

            {/* iOS Install Prompt Modal */}
            <Modal show={showIOSPrompt} onHide={() => setShowIOSPrompt(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title className="d-flex align-items-center gap-2">
                        <FaApple size={24} />
                        Install on iOS
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
                            <span>Scroll down and tap <strong>Add to Home Screen</strong> <span role="img" aria-label="plus icon">➕</span></span>
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowIOSPrompt(false)}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default NavigationBar;
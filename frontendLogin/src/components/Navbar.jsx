import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { FaUserCircle, FaSignOutAlt, FaDownload } from 'react-icons/fa';

const NavigationBar = () => {
    const { user, logout, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [expanded, setExpanded] = React.useState(false);
    const navbarRef = React.useRef(null);
    const [deferredPrompt, setDeferredPrompt] = React.useState(null);

    React.useEffect(() => {
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
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
                                        <Nav.Link as={Link} to="/invoices" onClick={() => setExpanded(false)}>Invoices</Nav.Link>
                                        <Nav.Link as={Link} to="/settings" onClick={() => setExpanded(false)}>Settings</Nav.Link>
                                    </>
                                )}
                            </>
                        )}
                    </Nav>

                    <Nav>
                        {deferredPrompt && (
                            <Button
                                variant="outline-success"
                                size="sm"
                                className="me-3 d-flex align-items-center gap-2"
                                onClick={() => {
                                    handleInstallClick();
                                    setExpanded(false);
                                }}
                            >
                                <FaDownload size={14} />
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
    );
};

export default NavigationBar;
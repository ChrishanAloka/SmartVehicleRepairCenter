import React from 'react';
import { Navbar, Container, Nav, Button } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { FaTools, FaCalendarPlus, FaSearch, FaDownload } from 'react-icons/fa';
import logo from '../assets/logo.png';

const PublicNavbar = () => {
    const location = useLocation();
    const [expanded, setExpanded] = React.useState(false);
    const navbarRef = React.useRef(null);
    const [deferredPrompt, setDeferredPrompt] = React.useState(null);
    const [isInstalling, setIsInstalling] = React.useState(false);

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
        document.addEventListener('touchstart', handleClickOutside); // For mobile touches

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        setIsInstalling(true);
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        }
        setIsInstalling(false);
    };

    return (
        <Navbar
            bg="white"
            expand="lg"
            className="shadow-sm py-2 sticky-top"
            expanded={expanded}
            onToggle={setExpanded}
            ref={navbarRef}
        >
            <Container>
                <Navbar.Brand as={Link} to="/" className="fw-bold text-danger d-flex align-items-center">
                    {/* <div className="bg-primary bg-opacity-10 p-2 rounded-3 me-2">
                        <FaTools className="text-primary" />
                    </div> */}
                    <img src={logo} alt="Logo" style={{ height: '35px', margin: '0 7px 3px 0' }} />
                    <span className="letter-spacing-1 fs-5">ROYAL AUTO SERVICE</span>
                </Navbar.Brand>

                <Navbar.Toggle aria-controls="public-navbar-nav" />
                <Navbar.Collapse id="public-navbar-nav">
                    <Nav className="ms-auto align-items-center gap-2">
                        <Nav.Link
                            as={Link}
                            to="/"
                            className={`fw-semibold px-3 ${location.pathname === '/' ? 'text-primary' : 'text-muted'}`}
                            onClick={() => setExpanded(false)}
                        >
                            LIVE STATUS
                        </Nav.Link>

                        <Nav.Link
                            as={Link}
                            to="/customer-lookup"
                            className={`fw-semibold px-3 ${location.pathname === '/customer-lookup' ? 'text-primary' : 'text-muted'}`}
                            onClick={() => setExpanded(false)}
                        >
                            CHECK STATUS
                        </Nav.Link>

                        {deferredPrompt && (
                            <Button
                                variant="outline-dark"
                                size="sm"
                                className="btn-pill px-3 d-flex align-items-center gap-2 animate-fade-in"
                                onClick={() => {
                                    handleInstallClick();
                                    setExpanded(false);
                                }}
                                disabled={isInstalling}
                            >
                                {isInstalling ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                        <span>Installing...</span>
                                    </>
                                ) : (
                                    <>
                                        <FaDownload size={14} />
                                        <span>Install App</span>
                                    </>
                                )}
                            </Button>
                        )}

                        <Button
                            as={Link}
                            to="/booking"
                            variant={location.pathname === '/booking' ? "primary" : "outline-primary"}
                            className="btn-pill ms-lg-2 px-4 shadow-sm"
                            onClick={() => setExpanded(false)}
                        >
                            <FaCalendarPlus className="me-2" />
                            BOOK NOW
                        </Button>
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
};

export default PublicNavbar;

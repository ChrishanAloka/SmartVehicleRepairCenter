import React from 'react';
import { Navbar, Container, Nav, Button, Modal } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { FaTools, FaCalendarPlus, FaSearch, FaDownload, FaSync, FaApple } from 'react-icons/fa';
import logo from '../assets/logo.png';
import { useRegisterSW } from 'virtual:pwa-register/react';

const PublicNavbar = () => {
    const location = useLocation();
    const [expanded, setExpanded] = React.useState(false);
    const navbarRef = React.useRef(null);
    const [deferredPrompt, setDeferredPrompt] = React.useState(null);
    const [isInstalling, setIsInstalling] = React.useState(false);
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
        document.addEventListener('touchstart', handleClickOutside); // For mobile touches

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
        setIsInstalling(true);
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        }
        setIsInstalling(false);
    };

    return (
        <>
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

                            {needRefresh && (
                                <Button
                                    variant="warning"
                                    size="sm"
                                    className="btn-pill px-3 d-flex align-items-center gap-2 animate-fade-in shadow-sm fw-bold"
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
                                    variant="outline-dark"
                                    size="sm"
                                    className="btn-pill px-3 d-flex align-items-center gap-2 animate-fade-in"
                                    onClick={() => {
                                        handleInstallClick();
                                        if (!isIOS) setExpanded(false);
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
                                            {isIOS ? <FaApple size={16} /> : <FaDownload size={14} />}
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

export default PublicNavbar;

import React from 'react';
import { Navbar, Container, Nav, Button } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { FaTools, FaCalendarPlus, FaSearch, FaDownload } from 'react-icons/fa';
import logo from '../assets/logo.png';

const PublicNavbar = () => {
    const location = useLocation();
    const [deferredPrompt, setDeferredPrompt] = React.useState(null);

    React.useEffect(() => {
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        }
    };

    return (
        <Navbar bg="white" expand="lg" className="shadow-sm py-3 sticky-top">
            <Container>
                <Navbar.Brand as={Link} to="/" className="fw-bold text-danger d-flex align-items-center">
                    {/* <div className="bg-primary bg-opacity-10 p-2 rounded-3 me-2">
                        <FaTools className="text-primary" />
                    </div> */}
                    <img src={logo} alt="Logo" style={{ height: '50px', margin: '0 7px 3px 0' }} />
                    <span className="letter-spacing-1">ROYAL AUTO SERVICE</span>
                </Navbar.Brand>

                <Navbar.Toggle aria-controls="public-navbar-nav" />
                <Navbar.Collapse id="public-navbar-nav">
                    <Nav className="ms-auto align-items-center gap-2">
                        <Nav.Link
                            as={Link}
                            to="/"
                            className={`fw-semibold px-3 ${location.pathname === '/' ? 'text-primary' : 'text-muted'}`}
                        >
                            LIVE STATUS
                        </Nav.Link>

                        <Nav.Link
                            as={Link}
                            to="/customer-lookup"
                            className={`fw-semibold px-3 ${location.pathname === '/customer-lookup' ? 'text-primary' : 'text-muted'}`}
                        >
                            CHECK STATUS
                        </Nav.Link>

                        {deferredPrompt && (
                            <Button
                                variant="outline-dark"
                                size="sm"
                                className="btn-pill px-3 d-flex align-items-center gap-2 animate-fade-in"
                                onClick={handleInstallClick}
                            >
                                <FaDownload size={14} />
                                <span>Install App</span>
                            </Button>
                        )}

                        <Button
                            as={Link}
                            to="/booking"
                            variant={location.pathname === '/booking' ? "primary" : "outline-primary"}
                            className="btn-pill ms-lg-2 px-4 shadow-sm"
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

import React from 'react';
import { Navbar, Container, Nav, Button } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { FaTools, FaCalendarPlus, FaSearch } from 'react-icons/fa';

const PublicNavbar = () => {
    const location = useLocation();

    return (
        <Navbar bg="white" expand="lg" className="shadow-sm py-3 sticky-top">
            <Container>
                <Navbar.Brand as={Link} to="/" className="fw-bold text-primary d-flex align-items-center">
                    <div className="bg-primary bg-opacity-10 p-2 rounded-3 me-2">
                        <FaTools className="text-primary" />
                    </div>
                    <span className="letter-spacing-1">ROYALAUTO SERVICE</span>
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

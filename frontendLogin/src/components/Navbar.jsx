import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { FaUserCircle, FaSignOutAlt } from 'react-icons/fa';

const NavigationBar = () => {
    const { user, logout, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

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
        <Navbar bg="dark" variant="dark" expand="lg" className="shadow-sm">
            <Container>
                <Navbar.Brand as={Link} to={isAuthenticated ? (user?.role === 'admin' ? '/dashboard' : '/technician-portal') : '/login'} className="fw-bold">
                    Vehicle Service Center
                </Navbar.Brand>
                <Navbar.Toggle aria-controls="navbar-nav" />
                <Navbar.Collapse id="navbar-nav">
                    <Nav className="me-auto">
                        {isAuthenticated && (
                            <>
                                {user?.role === 'admin' && <Nav.Link as={Link} to="/dashboard">Dashboard</Nav.Link>}
                                <Nav.Link as={Link} to="/technician-portal">Technician Portal</Nav.Link>
                                <Nav.Link as={Link} to="/attendance">Attendance</Nav.Link>
                                {user?.role === 'admin' && (
                                    <>
                                        <Nav.Link as={Link} to="/bookings">Bookings</Nav.Link>
                                        <Nav.Link as={Link} to="/technicians">Technicians</Nav.Link>
                                        <Nav.Link as={Link} to="/invoices">Invoices</Nav.Link>
                                        <Nav.Link as={Link} to="/settings">Settings</Nav.Link>
                                    </>
                                )}
                            </>
                        )}
                    </Nav>

                    <Nav>
                        {isAuthenticated ? (
                            <>
                                <Nav.Item className="d-flex align-items-center me-3 text-light">
                                    <FaUserCircle className="me-2" />
                                    <span>{user?.username}</span>
                                </Nav.Item>
                                <Button
                                    variant="outline-light"
                                    size="sm"
                                    onClick={handleLogout}
                                >
                                    <FaSignOutAlt className="me-1" /> Logout
                                </Button>
                            </>
                        ) : (
                            !isPublicPage && (
                                <Nav.Link as={Link} to="/login">
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
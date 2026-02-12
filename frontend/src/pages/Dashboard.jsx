import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { bookingAPI, technicianAPI, invoiceAPI } from '../utils/api';
import { FaUsers, FaCalendarCheck, FaMoneyBillWave, FaClock } from 'react-icons/fa';
import moment from 'moment';

const Dashboard = () => {
    const [stats, setStats] = useState({
        totalTechnicians: 0,
        presentTechnicians: 0,
        todayBookings: 0,
        pendingBookings: 0,
        acceptedBookings: 0
    });
    const [recentBookings, setRecentBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
        const interval = setInterval(fetchDashboardData, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, []);

    const fetchDashboardData = async () => {
        try {
            const [techRes, presentTechRes, bookingsRes] = await Promise.all([
                technicianAPI.getAll(),
                technicianAPI.getPresent(),
                bookingAPI.getToday()
            ]);

            const bookings = bookingsRes.data;

            setStats({
                totalTechnicians: techRes.data.length,
                presentTechnicians: presentTechRes.data.length,
                todayBookings: bookings.length,
                pendingBookings: bookings.filter(b => b.status === 'pending').length,
                acceptedBookings: bookings.filter(b => b.status === 'accepted' && !b.isPaidOut).length
            });

            setRecentBookings(bookings.slice(0, 10));
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const statusMap = {
            pending: { bg: 'warning', text: 'Pending' },
            accepted: { bg: 'success', text: 'Accepted' },
            declined: { bg: 'danger', text: 'Declined' },
            not_today: { bg: 'secondary', text: 'Not Today' },
            completed: { bg: 'info', text: 'Completed' },
            cancelled: { bg: 'dark', text: 'Cancelled' }
        };
        const config = statusMap[status] || { bg: 'secondary', text: status };
        return <Badge bg={config.bg}>{config.text}</Badge>;
    };

    if (loading) {
        return (
            <Container className="py-5 text-center">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </Container>
        );
    }

    return (
        <Container fluid className="py-4">
            <h2 className="mb-4">Dashboard</h2>

            {/* Statistics Cards */}
            <Row className="g-4 mb-4">
                <Col md={6} lg={3}>
                    <Card className="shadow-sm border-0 h-100">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <p className="text-muted mb-1">Total Technicians</p>
                                    <h2 className="mb-0">{stats.totalTechnicians}</h2>
                                </div>
                                <FaUsers size={40} className="text-primary opacity-75" />
                            </div>
                            <div className="mt-3">
                                <small className="text-success">
                                    {stats.presentTechnicians} present today
                                </small>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                <Col md={6} lg={3}>
                    <Card className="shadow-sm border-0 h-100">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <p className="text-muted mb-1">Today's Bookings</p>
                                    <h2 className="mb-0">{stats.todayBookings}</h2>
                                </div>
                                <FaCalendarCheck size={40} className="text-info opacity-75" />
                            </div>
                            <div className="mt-3">
                                <Link to="/bookings" className="text-decoration-none small">
                                    View all bookings →
                                </Link>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                <Col md={6} lg={3}>
                    <Card className="shadow-sm border-0 h-100">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <p className="text-muted mb-1">Pending</p>
                                    <h2 className="mb-0">{stats.pendingBookings}</h2>
                                </div>
                                <FaClock size={40} className="text-warning opacity-75" />
                            </div>
                            <div className="mt-3">
                                <small className="text-warning">
                                    Awaiting technician confirmation
                                </small>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                <Col md={6} lg={3}>
                    <Card className="shadow-sm border-0 h-100">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <p className="text-muted mb-1">In Progress</p>
                                    <h2 className="mb-0">{stats.acceptedBookings}</h2>
                                </div>
                                <FaMoneyBillWave size={40} className="text-success opacity-75" />
                            </div>
                            <div className="mt-3">
                                <small className="text-muted">
                                    Accepted & not paid out
                                </small>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Recent Bookings */}
            <Card className="shadow-sm border-0">
                <Card.Header className="bg-white">
                    <div className="d-flex justify-content-between align-items-center">
                        <h5 className="mb-0">Recent Bookings</h5>
                        <Link to="/bookings">
                            <Button variant="outline-primary" size="sm">View All</Button>
                        </Link>
                    </div>
                </Card.Header>
                <Card.Body className="p-0">
                    {recentBookings.length === 0 ? (
                        <Alert variant="info" className="m-3 mb-0">
                            No bookings for today yet.
                        </Alert>
                    ) : (
                        <div className="table-responsive">
                            <Table hover className="mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th>Customer</th>
                                        <th>Vehicle</th>
                                        <th>Problem</th>
                                        <th>Technician</th>
                                        <th>Status</th>
                                        <th>Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentBookings.map((booking) => (
                                        <tr key={booking._id}>
                                            <td>
                                                <div>
                                                    <strong>{booking.customer?.name}</strong>
                                                    <br />
                                                    <small className="text-muted">{booking.customer?.phone}</small>
                                                </div>
                                            </td>
                                            <td>{booking.customer?.vehicleNumber}</td>
                                            <td>
                                                <small>{booking.problemDescription.substring(0, 50)}...</small>
                                            </td>
                                            <td>
                                                {booking.technician ? (
                                                    <span>{booking.technician.name}</span>
                                                ) : (
                                                    <span className="text-muted">Not assigned</span>
                                                )}
                                            </td>
                                            <td>{getStatusBadge(booking.status)}</td>
                                            <td>
                                                <small>{moment(booking.createdAt).format('HH:mm')}</small>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    )}
                </Card.Body>
            </Card>
        </Container>
    );
};

export default Dashboard;
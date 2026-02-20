import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { bookingAPI, technicianAPI, invoiceAPI } from '../utils/api';
import { FaUsers, FaCalendarCheck, FaMoneyBillWave, FaClock, FaStar, FaStarHalfAlt, FaCommentAlt, FaTools } from 'react-icons/fa';
import moment from 'moment';

const Dashboard = () => {
    const [stats, setStats] = useState({
        totalTechnicians: 0,
        presentTechnicians: 0,
        todayBookings: 0,
        pendingBookings: 0,
        acceptedBookings: 0,
        repairedBookings: 0,
        averageRating: 0
    });
    const [recentBookings, setRecentBookings] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
        const interval = setInterval(fetchDashboardData, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, []);

    const fetchDashboardData = async () => {
        try {
            const [techRes, presentTechRes, bookingsRes, allBookingsRes] = await Promise.all([
                technicianAPI.getAll(),
                technicianAPI.getPresent(),
                bookingAPI.getToday(),
                bookingAPI.getAll()
            ]);

            const bookings = bookingsRes.data;
            const allBookings = allBookingsRes.data;

            // Extract and calculate reviews
            const allReviews = allBookings.filter(b => b.rating && b.rating > 0);
            const avgRating = allReviews.length > 0
                ? (allReviews.reduce((sum, b) => sum + b.rating, 0) / allReviews.length).toFixed(1)
                : "0.0";

            setStats({
                totalTechnicians: techRes.data.length,
                presentTechnicians: presentTechRes.data.length,
                todayBookings: bookings.length,
                pendingBookings: bookings.filter(b => b.status === 'pending').length,
                acceptedBookings: bookings.filter(b => b.status === 'accepted' && !b.isPaidOut).length,
                repairedBookings: bookings.filter(b => b.status === 'repaired' && !b.isPaidOut).length,
                averageRating: avgRating
            });

            setRecentBookings(bookings.slice(0, 10));

            // Sort by latest feedback (using updatedAt)
            const sortedReviews = [...allReviews].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
            setReviews(sortedReviews.slice(0, 6));

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderStars = (rating) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            if (i <= rating) {
                stars.push(<FaStar key={i} className="text-warning" />);
            } else if (i - 0.5 === rating) {
                stars.push(<FaStarHalfAlt key={i} className="text-warning" />);
            } else {
                stars.push(<FaStar key={i} className="text-light text-opacity-50" />);
            }
        }
        return stars;
    };

    const calculateAverageRating = () => {
        return stats.averageRating || 0;
    };

    const getStatusBadge = (status) => {
        const statusMap = {
            pending: { bg: 'warning', text: 'Pending' },
            accepted: { bg: 'success', text: 'Accepted' },
            declined: { bg: 'danger', text: 'Declined' },
            not_today: { bg: 'secondary', text: 'Not Today' },
            completed: { bg: 'info', text: 'Completed' },
            repaired: { bg: 'primary', text: 'Repaired' },
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

            {/* Workshop Status Cards */}
            <Row className="g-4 mb-4">
                <Col md={4}>
                    <Card className="shadow-sm border-0 bg-warning text-dark h-100">
                        <Card.Body className="d-flex align-items-center">
                            <div className="rounded-circle bg-white bg-opacity-25 p-3 me-3">
                                <FaClock size={24} />
                            </div>
                            <div>
                                <h6 className="mb-0">Awaiting Service</h6>
                                <h3 className="mb-0 fw-bold">{stats.pendingBookings}</h3>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card className="shadow-sm border-0 bg-success text-white h-100">
                        <Card.Body className="d-flex align-items-center">
                            <div className="rounded-circle bg-white bg-opacity-25 p-3 me-3">
                                <FaCalendarCheck size={24} />
                            </div>
                            <div>
                                <h6 className="mb-0">In Progress</h6>
                                <h3 className="mb-0 fw-bold">{stats.acceptedBookings}</h3>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card className="shadow-sm border-0 bg-primary text-white h-100">
                        <Card.Body className="d-flex align-items-center">
                            <div className="rounded-circle bg-white bg-opacity-25 p-3 me-3">
                                <FaMoneyBillWave size={24} />
                            </div>
                            <div>
                                <h6 className="mb-0">Ready for Billing</h6>
                                <h3 className="mb-0 fw-bold">{stats.repairedBookings}</h3>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* General Statistics Cards */}
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
                                    <p className="text-muted mb-1">Customer Satisfaction</p>
                                    <h2 className="mb-0">{calculateAverageRating()}</h2>
                                </div>
                                <div className="text-warning d-flex flex-column align-items-end">
                                    <FaStar size={30} />
                                    <small className="mt-1 fw-bold">AVG RATING</small>
                                </div>
                            </div>
                            <div className="mt-2 d-flex gap-1">
                                {renderStars(parseFloat(calculateAverageRating()))}
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Row className="mb-4 g-4">
                <Col lg={8}>
                    {/* Recent Bookings */}
                    <Card className="shadow-sm border-0 h-100">
                        <Card.Header className="bg-white py-3 border-0">
                            <div className="d-flex justify-content-between align-items-center">
                                <h5 className="mb-0 fw-bold d-flex align-items-center">
                                    <FaTools className="me-2 text-primary" /> Live Workshop Orders
                                </h5>
                                <Link to="/bookings">
                                    <Button variant="outline-primary" size="sm" className="btn-pill">View All</Button>
                                </Link>
                            </div>
                        </Card.Header>
                        <Card.Body className="p-0">
                            {recentBookings.length === 0 ? (
                                <Alert variant="info" className="m-3">
                                    No active workshop orders for today.
                                </Alert>
                            ) : (
                                <div className="table-responsive">
                                    <Table hover className="mb-0 align-middle">
                                        <thead className="bg-light">
                                            <tr>
                                                <th className="ps-4">Customer</th>
                                                <th>Vehicle</th>
                                                <th>Technician</th>
                                                <th>Status</th>
                                                <th className="text-end pe-4">Time</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recentBookings.map((booking) => (
                                                <tr key={booking._id}>
                                                    <td className="ps-4">
                                                        <div>
                                                            <div className="fw-bold text-dark">{booking.customer?.name}</div>
                                                            <small className="text-muted">{booking.customer?.phone}</small>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <Badge bg="light" text="dark" className="border">
                                                            {booking.customer?.vehicleNumber}
                                                        </Badge>
                                                    </td>
                                                    <td>
                                                        {booking.technician ? (
                                                            <div className="d-flex align-items-center">
                                                                <div className="bg-primary bg-opacity-10 p-1 rounded-circle me-2" style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    <FaUsers size={12} className="text-primary" />
                                                                </div>
                                                                <span className="small fw-semibold">{booking.technician.name}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted small">Queueing...</span>
                                                        )}
                                                    </td>
                                                    <td>{getStatusBadge(booking.status)}</td>
                                                    <td className="text-end pe-4">
                                                        <small className="fw-bold">{moment(booking.createdAt).format('HH:mm')}</small>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                <Col lg={4}>
                    {/* Customer Reviews */}
                    <Card className="shadow-sm border-0 h-100">
                        <Card.Header className="bg-white py-3 border-0">
                            <h5 className="mb-0 fw-bold d-flex align-items-center">
                                <FaCommentAlt className="me-2 text-warning" /> Recent Feedback
                            </h5>
                        </Card.Header>
                        <Card.Body className="p-0">
                            {reviews.length === 0 ? (
                                <div className="text-center py-5 text-muted">
                                    <FaStar size={40} className="mb-3 opacity-25" />
                                    <p>No reviews yet.</p>
                                </div>
                            ) : (
                                <div className="review-list">
                                    {reviews.map((b) => (
                                        <div key={b._id} className="p-3 border-bottom hover-bg-light transition-base">
                                            <div className="d-flex justify-content-between align-items-start mb-2">
                                                <div className="fw-bold small">{b.customer?.name}</div>
                                                <div className="d-flex gap-1">
                                                    {renderStars(b.rating)}
                                                </div>
                                            </div>
                                            {b.reviewComment && (
                                                <p className="small text-muted mb-2 fst-italic">
                                                    "{b.reviewComment.substring(0, 80)}{b.reviewComment.length > 80 ? '...' : ''}"
                                                </p>
                                            )}
                                            <div className="d-flex justify-content-between align-items-center mt-1">
                                                <Badge bg="light" text="dark" className="border x-small">
                                                    {b.customer?.vehicleNumber}
                                                </Badge>
                                                <small className="text-muted x-small">
                                                    {moment(b.updatedAt).fromNow()}
                                                </small>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card.Body>
                        <Card.Footer className="bg-white border-0 text-center py-3">
                            <small className="text-muted">Feedback drives excellence</small>
                        </Card.Footer>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default Dashboard;
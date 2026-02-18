import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Table, Badge, Modal } from 'react-bootstrap';
import { bookingAPI } from '../utils/api';
import { FaSearch, FaUser, FaCar, FaClock, FaTools, FaStar, FaRegStar } from 'react-icons/fa';
import moment from 'moment';

const StarRating = ({ rating, setRating, interactive = false }) => {
    return (
        <div className="d-flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <span
                    key={star}
                    onClick={() => interactive && setRating(star)}
                    style={{ cursor: interactive ? 'pointer' : 'default' }}
                >
                    {star <= rating ? (
                        <FaStar className="text-warning" size={interactive ? 24 : 16} />
                    ) : (
                        <FaRegStar className="text-muted" size={interactive ? 24 : 16} />
                    )}
                </span>
            ))}
        </div>
    );
};

const CustomerLookup = () => {
    const [identifier, setIdentifier] = useState('');
    const [customerData, setCustomerData] = useState(null);
    const [allTodayBookings, setAllTodayBookings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [reviewForm, setReviewForm] = useState({ rating: 0, comment: '' });
    const [submittingReview, setSubmittingReview] = useState(false);
    const [showRebookModal, setShowRebookModal] = useState(false);
    const [rebookDate, setRebookDate] = useState(moment().format('YYYY-MM-DD'));
    const [submittingRebook, setSubmittingRebook] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        setError('');
        setCustomerData(null);
        setLoading(true);

        try {
            const [customerRes, todayRes] = await Promise.all([
                bookingAPI.getByCustomer(identifier),
                bookingAPI.getToday()
            ]);

            setCustomerData(customerRes.data);
            setAllTodayBookings(todayRes.data);

            if (customerRes.data.bookings.length === 0) {
                setError('No booking history found for this vehicle/ID.');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Information not found. Please check your vehicle number or ID.');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenReview = (booking) => {
        setSelectedBooking(booking);
        setReviewForm({ rating: booking.rating || 0, comment: booking.reviewComment || '' });
        setShowReviewModal(true);
    };

    const handleSubmitReview = async () => {
        if (!selectedBooking) return;
        if (reviewForm.rating === 0) {
            alert('Please select a rating before submitting.');
            return;
        }
        setSubmittingReview(true);
        try {
            await bookingAPI.submitReview(selectedBooking._id, {
                rating: reviewForm.rating,
                reviewComment: reviewForm.comment
            });
            setShowReviewModal(false);
            // Refresh data
            const event = { preventDefault: () => { } };
            handleSearch(event);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to submit review');
        } finally {
            setSubmittingReview(false);
        }
    };

    const handleOpenRebook = (booking) => {
        setSelectedBooking(booking);
        setRebookDate(moment().format('YYYY-MM-DD'));
        setShowRebookModal(true);
    };

    const handleRebook = async () => {
        if (!selectedBooking) return;
        setSubmittingRebook(true);
        try {
            await bookingAPI.rebook(selectedBooking._id, {
                bookingDate: rebookDate
            });
            setShowRebookModal(false);
            // Refresh data
            const event = { preventDefault: () => { } };
            handleSearch(event);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to rebook');
        } finally {
            setSubmittingRebook(false);
        }
    };

    const getStatusBadge = (status) => {
        const statusMap = {
            pending: { bg: 'warning', text: 'Waiting' },
            accepted: { bg: 'success', text: 'In Progress' },
            declined: { bg: 'danger', text: 'Declined' },
            not_today: { bg: 'secondary', text: 'Postponed' },
            completed: { bg: 'info', text: 'Completed' },
            repaired: { bg: 'primary', text: 'Repaired' },
            cancelled: { bg: 'dark', text: 'Cancelled' }
        };
        const config = statusMap[status] || { bg: 'secondary', text: status };
        return <Badge bg={config.bg} className="px-3 py-2 rounded-pill shadow-sm">{config.text}</Badge>;
    };

    const getPendingBookings = () => {
        if (!customerData || !customerData.bookings) return [];
        return customerData.bookings.filter(b =>
            (b.status === 'pending' || b.status === 'accepted' || b.status === 'repaired') && !b.isPaidOut
        );
    };

    const QueueVisualizer = ({ title, bookingsList, userBookingIds, icon, color, status }) => {
        return (
            <Card className="card-modern h-100 border-0 bg-white">
                <Card.Body className="p-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <div className="d-flex align-items-center">
                            <div className={`rounded-circle bg-${color} bg-opacity-10 p-3 me-3`}>
                                {icon}
                            </div>
                            <div>
                                <h5 className="fw-bold mb-0 text-dark">{title}</h5>
                                <small className="text-muted fw-bold text-uppercase" style={{ fontSize: '0.75rem' }}>{status}</small>
                            </div>
                        </div>
                        <h2 className={`fw-extrabold mb-0 text-${color}`}>{bookingsList.length}</h2>
                    </div>

                    <div className="queue-container d-flex flex-wrap gap-3 py-2">
                        {bookingsList.length === 0 ? (
                            <div className="text-muted small fst-italic py-3 opacity-50">Workshop floor is clear</div>
                        ) : (
                            bookingsList.map((b, i) => {
                                const isMe = userBookingIds.includes(b._id);
                                return (
                                    <div key={b._id} className="text-center" style={{ minWidth: '45px' }}>
                                        <div className={`queue-man-icon ${isMe ? 'text-danger scale-11' : `text-${color}`} ${isMe ? 'pulse-animation' : ''}`}>
                                            <FaUser size={isMe ? 32 : 24} />
                                        </div>
                                        {isMe && <div className="fw-extrabold text-danger mt-1 animate-fade-in" style={{ fontSize: '0.65rem' }}>YOU</div>}
                                        {!isMe && <div className="text-muted mt-1" style={{ fontSize: '0.65rem' }}>#{i + 1}</div>}
                                    </div>
                                )
                            })
                        )}
                    </div>
                </Card.Body>
            </Card>
        );
    };

    return (
        <Container className="py-5 bg-light min-vh-100">
            <Row className="justify-content-center mb-5 animate-fade-in">
                <Col lg={7}>
                    <div className="text-center mb-5">
                        <h1 className="display-5 fw-bold text-primary mb-2">Check My Status</h1>
                        <p className="text-muted lead">Track your vehicle's progress in real-time</p>
                    </div>
                    <Card className="card-modern border-0">
                        <Card.Body className="p-4 p-md-5">
                            <Form onSubmit={handleSearch}>
                                <Form.Group className="mb-4">
                                    <Form.Label className="fw-bold text-uppercase small letter-spacing-1 text-muted ms-1">Enter Vehicle or ID Number</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={identifier}
                                        onChange={(e) => setIdentifier(e.target.value)}
                                        placeholder="e.g., CAS-1234 or ID123456"
                                        required
                                        className="form-control-lg border-0 shadow-sm bg-light fw-bold text-primary"
                                        autoFocus
                                    />
                                </Form.Group>

                                <Button
                                    variant="primary"
                                    type="submit"
                                    className="btn-primary-gradient btn-pill w-100 py-3 shadow-lg fw-bold"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" />
                                            TRACKING...
                                        </>
                                    ) : (
                                        <>
                                            <FaSearch className="me-2" />
                                            FIND MY VEHICLE
                                        </>
                                    )}
                                </Button>
                            </Form>

                            {error && (
                                <Alert variant="danger" className="mt-4 border-0 shadow-sm rounded-3">
                                    {error}
                                </Alert>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {customerData && (
                <div className="animate-fade-in">
                    {/* Personalized Queue Status */}
                    {getPendingBookings().length > 0 && (
                        <div className="mb-5">
                            <div className="d-flex align-items-center mb-4">
                                <h3 className="fw-bold text-dark mb-0 border-start border-4 border-primary ps-3">Your Live Queue Position</h3>
                            </div>
                            <Row className="g-4">
                                <Col lg={6}>
                                    <QueueVisualizer
                                        title="Waiting List"
                                        bookingsList={allTodayBookings.filter(b => b.status === 'pending')}
                                        userBookingIds={getPendingBookings().map(b => b._id)}
                                        icon={<FaClock className="text-warning text-opacity-75" size={24} />}
                                        color="warning"
                                        status="Next in line"
                                    />
                                </Col>
                                <Col lg={6}>
                                    <QueueVisualizer
                                        title="Being Repaired"
                                        bookingsList={allTodayBookings.filter(b => b.status === 'accepted' && !b.isPaidOut)}
                                        userBookingIds={getPendingBookings().map(b => b._id)}
                                        icon={<FaTools className="text-success text-opacity-75" size={24} />}
                                        color="success"
                                        status="On the floor"
                                    />
                                </Col>
                            </Row>
                        </div>
                    )}

                    {/* Customer Information Summary */}
                    <Card className="card-modern mb-5 bg-white border-0">
                        <Card.Body className="p-4">
                            <Row className="align-items-center">
                                <Col md={8}>
                                    <div className="d-flex align-items-center mb-3 mb-md-0">
                                        <div className="rounded-circle bg-primary bg-opacity-10 p-4 me-4">
                                            <FaUser className="text-primary" size={32} />
                                        </div>
                                        <div>
                                            <h4 className="fw-bold text-dark mb-1">{customerData.customer.name}</h4>
                                            <div className="d-flex gap-3 text-muted small">
                                                <span><FaCar className="me-1" /> {customerData.customer.vehicleNumber}</span>
                                                {customerData.customer.vehicleModel && <span>• {customerData.customer.vehicleModel}</span>}
                                            </div>
                                        </div>
                                    </div>
                                </Col>
                                <Col md={4} className="text-md-end">
                                    <Button
                                        variant="light"
                                        className="btn-pill px-4 border text-muted hover-lift"
                                        onClick={() => {
                                            setCustomerData(null);
                                            setIdentifier('');
                                        }}
                                    >
                                        Track Different ID
                                    </Button>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>

                    {/* Pending/Active Bookings Table */}
                    {getPendingBookings().length > 0 && (
                        <div className="mb-5">
                            <h5 className="fw-bold text-dark mb-3 text-uppercase small letter-spacing-1">Current Service Status</h5>
                            <Card className="card-modern border-0 overflow-hidden">
                                <Card.Body className="p-0">
                                    <div className="table-responsive">
                                        <Table hover className="mb-0 align-middle">
                                            <thead className="bg-light">
                                                <tr>
                                                    <th className="ps-4 py-3 text-muted small text-uppercase fw-bold letter-spacing-1">Booking ID</th>
                                                    <th className="py-3 text-muted small text-uppercase fw-bold letter-spacing-1">Issue Reported</th>
                                                    <th className="py-3 text-muted small text-uppercase fw-bold letter-spacing-1">Technician</th>
                                                    <th className="pe-4 py-3 text-end text-muted small text-uppercase fw-bold letter-spacing-1">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {getPendingBookings().map((booking) => (
                                                    <tr key={booking._id} className="transition-base">
                                                        <td className="ps-4 py-3 fw-bold text-primary">
                                                            #{booking._id.slice(-6).toUpperCase()}
                                                        </td>
                                                        <td className="py-3 text-dark">
                                                            {booking.problemDescription}
                                                        </td>
                                                        <td className="py-3">
                                                            {booking.technician ? (
                                                                <div className="d-flex align-items-center">
                                                                    <div className="rounded-circle bg-success bg-opacity-10 p-2 me-2">
                                                                        <FaUser size={12} className="text-success" />
                                                                    </div>
                                                                    <span className="fw-medium">{booking.technician.name}</span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-muted italic small">Awaiting Assign</span>
                                                            )}
                                                        </td>
                                                        <td className="pe-4 py-3 text-end">
                                                            {getStatusBadge(booking.status)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    </div>
                                </Card.Body>
                            </Card>
                        </div>
                    )}

                    {/* Booking History */}
                    <div>
                        <h5 className="fw-bold text-dark mb-3 text-uppercase small letter-spacing-1">Service History</h5>
                        <Card className="card-modern border-0 overflow-hidden">
                            <Card.Body className="p-0">
                                <div className="table-responsive">
                                    <Table hover className="mb-0 align-middle">
                                        <thead className="bg-light text-muted small text-uppercase fw-bold">
                                            <tr>
                                                <th className="ps-4 py-3 border-0">Date</th>
                                                <th className="py-3 border-0">Technician</th>
                                                <th className="py-3 border-0">Issue</th>
                                                <th className="py-3 border-0">Status</th>
                                                <th className="py-3 border-0">Rating</th>
                                                <th className="pe-4 py-3 text-end border-0">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {customerData.bookings
                                                .filter(b => !((b.status === 'pending' || b.status === 'accepted') && !b.isPaidOut))
                                                .sort((a, b) => moment(b.bookingDate).diff(moment(a.bookingDate)))
                                                .map((booking) => (
                                                    <tr key={booking._id} className="opacity-75">
                                                        <td className="ps-4 py-3">{moment(booking.bookingDate).format('MMM DD, YYYY')}</td>
                                                        <td className="py-3">
                                                            {booking.technician?.name || '-'}
                                                        </td>
                                                        <td className="py-3">
                                                            <div className="text-dark small">{booking.problemDescription}</div>
                                                            {booking.notes && (
                                                                <div className="text-muted x-small mt-1 fst-italic">
                                                                    <FaTools size={10} className="me-1" /> {booking.notes}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="py-3">{getStatusBadge(booking.status)}</td>
                                                        <td className="py-3">
                                                            {booking.status === 'not_today' ? (
                                                                <Button
                                                                    variant="success"
                                                                    size="sm"
                                                                    className="rounded-pill px-3 fw-bold"
                                                                    onClick={() => handleOpenRebook(booking)}
                                                                >
                                                                    QUICK BOOK
                                                                </Button>
                                                            ) : (
                                                                booking.rating ? (
                                                                    <div className="d-flex align-items-center gap-2">
                                                                        <StarRating rating={booking.rating} />
                                                                        <Button
                                                                            variant="link"
                                                                            size="sm"
                                                                            className="p-0 text-decoration-none x-small fw-bold"
                                                                            onClick={() => handleOpenReview(booking)}
                                                                        >
                                                                            EDIT
                                                                        </Button>
                                                                    </div>
                                                                ) : (
                                                                    booking.status === 'completed' ? (
                                                                        <Button
                                                                            variant="outline-primary"
                                                                            size="sm"
                                                                            className="rounded-pill px-3"
                                                                            onClick={() => handleOpenReview(booking)}
                                                                        >
                                                                            Rate Service
                                                                        </Button>
                                                                    ) : '-'
                                                                )
                                                            )}
                                                        </td>
                                                        <td className="pe-4 py-3 text-end fw-bold">
                                                            {booking.isPaidOut && booking.amount ? (
                                                                <span>LKR {booking.amount.toLocaleString()}</span>
                                                            ) : (
                                                                <span className="text-muted">-</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            {customerData.bookings.filter(b => !((b.status === 'pending' || b.status === 'accepted') && !b.isPaidOut)).length === 0 && (
                                                <tr>
                                                    <td colSpan="5" className="text-center py-4 text-muted small">No previous booking history found.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </Table>
                                </div>
                            </Card.Body>
                        </Card>
                    </div>
                </div>
            )}
            {/* Review Modal */}
            <Modal show={showReviewModal} onHide={() => setShowReviewModal(false)} centered>
                <Modal.Header closeButton className="border-0">
                    <Modal.Title className="fw-bold">Rate Our Service</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    <div className="text-center mb-4">
                        <p className="text-muted">How was your experience with us?</p>
                        <div className="d-flex justify-content-center">
                            <StarRating
                                rating={reviewForm.rating}
                                setRating={(r) => setReviewForm({ ...reviewForm, rating: r })}
                                interactive={true}
                            />
                        </div>
                    </div>
                    <Form.Group className="mb-3">
                        <Form.Label className="fw-bold small text-muted text-uppercase">Your Comment</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={3}
                            placeholder="Tell us what you liked (optional)"
                            value={reviewForm.comment}
                            onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                            className="bg-light border-0"
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer className="border-0 p-4 pt-0">
                    <Button variant="light" className="btn-pill px-4" onClick={() => setShowReviewModal(false)}>
                        Skip
                    </Button>
                    <Button
                        variant="primary"
                        className="btn-primary-gradient btn-pill px-4 shadow-sm"
                        onClick={handleSubmitReview}
                        disabled={submittingReview}
                    >
                        {submittingReview ? 'SUBMITTING...' : 'SUBMIT REVIEW'}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Rebook Modal */}
            <Modal show={showRebookModal} onHide={() => setShowRebookModal(false)} centered>
                <Modal.Header closeButton className="border-0">
                    <Modal.Title className="fw-bold">Reschedule Booking</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    <p className="text-muted">Select a new date for your postponed service.</p>
                    <Form.Group className="mb-3">
                        <Form.Label className="fw-bold small text-muted text-uppercase">New Service Date</Form.Label>
                        <Form.Control
                            type="date"
                            value={rebookDate}
                            onChange={(e) => setRebookDate(e.target.value)}
                            min={moment().format('YYYY-MM-DD')}
                            className="bg-light border-0 fw-bold"
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer className="border-0 p-4 pt-0">
                    <Button variant="light" className="btn-pill px-4" onClick={() => setShowRebookModal(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="success"
                        className="btn-pill px-4 shadow-sm fw-bold"
                        onClick={handleRebook}
                        disabled={submittingRebook}
                    >
                        {submittingRebook ? 'REBOOKING...' : 'CONFIRM NEW DATE'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default CustomerLookup;
import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Table, Badge, Modal } from 'react-bootstrap';
import { bookingAPI } from '../utils/api';
import { FaSearch, FaUser, FaCar, FaClock, FaTools, FaStar, FaRegStar, FaEdit } from 'react-icons/fa';
import toast from 'react-hot-toast';
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
    const [showEditCustomerModal, setShowEditCustomerModal] = useState(false);
    const [editCustomerForm, setEditCustomerForm] = useState({
        name: '',
        phone: '',
        idNumber: '',
        vehicleNumber: '',
        vehicleModel: ''
    });
    const [updatingCustomer, setUpdatingCustomer] = useState(false);
    const [showEditBookingModal, setShowEditBookingModal] = useState(false);
    const [editBookingForm, setEditBookingForm] = useState({
        problemDescription: '',
        bookingDate: ''
    });
    const [updatingBooking, setUpdatingBooking] = useState(false);

    const fetchLatestData = useCallback(async (isAutoRefresh = false) => {
        if (!identifier) return;

        if (!isAutoRefresh) {
            setLoading(true);
            setError('');
        }

        try {
            const [customerRes, todayRes] = await Promise.all([
                bookingAPI.getByCustomer(identifier),
                bookingAPI.getToday({ date: moment().format('YYYY-MM-DD') })
            ]);

            setCustomerData(customerRes.data);
            setAllTodayBookings(todayRes.data);

            if (!isAutoRefresh && customerRes.data.bookings.length === 0) {
                setError('No booking history found for this vehicle/ID.');
            }
        } catch (err) {
            if (!isAutoRefresh) {
                const msg = err.response?.data?.message || 'Information not found. Please check your vehicle number or ID.';
                setError(msg);
                toast.error(msg);
                setCustomerData(null);
            }
        } finally {
            if (!isAutoRefresh) {
                setLoading(false);
            }
        }
    }, [identifier]);

    const handleSearch = (e) => {
        if (e) e.preventDefault();
        fetchLatestData(false);
    };

    useEffect(() => {
        let interval;
        if (customerData) {
            interval = setInterval(() => {
                fetchLatestData(true);
            }, 15000); // 15 seconds refresh
        }
        return () => clearInterval(interval);
    }, [customerData, fetchLatestData]);

    const handleOpenEditCustomer = () => {
        setEditCustomerForm({
            name: customerData.customer.name,
            phone: customerData.customer.phone,
            idNumber: customerData.customer.idNumber,
            vehicleNumber: customerData.customer.vehicleNumber,
            vehicleModel: customerData.customer.vehicleModel || ''
        });
        setShowEditCustomerModal(true);
    };

    const handleUpdateCustomer = async () => {
        setUpdatingCustomer(true);
        try {
            await bookingAPI.updateCustomer(customerData.customer._id, editCustomerForm);
            setShowEditCustomerModal(false);
            // Refresh data
            const event = { preventDefault: () => { } };
            handleSearch(event);
            toast.success('Customer details updated successfully');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update customer details');
        } finally {
            setUpdatingCustomer(false);
        }
    };

    const handleOpenEditBooking = (booking) => {
        setSelectedBooking(booking);
        setEditBookingForm({
            problemDescription: booking.problemDescription,
            bookingDate: moment(booking.bookingDate).format('YYYY-MM-DD')
        });
        setShowEditBookingModal(true);
    };

    const handleUpdateBooking = async () => {
        if (!selectedBooking) return;
        setUpdatingBooking(true);
        try {
            await bookingAPI.update(selectedBooking._id, editBookingForm);
            setShowEditBookingModal(false);
            // Refresh data
            const event = { preventDefault: () => { } };
            handleSearch(event);
            toast.success('Booking details updated successfully');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update booking details');
        } finally {
            setUpdatingBooking(false);
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
            toast.error('Please select a rating before submitting.');
            return;
        }
        setSubmittingReview(true);
        try {
            await bookingAPI.submitReview(selectedBooking._id, {
                rating: reviewForm.rating,
                reviewComment: reviewForm.comment
            });
            toast.success('Review submitted successfully');
            // Refresh data
            const event = { preventDefault: () => { } };
            handleSearch(event);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to submit review');
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
            toast.success('Service rescheduled successfully');
            // Refresh data
            const event = { preventDefault: () => { } };
            handleSearch(event);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to rebook');
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

    const getTodayActiveBookings = () => {
        if (!customerData || !customerData.bookings) return [];
        const today = moment().format('YYYY-MM-DD');
        return customerData.bookings.filter(b =>
            // Show if it's pending for today OR if it's currently in progress regardless of date
            ((moment(b.bookingDate).format('YYYY-MM-DD') === today && b.status === 'pending') ||
                (b.status === 'accepted')) &&
            !b.isPaidOut
        );
    };

    const getOverallActiveBookings = () => {
        if (!customerData || !customerData.bookings) return [];
        return customerData.bookings.filter(b =>
            (b.status === 'pending' || b.status === 'accepted' || b.status === 'repaired') &&
            !b.isPaidOut
        );
    };

    const getQueuePosition = (bookingId, list) => {
        const index = list.findIndex(b => b._id === bookingId);
        if (index === -1) return null;
        const pos = index + 1;
        const suffix = (pos) => {
            if (pos > 3 && pos < 21) return 'th';
            switch (pos % 10) {
                case 1: return 'st';
                case 2: return 'nd';
                case 3: return 'rd';
                default: return 'th';
            }
        };
        return `${pos}${suffix(pos)}`;
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
                        <h1 className="display-5 fw-bold text-primary mb-2">Customer Service Lookup</h1>
                        <p className="text-muted lead">Track any vehicle's progress and history</p>
                    </div>
                    <Card id="tour-lookup-search" className="card-modern border-0">
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
                                            SEARCHING...
                                        </>
                                    ) : (
                                        <>
                                            <FaSearch className="me-2" />
                                            FIND RECORDS
                                        </>
                                    )}
                                </Button>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {customerData && (
                <div className="animate-fade-in">
                    {/* Personalized Queue Status */}
                    {getTodayActiveBookings().length > 0 && (
                        <div className="mb-5">
                            <div className="d-flex align-items-center justify-content-between mb-4">
                                <h3 className="fw-bold text-dark mb-0 border-start border-4 border-primary ps-3">Your Live Workshop Positioning</h3>
                                <div className="d-flex gap-2">
                                    {getTodayActiveBookings().map(myBooking => {
                                        const pendingList = getOverallActiveBookings().filter(b => b.status === 'pending');
                                        const repairingList = getOverallActiveBookings().filter(b => b.status === 'accepted' && !b.isPaidOut);

                                        const waitingPos = getQueuePosition(myBooking._id, pendingList);
                                        const floorPos = getQueuePosition(myBooking._id, repairingList);

                                        if (waitingPos) return <Badge key={myBooking._id} bg="warning" className="px-3 py-2 rounded-pill text-dark shadow-sm">Waiting: {waitingPos}</Badge>;
                                        if (floorPos) return <Badge key={myBooking._id} bg="success" className="px-3 py-2 rounded-pill shadow-sm">Repairing: {floorPos}</Badge>;
                                        return null;
                                    })}
                                </div>
                            </div>
                            <Row className="g-4">
                                <Col lg={6}>
                                    <QueueVisualizer
                                        title="Waiting List"
                                        bookingsList={allTodayBookings.filter(b => b.status === 'pending')}
                                        userBookingIds={getTodayActiveBookings().map(b => b._id)}
                                        icon={<FaClock className="text-warning text-opacity-75" size={24} />}
                                        color="warning"
                                        status="Next in line"
                                    />
                                </Col>
                                <Col lg={6}>
                                    <QueueVisualizer
                                        title="Being Repaired"
                                        bookingsList={allTodayBookings.filter(b => b.status === 'accepted' && !b.isPaidOut)}
                                        userBookingIds={getTodayActiveBookings().map(b => b._id)}
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
                                            <div className="d-flex flex-wrap gap-3 text-muted small">
                                                <span><FaCar className="me-1" /> {customerData.customer.vehicleNumber}</span>
                                                {customerData.customer.vehicleModel && <span>• {customerData.customer.vehicleModel}</span>}
                                                <span>• <strong>ID:</strong> {customerData.customer.idNumber}</span>
                                                <span>• <strong>Phone:</strong> {customerData.customer.phone}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Col>
                                <Col md={4} className="text-md-end d-flex gap-2 justify-content-md-end">
                                    <Button
                                        variant="outline-primary"
                                        className="btn-pill px-4 hover-lift"
                                        onClick={handleOpenEditCustomer}
                                    >
                                        Edit Details
                                    </Button>
                                    <Button
                                        variant="light"
                                        className="btn-pill px-4 border text-muted hover-lift"
                                        onClick={() => {
                                            setCustomerData(null);
                                            setIdentifier('');
                                        }}
                                    >
                                        New Search
                                    </Button>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>

                    {/* Pending/Active Bookings Table */}
                    {getOverallActiveBookings().length > 0 && (
                        <div className="mb-5">
                            <h5 className="fw-bold text-dark mb-3 text-uppercase small letter-spacing-1">Current Service Status</h5>
                            <Card className="card-modern border-0 overflow-hidden">
                                <Card.Body className="p-0">
                                    <div className="table-responsive">
                                        <Table hover className="mb-0 align-middle">
                                            <thead className="bg-light">
                                                <tr>
                                                    <th className="ps-4 py-3 text-muted small text-uppercase fw-bold letter-spacing-1">Booking ID</th>
                                                    <th className="py-3 text-muted small text-uppercase fw-bold letter-spacing-1">Date</th>
                                                    <th className="py-3 text-muted small text-uppercase fw-bold letter-spacing-1">Issue Reported</th>
                                                    <th className="py-3 text-muted small text-uppercase fw-bold letter-spacing-1">Technician</th>
                                                    <th className="py-3 text-muted small text-uppercase fw-bold letter-spacing-1">Technician Notes</th>
                                                    <th className="pe-4 py-3 text-end text-muted small text-uppercase fw-bold letter-spacing-1">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {getOverallActiveBookings().map((booking) => (
                                                    <tr key={booking._id} className="transition-base">
                                                        <td className="ps-4 py-3 fw-bold text-primary">
                                                            #{booking._id.slice(-6).toUpperCase()}
                                                        </td>
                                                        <td className="py-3 text-dark">
                                                            {moment(booking.bookingDate).isSame(moment(), 'day') ? (
                                                                <Badge bg="primary" className="me-2">TODAY</Badge>
                                                            ) : moment(booking.bookingDate).format('MMM DD, YYYY')}
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
                                                        <td className="py-3">
                                                            {booking.notes ? (
                                                                <span className="text-dark small">{booking.notes}</span>
                                                            ) : (
                                                                <span className="text-muted italic small">-</span>
                                                            )}
                                                        </td>
                                                        <td className="pe-4 py-3 text-end">
                                                            <div className="d-flex gap-2 justify-content-end align-items-center">
                                                                {booking.status === 'pending' && (
                                                                    <Button
                                                                        variant="link"
                                                                        size="sm"
                                                                        className="p-0 text-decoration-none small fw-bold me-2"
                                                                        onClick={() => handleOpenEditBooking(booking)}
                                                                    >
                                                                        EDIT
                                                                    </Button>
                                                                )}
                                                                {getStatusBadge(booking.status)}
                                                            </div>
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

            {/* Edit Customer Modal */}
            <Modal show={showEditCustomerModal} onHide={() => setShowEditCustomerModal(false)} centered>
                <Modal.Header closeButton className="border-0">
                    <Modal.Title className="fw-bold">Edit Customer Details</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold small text-muted text-uppercase">Full Name</Form.Label>
                            <Form.Control
                                type="text"
                                value={editCustomerForm.name}
                                onChange={(e) => setEditCustomerForm({ ...editCustomerForm, name: e.target.value })}
                                className="bg-light border-0"
                            />
                        </Form.Group>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-bold small text-muted text-uppercase">Phone Number</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={editCustomerForm.phone}
                                        onChange={(e) => setEditCustomerForm({ ...editCustomerForm, phone: e.target.value })}
                                        className="bg-light border-0"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-bold small text-muted text-uppercase">ID Number</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={editCustomerForm.idNumber}
                                        onChange={(e) => setEditCustomerForm({ ...editCustomerForm, idNumber: e.target.value })}
                                        className="bg-light border-0"
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-bold small text-muted text-uppercase">Vehicle Number</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={editCustomerForm.vehicleNumber}
                                        onChange={(e) => setEditCustomerForm({ ...editCustomerForm, vehicleNumber: e.target.value.toUpperCase() })}
                                        className="bg-light border-0"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-bold small text-muted text-uppercase">Vehicle Category</Form.Label>
                                    <Form.Select
                                        value={editCustomerForm.vehicleModel}
                                        onChange={(e) => setEditCustomerForm({ ...editCustomerForm, vehicleModel: e.target.value })}
                                        className="bg-light border-0"
                                    >
                                        <option value="">Select Category</option>
                                        <option value="Bike">Bike</option>
                                        <option value="Scooter">Scooter</option>
                                        <option value="Sports Bike">Sports Bike</option>
                                        <option value="Off-Road Bike">Off-Road Bike</option>
                                        <option value="Mini-Moto Bike">Mini-Moto Bike</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>
                    </Form>
                </Modal.Body>
                <Modal.Footer className="border-0 p-4 pt-0">
                    <Button variant="light" className="btn-pill px-4" onClick={() => setShowEditCustomerModal(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        className="btn-primary-gradient btn-pill px-4 shadow-sm"
                        onClick={handleUpdateCustomer}
                        disabled={updatingCustomer}
                    >
                        {updatingCustomer ? 'UPDATING...' : 'SAVE CHANGES'}
                    </Button>
                </Modal.Footer>
            </Modal>
            {/* Edit Booking Modal */}
            <Modal show={showEditBookingModal} onHide={() => setShowEditBookingModal(false)} centered>
                <Modal.Header closeButton className="border-0">
                    <Modal.Title className="fw-bold">Edit Booking Details</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold small text-muted text-uppercase">Booking Date</Form.Label>
                            <Form.Control
                                type="date"
                                value={editBookingForm.bookingDate}
                                onChange={(e) => setEditBookingForm({ ...editBookingForm, bookingDate: e.target.value })}
                                className="bg-light border-0 fw-bold"
                                min={moment().format('YYYY-MM-DD')}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold small text-muted text-uppercase">Reported Issue / Description</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={4}
                                value={editBookingForm.problemDescription}
                                onChange={(e) => setEditBookingForm({ ...editBookingForm, problemDescription: e.target.value })}
                                className="bg-light border-0"
                                placeholder="Describe the issue in detail"
                            />
                        </Form.Group>
                        <div className="alert alert-info py-2 small border-0">
                            <FaClock className="me-2" /> You can only edit details while the booking is in the Waiting List.
                        </div>
                    </Form>
                </Modal.Body>
                <Modal.Footer className="border-0 p-4 pt-0">
                    <Button variant="light" className="btn-pill px-4" onClick={() => setShowEditBookingModal(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        className="btn-primary-gradient btn-pill px-4 shadow-sm fw-bold"
                        onClick={handleUpdateBooking}
                        disabled={updatingBooking}
                    >
                        {updatingBooking ? 'SAVING...' : 'SAVE CHANGES'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default CustomerLookup;
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Form, Alert, Modal } from 'react-bootstrap';
import { bookingAPI, technicianAPI } from '../utils/api';
import { FaCheckCircle, FaTimesCircle, FaClock, FaSearch, FaUser, FaTools } from 'react-icons/fa';
import moment from 'moment';

const TechnicianPortal = () => {
    const [technicians, setTechnicians] = useState([]);
    const [selectedTechnicianId, setSelectedTechnicianId] = useState('');
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showActionModal, setShowActionModal] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [actionData, setActionData] = useState({
        status: '',
        notes: ''
    });

    useEffect(() => {
        fetchTechnicians();
        const interval = setInterval(fetchTechnicians, 20000); // Sync availability every 20s
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (selectedTechnicianId) {
            fetchTodayBookings();
            const interval = setInterval(fetchTodayBookings, 20000); // Refresh every 20 seconds
            return () => clearInterval(interval);
        }
    }, [selectedTechnicianId]);

    const fetchTechnicians = async () => {
        try {
            const response = await technicianAPI.getAll();
            // Only show technicians who are active and present for today
            setTechnicians(response.data.filter(t => t.isActive && t.isPresent));
        } catch (error) {
            console.error('Error fetching technicians:', error);
            setError('Failed to load technicians');
        }
    };

    const fetchTodayBookings = async () => {
        setLoading(true);
        try {
            const response = await bookingAPI.getToday();
            setBookings(response.data);
        } catch (error) {
            console.error('Error fetching bookings:', error);
            setError('Failed to load bookings');
        } finally {
            setLoading(false);
        }
    };

    const handleTechnicianChange = (e) => {
        setSelectedTechnicianId(e.target.value);
        setError('');
        setSuccess('');
    };

    const handleShowActionModal = (booking, status) => {
        setSelectedBooking(booking);
        setActionData({
            status: status,
            notes: booking.notes || ''
        });
        setShowActionModal(true);
    };

    const handleCloseActionModal = () => {
        setShowActionModal(false);
        setSelectedBooking(null);
        setActionData({ status: '', notes: '' });
    };

    const handleActionSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            await bookingAPI.updateStatus(selectedBooking._id, {
                status: actionData.status,
                technicianId: selectedTechnicianId,
                notes: actionData.notes
            });

            setSuccess(`Booking ${actionData.status} successfully!`);
            await fetchTodayBookings();
            handleCloseActionModal();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update booking');
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

    const getMyBookings = () => {
        if (!selectedTechnicianId) return { pending: [], accepted: [], other: [] };

        return {
            pending: bookings.filter(b => b.status === 'pending'),
            accepted: bookings.filter(b =>
                b.technician?._id === selectedTechnicianId &&
                b.status === 'accepted' &&
                !b.isPaidOut
            ),
            other: bookings.filter(b =>
                b.technician?._id === selectedTechnicianId &&
                (b.status === 'declined' || b.status === 'not_today' || b.status === 'completed' || b.isPaidOut)
            )
        };
    };

    const myBookings = getMyBookings();
    const selectedTechnician = technicians.find(t => t._id === selectedTechnicianId);

    return (
        <Container fluid className="py-5 bg-light min-vh-100">
            <h2 className="mb-4 fw-bold text-primary">Technician Portal</h2>

            {error && <Alert variant="danger" onClose={() => setError('')} dismissible className="shadow-sm border-0">{error}</Alert>}
            {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible className="shadow-sm border-0">{success}</Alert>}

            {/* Technician Selection */}
            <Card className="card-modern mb-4">
                <Card.Body className="p-4">
                    <Row className="align-items-center">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label className="fw-bold text-uppercase small letter-spacing-1 text-muted">Select Technician ID</Form.Label>
                                <Form.Select
                                    value={selectedTechnicianId}
                                    onChange={handleTechnicianChange}
                                    size="lg"
                                    className="form-control-lg border-0 shadow-sm bg-light text-primary fw-bold"
                                >
                                    <option value="">-- Select Your ID --</option>
                                    {technicians.map(tech => (
                                        <option key={tech._id} value={tech._id}>
                                            {tech.name} ({tech.employeeId})
                                        </option>
                                    ))}
                                </Form.Select>
                                <Form.Text className="text-muted small ms-1">
                                    {technicians.length === 0
                                        ? "No technicians are currently clocked in. Please mark yourself as PRESENT on the Attendance page first."
                                        : "Select your employee ID to view and manage your bookings"}
                                </Form.Text>
                            </Form.Group>
                        </Col>
                        {selectedTechnician && (
                            <Col md={6}>
                                <div className="p-3 rounded-3 bg-primary bg-opacity-10 border border-primary border-opacity-25 d-flex align-items-center">
                                    <div className="rounded-circle bg-primary text-white p-3 me-3">
                                        <FaUser size={20} />
                                    </div>
                                    <div>
                                        <h5 className="mb-0 fw-bold text-primary">{selectedTechnician.name}</h5>
                                        <div className="d-flex gap-3 text-dark small mt-1">
                                            <span><strong>ID:</strong> {selectedTechnician.employeeId}</span>
                                            {selectedTechnician.specialization && (
                                                <span><strong>Role:</strong> {selectedTechnician.specialization}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Col>
                        )}
                    </Row>
                </Card.Body>
            </Card>

            {selectedTechnicianId && (
                <div className="animate-fade-in">
                    {/* Active Jobs Quick View */}
                    <Row className="mb-4">
                        <Col md={12}>
                            <Card className="card-modern bg-primary-gradient text-white border-0">
                                <Card.Body className="d-flex justify-content-between align-items-center py-4 px-4">
                                    <div>
                                        <h3 className="mb-1 fw-bold">My Active Shift</h3>
                                        <p className="mb-0 opacity-75">Manage your current workload and incoming requests</p>
                                    </div>
                                    <div className="d-flex gap-3">
                                        <div className="text-center px-4 py-2 bg-white bg-opacity-20 rounded-3 backdrop-blur">
                                            <h4 className="mb-0 fw-bold">{myBookings.accepted.length}</h4>
                                            <small className="text-uppercase" style={{ fontSize: '0.7rem' }}>In Progress</small>
                                        </div>
                                        <div className="text-center px-4 py-2 bg-warning text-dark rounded-3 shadow-sm">
                                            <h4 className="mb-0 fw-bold">{myBookings.pending.length}</h4>
                                            <small className="text-uppercase fw-bold" style={{ fontSize: '0.7rem' }}>Pending</small>
                                        </div>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>

                    {/* Pending Bookings - Quick Actions */}
                    <Card className="card-modern mb-4">
                        <Card.Header className="card-header-custom d-flex align-items-center bg-white">
                            <div className="rounded-circle bg-warning bg-opacity-10 p-2 me-3">
                                <FaClock className="text-warning" />
                            </div>
                            <h5 className="mb-0 text-dark fw-bold">New Job Requests</h5>
                        </Card.Header>
                        <Card.Body className="p-0">
                            {myBookings.pending.length === 0 ? (
                                <div className="text-center py-5 text-muted">
                                    <FaCheckCircle size={48} className="mb-3 text-success opacity-50" />
                                    <h6 className="fw-bold">All caught up!</h6>
                                    <p className="small mb-0">No new job requests at the moment.</p>
                                </div>
                            ) : (
                                <div className="table-responsive">
                                    <Table hover className="mb-0 align-middle">
                                        <thead className="bg-light">
                                            <tr>
                                                <th className="ps-4 py-3 text-uppercase small text-muted letter-spacing-1">Vehicle Info</th>
                                                <th className="py-3 text-uppercase small text-muted letter-spacing-1">Reported Issue</th>
                                                <th className="pe-4 py-3 text-end text-uppercase small text-muted letter-spacing-1">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {myBookings.pending.map((booking) => (
                                                <tr key={booking._id}>
                                                    <td className="ps-4 py-3">
                                                        <div className="d-flex align-items-center">
                                                            <div className="rounded bg-light p-2 me-3 fw-bold border text-center" style={{ minWidth: '80px' }}>
                                                                {booking.customer?.vehicleNumber}
                                                            </div>
                                                            <div>
                                                                <div className="fw-bold text-dark">{booking.customer?.vehicleModel}</div>
                                                                <small className="text-muted">{booking.customer?.name}</small>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-3">
                                                        <div className="text-truncate text-secondary" style={{ maxWidth: '300px' }}>
                                                            {booking.problemDescription}
                                                        </div>
                                                    </td>
                                                    <td className="text-end pe-4 py-3">
                                                        <div className="d-flex gap-2 justify-content-end">
                                                            <Button
                                                                variant="success"
                                                                size="sm"
                                                                className="btn-pill px-3 fw-bold shadow-sm"
                                                                onClick={() => handleShowActionModal(booking, 'accepted')}
                                                            >
                                                                Accept Is
                                                            </Button>
                                                            <Button
                                                                variant="light"
                                                                size="sm"
                                                                className="btn-pill px-3 fw-bold border text-secondary hover-lift"
                                                                onClick={() => handleShowActionModal(booking, 'not_today')}
                                                            >
                                                                Not Today
                                                            </Button>
                                                            <Button
                                                                variant="danger"
                                                                size="sm"
                                                                className="btn-pill px-3 fw-bold shadow-sm opacity-75 hover-opacity-100"
                                                                onClick={() => handleShowActionModal(booking, 'declined')}
                                                            >
                                                                Decline
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </div>
                            )}
                        </Card.Body>
                    </Card>

                    {/* Active Workshop Floor */}
                    <Card className="card-modern">
                        <Card.Header className="card-header-custom d-flex align-items-center bg-white">
                            <div className="rounded-circle bg-success bg-opacity-10 p-2 me-3">
                                <FaTools className="text-success" />
                            </div>
                            <h5 className="mb-0 text-dark fw-bold">My Floor (Active Jobs)</h5>
                        </Card.Header>
                        <Card.Body className="p-0">
                            {myBookings.accepted.length === 0 ? (
                                <div className="text-center py-5 text-muted">
                                    <p className="mb-0 small">No active repairs. Use 'Accept' on new requests to start a job.</p>
                                </div>
                            ) : (
                                <div className="table-responsive">
                                    <Table hover className="mb-0 align-middle">
                                        <thead className="bg-light">
                                            <tr>
                                                <th className="ps-4 py-3 text-uppercase small text-muted letter-spacing-1">Vehicle</th>
                                                <th className="py-3 text-uppercase small text-muted letter-spacing-1">Repair Notes</th>
                                                <th className="pe-4 py-3 text-end text-uppercase small text-muted letter-spacing-1">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {myBookings.accepted.map((booking) => (
                                                <tr key={booking._id}>
                                                    <td className="ps-4 py-3">
                                                        <div className="d-flex align-items-center">
                                                            <div className="rounded bg-dark text-white p-2 me-3 fw-bold text-center" style={{ minWidth: '80px' }}>
                                                                {booking.customer?.vehicleNumber}
                                                            </div>
                                                            <div>
                                                                <div className="fw-bold text-dark">{booking.customer?.vehicleModel}</div>
                                                                <small className="text-muted">{booking.customer?.name}</small>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 text-secondary">
                                                        {booking.problemDescription}
                                                    </td>
                                                    <td className="text-end pe-4 py-3">
                                                        <Badge bg="success" className="px-3 py-2 rounded-pill shadow-sm">
                                                            IN SERVICE
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </div>
            )}

            {!selectedTechnicianId && (
                <div className="text-center py-5 animate-fade-in">
                    <div className="d-inline-block p-4 rounded-circle bg-white shadow-lg mb-4">
                        <FaUser size={48} className="text-primary opacity-50" />
                    </div>
                    <h4 className="fw-bold text-dark">Welcome to Technician Portal</h4>
                    <p className="text-muted mb-0">Please select your employee ID above to access your workspace.</p>
                </div>
            )}

            {/* Action Modal */}
            <Modal show={showActionModal} onHide={handleCloseActionModal} centered contentClassName="border-0 shadow-lg rounded-4">
                <Modal.Header closeButton className="border-bottom-0 pb-0">
                    <Modal.Title className="fw-bold">
                        {actionData.status === 'accepted' && <span className="text-success">Accept Job</span>}
                        {actionData.status === 'declined' && <span className="text-danger">Decline Job</span>}
                        {actionData.status === 'not_today' && <span className="text-warning">Postpone Job</span>}
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleActionSubmit}>
                    <Modal.Body className="pt-2">
                        {selectedBooking && (
                            <div className="bg-light p-3 rounded-3 mb-3 border">
                                <div className="d-flex justify-content-between mb-1">
                                    <span className="text-muted small text-uppercase fw-bold">Customer</span>
                                    <span className="fw-bold text-dark">{selectedBooking.customer?.name}</span>
                                </div>
                                <div className="d-flex justify-content-between mb-1">
                                    <span className="text-muted small text-uppercase fw-bold">Vehicle</span>
                                    <span className="fw-bold text-dark">{selectedBooking.customer?.vehicleNumber}</span>
                                </div>
                                <hr className="my-2 opacity-10" />
                                <div className="d-block">
                                    <span className="text-muted small text-uppercase fw-bold d-block mb-1">Reported Issue</span>
                                    <p className="mb-0 text-dark small">{selectedBooking.problemDescription}</p>
                                </div>
                            </div>
                        )}

                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold small text-uppercase text-muted">Technician Notes {actionData.status === 'accepted' ? '(Optional)' : '(Required)'}</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={actionData.notes}
                                onChange={(e) => setActionData({ ...actionData, notes: e.target.value })}
                                required={actionData.status !== 'accepted'}
                                placeholder={
                                    actionData.status === 'accepted'
                                        ? 'Add any diagnosis or repair notes...'
                                        : 'Please explain the reason...'
                                }
                                className="form-control-lg fs-6"
                            />
                        </Form.Group>

                        {actionData.status === 'accepted' && (
                            <Alert variant="success" className="border-0 bg-success bg-opacity-10 mb-0">
                                <small className="fw-bold text-success">
                                    <FaCheckCircle className="me-2" />
                                    By accepting, you confirm availability to work on this vehicle immediately.
                                </small>
                            </Alert>
                        )}
                    </Modal.Body>
                    <Modal.Footer className="border-top-0 pt-0">
                        <Button variant="light" onClick={handleCloseActionModal} className="btn-pill px-4 fw-bold">
                            Cancel
                        </Button>
                        <Button
                            variant={
                                actionData.status === 'accepted' ? 'success' :
                                    actionData.status === 'declined' ? 'danger' : 'warning'
                            }
                            type="submit"
                            className="btn-pill px-4 fw-bold shadow-sm"
                        >
                            Confirm Action
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default TechnicianPortal;
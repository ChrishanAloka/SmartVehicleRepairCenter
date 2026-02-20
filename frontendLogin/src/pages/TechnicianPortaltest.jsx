import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Form, Alert, Modal } from 'react-bootstrap';
import { bookingAPI, technicianAPI } from '../utils/api';
import { FaCheckCircle, FaTimesCircle, FaClock, FaSearch } from 'react-icons/fa';
import toast from 'react-hot-toast';
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
    }, []);

    useEffect(() => {
        if (selectedTechnicianId) {
            fetchTodayBookings();
        }
    }, [selectedTechnicianId]);

    const fetchTechnicians = async () => {
        try {
            const response = await technicianAPI.getAll();
            setTechnicians(response.data.filter(t => t.isActive));
        } catch (error) {
            console.error('Error fetching technicians:', error);
            const eMsg = 'Failed to load technicians';
            setError(eMsg);
            toast.error(eMsg);
        }
    };

    const fetchTodayBookings = async () => {
        setLoading(true);
        try {
            const response = await bookingAPI.getToday();
            setBookings(response.data);
        } catch (error) {
            console.error('Error fetching bookings:', error);
            const eMsg = 'Failed to load bookings';
            setError(eMsg);
            toast.error(eMsg);
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

            const sMsg = `Booking ${actionData.status} successfully!`;
            setSuccess(sMsg);
            toast.success(sMsg);
            await fetchTodayBookings();
            handleCloseActionModal();
        } catch (err) {
            const eMsg = err.response?.data?.message || 'Failed to update booking';
            setError(eMsg);
            toast.error(eMsg);
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
        <Container fluid className="py-4">
            <h2 className="mb-4">Technician Portal</h2>


            {/* Technician Selection */}
            <Card className="shadow-sm border-0 mb-4">
                <Card.Body>
                    <Row className="align-items-center">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label className="fw-bold">Select Technician</Form.Label>
                                <Form.Select
                                    value={selectedTechnicianId}
                                    onChange={handleTechnicianChange}
                                    size="lg"
                                >
                                    <option value="">-- Select Your ID --</option>
                                    {technicians.map(tech => (
                                        <option key={tech._id} value={tech._id}>
                                            {tech.name} ({tech.employeeId})
                                        </option>
                                    ))}
                                </Form.Select>
                                <Form.Text className="text-muted">
                                    Select your employee ID to view and manage your bookings
                                </Form.Text>
                            </Form.Group>
                        </Col>
                        {selectedTechnician && (
                            <Col md={6}>
                                <Alert variant="info" className="mb-0">
                                    <strong>Logged in as:</strong> {selectedTechnician.name}<br />
                                    <strong>ID:</strong> {selectedTechnician.employeeId}<br />
                                    {selectedTechnician.specialization && (
                                        <><strong>Specialization:</strong> {selectedTechnician.specialization}</>
                                    )}
                                </Alert>
                            </Col>
                        )}
                    </Row>
                </Card.Body>
            </Card>

            {selectedTechnicianId && (
                <>
                    {/* Statistics */}
                    <Row className="g-3 mb-4">
                        <Col md={4}>
                            <Card className="text-center border-0 shadow-sm">
                                <Card.Body>
                                    <h3 className="mb-0 text-warning">{myBookings.pending.length}</h3>
                                    <small className="text-muted">Pending Bookings</small>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={4}>
                            <Card className="text-center border-0 shadow-sm">
                                <Card.Body>
                                    <h3 className="mb-0 text-success">{myBookings.accepted.length}</h3>
                                    <small className="text-muted">My Active Jobs</small>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={4}>
                            <Card className="text-center border-0 shadow-sm">
                                <Card.Body>
                                    <h3 className="mb-0 text-info">{myBookings.other.length}</h3>
                                    <small className="text-muted">Completed Today</small>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>

                    {/* Pending Bookings - Need Action */}
                    <Card className="shadow-sm border-0 mb-4">
                        <Card.Header className="bg-warning text-dark">
                            <h5 className="mb-0">
                                <FaSearch className="me-2" />
                                Pending Bookings - Need Your Response
                            </h5>
                        </Card.Header>
                        <Card.Body className="p-0">
                            {myBookings.pending.length === 0 ? (
                                <Alert variant="info" className="m-3 mb-0">
                                    No pending bookings at the moment. Check back later!
                                </Alert>
                            ) : (
                                <div className="table-responsive">
                                    <Table hover className="mb-0">
                                        <thead className="table-light">
                                            <tr>
                                                <th>Time</th>
                                                <th>Customer</th>
                                                <th>Vehicle</th>
                                                <th>Problem</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {myBookings.pending.map((booking) => (
                                                <tr key={booking._id}>
                                                    <td>
                                                        <small>{moment(booking.createdAt).format('HH:mm')}</small>
                                                    </td>
                                                    <td>
                                                        <div>
                                                            <strong>{booking.customer?.name}</strong>
                                                            <br />
                                                            <small className="text-muted">{booking.customer?.phone}</small>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <strong>{booking.customer?.vehicleNumber}</strong>
                                                        <br />
                                                        <small className="text-muted">{booking.customer?.vehicleModel}</small>
                                                    </td>
                                                    <td>
                                                        <small>{booking.problemDescription}</small>
                                                    </td>
                                                    <td>
                                                        <div className="d-flex gap-2">
                                                            <Button
                                                                variant="success"
                                                                size="sm"
                                                                onClick={() => handleShowActionModal(booking, 'accepted')}
                                                            >
                                                                <FaCheckCircle className="me-1" />
                                                                Accept
                                                            </Button>
                                                            <Button
                                                                variant="danger"
                                                                size="sm"
                                                                onClick={() => handleShowActionModal(booking, 'declined')}
                                                            >
                                                                <FaTimesCircle className="me-1" />
                                                                Decline
                                                            </Button>
                                                            <Button
                                                                variant="secondary"
                                                                size="sm"
                                                                onClick={() => handleShowActionModal(booking, 'not_today')}
                                                            >
                                                                <FaClock className="me-1" />
                                                                Not Today
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

                    {/* My Active Jobs */}
                    <Card className="shadow-sm border-0 mb-4">
                        <Card.Header className="bg-success text-white">
                            <h5 className="mb-0">My Active Jobs</h5>
                        </Card.Header>
                        <Card.Body className="p-0">
                            {myBookings.accepted.length === 0 ? (
                                <Alert variant="info" className="m-3 mb-0">
                                    No active jobs. Accept pending bookings to start working!
                                </Alert>
                            ) : (
                                <div className="table-responsive">
                                    <Table hover className="mb-0">
                                        <thead className="table-light">
                                            <tr>
                                                <th>Customer</th>
                                                <th>Vehicle</th>
                                                <th>Problem</th>
                                                <th>Notes</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {myBookings.accepted.map((booking) => (
                                                <tr key={booking._id}>
                                                    <td>
                                                        <div>
                                                            <strong>{booking.customer?.name}</strong>
                                                            <br />
                                                            <small className="text-muted">{booking.customer?.phone}</small>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <strong>{booking.customer?.vehicleNumber}</strong>
                                                        <br />
                                                        <small className="text-muted">{booking.customer?.vehicleModel}</small>
                                                    </td>
                                                    <td>
                                                        <small>{booking.problemDescription}</small>
                                                    </td>
                                                    <td>
                                                        {booking.notes ? (
                                                            <small className="text-muted">{booking.notes}</small>
                                                        ) : (
                                                            <span className="text-muted fst-italic">No notes</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <Badge bg="success">In Progress</Badge>
                                                        <div className="mt-2">
                                                            <small className="text-muted">
                                                                Customer will pay at office when complete
                                                            </small>
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

                    {/* Completed/Other Bookings */}
                    {myBookings.other.length > 0 && (
                        <Card className="shadow-sm border-0">
                            <Card.Header className="bg-secondary text-white">
                                <h5 className="mb-0">Completed Today</h5>
                            </Card.Header>
                            <Card.Body className="p-0">
                                <div className="table-responsive">
                                    <Table hover className="mb-0">
                                        <thead className="table-light">
                                            <tr>
                                                <th>Customer</th>
                                                <th>Vehicle</th>
                                                <th>Problem</th>
                                                <th>Status</th>
                                                <th>Payment</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {myBookings.other.map((booking) => (
                                                <tr key={booking._id}>
                                                    <td>
                                                        <div>
                                                            <strong>{booking.customer?.name}</strong>
                                                            <br />
                                                            <small className="text-muted">{booking.customer?.phone}</small>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <strong>{booking.customer?.vehicleNumber}</strong>
                                                    </td>
                                                    <td>
                                                        <small>{booking.problemDescription.substring(0, 40)}...</small>
                                                    </td>
                                                    <td>{getStatusBadge(booking.status)}</td>
                                                    <td>
                                                        {booking.isPaidOut ? (
                                                            <Badge bg="success">Paid ${booking.amount?.toFixed(2)}</Badge>
                                                        ) : (
                                                            <Badge bg="secondary">Unpaid</Badge>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </div>
                            </Card.Body>
                        </Card>
                    )}
                </>
            )}

            {!selectedTechnicianId && (
                <Alert variant="info" className="text-center">
                    <h5>Welcome to Technician Portal</h5>
                    <p>Please select your employee ID from the dropdown above to view and manage your bookings.</p>
                </Alert>
            )}

            {/* Action Modal */}
            <Modal show={showActionModal} onHide={handleCloseActionModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        {actionData.status === 'accepted' && 'Accept Booking'}
                        {actionData.status === 'declined' && 'Decline Booking'}
                        {actionData.status === 'not_today' && 'Postpone Booking'}
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleActionSubmit}>
                    <Modal.Body>
                        {selectedBooking && (
                            <div className="mb-3">
                                <p><strong>Customer:</strong> {selectedBooking.customer?.name}</p>
                                <p><strong>Vehicle:</strong> {selectedBooking.customer?.vehicleNumber}</p>
                                <p><strong>Problem:</strong> {selectedBooking.problemDescription}</p>
                            </div>
                        )}

                        <Form.Group className="mb-3">
                            <Form.Label>Add Notes {actionData.status === 'accepted' ? '(Optional)' : '(Required)'}</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={actionData.notes}
                                onChange={(e) => setActionData({ ...actionData, notes: e.target.value })}
                                required={actionData.status !== 'accepted'}
                                placeholder={
                                    actionData.status === 'accepted'
                                        ? 'Add any notes about the repair...'
                                        : 'Please provide a reason...'
                                }
                            />
                        </Form.Group>

                        {actionData.status === 'accepted' && (
                            <Alert variant="success">
                                <small>
                                    <strong>Note:</strong> By accepting, you confirm you can work on this vehicle today.
                                    The customer will pay at the office after completion.
                                </small>
                            </Alert>
                        )}

                        {actionData.status === 'declined' && (
                            <Alert variant="danger">
                                <small>
                                    <strong>Note:</strong> The customer will be notified and can book another date.
                                </small>
                            </Alert>
                        )}

                        {actionData.status === 'not_today' && (
                            <Alert variant="warning">
                                <small>
                                    <strong>Note:</strong> The customer can reschedule for another day.
                                </small>
                            </Alert>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseActionModal}>
                            Cancel
                        </Button>
                        <Button
                            variant={
                                actionData.status === 'accepted' ? 'success' :
                                    actionData.status === 'declined' ? 'danger' : 'warning'
                            }
                            type="submit"
                        >
                            Confirm {actionData.status === 'accepted' ? 'Accept' :
                                actionData.status === 'declined' ? 'Decline' : 'Postpone'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default TechnicianPortal;
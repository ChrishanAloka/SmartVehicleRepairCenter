import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Form, Alert, Modal } from 'react-bootstrap';
import { bookingAPI, technicianAPI } from '../utils/api';
import { useSettings } from '../context/SettingsContext';
import { FaCalendarAlt, FaFilter, FaSync } from 'react-icons/fa';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import toast from 'react-hot-toast';
import moment from 'moment';

const Bookings = () => {
    const { settings } = useSettings();
    const [bookings, setBookings] = useState([]);
    const [technicians, setTechnicians] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [filters, setFilters] = useState({
        date: moment().format('YYYY-MM-DD'),
        status: '',
        technician: ''
    });
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showEditStatusModal, setShowEditStatusModal] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [editData, setEditData] = useState({
        status: '',
        technicianId: '',
        notes: ''
    });
    const [highlightDates, setHighlightDates] = useState([]);

    useEffect(() => {
        fetchBookings();
        fetchTechnicians();
        fetchHighlightDates();
    }, []);

    const fetchHighlightDates = async () => {
        try {
            // Fetch all bookings to get highlight dates
            const response = await bookingAPI.getAll();
            const dates = response.data.map(b => new Date(moment(b.bookingDate).format('YYYY-MM-DD')));
            setHighlightDates(dates);
        } catch (error) {
            console.error('Error fetching highlight dates:', error);
        }
    };

    const fetchBookings = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filters.date) params.date = filters.date;
            if (filters.status) params.status = filters.status;
            if (filters.technician) params.technician = filters.technician;

            const response = await bookingAPI.getAll(params);
            setBookings(response.data);
        } catch (error) {
            console.error('Error fetching bookings:', error);
            setError('Failed to fetch bookings');
        } finally {
            setLoading(false);
        }
    };

    const fetchTechnicians = async () => {
        try {
            const response = await technicianAPI.getAll();
            setTechnicians(response.data);
        } catch (error) {
            console.error('Error fetching technicians:', error);
        }
    };

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const handleApplyFilters = () => {
        fetchBookings();
    };

    const handleResetFilters = () => {
        setFilters({
            date: moment().format('YYYY-MM-DD'),
            status: '',
            technician: ''
        });
        setTimeout(() => {
            fetchBookings();
        }, 100);
    };

    const handleViewDetails = (booking) => {
        setSelectedBooking(booking);
        setShowDetailsModal(true);
    };

    const handleEditStatus = (booking) => {
        setSelectedBooking(booking);
        setEditData({
            status: booking.status,
            technicianId: booking.technician?._id || '',
            notes: booking.notes || ''
        });
        setShowEditStatusModal(true);
    };

    const handleSaveStatus = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            await bookingAPI.updateStatus(selectedBooking._id, {
                status: editData.status,
                technicianId: editData.technicianId,
                notes: editData.notes
            });

            const sMsg = 'Booking status updated successfully';
            setSuccess(sMsg);
            toast.success(sMsg);
            setShowEditStatusModal(false);
            fetchBookings();
        } catch (err) {
            const eMsg = err.response?.data?.message || 'Failed to update status';
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
            repaired: { bg: 'primary', text: 'Repaired' },
            cancelled: { bg: 'dark', text: 'Cancelled' }
        };
        const config = statusMap[status] || { bg: 'secondary', text: status };
        return <Badge bg={config.bg}>{config.text}</Badge>;
    };

    const getStatusCounts = () => {
        const activeBookings = bookings.filter(b =>
            (b.status === 'pending' || b.status === 'accepted') &&
            !b.isPaidOut
        );
        return {
            total: activeBookings.length,
            pending: bookings.filter(b => b.status === 'pending').length,
            accepted: bookings.filter(b => b.status === 'accepted' && !b.isPaidOut).length,
            completed: bookings.filter(b => b.status === 'completed' || b.isPaidOut).length,
            cancelled: bookings.filter(b => b.status === 'cancelled' || b.status === 'declined').length
        };
    };

    const counts = getStatusCounts();

    return (
        <Container fluid className="py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>
                    <FaCalendarAlt className="me-2" />
                    Bookings Management
                </h2>
                <Button variant="outline-primary" onClick={fetchBookings} disabled={loading}>
                    <FaSync className={loading ? 'spinning' : ''} /> Refresh
                </Button>
            </div>


            {/* Statistics Cards */}
            <Row className="g-3 mb-4">
                <Col md={6} lg={3}>
                    <Card className="text-center border-0 shadow-sm">
                        <Card.Body>
                            <h3 className="mb-0">{counts.total}</h3>
                            <small className="text-muted">Active Today</small>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={6} lg={3}>
                    <Card className="text-center border-0 shadow-sm">
                        <Card.Body>
                            <h3 className="mb-0 text-warning">{counts.pending}</h3>
                            <small className="text-muted">Pending</small>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={6} lg={3}>
                    <Card className="text-center border-0 shadow-sm">
                        <Card.Body>
                            <h3 className="mb-0 text-success">{counts.accepted}</h3>
                            <small className="text-muted">In Progress</small>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={6} lg={3}>
                    <Card className="text-center border-0 shadow-sm">
                        <Card.Body>
                            <h3 className="mb-0 text-info">{counts.completed}</h3>
                            <small className="text-muted">Completed</small>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Filters */}
            <Card className="shadow-sm border-0 mb-4">
                <Card.Header className="bg-light">
                    <h6 className="mb-0">
                        <FaFilter className="me-2" />
                        Filters
                    </h6>
                </Card.Header>
                <Card.Body>
                    <Row>
                        <Col md={3}>
                            <Form.Group className="mb-3 d-flex flex-column">
                                <Form.Label>Date</Form.Label>
                                <DatePicker
                                    selected={filters.date ? new Date(filters.date) : null}
                                    onChange={(date) => {
                                        const formattedDate = date ? moment(date).format('YYYY-MM-DD') : '';
                                        setFilters({ ...filters, date: formattedDate });
                                    }}
                                    dateFormat="yyyy-MM-dd"
                                    className="form-control"
                                    placeholderText="Select date"
                                    highlightDates={highlightDates}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group className="mb-3">
                                <Form.Label>Status</Form.Label>
                                <Form.Select
                                    name="status"
                                    value={filters.status}
                                    onChange={handleFilterChange}
                                >
                                    <option value="">All Statuses</option>
                                    <option value="pending">Pending</option>
                                    <option value="accepted">Accepted</option>
                                    <option value="declined">Declined</option>
                                    <option value="not_today">Not Today</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group className="mb-3">
                                <Form.Label>Technician</Form.Label>
                                <Form.Select
                                    name="technician"
                                    value={filters.technician}
                                    onChange={handleFilterChange}
                                >
                                    <option value="">All Technicians</option>
                                    {technicians.map(tech => (
                                        <option key={tech._id} value={tech._id}>
                                            {tech.name}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={3} className="d-flex align-items-end">
                            <div className="d-flex gap-2 mb-3 w-100">
                                <Button variant="primary" onClick={handleApplyFilters} className="flex-grow-1">
                                    Apply
                                </Button>
                                <Button variant="outline-secondary" onClick={handleResetFilters}>
                                    Reset
                                </Button>
                            </div>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {/* Bookings Table */}
            <Card className="shadow-sm border-0">
                <Card.Body className="p-0">
                    <div className="table-responsive">
                        <Table hover className="mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>Date</th>
                                    <th>Customer</th>
                                    <th>Vehicle</th>
                                    <th>Problem</th>
                                    <th>Technician</th>
                                    <th>Status</th>
                                    <th>Payment</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="8" className="text-center py-4">
                                            <div className="spinner-border text-primary" role="status">
                                                <span className="visually-hidden">Loading...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : bookings.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="text-center py-4 text-muted">
                                            No bookings found for the selected filters
                                        </td>
                                    </tr>
                                ) : (
                                    bookings.map((booking) => (
                                        <tr key={booking._id}>
                                            <td>
                                                <div>
                                                    <strong>{moment(booking.bookingDate).format('MMM DD')}</strong>
                                                    <br />
                                                    <small className="text-muted">
                                                        {moment(booking.createdAt).format('HH:mm')}
                                                    </small>
                                                </div>
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
                                                <small>{booking.problemDescription ? booking.problemDescription.substring(0, 50) : 'No description'}...</small>
                                            </td>
                                            <td>
                                                {booking.technician ? (
                                                    <div>
                                                        <strong>{booking.technician.name}</strong>
                                                        <br />
                                                        <small className="text-muted">{booking.technician.employeeId}</small>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted fst-italic">Not assigned</span>
                                                )}
                                            </td>
                                            <td>{getStatusBadge(booking.status)}</td>
                                            <td>
                                                {booking.isPaidOut ? (
                                                    <Badge bg="success">Paid {settings.currency} {booking.amount?.toFixed(2) || '0.00'}</Badge>
                                                ) : (
                                                    <Badge bg="secondary">Unpaid</Badge>
                                                )}
                                            </td>
                                            <td>
                                                <div className="d-flex gap-2">
                                                    <Button
                                                        variant="outline-primary"
                                                        size="sm"
                                                        onClick={() => handleViewDetails(booking)}
                                                    >
                                                        View
                                                    </Button>
                                                    <Button
                                                        variant="outline-warning"
                                                        size="sm"
                                                        onClick={() => handleEditStatus(booking)}
                                                        disabled={booking.isPaidOut}
                                                    >
                                                        Edit Status
                                                    </Button>
                                                    {booking.status === 'accepted' && (
                                                        <Button
                                                            variant="success"
                                                            size="sm"
                                                            onClick={async () => {
                                                                if (window.confirm('Mark this repair as done?')) {
                                                                    try {
                                                                        await bookingAPI.updateStatus(booking._id, {
                                                                            status: 'repaired',
                                                                            notes: 'Marked done from admin panel'
                                                                        });
                                                                        fetchBookings();
                                                                        toast.success('Repair marked as done');
                                                                    } catch (err) {
                                                                        toast.error('Failed to update: ' + (err.response?.data?.message || err.message));
                                                                    }
                                                                }
                                                            }}
                                                        >
                                                            Done
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </Table>
                    </div>
                </Card.Body>
            </Card>

            {/* Booking Details Modal */}
            <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Booking Details</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedBooking && (
                        <div>
                            <Row className="mb-4">
                                <Col md={6}>
                                    <h6>Customer Information</h6>
                                    <p className="mb-1"><strong>Name:</strong> {selectedBooking.customer?.name}</p>
                                    <p className="mb-1"><strong>Phone:</strong> {selectedBooking.customer?.phone}</p>
                                    {selectedBooking.customer?.email && (
                                        <p className="mb-1"><strong>Email:</strong> {selectedBooking.customer?.email}</p>
                                    )}
                                    <p className="mb-1"><strong>ID Number:</strong> {selectedBooking.customer?.idNumber}</p>
                                </Col>
                                <Col md={6}>
                                    <h6>Vehicle Information</h6>
                                    <p className="mb-1"><strong>Number:</strong> {selectedBooking.customer?.vehicleNumber}</p>
                                    {selectedBooking.customer?.vehicleModel && (
                                        <p className="mb-1"><strong>Model:</strong> {selectedBooking.customer?.vehicleModel}</p>
                                    )}
                                    {selectedBooking.customer?.vehicleYear && (
                                        <p className="mb-1"><strong>Year:</strong> {selectedBooking.customer?.vehicleYear}</p>
                                    )}
                                </Col>
                            </Row>

                            <Row className="mb-4">
                                <Col md={6}>
                                    <h6>Booking Information</h6>
                                    <p className="mb-1"><strong>Date:</strong> {moment(selectedBooking.bookingDate).format('MMMM DD, YYYY')}</p>
                                    <p className="mb-1"><strong>Created:</strong> {moment(selectedBooking.createdAt).format('MMM DD, YYYY HH:mm')}</p>
                                    <p className="mb-1"><strong>Status:</strong> {getStatusBadge(selectedBooking.status)}</p>
                                </Col>
                                <Col md={6}>
                                    <h6>Assignment</h6>
                                    {selectedBooking.technician ? (
                                        <>
                                            <p className="mb-1"><strong>Technician:</strong> {selectedBooking.technician.name}</p>
                                            <p className="mb-1"><strong>ID:</strong> {selectedBooking.technician.employeeId}</p>
                                            {selectedBooking.technician.specialization && (
                                                <p className="mb-1"><strong>Specialization:</strong> {selectedBooking.technician.specialization}</p>
                                            )}
                                        </>
                                    ) : (
                                        <p className="text-muted fst-italic">Not assigned to any technician</p>
                                    )}
                                </Col>
                            </Row>

                            <div className="mb-4">
                                <h6>Problem Description</h6>
                                <p className="bg-light p-3 rounded">{selectedBooking.problemDescription}</p>
                            </div>

                            {selectedBooking.notes && (
                                <div className="mb-4">
                                    <h6>Technician Notes</h6>
                                    <p className="bg-light p-3 rounded">{selectedBooking.notes}</p>
                                </div>
                            )}

                            {selectedBooking.cancelledReason && (
                                <div className="mb-4">
                                    <h6>Cancellation Reason</h6>
                                    <Alert variant="warning">{selectedBooking.cancelledReason}</Alert>
                                </div>
                            )}

                            {selectedBooking.isPaidOut && (
                                <div>
                                    <h6>Payment Information</h6>
                                    <Alert variant="success">
                                        <strong>Paid:</strong> {settings.currency} {selectedBooking.amount?.toFixed(2) || '0.00'}
                                    </Alert>
                                </div>
                            )}
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Edit Status Modal */}
            <Modal show={showEditStatusModal} onHide={() => setShowEditStatusModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Manage Booking Status</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSaveStatus}>
                    <Modal.Body>
                        {selectedBooking && (
                            <div className="mb-3 p-3 bg-light rounded">
                                <small className="text-muted d-block">Vehicle</small>
                                <div className="fw-bold fs-5">{selectedBooking.customer?.vehicleNumber}</div>
                                <small className="text-muted d-block mt-2">Problem</small>
                                <div className="small">{selectedBooking.problemDescription}</div>
                            </div>
                        )}

                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold">Override Status</Form.Label>
                            <Form.Select
                                value={editData.status}
                                onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                                className="border-warning"
                            >
                                <option value="pending">Pending (Waiting)</option>
                                <option value="accepted">Accepted (In Service)</option>
                                <option value="repaired">Repaired (Done)</option>
                                <option value="completed">Completed (Paid Out)</option>
                                <option value="declined">Declined</option>
                                <option value="not_today">Not Today</option>
                                <option value="cancelled">Cancelled</option>
                            </Form.Select>
                            <Form.Text className="text-muted">
                                Manual override for technician errors.
                            </Form.Text>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold">Assign Technician</Form.Label>
                            <Form.Select
                                value={editData.technicianId}
                                onChange={(e) => setEditData({ ...editData, technicianId: e.target.value })}
                            >
                                <option value="">Not Assigned</option>
                                {technicians.map(tech => (
                                    <option key={tech._id} value={tech._id}>
                                        {tech.name} ({tech.employeeId})
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold">Internal Notes</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={2}
                                value={editData.notes}
                                onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                                placeholder="Reason for change..."
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="link" onClick={() => setShowEditStatusModal(false)}>
                            Cancel
                        </Button>
                        <Button variant="warning" type="submit" className="px-4">
                            Save Changes
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .spinning {
          animation: spin 1s linear infinite;
        }
      `}</style>
        </Container>
    );
};

export default Bookings;
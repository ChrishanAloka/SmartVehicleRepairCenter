import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Form, Alert, Modal } from 'react-bootstrap';
import { bookingAPI, technicianAPI } from '../utils/api';
import { FaCheckCircle, FaTimesCircle, FaClock, FaSearch, FaUser, FaTools, FaEdit } from 'react-icons/fa';
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
            const msg = 'Failed to load technicians';
            setError(msg);
            toast.error(msg);
        }
    };

    const fetchTodayBookings = async () => {
        setLoading(true);
        try {
            const response = await bookingAPI.getToday({ date: moment().format('YYYY-MM-DD') });
            setBookings(response.data);
        } catch (error) {
            console.error('Error fetching bookings:', error);
            const msg = 'Failed to load bookings';
            setError(msg);
            toast.error(msg);
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
            repaired: { bg: 'primary', text: 'Repaired' },
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
                (b.status === 'declined' || b.status === 'not_today' || b.status === 'repaired' || b.status === 'completed' || b.isPaidOut)
            )
        };
    };

    const myBookings = getMyBookings();
    const selectedTechnician = technicians.find(t => t._id === selectedTechnicianId);

    // Calculate today's coins (repaired or completed jobs today)
    const todayCoins = bookings.filter(b =>
        b.technician?._id === selectedTechnicianId &&
        (b.status === 'repaired' || b.status === 'completed')
    ).length;

    // Only counts jobs that are strictly in 'accepted' status as active
    const hasActiveJob = myBookings.accepted.length > 0;

    return (
        <Container fluid className="py-5 bg-light min-vh-100">
            <h2 className="mb-4 fw-bold text-primary">Technician Portal</h2>


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
                                <div className="flex-grow-1 p-3 rounded-3 bg-primary bg-opacity-10 border border-primary border-opacity-25 d-flex align-items-center">
                                    <div className="rounded-circle bg-primary text-white p-3 me-3">
                                        <FaUser size={20} />
                                    </div>
                                    <div>
                                        <h5 className="mb-0 fw-bold text-primary">{selectedTechnician.name}</h5>
                                        <div className="d-flex gap-3 text-dark small mt-1">
                                            <span><strong>ID:</strong> {selectedTechnician.employeeId}</span>
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
                    <Row className="mb-2">
                        <Col md={12}>
                            <Card className="card-modern bg-primary-gradient text-white border-0 overflow-hidden position-relative">
                                {/* Decorative circle */}
                                <div className="position-absolute translate-middle" style={{ top: '0', right: '-50px', width: '250px', height: '250px', background: 'white', opacity: '0.1', borderRadius: '50%' }}></div>

                                <Card.Body className="d-flex flex-column flex-md-row justify-content-between align-items-center py-2 px-4 position-relative gap-3">
                                    <div className="d-flex flex-column flex-sm-row align-items-center gap-3 text-center text-sm-start">
                                        <div>
                                            <h3 className="mb-0 fw-bold text-nowrap">My Active Shift</h3>
                                            <p className="mb-0 opacity-90 small text-nowrap">Manage workload & rewards</p>
                                        </div>
                                        <div className="d-flex gap-2 border-start-sm ps-sm-3 ms-sm-1 justify-content-center">
                                            <div className="coin-display-dark text-center py-1 px-3">
                                                <div className="gold-coin-sm mb-1"></div>
                                                <div className="lh-1">
                                                    <small className="text-white text-opacity-75 d-block text-uppercase fw-bold" style={{ fontSize: '0.6rem' }}>Today</small>
                                                    <span className="fw-black text-warning fs-4">+{todayCoins}</span>
                                                </div>
                                            </div>
                                            <div className="coin-display-dark text-center py-1 px-3">
                                                <div className="gold-coin-sm mb-1"></div>
                                                <div className="lh-1">
                                                    <small className="text-white text-opacity-75 d-block text-uppercase fw-bold" style={{ fontSize: '0.6rem' }}>Total</small>
                                                    <span className="fw-black text-warning fs-4">{selectedTechnician.totalCoins || 0}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="d-flex gap-2 gap-md-3">
                                        <div className="text-center px-3 px-md-4 py-2 bg-dark bg-opacity-40 rounded-3 border border-white border-opacity-25 shadow-sm">
                                            <h3 className="mb-0 fw-bold text-white">{myBookings.accepted.length}</h3>
                                            <small className="text-white text-opacity-90 text-uppercase fw-bold" style={{ fontSize: '0.65rem' }}>In Progress</small>
                                        </div>
                                        <div className="text-center px-3 px-md-4 py-2 bg-warning text-dark rounded-3 shadow-sm border border-warning">
                                            <h3 className="mb-0 fw-bold">{myBookings.pending.length}</h3>
                                            <small className="text-uppercase fw-bold" style={{ fontSize: '0.65rem' }}>Requests</small>
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
                                                                disabled={hasActiveJob}
                                                                title={hasActiveJob ? "Finish your current job first!" : "Accept Job"}
                                                            >
                                                                {hasActiveJob ? 'BUSY' : 'Accept Job'}
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
                                                <th className="ps-4 py-3 text-uppercase small text-muted letter-spacing-1">Vehicle & Customer</th>
                                                <th className="py-3 text-uppercase small text-muted letter-spacing-1">Job Info</th>
                                                <th className="py-3 text-uppercase small text-muted letter-spacing-1">Technician Notes</th>
                                                <th className="pe-4 py-3 text-end text-uppercase small text-muted letter-spacing-1">Actions</th>
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
                                                                <div className="text-muted small">
                                                                    <FaUser className="me-1" size={10} />
                                                                    {booking.customer?.name} • <span className="text-primary fw-medium">{booking.customer?.phone}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-3">
                                                        <div className="text-secondary small" style={{ maxWidth: '200px' }}>
                                                            {booking.problemDescription}
                                                        </div>
                                                    </td>
                                                    <td className="py-3">
                                                        <div className="d-flex align-items-start gap-2">
                                                            <div className="text-dark small flex-grow-1" style={{ maxWidth: '250px', minHeight: '20px' }}>
                                                                {booking.notes || <span className="text-muted italic opacity-50">No notes yet...</span>}
                                                            </div>
                                                            <Button
                                                                variant="link"
                                                                size="sm"
                                                                className="p-0 text-decoration-none text-primary"
                                                                onClick={() => handleShowActionModal(booking, 'accepted')}
                                                                title="Edit Notes"
                                                            >
                                                                <FaEdit size={14} />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                    <td className="text-end pe-4 py-3">
                                                        <div className="d-flex gap-2 justify-content-end align-items-center">
                                                            <Badge bg="success" className="px-3 py-2 rounded-pill shadow-sm">
                                                                IN SERVICE
                                                            </Badge>
                                                            <Button
                                                                variant="primary"
                                                                size="sm"
                                                                className="btn-pill px-3 fw-bold shadow-sm"
                                                                onClick={() => handleShowActionModal(booking, 'repaired')}
                                                            >
                                                                DONE
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
                        {actionData.status === 'accepted' && (selectedBooking?.status === 'accepted' ? <span className="text-primary">Update Job Notes</span> : <span className="text-success">Accept Job</span>)}
                        {actionData.status === 'declined' && <span className="text-danger">Decline Job</span>}
                        {actionData.status === 'not_today' && <span className="text-warning">Postpone Job</span>}
                        {actionData.status === 'repaired' && <span className="text-primary">Finish Repair</span>}
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleActionSubmit}>
                    <Modal.Body className="pt-2">
                        {selectedBooking && (
                            <div className="bg-light p-3 rounded-3 mb-3 border">
                                <div className="d-flex justify-content-between mb-1">
                                    <span className="text-muted small text-uppercase fw-bold">Customer</span>
                                    <div className="text-end">
                                        <div className="fw-bold text-dark">{selectedBooking.customer?.name}</div>
                                        <div className="text-muted small">{selectedBooking.customer?.phone}</div>
                                    </div>
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
                            <Form.Label className="fw-bold small text-uppercase text-muted">Technician Notes (Optional)</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={actionData.notes}
                                onChange={(e) => setActionData({ ...actionData, notes: e.target.value })}
                                required={false}
                                placeholder="Add any diagnosis or repair notes..."
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
                                    actionData.status === 'repaired' ? 'primary' :
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

            <style jsx>{`
                .card-modern {
                    border: none;
                    border-radius: 1.5rem;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.05);
                    transition: transform 0.3s ease;
                }
                .bg-primary-gradient {
                    background: linear-gradient(135deg, #0d6efd 0%, #0044cc 100%);
                }
                @media (min-width: 576px) {
                    .border-start-sm {
                        border-left: 1px solid rgba(255, 255, 255, 0.25) !important;
                    }
                }
                .backdrop-blur {
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                }
                .btn-pill {
                    border-radius: 50rem;
                }
                .letter-spacing-1 {
                    letter-spacing: 1px;
                }
                .fw-black {
                    font-weight: 900;
                }
                .gold-coin {
                    width: 32px;
                    height: 32px;
                    background: radial-gradient(circle at 30% 30%, #ffd700, #daa520);
                    border-radius: 50%;
                    display: inline-block;
                    margin-bottom: 5px;
                    box-shadow: 0 4px 10px rgba(218, 165, 32, 0.4), inset -2px -2px 5px rgba(0,0,0,0.2);
                    animation: spin-coin 3s linear infinite;
                    transform-style: preserve-3d;
                    position: relative;
                    border: 2px solid #b8860b;
                }

                .gold-coin:before {
                    content: '★';
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    font-size: 16px;
                    color: #b8860b;
                    text-shadow: 1px 1px 0 rgba(255,255,255,0.3);
                }

                @keyframes spin-coin {
                    0% { transform: rotateY(0deg); }
                    100% { transform: rotateY(360deg); }
                }

                .coin-display {
                    background: white;
                    padding: 10px 20px;
                    border-radius: 1rem;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.05);
                    border: 1px solid rgba(255, 215, 0, 0.2);
                }
                .coin-display-dark {
                    background: rgba(0, 0, 0, 0.3);
                    padding: 8px 15px;
                    border-radius: 0.8rem;
                    border: 1px solid rgba(255, 215, 0, 0.15);
                    min-width: 65px;
                }
                .gold-coin-sm {
                    width: 28px;
                    height: 28px;
                    background: radial-gradient(circle at 30% 30%, #ffd700, #daa520);
                    border-radius: 50%;
                    display: inline-block;
                    box-shadow: 0 2px 5px rgba(218, 165, 32, 0.4);
                    animation: spin-coin 3s linear infinite;
                    transform-style: preserve-3d;
                    position: relative;
                    border: 1px solid #b8860b;
                }
                .gold-coin-sm:before {
                    content: '★';
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    font-size: 14px;
                    color: #b8860b;
                }
            `}</style>
        </Container>
    );
};

export default TechnicianPortal;
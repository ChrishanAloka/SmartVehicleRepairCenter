import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Modal, Form, Alert, Badge } from 'react-bootstrap';
import { technicianAPI } from '../utils/api';
import { FaPlus, FaEdit, FaTrash, FaQrcode, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import moment from 'moment';

const Technicians = () => {
    const [technicians, setTechnicians] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [showQRModal, setShowQRModal] = useState(false);
    const [selectedTechnician, setSelectedTechnician] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [formData, setFormData] = useState({
        employeeId: '',
        name: '',
        email: '',
        phone: '',
        specialization: ''
    });

    useEffect(() => {
        fetchTechnicians();
    }, []);

    const fetchTechnicians = async () => {
        try {
            const response = await technicianAPI.getAll();
            setTechnicians(response.data);
        } catch (error) {
            console.error('Error fetching technicians:', error);
        }
    };

    const handleShowModal = (technician = null) => {
        if (technician) {
            setFormData({
                employeeId: technician.employeeId,
                name: technician.name,
                email: technician.email,
                phone: technician.phone,
                specialization: technician.specialization || ''
            });
            setSelectedTechnician(technician);
        } else {
            setFormData({
                employeeId: '',
                name: '',
                email: '',
                phone: '',
                specialization: ''
            });
            setSelectedTechnician(null);
        }
        setError('');
        setSuccess('');
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedTechnician(null);
        setFormData({
            employeeId: '',
            name: '',
            email: '',
            phone: '',
            specialization: ''
        });
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            if (selectedTechnician) {
                await technicianAPI.update(selectedTechnician._id, formData);
                setSuccess('Technician updated successfully!');
            } else {
                await technicianAPI.create(formData);
                setSuccess('Technician created successfully!');
            }

            await fetchTechnicians();
            setTimeout(() => {
                handleCloseModal();
            }, 1500);
        } catch (err) {
            setError(err.response?.data?.message || 'Operation failed');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this technician?')) {
            try {
                await technicianAPI.delete(id);
                setSuccess('Technician deleted successfully!');
                await fetchTechnicians();
                setTimeout(() => setSuccess(''), 3000);
            } catch (err) {
                setError(err.response?.data?.message || 'Delete failed');
                setTimeout(() => setError(''), 3000);
            }
        }
    };

    const handleToggleActive = async (technician) => {
        try {
            await technicianAPI.update(technician._id, {
                isActive: !technician.isActive
            });
            await fetchTechnicians();
        } catch (err) {
            setError(err.response?.data?.message || 'Update failed');
            setTimeout(() => setError(''), 3000);
        }
    };

    const handleShowQR = (technician) => {
        setSelectedTechnician(technician);
        setShowQRModal(true);
    };

    const handleDownloadQR = () => {
        const link = document.createElement('a');
        link.href = selectedTechnician.qrCode;
        link.download = `${selectedTechnician.employeeId}_QR.png`;
        link.click();
    };

    const handlePrintQR = () => {
        const printWindow = window.open('', '', 'width=600,height=600');
        printWindow.document.write(`
      <html>
        <head>
          <title>Print QR Code - ${selectedTechnician.name}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 20px;
            }
            .card {
              border: 2px solid #333;
              padding: 20px;
              max-width: 400px;
              margin: 0 auto;
            }
            h2 { margin: 10px 0; }
            img { margin: 20px 0; }
            .info { font-size: 14px; margin: 5px 0; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Employee ID Card</h2>
            <img src="${selectedTechnician.qrCode}" alt="QR Code" width="200" />
            <div class="info"><strong>Name:</strong> ${selectedTechnician.name}</div>
            <div class="info"><strong>ID:</strong> ${selectedTechnician.employeeId}</div>
            <div class="info"><strong>Email:</strong> ${selectedTechnician.email}</div>
            ${selectedTechnician.specialization ? `<div class="info"><strong>Specialization:</strong> ${selectedTechnician.specialization}</div>` : ''}
          </div>
        </body>
      </html>
    `);
        printWindow.document.close();
        printWindow.print();
    };

    return (
        <Container fluid className="py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>Technicians Management</h2>
                <Button variant="primary" onClick={() => handleShowModal()}>
                    <FaPlus className="me-2" />
                    Add Technician
                </Button>
            </div>

            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
            {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

            <Card className="shadow-sm border-0">
                <Card.Body className="p-0">
                    <div className="table-responsive">
                        <Table hover className="mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>Employee ID</th>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th>Specialization</th>
                                    <th>Status</th>
                                    <th>Last Check-in</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {technicians.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="text-center py-4 text-muted">
                                            No technicians found. Add your first technician!
                                        </td>
                                    </tr>
                                ) : (
                                    technicians.map((technician) => (
                                        <tr key={technician._id}>
                                            <td>
                                                <strong>{technician.employeeId}</strong>
                                            </td>
                                            <td>{technician.name}</td>
                                            <td>{technician.email}</td>
                                            <td>{technician.phone}</td>
                                            <td>
                                                {technician.specialization ? (
                                                    <span className="text-muted">{technician.specialization}</span>
                                                ) : (
                                                    <span className="text-muted fst-italic">Not specified</span>
                                                )}
                                            </td>
                                            <td>
                                                <div className="d-flex gap-2">
                                                    {technician.isActive ? (
                                                        <Badge bg="success">Active</Badge>
                                                    ) : (
                                                        <Badge bg="secondary">Inactive</Badge>
                                                    )}
                                                    {technician.isPresent && (
                                                        <Badge bg="info">Present</Badge>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                {technician.lastCheckIn ? (
                                                    <small>{moment(technician.lastCheckIn).format('MMM DD, HH:mm')}</small>
                                                ) : (
                                                    <span className="text-muted">-</span>
                                                )}
                                            </td>
                                            <td>
                                                <div className="d-flex gap-2">
                                                    <Button
                                                        variant="outline-primary"
                                                        size="sm"
                                                        onClick={() => handleShowQR(technician)}
                                                        title="View QR Code"
                                                    >
                                                        <FaQrcode />
                                                    </Button>
                                                    <Button
                                                        variant="outline-secondary"
                                                        size="sm"
                                                        onClick={() => handleShowModal(technician)}
                                                        title="Edit"
                                                    >
                                                        <FaEdit />
                                                    </Button>
                                                    <Button
                                                        variant={technician.isActive ? "outline-warning" : "outline-success"}
                                                        size="sm"
                                                        onClick={() => handleToggleActive(technician)}
                                                        title={technician.isActive ? "Deactivate" : "Activate"}
                                                    >
                                                        {technician.isActive ? <FaTimesCircle /> : <FaCheckCircle />}
                                                    </Button>
                                                    <Button
                                                        variant="outline-danger"
                                                        size="sm"
                                                        onClick={() => handleDelete(technician._id)}
                                                        title="Delete"
                                                    >
                                                        <FaTrash />
                                                    </Button>
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

            {/* Add/Edit Technician Modal */}
            <Modal show={showModal} onHide={handleCloseModal} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>
                        {selectedTechnician ? 'Edit Technician' : 'Add New Technician'}
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSubmit}>
                    <Modal.Body>
                        {error && <Alert variant="danger">{error}</Alert>}
                        {success && <Alert variant="success">{success}</Alert>}

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Employee ID *</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="employeeId"
                                        value={formData.employeeId}
                                        onChange={handleChange}
                                        required
                                        disabled={selectedTechnician !== null}
                                        placeholder="e.g., TECH001"
                                    />
                                    {selectedTechnician && (
                                        <Form.Text className="text-muted">
                                            Employee ID cannot be changed
                                        </Form.Text>
                                    )}
                                </Form.Group>
                            </Col>

                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Full Name *</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                        placeholder="Enter full name"
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Email *</Form.Label>
                                    <Form.Control
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        placeholder="email@example.com"
                                    />
                                </Form.Group>
                            </Col>

                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Phone Number *</Form.Label>
                                    <Form.Control
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        required
                                        placeholder="Enter phone number"
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Form.Group className="mb-3">
                            <Form.Label>Specialization</Form.Label>
                            <Form.Control
                                type="text"
                                name="specialization"
                                value={formData.specialization}
                                onChange={handleChange}
                                placeholder="e.g., Engine & Transmission, Electrical Systems, Body Work"
                            />
                            <Form.Text className="text-muted">
                                Optional: Specify the technician's area of expertise
                            </Form.Text>
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseModal}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit" disabled={loading}>
                            {loading ? 'Saving...' : (selectedTechnician ? 'Update' : 'Create')}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* QR Code Modal */}
            <Modal show={showQRModal} onHide={() => setShowQRModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>QR Code - {selectedTechnician?.name}</Modal.Title>
                </Modal.Header>
                <Modal.Body className="text-center">
                    {selectedTechnician && (
                        <>
                            <img
                                src={selectedTechnician.qrCode}
                                alt="QR Code"
                                className="img-fluid mb-3"
                                style={{ maxWidth: '300px' }}
                            />
                            <div className="mb-3">
                                <p className="mb-1"><strong>Employee ID:</strong> {selectedTechnician.employeeId}</p>
                                <p className="mb-1"><strong>Name:</strong> {selectedTechnician.name}</p>
                                <p className="mb-0"><strong>Email:</strong> {selectedTechnician.email}</p>
                            </div>
                            <Alert variant="info">
                                <small>
                                    Scan this QR code to check in/check out.
                                    You can download or print this QR code for the employee ID card.
                                </small>
                            </Alert>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="outline-secondary" onClick={handleDownloadQR}>
                        Download QR Code
                    </Button>
                    <Button variant="primary" onClick={handlePrintQR}>
                        Print ID Card
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default Technicians;
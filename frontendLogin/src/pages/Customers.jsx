import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Form, Button, Modal, Row, Col, Badge } from 'react-bootstrap';
import { customerAPI } from '../utils/api';
import { FaUser, FaSearch, FaEdit, FaTrash, FaCar, FaPhone, FaCalendarAlt } from 'react-icons/fa';
import toast from 'react-hot-toast';
import moment from 'moment';

const Customers = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        idNumber: '',
        vehicleNumber: '',
        vehicleModel: '',
        vehicleYear: ''
    });

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            const response = await customerAPI.getAll();
            setCustomers(response.data);
        } catch (error) {
            console.error('Error fetching customers:', error);
            toast.error('Failed to load customers');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (customer) => {
        setSelectedCustomer(customer);
        setFormData({
            name: customer.name || '',
            phone: customer.phone || '',
            email: customer.email || '',
            idNumber: customer.idNumber || '',
            vehicleNumber: customer.vehicleNumber || '',
            vehicleModel: customer.vehicleModel || '',
            vehicleYear: customer.vehicleYear || ''
        });
        setShowEditModal(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this customer? All associated history will remain but the customer record will be removed.')) {
            try {
                await customerAPI.delete(id);
                toast.success('Customer deleted successfully');
                fetchCustomers();
            } catch (error) {
                console.error('Error deleting customer:', error);
                toast.error('Failed to delete customer');
            }
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await customerAPI.update(selectedCustomer._id, formData);
            toast.success('Customer updated successfully');
            setShowEditModal(false);
            fetchCustomers();
        } catch (error) {
            console.error('Error updating customer:', error);
            const msg = error.response?.data?.message || 'Update failed';
            toast.error(msg);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm) ||
        c.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.idNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Container fluid className="py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="fw-bold text-dark mb-1">Customer Management</h2>
                    <p className="text-muted small mb-0">View and manage all registered customers and their vehicles</p>
                </div>
                <Badge bg="primary" className="px-3 py-2 rounded-pill">
                    Total: {customers.length}
                </Badge>
            </div>

            <Card className="shadow-sm border-0 mb-4">
                <Card.Body className="p-3">
                    <Row className="align-items-center">
                        <Col md={6}>
                            <div className="input-group">
                                <span className="input-group-text bg-white border-end-0">
                                    <FaSearch className="text-muted" />
                                </span>
                                <Form.Control
                                    type="text"
                                    placeholder="Search by name, phone, vehicle or ID..."
                                    className="border-start-0 ps-0"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            <Card className="shadow-sm border-0 overflow-hidden">
                <Card.Body className="p-0">
                    <div className="table-responsive">
                        <Table hover className="mb-0 align-middle">
                            <thead className="bg-light text-muted small text-uppercase fw-bold">
                                <tr>
                                    <th className="ps-4 py-3">Customer Info</th>
                                    <th className="py-3">Vehicle Details</th>
                                    <th className="py-3">Contact</th>
                                    <th className="py-3">Registered</th>
                                    <th className="pe-4 py-3 text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="text-center py-5">
                                            <div className="spinner-border text-primary" role="status">
                                                <span className="visually-hidden">Loading...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredCustomers.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="text-center py-5 text-muted fst-italic">
                                            {searchTerm ? 'No matching customers found' : 'No customers registered yet'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredCustomers.map(customer => (
                                        <tr key={customer._id}>
                                            <td className="ps-4 py-3">
                                                <div className="d-flex align-items-center gap-3">
                                                    <div className="bg-primary bg-opacity-10 p-2 rounded-circle">
                                                        <FaUser className="text-primary" />
                                                    </div>
                                                    <div>
                                                        <div className="fw-bold text-dark">{customer.name}</div>
                                                        <div className="text-muted x-small">ID: {customer.idNumber}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3">
                                                <div className="d-flex align-items-center gap-2 mb-1">
                                                    <Badge bg="dark" className="px-2 py-1">
                                                        {customer.vehicleNumber}
                                                    </Badge>
                                                    <span className="small text-dark fw-medium">
                                                        {customer.vehicleModel || 'Model N/A'}
                                                    </span>
                                                </div>
                                                <div className="text-muted x-small">
                                                    Year: {customer.vehicleYear || 'N/A'}
                                                </div>
                                            </td>
                                            <td className="py-3">
                                                <div className="small text-dark d-flex align-items-center gap-2">
                                                    <FaPhone size={12} className="text-muted" /> {customer.phone}
                                                </div>
                                                {customer.email && (
                                                    <div className="text-muted x-small mt-1">{customer.email}</div>
                                                )}
                                            </td>
                                            <td className="py-3 text-muted small">
                                                {moment(customer.createdAt).format('MMM DD, YYYY')}
                                            </td>
                                            <td className="pe-4 py-3 text-end">
                                                <div className="d-flex justify-content-end gap-2">
                                                    <Button
                                                        variant="light"
                                                        size="sm"
                                                        title="Edit Customer"
                                                        onClick={() => handleEdit(customer)}
                                                        className="text-primary hover-bg-primary hover-text-white transition-base"
                                                    >
                                                        <FaEdit size={14} />
                                                    </Button>
                                                    <Button
                                                        variant="light"
                                                        size="sm"
                                                        title="Delete Customer"
                                                        onClick={() => handleDelete(customer._id)}
                                                        className="text-danger hover-bg-danger hover-text-white transition-base"
                                                    >
                                                        <FaTrash size={14} />
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

            {/* Edit Modal */}
            <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered size="lg">
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="fw-bold">Update Customer Details</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleUpdate}>
                    <Modal.Body className="pt-4">
                        <Row className="g-3">
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold">Customer Name</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold">ID Number</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="idNumber"
                                        value={formData.idNumber}
                                        onChange={handleChange}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold">Phone Number</Form.Label>
                                    <Form.Control
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold">Email Address</Form.Label>
                                    <Form.Control
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold">Vehicle Number</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="vehicleNumber"
                                        value={formData.vehicleNumber}
                                        onChange={handleChange}
                                        required
                                        className="text-uppercase"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold">Vehicle Model</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="vehicleModel"
                                        value={formData.vehicleModel}
                                        onChange={handleChange}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold">Vehicle Year</Form.Label>
                                    <Form.Control
                                        type="number"
                                        name="vehicleYear"
                                        value={formData.vehicleYear}
                                        onChange={handleChange}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                    </Modal.Body>
                    <Modal.Footer className="border-0 pt-3">
                        <Button variant="light" className="px-4" onClick={() => setShowEditModal(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit" className="px-4">
                            Save Changes
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default Customers;

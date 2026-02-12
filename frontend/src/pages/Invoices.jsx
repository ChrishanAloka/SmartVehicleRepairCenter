import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Modal, Form, Alert, Badge } from 'react-bootstrap';
import { invoiceAPI, bookingAPI } from '../utils/api';
import { FaPlus, FaEye, FaTrash, FaFileInvoice, FaPrint } from 'react-icons/fa';
import moment from 'moment';

const Invoices = () => {
    const [invoices, setInvoices] = useState([]);
    const [acceptedBookings, setAcceptedBookings] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [formData, setFormData] = useState({
        type: 'service',
        bookingId: '',
        customerId: '',
        customerName: '',
        customerPhone: '',
        items: [{ description: '', quantity: 1, unitPrice: 0, total: 0 }],
        tax: 0,
        discount: 0,
        paymentMethod: 'cash',
        notes: ''
    });

    useEffect(() => {
        fetchInvoices();
        fetchAcceptedBookings();
    }, []);

    const fetchInvoices = async () => {
        try {
            const response = await invoiceAPI.getAll();
            setInvoices(response.data);
        } catch (error) {
            console.error('Error fetching invoices:', error);
        }
    };

    const fetchAcceptedBookings = async () => {
        try {
            const response = await bookingAPI.getAll({ status: 'accepted' });
            // Filter only non-paid bookings
            const unpaid = response.data.filter(b => !b.isPaidOut);
            setAcceptedBookings(unpaid);
        } catch (error) {
            console.error('Error fetching bookings:', error);
        }
    };

    const handleShowModal = () => {
        setFormData({
            type: 'service',
            bookingId: '',
            customerId: '',
            customerName: '',
            customerPhone: '',
            items: [{ description: '', quantity: 1, unitPrice: 0, total: 0 }],
            tax: 0,
            discount: 0,
            paymentMethod: 'cash',
            notes: ''
        });
        setError('');
        setSuccess('');
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
    };

    const handleBookingSelect = (e) => {
        const bookingId = e.target.value;
        if (bookingId) {
            const booking = acceptedBookings.find(b => b._id === bookingId);
            if (booking) {
                setFormData({
                    ...formData,
                    bookingId: booking._id,
                    customerId: booking.customer._id,
                    customerName: booking.customer.name,
                    customerPhone: booking.customer.phone
                });
            }
        } else {
            setFormData({
                ...formData,
                bookingId: '',
                customerId: '',
                customerName: '',
                customerPhone: ''
            });
        }
    };

    const handleAddItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { description: '', quantity: 1, unitPrice: 0, total: 0 }]
        });
    };

    const handleRemoveItem = (index) => {
        const items = formData.items.filter((_, i) => i !== index);
        setFormData({ ...formData, items });
    };

    const handleItemChange = (index, field, value) => {
        const items = [...formData.items];
        items[index][field] = value;

        // Calculate total for this item
        if (field === 'quantity' || field === 'unitPrice') {
            items[index].total = items[index].quantity * items[index].unitPrice;
        }

        setFormData({ ...formData, items });
    };

    const calculateSubtotal = () => {
        return formData.items.reduce((sum, item) => sum + (item.total || 0), 0);
    };

    const calculateTotal = () => {
        const subtotal = calculateSubtotal();
        return subtotal + (formData.tax || 0) - (formData.discount || 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const invoiceData = {
                ...formData,
                subtotal: calculateSubtotal(),
                total: calculateTotal()
            };

            await invoiceAPI.create(invoiceData);
            setSuccess('Invoice created successfully!');
            await fetchInvoices();
            await fetchAcceptedBookings();

            setTimeout(() => {
                handleCloseModal();
            }, 1500);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create invoice');
        } finally {
            setLoading(false);
        }
    };

    const handleViewInvoice = (invoice) => {
        setSelectedInvoice(invoice);
        setShowViewModal(true);
    };

    const handlePrintInvoice = () => {
        const printWindow = window.open('', '', 'width=800,height=600');
        printWindow.document.write(`
      <html>
        <head>
          <title>Invoice ${selectedInvoice.invoiceNumber}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
            }
            .info-section {
              margin-bottom: 20px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 10px;
              text-align: left;
            }
            th {
              background-color: #f8f9fa;
            }
            .totals {
              text-align: right;
              margin-top: 20px;
            }
            .totals table {
              margin-left: auto;
              width: 300px;
            }
            .total-row {
              font-weight: bold;
              font-size: 1.2em;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>INVOICE</h1>
            <h3>${selectedInvoice.invoiceNumber}</h3>
            <p>Date: ${moment(selectedInvoice.createdAt).format('MMMM DD, YYYY')}</p>
          </div>
          
          <div class="info-section">
            <h3>Customer Information</h3>
            <p><strong>Name:</strong> ${selectedInvoice.customerName}</p>
            <p><strong>Phone:</strong> ${selectedInvoice.customerPhone}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${selectedInvoice.items.map(item => `
                <tr>
                  <td>${item.description}</td>
                  <td>${item.quantity}</td>
                  <td>$${item.unitPrice.toFixed(2)}</td>
                  <td>$${item.total.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <table>
              <tr>
                <td>Subtotal:</td>
                <td>$${selectedInvoice.subtotal.toFixed(2)}</td>
              </tr>
              ${selectedInvoice.tax > 0 ? `
              <tr>
                <td>Tax:</td>
                <td>$${selectedInvoice.tax.toFixed(2)}</td>
              </tr>
              ` : ''}
              ${selectedInvoice.discount > 0 ? `
              <tr>
                <td>Discount:</td>
                <td>-$${selectedInvoice.discount.toFixed(2)}</td>
              </tr>
              ` : ''}
              <tr class="total-row">
                <td>Total:</td>
                <td>$${selectedInvoice.total.toFixed(2)}</td>
              </tr>
              <tr>
                <td>Payment Method:</td>
                <td>${selectedInvoice.paymentMethod.toUpperCase()}</td>
              </tr>
            </table>
          </div>

          ${selectedInvoice.notes ? `
          <div class="info-section">
            <h3>Notes</h3>
            <p>${selectedInvoice.notes}</p>
          </div>
          ` : ''}

          <div style="margin-top: 50px; text-align: center; color: #666;">
            <p>Thank you for your business!</p>
          </div>
        </body>
      </html>
    `);
        printWindow.document.close();
        printWindow.print();
    };

    const handleDeleteInvoice = async (id) => {
        if (window.confirm('Are you sure you want to delete this invoice?')) {
            try {
                await invoiceAPI.delete(id);
                setSuccess('Invoice deleted successfully!');
                await fetchInvoices();
                setTimeout(() => setSuccess(''), 3000);
            } catch (err) {
                setError(err.response?.data?.message || 'Delete failed');
                setTimeout(() => setError(''), 3000);
            }
        }
    };

    const getTypeBadge = (type) => {
        const typeMap = {
            service: { bg: 'primary', text: 'Service' },
            spare_parts: { bg: 'success', text: 'Spare Parts' },
            both: { bg: 'info', text: 'Both' }
        };
        const config = typeMap[type] || { bg: 'secondary', text: type };
        return <Badge bg={config.bg}>{config.text}</Badge>;
    };

    return (
        <Container fluid className="py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>Invoices</h2>
                <Button variant="primary" onClick={handleShowModal}>
                    <FaPlus className="me-2" />
                    Create Invoice
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
                                    <th>Invoice #</th>
                                    <th>Date</th>
                                    <th>Customer</th>
                                    <th>Type</th>
                                    <th>Amount</th>
                                    <th>Payment Method</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="text-center py-4 text-muted">
                                            No invoices found. Create your first invoice!
                                        </td>
                                    </tr>
                                ) : (
                                    invoices.map((invoice) => (
                                        <tr key={invoice._id}>
                                            <td>
                                                <strong>{invoice.invoiceNumber}</strong>
                                            </td>
                                            <td>{moment(invoice.createdAt).format('MMM DD, YYYY')}</td>
                                            <td>
                                                <div>
                                                    <strong>{invoice.customerName}</strong>
                                                    <br />
                                                    <small className="text-muted">{invoice.customerPhone}</small>
                                                </div>
                                            </td>
                                            <td>{getTypeBadge(invoice.type)}</td>
                                            <td>
                                                <strong>${invoice.total.toFixed(2)}</strong>
                                            </td>
                                            <td>
                                                <Badge bg="secondary">{invoice.paymentMethod.toUpperCase()}</Badge>
                                            </td>
                                            <td>
                                                <div className="d-flex gap-2">
                                                    <Button
                                                        variant="outline-primary"
                                                        size="sm"
                                                        onClick={() => handleViewInvoice(invoice)}
                                                        title="View Details"
                                                    >
                                                        <FaEye />
                                                    </Button>
                                                    <Button
                                                        variant="outline-danger"
                                                        size="sm"
                                                        onClick={() => handleDeleteInvoice(invoice._id)}
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

            {/* Create Invoice Modal */}
            <Modal show={showModal} onHide={handleCloseModal} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>
                        <FaFileInvoice className="me-2" />
                        Create New Invoice
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSubmit}>
                    <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                        {error && <Alert variant="danger">{error}</Alert>}
                        {success && <Alert variant="success">{success}</Alert>}

                        <Form.Group className="mb-3">
                            <Form.Label>Invoice Type *</Form.Label>
                            <Form.Select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                required
                            >
                                <option value="service">Service</option>
                                <option value="spare_parts">Spare Parts Only</option>
                                <option value="both">Service & Spare Parts</option>
                            </Form.Select>
                        </Form.Group>

                        {formData.type !== 'spare_parts' && acceptedBookings.length > 0 && (
                            <Form.Group className="mb-3">
                                <Form.Label>Link to Booking (Optional)</Form.Label>
                                <Form.Select
                                    value={formData.bookingId}
                                    onChange={handleBookingSelect}
                                >
                                    <option value="">-- Select a booking --</option>
                                    {acceptedBookings.map(booking => (
                                        <option key={booking._id} value={booking._id}>
                                            {booking.customer.name} - {booking.customer.vehicleNumber} ({moment(booking.bookingDate).format('MMM DD')})
                                        </option>
                                    ))}
                                </Form.Select>
                                <Form.Text className="text-muted">
                                    This will automatically mark the booking as completed
                                </Form.Text>
                            </Form.Group>
                        )}

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Customer Name *</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={formData.customerName}
                                        onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                                        required
                                        placeholder="Enter customer name"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Customer Phone *</Form.Label>
                                    <Form.Control
                                        type="tel"
                                        value={formData.customerPhone}
                                        onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                                        required
                                        placeholder="Enter phone number"
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <hr />

                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h6 className="mb-0">Invoice Items</h6>
                            <Button variant="outline-primary" size="sm" onClick={handleAddItem}>
                                <FaPlus className="me-1" /> Add Item
                            </Button>
                        </div>

                        {formData.items.map((item, index) => (
                            <Card key={index} className="mb-3">
                                <Card.Body>
                                    <Row>
                                        <Col md={5}>
                                            <Form.Group className="mb-2">
                                                <Form.Label>Description</Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    value={item.description}
                                                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                                    required
                                                    placeholder="e.g., Oil Change, Air Filter"
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={2}>
                                            <Form.Group className="mb-2">
                                                <Form.Label>Qty</Form.Label>
                                                <Form.Control
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
                                                    required
                                                    min="1"
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={2}>
                                            <Form.Group className="mb-2">
                                                <Form.Label>Unit Price</Form.Label>
                                                <Form.Control
                                                    type="number"
                                                    step="0.01"
                                                    value={item.unitPrice}
                                                    onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value))}
                                                    required
                                                    min="0"
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={2}>
                                            <Form.Group className="mb-2">
                                                <Form.Label>Total</Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    value={`$${item.total.toFixed(2)}`}
                                                    disabled
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={1} className="d-flex align-items-end">
                                            {formData.items.length > 1 && (
                                                <Button
                                                    variant="outline-danger"
                                                    size="sm"
                                                    onClick={() => handleRemoveItem(index)}
                                                    className="mb-2"
                                                >
                                                    <FaTrash />
                                                </Button>
                                            )}
                                        </Col>
                                    </Row>
                                </Card.Body>
                            </Card>
                        ))}

                        <hr />

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Tax Amount</Form.Label>
                                    <Form.Control
                                        type="number"
                                        step="0.01"
                                        value={formData.tax}
                                        onChange={(e) => setFormData({ ...formData, tax: parseFloat(e.target.value) || 0 })}
                                        min="0"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Discount Amount</Form.Label>
                                    <Form.Control
                                        type="number"
                                        step="0.01"
                                        value={formData.discount}
                                        onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                                        min="0"
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Payment Method *</Form.Label>
                                    <Form.Select
                                        value={formData.paymentMethod}
                                        onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                                        required
                                    >
                                        <option value="cash">Cash</option>
                                        <option value="card">Card</option>
                                        <option value="bank_transfer">Bank Transfer</option>
                                        <option value="other">Other</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <div className="mb-3">
                                    <Form.Label>Invoice Summary</Form.Label>
                                    <div className="bg-light p-3 rounded">
                                        <div className="d-flex justify-content-between mb-1">
                                            <span>Subtotal:</span>
                                            <strong>${calculateSubtotal().toFixed(2)}</strong>
                                        </div>
                                        <div className="d-flex justify-content-between mb-1">
                                            <span>Tax:</span>
                                            <strong>${(formData.tax || 0).toFixed(2)}</strong>
                                        </div>
                                        <div className="d-flex justify-content-between mb-2">
                                            <span>Discount:</span>
                                            <strong>-${(formData.discount || 0).toFixed(2)}</strong>
                                        </div>
                                        <hr className="my-2" />
                                        <div className="d-flex justify-content-between">
                                            <span className="h6 mb-0">Total:</span>
                                            <strong className="h5 mb-0 text-primary">${calculateTotal().toFixed(2)}</strong>
                                        </div>
                                    </div>
                                </div>
                            </Col>
                        </Row>

                        <Form.Group className="mb-3">
                            <Form.Label>Notes</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={2}
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Additional notes (optional)"
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseModal}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Invoice'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* View Invoice Modal */}
            <Modal show={showViewModal} onHide={() => setShowViewModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Invoice Details</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedInvoice && (
                        <div>
                            <div className="text-center mb-4">
                                <h3>{selectedInvoice.invoiceNumber}</h3>
                                <p className="text-muted">
                                    {moment(selectedInvoice.createdAt).format('MMMM DD, YYYY - HH:mm')}
                                </p>
                            </div>

                            <Row className="mb-4">
                                <Col md={6}>
                                    <h6>Customer Information</h6>
                                    <p className="mb-1"><strong>Name:</strong> {selectedInvoice.customerName}</p>
                                    <p className="mb-1"><strong>Phone:</strong> {selectedInvoice.customerPhone}</p>
                                </Col>
                                <Col md={6}>
                                    <h6>Invoice Information</h6>
                                    <p className="mb-1"><strong>Type:</strong> {getTypeBadge(selectedInvoice.type)}</p>
                                    <p className="mb-1"><strong>Payment:</strong> <Badge bg="secondary">{selectedInvoice.paymentMethod.toUpperCase()}</Badge></p>
                                </Col>
                            </Row>

                            <h6>Items</h6>
                            <Table bordered size="sm" className="mb-4">
                                <thead className="table-light">
                                    <tr>
                                        <th>Description</th>
                                        <th>Qty</th>
                                        <th>Unit Price</th>
                                        <th>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedInvoice.items.map((item, index) => (
                                        <tr key={index}>
                                            <td>{item.description}</td>
                                            <td>{item.quantity}</td>
                                            <td>${item.unitPrice.toFixed(2)}</td>
                                            <td>${item.total.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>

                            <Row>
                                <Col md={{ span: 6, offset: 6 }}>
                                    <Table size="sm">
                                        <tbody>
                                            <tr>
                                                <td>Subtotal:</td>
                                                <td className="text-end">${selectedInvoice.subtotal.toFixed(2)}</td>
                                            </tr>
                                            {selectedInvoice.tax > 0 && (
                                                <tr>
                                                    <td>Tax:</td>
                                                    <td className="text-end">${selectedInvoice.tax.toFixed(2)}</td>
                                                </tr>
                                            )}
                                            {selectedInvoice.discount > 0 && (
                                                <tr>
                                                    <td>Discount:</td>
                                                    <td className="text-end">-${selectedInvoice.discount.toFixed(2)}</td>
                                                </tr>
                                            )}
                                            <tr className="fw-bold">
                                                <td>Total:</td>
                                                <td className="text-end h5 mb-0">${selectedInvoice.total.toFixed(2)}</td>
                                            </tr>
                                        </tbody>
                                    </Table>
                                </Col>
                            </Row>

                            {selectedInvoice.notes && (
                                <div className="mt-3">
                                    <h6>Notes</h6>
                                    <p className="text-muted">{selectedInvoice.notes}</p>
                                </div>
                            )}
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="outline-primary" onClick={handlePrintInvoice}>
                        <FaPrint className="me-2" />
                        Print Invoice
                    </Button>
                    <Button variant="secondary" onClick={() => setShowViewModal(false)}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default Invoices;
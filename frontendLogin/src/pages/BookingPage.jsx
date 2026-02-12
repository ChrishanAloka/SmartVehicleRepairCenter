import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { bookingAPI, settingsAPI } from '../utils/api';
import { FaClock } from 'react-icons/fa';
import moment from 'moment';

const BookingPage = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        idNumber: '',
        vehicleNumber: '',
        vehicleModel: '',
        vehicleYear: '',
        bookingDate: moment().format('YYYY-MM-DD'),
        problemDescription: ''
    });
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [shopCurrentlyClosed, setShopCurrentlyClosed] = useState(false);
    const [viewMode, setViewMode] = useState('status');

    useEffect(() => {
        const checkInitialStatus = async () => {
            try {
                const response = await settingsAPI.get();
                const shopSettings = response.data;
                setSettings(shopSettings);

                const isOpenResponse = await settingsAPI.isOpen(moment().format('YYYY-MM-DD'));
                const holidayClosed = !isOpenResponse.data.isOpen;

                const [openH, openM] = shopSettings.openingTime.split(':');
                const [closeH, closeM] = shopSettings.closingTime.split(':');
                const openTime = moment().hours(openH).minutes(openM).seconds(0);
                const closeTime = moment().hours(closeH).minutes(closeM).seconds(0);
                const afterHours = !moment().isBetween(openTime, closeTime, null, '[]');

                const isClosed = holidayClosed || afterHours;
                setShopCurrentlyClosed(isClosed);
                // We keep viewMode at 'status' to let users choose between Live Queue and Future Date
            } catch (err) {
                console.error('Error checking status:', err);
            }
        };
        checkInitialStatus();
    }, []);

    const isWithinWorkingHours = () => {
        if (!settings) return true;

        const now = moment();
        const [openH, openM] = settings.openingTime.split(':');
        const [closeH, closeM] = settings.closingTime.split(':');

        const openTime = moment().hours(openH).minutes(openM).seconds(0);
        const closeTime = moment().hours(closeH).minutes(closeM).seconds(0);

        return now.isBetween(openTime, closeTime, null, '[]');
    };

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === 'bookingDate') {
            setError('');
            const selectedDate = moment(value).format('YYYY-MM-DD');

            // Check if selected date is a holiday
            const holiday = settings?.holidays?.find(h =>
                moment(h.date).format('YYYY-MM-DD') === selectedDate
            );

            if (holiday) {
                setError(`The shop is closed on ${moment(selectedDate).format('MMMM Do')} for ${holiday.reason || 'a holiday'}. Please choose another date.`);
                // Reset to tomorrow if today or previous date was picked
                setFormData({ ...formData, [name]: moment().add(1, 'days').format('YYYY-MM-DD') });
                return;
            }
        }

        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            // 1. Holiday validation
            const isOpenResponse = await settingsAPI.isOpen(formData.bookingDate);
            if (!isOpenResponse.data.isOpen) {
                setError('The shop is closed on the selected date (Holiday/Day-off). Please choose another date.');
                setLoading(false);
                return;
            }

            // 2. Working hours validation for same-day bookings
            const isToday = moment(formData.bookingDate).isSame(moment(), 'day');
            if (isToday && !isWithinWorkingHours()) {
                setError(`Same-day bookings are only accepted during working hours (${settings.openingTime} - ${settings.closingTime}). Please book for tomorrow or visit us when we open.`);
                setLoading(false);
                return;
            }

            await bookingAPI.create(formData);
            setSuccess('Booking created successfully! We will see you soon.');

            setFormData({
                name: '',
                phone: '',
                email: '',
                idNumber: '',
                vehicleNumber: '',
                vehicleModel: '',
                vehicleYear: '',
                bookingDate: moment().format('YYYY-MM-DD'),
                problemDescription: ''
            });

            setTimeout(() => navigate('/'), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create booking');
        } finally {
            setLoading(false);
        }
    };

    if (viewMode === 'status') {
        return (
            <Container className="py-5">
                <Row className="justify-content-center">
                    <Col md={10} lg={8}>
                        <Card className="shadow-lg border-0 text-center py-5 px-4">
                            <Card.Body>
                                <div className="display-1 text-primary mb-4">
                                    <FaClock />
                                </div>
                                <h1 className="fw-bold text-dark mb-2">Service Center Booking</h1>

                                {shopCurrentlyClosed ? (
                                    <Alert variant="warning" className="border-0 shadow-sm mb-4">
                                        {moment().isAfter(moment(settings?.closingTime, 'HH:mm'))
                                            ? "We've finished for the day! Same-day bookings are now closed."
                                            : "We are currently closed for a holiday or scheduled maintenance."}
                                    </Alert>
                                ) : (
                                    <Alert variant="success" className="border-0 shadow-sm mb-4">
                                        We are currently <strong>OPEN</strong> and accepting vehicles!
                                    </Alert>
                                )}

                                <p className="text-muted mb-5">
                                    Standard working hours: <strong className="text-dark">{settings?.openingTime} - {settings?.closingTime}</strong>
                                </p>

                                <Row className="g-4 justify-content-center">
                                    {!shopCurrentlyClosed && (
                                        <Col md={6}>
                                            <div
                                                className="p-4 rounded-4 border border-2 border-primary bg-primary bg-opacity-10 h-100 d-flex flex-column align-items-center cursor-pointer hover-lift"
                                                onClick={() => {
                                                    setFormData({ ...formData, bookingDate: moment().format('YYYY-MM-DD') });
                                                    setViewMode('form');
                                                }}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <div className="fs-1 mb-3 text-primary">🚗</div>
                                                <h4 className="fw-bold mb-2">Join Live Queue</h4>
                                                <p className="small text-muted mb-3">Bring your vehicle in right now for today's service.</p>
                                                <Button variant="primary" className="mt-auto px-4 rounded-pill">SELECT TODAY</Button>
                                            </div>
                                        </Col>
                                    )}
                                    <Col md={6}>
                                        <div
                                            className={`p-4 rounded-4 border border-2 ${shopCurrentlyClosed ? 'border-primary bg-primary bg-opacity-10' : 'border-light bg-light'} h-100 d-flex flex-column align-items-center hover-lift`}
                                            onClick={() => {
                                                setFormData({ ...formData, bookingDate: moment().add(1, 'days').format('YYYY-MM-DD') });
                                                setViewMode('form');
                                            }}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <div className="fs-1 mb-3 text-primary">📅</div>
                                            <h4 className="fw-bold mb-2">Schedule Future</h4>
                                            <p className="small text-muted mb-3">Plan ahead and reserve a slot for another day.</p>
                                            <Button variant={shopCurrentlyClosed ? "primary" : "outline-primary"} className="mt-auto px-4 rounded-pill">BOOK LATER</Button>
                                        </div>
                                    </Col>
                                </Row>

                                <div className="mt-5">
                                    <Button
                                        variant="link"
                                        className="text-muted text-decoration-none"
                                        onClick={() => navigate('/')}
                                    >
                                        Back to Home
                                    </Button>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>

                <style>{`
                    .hover-lift { transition: all 0.2s ease; }
                    .hover-lift:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.1); }
                `}</style>
            </Container>
        );
    }

    return (
        <Container className="py-5">
            <Row className="justify-content-center">
                <Col lg={8}>
                    <Card className="shadow-lg border-0">
                        <Card.Header className="bg-primary text-white">
                            <h3 className="mb-0">Book a Service Appointment</h3>
                        </Card.Header>
                        <Card.Body className="p-4">
                            {error && <Alert variant="danger">{error}</Alert>}
                            {success && <Alert variant="success">{success}</Alert>}

                            <Form onSubmit={handleSubmit}>
                                <Row>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Full Name *</Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleChange}
                                                required
                                                placeholder="Enter your full name"
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

                                <Row>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Email</Form.Label>
                                            <Form.Control
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                placeholder="Enter email address (optional)"
                                            />
                                        </Form.Group>
                                    </Col>

                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>ID Number *</Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="idNumber"
                                                value={formData.idNumber}
                                                onChange={handleChange}
                                                required
                                                placeholder="Enter your ID number"
                                            />
                                            <Form.Text className="text-muted">
                                                Used to retrieve your booking history
                                            </Form.Text>
                                        </Form.Group>
                                    </Col>
                                </Row>

                                <Row>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Vehicle Number *</Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="vehicleNumber"
                                                value={formData.vehicleNumber}
                                                onChange={handleChange}
                                                required
                                                placeholder="e.g., ABC-1234"
                                                style={{ textTransform: 'uppercase' }}
                                            />
                                            <Form.Text className="text-muted">
                                                Your details will be saved for future bookings
                                            </Form.Text>
                                        </Form.Group>
                                    </Col>

                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Vehicle Model</Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="vehicleModel"
                                                value={formData.vehicleModel}
                                                onChange={handleChange}
                                                placeholder="e.g., Toyota Corolla"
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>

                                <Row>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Vehicle Year</Form.Label>
                                            <Form.Control
                                                type="number"
                                                name="vehicleYear"
                                                value={formData.vehicleYear}
                                                onChange={handleChange}
                                                placeholder="e.g., 2020"
                                                min="1900"
                                                max={new Date().getFullYear() + 1}
                                            />
                                        </Form.Group>
                                    </Col>

                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Preferred Date *</Form.Label>
                                            <Form.Control
                                                type="date"
                                                name="bookingDate"
                                                value={formData.bookingDate}
                                                onChange={handleChange}
                                                required
                                                min={
                                                    // Dynamic min: If they chose 'Book Later' or today is a holiday/after hours, min is tomorrow
                                                    (shopCurrentlyClosed || !moment(formData.bookingDate).isSame(moment(), 'day'))
                                                        ? moment().add(1, 'days').format('YYYY-MM-DD')
                                                        : moment().format('YYYY-MM-DD')
                                                }
                                            />
                                            {settings?.holidays?.length > 0 && (
                                                <div className="mt-2 small text-muted">
                                                    <strong>Upcoming Shop Holidays:</strong>
                                                    <div className="d-flex flex-wrap gap-1 mt-1">
                                                        {settings.holidays
                                                            .filter(h => moment(h.date).isSameOrAfter(moment(), 'day'))
                                                            .sort((a, b) => moment(a.date).diff(moment(b.date)))
                                                            .slice(0, 3)
                                                            .map((h, i) => (
                                                                <Badge key={i} bg="light" text="dark" className="border">
                                                                    {moment(h.date).format('MMM DD')}
                                                                </Badge>
                                                            ))}
                                                    </div>
                                                </div>
                                            )}
                                        </Form.Group>
                                    </Col>
                                </Row>

                                <Form.Group className="mb-4">
                                    <Form.Label>Problem Description *</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={4}
                                        name="problemDescription"
                                        value={formData.problemDescription}
                                        onChange={handleChange}
                                        required
                                        placeholder="Please describe the issue with your vehicle..."
                                    />
                                </Form.Group>

                                {settings && (
                                    <Alert variant="info">
                                        <strong>Shop Hours:</strong> {settings.openingTime} - {settings.closingTime}
                                    </Alert>
                                )}

                                <div className="d-grid gap-2">
                                    <Button
                                        variant="primary"
                                        type="submit"
                                        size="lg"
                                        disabled={loading}
                                    >
                                        {loading ? 'Submitting...' : 'Submit Booking'}
                                    </Button>
                                    <Button
                                        variant="outline-secondary"
                                        onClick={() => navigate('/')}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default BookingPage;
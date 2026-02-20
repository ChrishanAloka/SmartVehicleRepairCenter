import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Table, Alert, Badge } from 'react-bootstrap';
import { settingsAPI } from '../utils/api';
import { useSettings } from '../context/SettingsContext';
import { FaSave, FaPlus, FaTrash, FaClock, FaCalendarAlt, FaMoneyBillWave } from 'react-icons/fa';
import toast from 'react-hot-toast';
import moment from 'moment';

const Settings = () => {
    const { fetchSettings: fetchGlobalSettings, updateGlobalSettings } = useSettings();
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [shopData, setShopData] = useState({
        openingTime: '08:00',
        closingTime: '18:00',
        shopName: '',
        shopAddress: '',
        shopPhone: '',
        shopEmail: '',
        currency: 'LKR'
    });

    const [holidayData, setHolidayData] = useState({
        date: '',
        reason: ''
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await settingsAPI.get();
            setSettings(response.data);
            setShopData({
                openingTime: response.data.openingTime,
                closingTime: response.data.closingTime,
                shopName: response.data.shopName || '',
                shopAddress: response.data.shopAddress || '',
                shopPhone: response.data.shopPhone || '',
                shopEmail: response.data.shopEmail || '',
                currency: response.data.currency || 'LKR'
            });
        } catch (error) {
            console.error('Error fetching settings:', error);
            setError('Failed to load settings');
        }
    };

    const handleShopChange = (e) => {
        setShopData({ ...shopData, [e.target.name]: e.target.value });
    };

    const handleHolidayChange = (e) => {
        setHolidayData({ ...holidayData, [e.target.name]: e.target.value });
    };

    const handleSaveShopSettings = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            await settingsAPI.update(shopData);
            const sMsg = 'Shop settings updated successfully!';
            setSuccess(sMsg);
            toast.success(sMsg);
            updateGlobalSettings(shopData);
            await fetchSettings();
        } catch (err) {
            const eMsg = err.response?.data?.message || 'Failed to update settings';
            setError(eMsg);
            toast.error(eMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleAddHoliday = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!holidayData.date || !holidayData.reason) {
            const msg = 'Please fill in all holiday fields';
            setError(msg);
            toast.error(msg);
            return;
        }

        try {
            await settingsAPI.addHoliday(holidayData);
            const sMsg = 'Holiday added successfully!';
            setSuccess(sMsg);
            toast.success(sMsg);
            setHolidayData({ date: '', reason: '' });
            await fetchSettings();
        } catch (err) {
            const eMsg = err.response?.data?.message || 'Failed to add holiday';
            setError(eMsg);
            toast.error(eMsg);
        }
    };

    const handleRemoveHoliday = async (holidayId) => {
        if (window.confirm('Are you sure you want to remove this holiday?')) {
            try {
                await settingsAPI.removeHoliday(holidayId);
                const sMsg = 'Holiday removed successfully!';
                setSuccess(sMsg);
                toast.success(sMsg);
                await fetchSettings();
            } catch (err) {
                const eMsg = err.response?.data?.message || 'Failed to remove holiday';
                setError(eMsg);
                toast.error(eMsg);
            }
        }
    };

    const isHolidayPast = (date) => {
        return moment(date).isBefore(moment(), 'day');
    };

    return (
        <Container fluid className="py-4">
            <h2 className="mb-4">Shop Settings</h2>


            <Row>
                {/* Shop Information */}
                <Col lg={6} className="mb-4">
                    <Card className="shadow-sm border-0 h-100">
                        <Card.Header className="bg-primary text-white">
                            <h5 className="mb-0">
                                <FaClock className="me-2" />
                                Shop Information & Hours
                            </h5>
                        </Card.Header>
                        <Card.Body>
                            <Form onSubmit={handleSaveShopSettings}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Shop Name</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="shopName"
                                        value={shopData.shopName}
                                        onChange={handleShopChange}
                                        placeholder="Vehicle Service Center"
                                    />
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>Shop Address</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={2}
                                        name="shopAddress"
                                        value={shopData.shopAddress}
                                        onChange={handleShopChange}
                                        placeholder="Enter shop address"
                                    />
                                </Form.Group>

                                <Row>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Phone Number</Form.Label>
                                            <Form.Control
                                                type="tel"
                                                name="shopPhone"
                                                value={shopData.shopPhone}
                                                onChange={handleShopChange}
                                                placeholder="Shop phone number"
                                            />
                                        </Form.Group>
                                    </Col>

                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Email</Form.Label>
                                            <Form.Control
                                                type="email"
                                                name="shopEmail"
                                                value={shopData.shopEmail}
                                                onChange={handleShopChange}
                                                placeholder="shop@example.com"
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>

                                <hr />

                                <h6 className="mb-3">Operating Hours</h6>

                                <Row>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Opening Time *</Form.Label>
                                            <Form.Control
                                                type="time"
                                                name="openingTime"
                                                value={shopData.openingTime}
                                                onChange={handleShopChange}
                                                required
                                            />
                                        </Form.Group>
                                    </Col>

                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Closing Time *</Form.Label>
                                            <Form.Control
                                                type="time"
                                                name="closingTime"
                                                value={shopData.closingTime}
                                                onChange={handleShopChange}
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>

                                <hr />

                                <h6 className="mb-3">Financial Settings</h6>
                                <Row>
                                    <Col md={12}>
                                        <Form.Group className="mb-3">
                                            <Form.Label><FaMoneyBillWave className="me-2" />Preferred Currency Symbol</Form.Label>
                                            <Form.Select
                                                name="currency"
                                                value={shopData.currency}
                                                onChange={handleShopChange}
                                            >
                                                <option value="LKR">LKR (Rs.)</option>
                                                <option value="$">$ (USD)</option>
                                                <option value="€">€ (EUR)</option>
                                                <option value="£">£ (GBP)</option>
                                                <option value="¥">¥ (JPY)</option>
                                                <option value="AED">AED</option>
                                                <option value="SAR">SAR</option>
                                            </Form.Select>
                                            <Form.Text className="text-muted">
                                                This symbol will be used for all invoices and quotations.
                                            </Form.Text>
                                        </Form.Group>
                                    </Col>
                                </Row>

                                <Alert variant="info" className="mb-3">
                                    <small>
                                        <strong>Note:</strong> Bookings that remain pending after closing time will be automatically cancelled.
                                    </small>
                                </Alert>

                                <Button
                                    variant="primary"
                                    type="submit"
                                    disabled={loading}
                                    className="w-100"
                                >
                                    {loading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <FaSave className="me-2" />
                                            Save Settings
                                        </>
                                    )}
                                </Button>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>

                {/* Holidays Management */}
                <Col lg={6} className="mb-4">
                    <Card className="shadow-sm border-0 h-100">
                        <Card.Header className="bg-warning text-dark">
                            <h5 className="mb-0">
                                <FaCalendarAlt className="me-2" />
                                Holidays Management
                            </h5>
                        </Card.Header>
                        <Card.Body>
                            <Form onSubmit={handleAddHoliday} className="mb-4">
                                <h6 className="mb-3">Add New Holiday</h6>

                                <Form.Group className="mb-3">
                                    <Form.Label>Holiday Date *</Form.Label>
                                    <Form.Control
                                        type="date"
                                        name="date"
                                        value={holidayData.date}
                                        onChange={handleHolidayChange}
                                        min={moment().format('YYYY-MM-DD')}
                                        required
                                    />
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>Reason *</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="reason"
                                        value={holidayData.reason}
                                        onChange={handleHolidayChange}
                                        placeholder="e.g., Christmas Day, Independence Day"
                                        required
                                    />
                                </Form.Group>

                                <Button variant="warning" type="submit" className="w-100">
                                    <FaPlus className="me-2" />
                                    Add Holiday
                                </Button>
                            </Form>

                            <hr />

                            <h6 className="mb-3">Upcoming Holidays</h6>

                            {settings && settings.holidays && settings.holidays.length > 0 ? (
                                <div className="table-responsive">
                                    <Table hover size="sm">
                                        <thead className="table-light">
                                            <tr>
                                                <th>Date</th>
                                                <th>Reason</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {settings.holidays
                                                .sort((a, b) => new Date(a.date) - new Date(b.date))
                                                .map((holiday) => (
                                                    <tr key={holiday._id} className={isHolidayPast(holiday.date) ? 'text-muted' : ''}>
                                                        <td>
                                                            {moment(holiday.date).format('MMM DD, YYYY')}
                                                            {isHolidayPast(holiday.date) && (
                                                                <Badge bg="secondary" className="ms-2">Past</Badge>
                                                            )}
                                                        </td>
                                                        <td>{holiday.reason}</td>
                                                        <td>
                                                            <Button
                                                                variant="outline-danger"
                                                                size="sm"
                                                                onClick={() => handleRemoveHoliday(holiday._id)}
                                                            >
                                                                <FaTrash />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </Table>
                                </div>
                            ) : (
                                <Alert variant="info">
                                    No holidays scheduled. Add your first holiday above.
                                </Alert>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Current Settings Summary */}
            <Row>
                <Col>
                    <Card className="shadow-sm border-0">
                        <Card.Header className="bg-secondary text-white">
                            <h5 className="mb-0">Current Settings Summary</h5>
                        </Card.Header>
                        <Card.Body>
                            <Row>
                                <Col md={4}>
                                    <div className="mb-3">
                                        <h6 className="text-muted mb-2">Shop Name</h6>
                                        <p className="mb-0">{settings?.shopName || 'Not set'}</p>
                                    </div>
                                </Col>
                                <Col md={3}>
                                    <div className="mb-3">
                                        <h6 className="text-muted mb-2">Operating Hours</h6>
                                        <p className="mb-0">
                                            {settings?.openingTime} - {settings?.closingTime}
                                        </p>
                                    </div>
                                </Col>
                                <Col md={3}>
                                    <div className="mb-3">
                                        <h6 className="text-muted mb-2">Currency</h6>
                                        <p className="mb-0">
                                            <Badge bg="primary">{settings?.currency}</Badge>
                                        </p>
                                    </div>
                                </Col>
                                <Col md={3}>
                                    <div className="mb-3">
                                        <h6 className="text-muted mb-2">Total Holidays</h6>
                                        <p className="mb-0">
                                            {settings?.holidays?.length || 0} scheduled
                                        </p>
                                    </div>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default Settings;
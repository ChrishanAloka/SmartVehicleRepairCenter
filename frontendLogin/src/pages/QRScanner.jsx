import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Form } from 'react-bootstrap';
import { technicianAPI } from '../utils/api';
import { FaQrcode, FaCheckCircle } from 'react-icons/fa';
import toast from 'react-hot-toast';

const QRScanner = () => {
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [manualId, setManualId] = useState('');
    const [recentCheckIns, setRecentCheckIns] = useState([]);

    useEffect(() => {
        loadRecentCheckIns();
    }, []);

    const loadRecentCheckIns = () => {
        const stored = localStorage.getItem('recentCheckIns');
        if (stored) {
            setRecentCheckIns(JSON.parse(stored));
        }
    };

    const saveCheckIn = (technician) => {
        const checkIn = {
            name: technician.name,
            employeeId: technician.employeeId,
            time: new Date().toISOString()
        };

        const recent = [checkIn, ...recentCheckIns.slice(0, 4)];
        setRecentCheckIns(recent);
        localStorage.setItem('recentCheckIns', JSON.stringify(recent));
    };

    const handleManualCheckIn = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            const response = await technicianAPI.checkIn(manualId.trim());
            const sMsg = `Welcome ${response.data.technician.name}! Check-in successful.`;
            setSuccess(sMsg);
            toast.success(sMsg);
            saveCheckIn(response.data.technician);
            setManualId('');
        } catch (err) {
            const eMsg = err.response?.data?.message || 'Check-in failed. Please verify the employee ID.';
            setError(eMsg);
            toast.error(eMsg);
        }
    };

    const handleStartScanning = () => {
        setScanning(true);
        setError('');
        setSuccess('');

        // Note: Actual QR scanning would require html5-qrcode library
        // For production, implement the QR scanner here
        toast.info('QR Scanner will be initialized here. For now, use manual entry below.');
        setScanning(false);
    };

    return (
        <Container className="py-5">
            <Row className="justify-content-center">
                <Col lg={8}>
                    <Card className="shadow-lg border-0">
                        <Card.Header className="bg-primary text-white text-center py-4">
                            <h2 className="mb-0">
                                <FaQrcode className="me-2" />
                                Technician Check-In
                            </h2>
                        </Card.Header>
                        <Card.Body className="p-5">

                            {/* QR Scanner Area */}
                            <div className="text-center mb-5">
                                <div
                                    className="bg-light rounded p-5 mb-3"
                                    style={{ minHeight: '250px', border: '3px dashed #dee2e6' }}
                                >
                                    {scanning ? (
                                        <div>
                                            <div className="spinner-border text-primary mb-3" role="status">
                                                <span className="visually-hidden">Scanning...</span>
                                            </div>
                                            <p className="text-muted">Position QR code in the camera view</p>
                                        </div>
                                    ) : (
                                        <div>
                                            <FaQrcode size={80} className="text-muted mb-3" />
                                            <p className="text-muted mb-3">Click the button below to scan your QR code</p>
                                            <Button
                                                variant="primary"
                                                size="lg"
                                                onClick={handleStartScanning}
                                            >
                                                Start QR Scanner
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                <p className="text-muted small mb-0">
                                    Scan your employee ID card QR code to check in
                                </p>
                            </div>

                            <div className="text-center mb-4">
                                <div className="d-inline-flex align-items-center">
                                    <hr className="flex-grow-1" style={{ width: '100px' }} />
                                    <span className="px-3 text-muted">OR</span>
                                    <hr className="flex-grow-1" style={{ width: '100px' }} />
                                </div>
                            </div>

                            {/* Manual Entry */}
                            <div className="mb-5">
                                <h5 className="text-center mb-4">Manual Check-In</h5>
                                <Form onSubmit={handleManualCheckIn}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Employee ID</Form.Label>
                                        <Form.Control
                                            type="text"
                                            value={manualId}
                                            onChange={(e) => setManualId(e.target.value)}
                                            placeholder="Enter your employee ID (e.g., TECH001)"
                                            size="lg"
                                            required
                                        />
                                        <Form.Text className="text-muted">
                                            Enter your employee ID if QR scanner is not available
                                        </Form.Text>
                                    </Form.Group>
                                    <Button variant="success" type="submit" className="w-100" size="lg">
                                        <FaCheckCircle className="me-2" />
                                        Check In
                                    </Button>
                                </Form>
                            </div>

                            {/* Recent Check-ins */}
                            {recentCheckIns.length > 0 && (
                                <div>
                                    <h6 className="text-muted mb-3">Recent Check-ins</h6>
                                    <div className="list-group">
                                        {recentCheckIns.map((checkIn, index) => (
                                            <div key={index} className="list-group-item">
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <div>
                                                        <strong>{checkIn.name}</strong>
                                                        <br />
                                                        <small className="text-muted">{checkIn.employeeId}</small>
                                                    </div>
                                                    <small className="text-muted">
                                                        {new Date(checkIn.time).toLocaleTimeString()}
                                                    </small>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </Card.Body>
                    </Card>

                    <Alert variant="info" className="mt-4">
                        <strong>Note:</strong> Check in when you arrive at work each day. Your status will be visible
                        on the public board so customers can see available technicians.
                    </Alert>
                </Col>
            </Row>
        </Container>
    );
};

export default QRScanner;
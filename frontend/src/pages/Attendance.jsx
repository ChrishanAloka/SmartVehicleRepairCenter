import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Alert, Badge, Spinner, Table, Pagination } from 'react-bootstrap';
import { technicianAPI } from '../utils/api';
import { FaUserCheck, FaUserTimes, FaIdCard, FaSearch, FaCheckCircle, FaHistory, FaUsers } from 'react-icons/fa';
import moment from 'moment';

const Attendance = () => {
    const [employeeId, setEmployeeId] = useState('');
    const [technician, setTechnician] = useState(null);
    const [allTechnicians, setAllTechnicians] = useState([]);
    const [loading, setLoading] = useState(false);
    const [marking, setMarking] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [recentLogs, setRecentLogs] = useState([]);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [techsPerPage] = useState(10);

    useEffect(() => {
        fetchTechnicians();
    }, []);

    const fetchTechnicians = async () => {
        setLoading(true);
        try {
            const response = await technicianAPI.getAll();
            setAllTechnicians(response.data.filter(t => t.isActive));
        } catch (err) {
            console.error('Error fetching technicians:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        if (!employeeId.trim()) return;

        setError('');
        setSuccess('');
        setTechnician(null);

        const found = allTechnicians.find(t =>
            t.employeeId.toLowerCase() === employeeId.toLowerCase()
        );

        if (found) {
            setTechnician(found);
        } else {
            setError('Active technician not found with this Employee ID.');
        }
    };

    const handleAttendance = async (tech, status) => {
        setMarking(true);
        setError('');
        setSuccess('');

        try {
            let response;
            if (status === 'in') {
                response = await technicianAPI.checkIn(tech.employeeId);
                setSuccess(`${tech.name} marked as PRESENT for today.`);
            } else {
                response = await technicianAPI.checkOut(tech.employeeId);
                setSuccess(`${tech.name} marked as OFF-DUTY.`);
            }

            // Refresh the list and search result
            await fetchTechnicians();
            if (technician && technician._id === tech._id) {
                setTechnician(response.data.technician);
            }

            // Add to local recent logs
            const newLog = {
                name: tech.name,
                id: tech.employeeId,
                status: status,
                time: moment().format('hh:mm A')
            };
            setRecentLogs([newLog, ...recentLogs.slice(0, 4)]);

        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update attendance.');
        } finally {
            setMarking(false);
        }
    };

    // Pagination Logic
    const indexOfLastTech = currentPage * techsPerPage;
    const indexOfFirstTech = indexOfLastTech - techsPerPage;
    const currentTechs = allTechnicians.slice(indexOfFirstTech, indexOfLastTech);
    const totalPages = Math.ceil(allTechnicians.length / techsPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    return (
        <div className="bg-light min-vh-100 py-5">
            <Container>
                <div className="text-center mb-5 animate-fade-in">
                    <h1 className="fw-bold text-primary mb-2 display-5 ls-tight">Technician Attendance</h1>
                    <p className="text-muted lead">Quick-mark presence for the entire team or verify by ID</p>
                </div>

                <Row className="g-4">
                    <Col lg={8} className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
                        {/* Technicians List Card */}
                        <Card className="card-modern mb-4">
                            <Card.Header className="card-header-custom bg-white d-flex justify-content-between align-items-center">
                                <h5 className="mb-0 fw-bold d-flex align-items-center text-dark">
                                    <FaUsers className="me-2 text-primary" /> Staff Directory
                                </h5>
                                <Badge bg="light" text="dark" className="rounded-pill border shadow-sm">Page {currentPage}</Badge>
                            </Card.Header>
                            <Card.Body className="p-0">
                                {loading && allTechnicians.length === 0 ? (
                                    <div className="text-center py-5">
                                        <Spinner animation="border" variant="primary" />
                                        <p className="mt-2 text-muted position-relative z-1">Loading staff list...</p>
                                    </div>
                                ) : (
                                    <div className="table-responsive">
                                        <Table hover className="mb-0 align-middle">
                                            <thead className="bg-light">
                                                <tr>
                                                    <th className="ps-4 py-3 text-muted small text-uppercase fw-bold letter-spacing-1">Technician</th>
                                                    <th className="py-3 text-muted small text-uppercase fw-bold letter-spacing-1">Status</th>
                                                    <th className="text-end pe-4 py-3 text-muted small text-uppercase fw-bold letter-spacing-1">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {currentTechs.map((tech) => (
                                                    <tr key={tech._id} className="hover-bg-light transition-base">
                                                        <td className="ps-4 py-3">
                                                            <div className="fw-bold text-dark">{tech.name}</div>
                                                            <div className="small text-muted">{tech.employeeId}</div>
                                                        </td>
                                                        <td className="py-3">
                                                            <Badge bg={tech.isPresent ? 'success' : 'secondary'} className="px-3 py-2 rounded-pill shadow-sm">
                                                                {tech.isPresent ? 'PRESENT' : 'OFF-DUTY'}
                                                            </Badge>
                                                        </td>
                                                        <td className="text-end pe-4 py-3">
                                                            {!tech.isPresent ? (
                                                                <Button
                                                                    variant="success"
                                                                    size="sm"
                                                                    className="btn-pill px-4 fw-bold shadow-sm"
                                                                    onClick={() => handleAttendance(tech, 'in')}
                                                                    disabled={marking}
                                                                >
                                                                    CLOCK IN
                                                                </Button>
                                                            ) : (
                                                                <Button
                                                                    variant="outline-danger"
                                                                    size="sm"
                                                                    className="btn-pill px-4 fw-bold"
                                                                    onClick={() => handleAttendance(tech, 'out')}
                                                                    disabled={marking}
                                                                >
                                                                    CLOCK OUT
                                                                </Button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {allTechnicians.length === 0 && (
                                                    <tr>
                                                        <td colSpan="3" className="text-center py-5 text-muted fst-italic">
                                                            No technicians found.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </Table>
                                    </div>
                                )}
                            </Card.Body>
                            {totalPages > 1 && (
                                <Card.Footer className="bg-white border-0 py-3 d-flex justify-content-center">
                                    <Pagination className="mb-0 shadow-sm rounded-pill overflow-hidden">
                                        <Pagination.Prev
                                            onClick={() => paginate(currentPage - 1)}
                                            disabled={currentPage === 1}
                                            className="border-0"
                                        />
                                        {[...Array(totalPages)].map((_, i) => (
                                            <Pagination.Item
                                                key={i + 1}
                                                active={i + 1 === currentPage}
                                                onClick={() => paginate(i + 1)}
                                                className="border-0"
                                            >
                                                {i + 1}
                                            </Pagination.Item>
                                        ))}
                                        <Pagination.Next
                                            onClick={() => paginate(currentPage + 1)}
                                            disabled={currentPage === totalPages}
                                            className="border-0"
                                        />
                                    </Pagination>
                                </Card.Footer>
                            )}
                        </Card>
                    </Col>

                    <Col lg={4} className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
                        {/* Search Verify Card */}
                        <Card className="card-modern mb-4 bg-primary-gradient text-white overflow-hidden border-0">
                            <Card.Body className="p-4">
                                <div className="d-flex align-items-center mb-4">
                                    <div className="rounded-circle bg-white bg-opacity-20 p-3 me-3">
                                        <FaIdCard size={24} className="text-white" />
                                    </div>
                                    <h5 className="mb-0 fw-bold">ID Verification</h5>
                                </div>

                                <Form onSubmit={handleSearch}>
                                    <Form.Group className="mb-3">
                                        <Form.Control
                                            placeholder="Enter Employee ID"
                                            value={employeeId}
                                            onChange={(e) => setEmployeeId(e.target.value)}
                                            className="form-control-lg border-0 shadow-sm bg-white bg-opacity-90 text-primary fw-bold placeholder-primary-opacity"
                                        />
                                    </Form.Group>
                                    <Button variant="light" type="submit" className="w-100 btn-pill fw-bold text-primary shadow-sm">VERIFY & ACTION</Button>
                                </Form>

                                {technician && (
                                    <div className="mt-4 p-3 rounded-4 bg-white text-dark shadow-lg animate-fade-in text-center">
                                        <h5 className="fw-bold mb-1 text-primary">{technician.name}</h5>
                                        <p className="small text-muted mb-3">{technician.employeeId}</p>
                                        <div className="d-grid">
                                            <Button
                                                variant={technician.isPresent ? "outline-danger" : "success"}
                                                size="lg"
                                                className="fw-bold btn-pill shadow-sm"
                                                onClick={() => handleAttendance(technician, technician.isPresent ? 'out' : 'in')}
                                                disabled={marking}
                                            >
                                                {technician.isPresent ? 'CLOCK OUT' : 'CLOCK IN'}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                                {error && <Alert variant="danger" className="border-0 small mt-3 py-2 rounded-3 shadow-sm">{error}</Alert>}
                                {success && <Alert variant="success" className="border-0 small mt-3 py-2 rounded-3 shadow-sm">{success}</Alert>}
                            </Card.Body>
                        </Card>

                        {/* Recent Activity Card */}
                        <Card className="card-modern">
                            <Card.Header className="card-header-custom bg-white border-0 py-3">
                                <h6 className="fw-bold mb-0 d-flex align-items-center text-dark">
                                    <FaHistory className="me-2 text-primary" /> Recent Activity
                                </h6>
                            </Card.Header>
                            <Card.Body className="p-0">
                                {recentLogs.length === 0 ? (
                                    <div className="text-center py-4 text-muted small opacity-50">
                                        No recent actions.
                                    </div>
                                ) : (
                                    <div className="activity-list">
                                        {recentLogs.map((log, i) => (
                                            <div key={i} className="p-3 border-bottom border-light hover-bg-light d-flex align-items-center">
                                                <div className={`rounded-circle p-2 me-3 ${log.status === 'in' ? 'bg-success' : 'bg-danger'} bg-opacity-10 text-center`} style={{ width: '40px', height: '40px' }}>
                                                    {log.status === 'in' ? <FaUserCheck className="text-success" /> : <FaUserTimes className="text-danger" />}
                                                </div>
                                                <div className="flex-grow-1 overflow-hidden">
                                                    <div className="fw-bold text-dark small text-truncate">{log.name}</div>
                                                    <div className="text-muted x-small d-flex justify-content-between">
                                                        <span>{log.status === 'in' ? 'Clocked In' : 'Clocked Out'}</span>
                                                        <span>{log.time}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default Attendance;

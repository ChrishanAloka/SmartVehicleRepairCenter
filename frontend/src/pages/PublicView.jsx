import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Alert, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { technicianAPI, bookingAPI, settingsAPI } from '../utils/api';
import { FaTools, FaCalendarPlus, FaCheckCircle, FaClock, FaUsers, FaUser } from 'react-icons/fa';
import moment from 'moment';

const PublicView = () => {
    const { isAuthenticated } = useAuth();
    const [technicians, setTechnicians] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000); // Refresh every 10 seconds
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            const [techRes, bookingRes, settingsRes] = await Promise.all([
                technicianAPI.getAll(),
                bookingAPI.getToday({ date: moment().format('YYYY-MM-DD') }),
                settingsAPI.get()
            ]);

            setTechnicians(techRes.data);
            setBookings(bookingRes.data);
            setSettings(settingsRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getTechnicianBookings = (technicianId) => {
        return bookings.filter(
            booking =>
                booking.technician?._id === technicianId &&
                booking.status === 'accepted' &&
                !booking.isPaidOut
        );
    };

    const getAcceptedBookingsCount = () => {
        return bookings.filter(b => b.status === 'accepted' && !b.isPaidOut).length;
    };

    const getPendingBookings = () => {
        return bookings.filter(b => b.status === 'pending');
    };

    const getServicingBookings = () => {
        return bookings.filter(b => b.status === 'accepted' && !b.isPaidOut);
    };

    const getActiveBookingsCount = () => {
        return bookings.filter(b =>
            (b.status === 'pending' || b.status === 'accepted') &&
            !b.isPaidOut
        ).length;
    };

    const getPresentTechniciansCount = () => {
        return technicians.filter(t => {
            const isBusy = bookings.some(b =>
                b.technician?._id === t._id &&
                b.status === 'accepted' &&
                !b.isPaidOut
            );
            return t.isPresent || isBusy;
        }).length;
    };

    const getAdjustedStartTime = (booking) => {
        let startTime = booking.status === 'accepted' ? (booking.acceptedAt || booking.createdAt) : booking.createdAt;

        // Clamp wait/repair time to shop opening time for entries from previous days
        const entryDate = moment(startTime).startOf('day');
        const today = moment().startOf('day');

        if (entryDate.isBefore(today) && settings?.openingTime) {
            try {
                // format e.g. "08:00 AM"
                const shopOpeningToday = moment(settings.openingTime, 'hh:mm A');
                if (shopOpeningToday.isValid() && moment().isAfter(shopOpeningToday)) {
                    startTime = shopOpeningToday;
                }
            } catch (e) {
                console.error("Error parsing opening time", e);
            }
        }
        return startTime;
    };

    const formatStopwatch = (booking) => {
        const startTime = getAdjustedStartTime(booking);
        const diff = moment.duration(moment().diff(moment(startTime)));
        const days = Math.floor(diff.asDays());
        const hours = diff.hours();
        const minutes = diff.minutes();

        if (days > 0) {
            return `${days}d ${hours}h`;
        }
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    };

    const QueueVisualizer = ({ title, bookingList, icon, color, status }) => {
        const count = bookingList.length;

        return (
            <Card className="card-modern h-100 border-0 mb-4 bg-white">
                <Card.Body className="p-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <div className="d-flex align-items-center">
                            <div className={`rounded-circle bg-${color} bg-opacity-10 p-3 me-3`}>
                                {icon}
                            </div>
                            <div>
                                <h5 className="fw-bold mb-0 text-dark">{title}</h5>
                                <small className="text-muted fw-bold text-uppercase" style={{ fontSize: '0.75rem' }}>{status}</small>
                            </div>
                        </div>
                        <h2 className={`fw-extrabold mb-0 text-${color}`}>{count}</h2>
                    </div>

                    <div className="queue-container d-flex flex-wrap gap-3 py-2">
                        {count === 0 ? (
                            <div className="text-muted small fst-italic py-3 opacity-50">No one in this queue</div>
                        ) : (
                            bookingList.map((booking, i) => (
                                <div key={i} className="text-center">
                                    <div className={`queue-man-icon text-${color} pulse-animation mb-1`}>
                                        <FaUser size={24} />
                                    </div>
                                    <div className="text-muted fw-bold" style={{ fontSize: '0.65rem' }}>
                                        {formatStopwatch(booking)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Card.Body>
            </Card>
        );
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center min-vh-100 bg-light">
                <div className="text-center">
                    <Spinner animation="grow" variant="primary" style={{ width: '3rem', height: '3rem' }} />
                    <h5 className="text-muted mt-3 fw-light">Syncing live dashboard...</h5>
                </div>
            </div>
        );
    }

    return (
        <div className="min-vh-100 py-5">
            <Container>
                {/* Header Section */}
                <div id="tour-public-status" className="text-center mb-5 animate-fade-in">
                    <h1 className="display-4 fw-bold text-primary mb-2 text-uppercase letter-spacing-1">
                        {settings?.shopName || 'Vehicle Service Center'}
                    </h1>
                    <div className="d-flex justify-content-center align-items-center gap-3 mb-4">
                        <span className="badge bg-white text-dark shadow-sm px-4 py-2 border rounded-pill fw-normal">
                            <FaClock className="me-2 text-primary" />
                            {moment().format('MMMM Do YYYY, h:mm A')}
                        </span>
                        {settings?.holidays?.some(h => moment(h.date).isSame(moment(), 'day')) && (
                            <Badge bg="danger" className="px-4 py-2 shadow-sm pulse-animation rounded-pill">
                                CLOSED TODAY FOR HOLIDAY
                            </Badge>
                        )}
                    </div>
                    <div className="d-flex justify-content-center gap-3 flex-wrap">
                        <Link to="/booking">
                            <Button size="lg" className="btn-primary-gradient btn-pill shadow-lg border-0 px-5 py-3">
                                <FaCalendarPlus className="me-2" />
                                BOOK NOW
                            </Button>
                        </Link>
                        <Link to="/customer-lookup">
                            <Button variant="light" size="lg" className="btn-pill shadow-sm border px-5 py-3 text-primary fw-bold hover-lift">
                                <FaUsers className="me-2" />
                                CHECK MY STATUS
                            </Button>
                        </Link>
                        {/* {isAuthenticated && (
                            <Link to="/attendance">
                                <Button variant="light" size="lg" className="btn-pill shadow-sm border px-5 py-3 text-secondary fw-bold hover-lift">
                                    <FaCheckCircle className="me-2" />
                                    STAFF ATTENDANCE
                                </Button>
                            </Link>
                        )} */}
                    </div>
                </div>

                {/* Queue Visualization Section */}
                <div id="tour-public-queue" className="mb-5 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                    <div className="d-flex align-items-center justify-content-between mb-4">
                        <h3 className="fw-bold text-dark mb-0 border-start border-4 border-primary ps-3">Live Workshop Status</h3>
                        <Badge bg="primary" className="px-3 py-2 rounded-pill shadow-sm">
                            Current Load: {getActiveBookingsCount() > (technicians.length * 2) ? 'High' : 'Normal'}
                        </Badge>
                    </div>

                    <Row className="g-4">
                        <Col lg={6}>
                            <QueueVisualizer
                                title="Waiting List"
                                bookingList={getPendingBookings()}
                                icon={<FaClock className="text-warning text-opacity-75" size={24} />}
                                color="warning"
                                status="Next in line"
                            />
                        </Col>
                        <Col lg={6}>
                            <QueueVisualizer
                                title="On The Floor"
                                bookingList={getServicingBookings()}
                                icon={<FaTools className="text-success text-opacity-75" size={24} />}
                                color="success"
                                status="Being Serviced"
                            />
                        </Col>
                    </Row>
                </div>

                {/* Technicians Status */}
                <div id="tour-public-team" className="mb-5 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                    <div className="d-flex align-items-center justify-content-between mb-4">
                        <h3 className="fw-bold text-dark mb-0 border-start border-4 border-success ps-3">
                            Our Expert Team
                        </h3>
                        <div className="d-flex gap-2">
                            <Badge bg="success" className="px-3 py-2 rounded-pill shadow-sm">
                                {getPresentTechniciansCount()} Online
                            </Badge>
                        </div>
                    </div>

                    {technicians.length === 0 ? (
                        <Card className="card-modern text-center py-5">
                            <Card.Body>
                                <div className="opacity-25 mb-3">
                                    <FaUsers size={64} className="text-muted" />
                                </div>
                                <h5 className="text-muted">No technicians registered yet.</h5>
                            </Card.Body>
                        </Card>
                    ) : (
                        <Row className="g-4">
                            {technicians.map((technician) => {
                                const techBookings = getTechnicianBookings(technician._id);
                                const isBusy = techBookings.length > 0;
                                const isPresent = technician.isPresent || isBusy;

                                let statusBadge;
                                if (isBusy) {
                                    statusBadge = <Badge bg="warning" className="px-3 py-1 rounded-pill text-dark border border-warning shadow-sm">BUSY</Badge>;
                                } else if (isPresent) {
                                    statusBadge = <Badge bg="success" className="px-3 py-1 rounded-pill border border-success shadow-sm">AVAILABLE</Badge>;
                                } else {
                                    statusBadge = <Badge bg="secondary" className="px-3 py-1 rounded-pill shadow-sm">OFF-DUTY</Badge>;
                                }

                                return (
                                    <Col md={6} lg={3} key={technician._id}>
                                        <Card className={`card-modern h-100 ${!isPresent ? 'opacity-50' : ''}`}>
                                            <Card.Body className="p-4 d-flex flex-column">
                                                <div className="d-flex justify-content-between align-items-start mb-3">
                                                    <div className="d-flex align-items-center">
                                                        <div className={`rounded-circle p-1 me-3 ${isPresent ? (isBusy ? 'bg-warning' : 'bg-success') : 'bg-secondary'} bg-opacity-10`}>
                                                            <div className={`rounded-circle p-2 ${isPresent ? (isBusy ? 'bg-warning' : 'bg-success') : 'bg-secondary'} text-white`}>
                                                                <FaUser size={16} />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <h5 className="fw-bold mb-0 text-dark">{technician.name}</h5>
                                                            <span className="text-muted small">ID: {technician.employeeId}</span>
                                                        </div>
                                                    </div>
                                                    {statusBadge}
                                                </div>

                                                <div className="mb-3 flex-grow-1">
                                                    <span className="text-uppercase text-muted fw-bold" style={{ fontSize: '0.7rem', letterSpacing: '1px' }}>Specialization</span>
                                                    <h6 className="fw-bold text-dark mt-1">
                                                        {technician.specialization || 'General Technician'}
                                                    </h6>
                                                </div>

                                                {isPresent && isBusy && (
                                                    <div className="mt-auto p-2 rounded bg-warning bg-opacity-10 border border-warning text-center">
                                                        <p className="small fw-bold text-warning mb-0 text-uppercase" style={{ fontSize: '0.7rem' }}>Currently Repairing</p>
                                                    </div>
                                                )}

                                                {isPresent && !isBusy && (
                                                    <div className="mt-auto p-2 rounded bg-success bg-opacity-10 border border-success text-center">
                                                        <p className="small fw-bold text-success mb-0 text-uppercase" style={{ fontSize: '0.7rem' }}>Ready for Job</p>
                                                    </div>
                                                )}
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                );
                            })}
                        </Row>
                    )}
                </div>

                {/* Shop Information Area */}
                <Row className="g-4 mt-2 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                    <Col md={12}>
                        {settings?.holidays?.filter(h => moment(h.date).isSameOrAfter(moment(), 'day')).length > 0 && (
                            <Card className="card-modern mb-4">
                                <Card.Header className="bg-white border-0 py-3">
                                    <h5 className="mb-0 fw-bold text-dark border-start border-4 border-info ps-3">
                                        Upcoming Holidays & Closures
                                    </h5>
                                </Card.Header>
                                <Card.Body className="pt-0">
                                    <div className="d-flex flex-wrap gap-3">
                                        {settings.holidays
                                            .filter(h => moment(h.date).isSameOrAfter(moment(), 'day'))
                                            .sort((a, b) => moment(a.date).diff(moment(b.date)))
                                            .slice(0, 5)
                                            .map((holiday, idx) => (
                                                <div key={idx} className="p-3 rounded-pill border bg-light d-flex align-items-center shadow-sm hover-lift" style={{ minWidth: '220px' }}>
                                                    <div className="me-3 text-primary fw-bold text-center lh-1">
                                                        <div className="small text-uppercase">{moment(holiday.date).format('MMM')}</div>
                                                        <div className="fs-4">{moment(holiday.date).format('DD')}</div>
                                                    </div>
                                                    <div>
                                                        <div className="fw-bold small text-dark">{holiday.reason || 'Public Holiday'}</div>
                                                        <div className="text-muted x-small text-uppercase">{moment(holiday.date).format('dddd')}</div>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </Card.Body>
                            </Card>
                        )}
                    </Col>
                    <Col md={6}>
                        {settings && (
                            <Card className="card-modern h-100">
                                <Card.Body className="p-4 d-flex align-items-center">
                                    <div className="rounded-circle bg-primary bg-opacity-10 p-3 me-4">
                                        <FaClock className="text-primary" size={24} />
                                    </div>
                                    <div>
                                        <h6 className="fw-bold text-dark mb-1 text-uppercase small letter-spacing-1">Operating Hours</h6>
                                        <p className="mb-0 text-muted fw-medium lead">
                                            {settings.openingTime} - {settings.closingTime}
                                        </p>
                                    </div>
                                </Card.Body>
                            </Card>
                        )}
                    </Col>
                    <Col md={6}>
                        <Card className="card-modern h-100">
                            <Card.Body className="p-4 d-flex align-items-center">
                                <div className="rounded-circle bg-info bg-opacity-10 p-3 me-4">
                                    <FaTools className="text-info" size={24} />
                                </div>
                                <div>
                                    <h6 className="fw-bold text-dark mb-1 text-uppercase small letter-spacing-1">Service Quality</h6>
                                    <p className="mb-0 text-muted">
                                        Professional repairs with real-time status tracking.
                                    </p>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </div >
    );
};

export default PublicView;
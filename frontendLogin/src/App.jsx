import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';

// Pages
import PublicView from './pages/PublicView';
import BookingPage from './pages/BookingPage';
import CustomerLookup from './pages/CustomerLookup';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Technicians from './pages/Technicians';
import Bookings from './pages/Bookings';
import Invoices from './pages/Invoices';
import Customers from './pages/Customers';
import Settings from './pages/Settings';
import TechnicianPortal from './pages/TechnicianPortal';
import Attendance from './pages/Attendance';
import QRScanner from './pages/QRScanner';

// Import Bootstrap CSS
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

function App() {
    return (
        <AuthProvider>
            <SettingsProvider>
                <Toaster position="top-right" reverseOrder={false} />
                <Router>
                    <AppLayout>
                        <Routes>
                            {/* Public Routes */}
                            <Route path="/" element={<Navigate to="/login" replace />} />
                            <Route path="/public" element={<PublicView />} />
                            <Route path="/booking" element={<BookingPage />} />
                            <Route path="/customer-lookup" element={<CustomerLookup />} />
                            <Route path="/qr-scanner" element={<QRScanner />} />
                            <Route path="/login" element={<Login />} />

                            {/* Protected Routes */}
                            <Route
                                path="/dashboard"
                                element={
                                    <ProtectedRoute adminOnly>
                                        <Dashboard />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/technicians"
                                element={
                                    <ProtectedRoute adminOnly>
                                        <Technicians />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/bookings"
                                element={
                                    <ProtectedRoute adminOnly>
                                        <Bookings />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/invoices"
                                element={
                                    <ProtectedRoute adminOnly>
                                        <Invoices />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/customers"
                                element={
                                    <ProtectedRoute adminOnly>
                                        <Customers />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/settings"
                                element={
                                    <ProtectedRoute adminOnly>
                                        <Settings />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/technician-portal"
                                element={
                                    <ProtectedRoute>
                                        <TechnicianPortal />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/attendance"
                                element={
                                    <ProtectedRoute>
                                        <Attendance />
                                    </ProtectedRoute>
                                }
                            />

                            {/* Add more routes as needed */}
                        </Routes>
                    </AppLayout>
                </Router>
            </SettingsProvider>
        </AuthProvider>
    );
}

export default App;
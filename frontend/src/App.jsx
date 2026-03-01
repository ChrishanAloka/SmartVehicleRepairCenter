import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';

// Pages
import PublicView from './pages/PublicView';
import BookingPage from './pages/BookingPage';
import CustomerLookup from './pages/CustomerLookup';

// Components
import PublicNavbar from './components/PublicNavbar';
import TourGuide from './components/TourGuide';

// Import Bootstrap CSS
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

function App() {
    return (
        <AuthProvider>
            <Toaster position="top-right" reverseOrder={false} />
            <Router>
                <div className="d-flex flex-column min-vh-100">
                    <TourGuide />
                    <PublicNavbar />
                    <main className="flex-grow-1">
                        <Routes>
                            <Route path="/" element={<PublicView />} />
                            <Route path="/booking" element={<BookingPage />} />
                            <Route path="/customer-lookup" element={<CustomerLookup />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </main>

                    <footer className="bg-dark text-white py-3 mt-auto">
                        <div className="container text-center">
                            <p className="mb-0">
                                © {new Date().getFullYear()} ideasmart Solutions. All rights reserved.
                            </p>
                        </div>
                    </footer>
                </div>
            </Router>
        </AuthProvider>
    );
}

export default App;

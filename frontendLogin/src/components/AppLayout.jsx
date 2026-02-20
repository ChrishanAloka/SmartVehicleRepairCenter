import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import { useAuth } from '../context/AuthContext';

const AppLayout = ({ children }) => {
    const { isAuthenticated } = useAuth();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [showMobileSidebar, setShowMobileSidebar] = useState(false);

    if (!isAuthenticated) {
        return <div className="min-vh-100">{children}</div>;
    }

    return (
        <div className="d-flex min-vh-100">
            <Sidebar
                isCollapsed={isCollapsed}
                setIsCollapsed={setIsCollapsed}
                showMobileSidebar={showMobileSidebar}
                setShowMobileSidebar={setShowMobileSidebar}
            />
            <div
                className={`main-content flex-grow-1 d-flex flex-column ${isCollapsed ? 'collapsed' : ''}`}
                onClick={() => {
                    // On desktop, if sidebar is expanded, collapse it when clicking main content
                    if (!isCollapsed && window.innerWidth > 991) {
                        setIsCollapsed(true);
                    }
                }}
            >
                <TopNavbar
                    onToggle={() => setIsCollapsed(!isCollapsed)}
                    isCollapsed={isCollapsed}
                    onMobileToggle={() => setShowMobileSidebar(!showMobileSidebar)}
                />
                <main className="flex-grow-1">
                    {children}
                </main>
                <footer className="bg-white border-top py-3 mt-4 text-center">
                    <p className="mb-0 text-muted small">
                        © {new Date().getFullYear()} ideasmart Solutions. All rights reserved.
                    </p>
                </footer>
            </div>
        </div>
    );
};

export default AppLayout;

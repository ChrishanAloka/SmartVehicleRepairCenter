import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Shepherd from 'shepherd.js';
import 'shepherd.js/dist/css/shepherd.css';
import './TourGuide.css';

/* ─── Tour step definitions by route ─── */
const getTourSteps = (pathname) => {
    switch (pathname) {
        /* ── Public View / Live Status ── */
        case '/':
            return [
                {
                    id: 'welcome',
                    title: '👋 Welcome to Our Service Center!',
                    text: 'This is the <strong>Live Status Board</strong>. Here you can see real-time workshop activity, available technicians, and queue status. Let us show you around!',
                    buttons: [
                        { text: 'Skip', action: 'cancel', classes: 'shepherd-button-secondary' },
                        { text: 'Let\'s Go →', action: 'next' }
                    ]
                },
                {
                    id: 'public-status',
                    attachTo: { element: '#tour-public-status', on: 'bottom' },
                    title: '🏪 Shop Status',
                    text: 'This header shows the <strong>shop name</strong>, today\'s date, and whether we\'re currently <strong>open or closed</strong>. You\'ll also see quick action buttons to book a service or check your vehicle status.',
                    buttons: [
                        { text: '← Back', action: 'back', classes: 'shepherd-button-secondary' },
                        { text: 'Next →', action: 'next' }
                    ]
                },
                {
                    id: 'public-queue',
                    attachTo: { element: '#tour-public-queue', on: 'top' },
                    title: '📊 Live Workshop Queue',
                    text: 'This section shows real-time queue status. The <strong>Waiting List</strong> shows vehicles in line, while <strong>On The Floor</strong> shows vehicles currently being repaired. Each icon represents a customer with their wait time.',
                    buttons: [
                        { text: '← Back', action: 'back', classes: 'shepherd-button-secondary' },
                        { text: 'Next →', action: 'next' }
                    ]
                },
                {
                    id: 'public-team',
                    attachTo: { element: '#tour-public-team', on: 'top' },
                    title: '👨‍🔧 Our Expert Team',
                    text: 'Here you can see all our technicians and their current status. <strong>Available</strong> (green) means they\'re ready, <strong>Busy</strong> (yellow) means they\'re working on a vehicle, and <strong>Off-Duty</strong> (grey) means they\'re not here today.',
                    buttons: [
                        { text: '← Back', action: 'back', classes: 'shepherd-button-secondary' },
                        { text: 'Finish ✓', action: 'next' }
                    ]
                }
            ];

        /* ── Booking Page ── */
        case '/booking':
            return [
                {
                    id: 'welcome-booking',
                    title: '📋 Service Booking',
                    text: 'This is the <strong>Booking Page</strong> where you can schedule a service for your vehicle. We offer both <strong>same-day walk-in</strong> and <strong>future date</strong> booking options!',
                    buttons: [
                        { text: 'Skip', action: 'cancel', classes: 'shepherd-button-secondary' },
                        { text: 'Show Me →', action: 'next' }
                    ]
                },
                {
                    id: 'booking-status-card',
                    attachTo: { element: '#tour-booking-status', on: 'bottom' },
                    title: '🕐 Booking Options',
                    text: 'First you\'ll see the shop status — whether we\'re <strong>open</strong> or <strong>closed</strong>. Then choose: <ul><li><strong>Join Live Queue</strong> — come in today</li><li><strong>Schedule Future</strong> — book ahead for another day</li></ul>',
                    buttons: [
                        { text: '← Back', action: 'back', classes: 'shepherd-button-secondary' },
                        { text: 'Next →', action: 'next' }
                    ]
                },
                {
                    id: 'booking-form',
                    attachTo: { element: '#tour-booking-form', on: 'top' },
                    title: '📝 Fill Out the Form',
                    text: 'After choosing a date, fill in your details. Enter your <strong>ID/NIC number first</strong> — if you\'re a returning customer, your details will auto-fill! Then provide your vehicle info and describe the problem.',
                    buttons: [
                        { text: '← Back', action: 'back', classes: 'shepherd-button-secondary' },
                        { text: 'Finish ✓', action: 'next' }
                    ]
                }
            ];

        /* ── Customer Lookup ── */
        case '/customer-lookup':
            return [
                {
                    id: 'welcome-lookup',
                    title: '🔍 Check Your Vehicle Status',
                    text: 'Use this page to <strong>track your vehicle\'s progress</strong> in real-time. Search by your vehicle number or NIC/ID to see your queue position, service history, and more!',
                    buttons: [
                        { text: 'Skip', action: 'cancel', classes: 'shepherd-button-secondary' },
                        { text: 'Show Me →', action: 'next' }
                    ]
                },
                {
                    id: 'lookup-search',
                    attachTo: { element: '#tour-lookup-search', on: 'bottom' },
                    title: '🔎 Search Your Records',
                    text: 'Enter your <strong>vehicle number</strong> (e.g., CAS-1234) or <strong>NIC/ID</strong> here and hit search. We\'ll pull up all your details, your position in the queue, and full service history.',
                    buttons: [
                        { text: '← Back', action: 'back', classes: 'shepherd-button-secondary' },
                        { text: 'Next →', action: 'next' }
                    ]
                },
                {
                    id: 'lookup-results',
                    title: '📋 What You\'ll See',
                    text: 'After searching, you\'ll get:<ul><li>🗺️ <strong>Live Queue Position</strong> — your exact spot in line</li><li>👤 <strong>Customer Profile</strong> — your details & vehicle info</li><li>📊 <strong>Active Services</strong> — current repairs in progress</li><li>📜 <strong>Service History</strong> — past visits with ratings & invoices</li></ul>You can also <strong>edit your details</strong>, <strong>rate past services</strong>, and <strong>rebook postponed visits</strong>!',
                    buttons: [
                        { text: '← Back', action: 'back', classes: 'shepherd-button-secondary' },
                        { text: 'Finish ✓', action: 'next' }
                    ]
                }
            ];

        default:
            return [];
    }
};

const TourGuide = () => {
    const location = useLocation();
    const tourRef = useRef(null);
    const [showFab, setShowFab] = useState(false);

    useEffect(() => {
        const steps = getTourSteps(location.pathname);
        setShowFab(steps.length > 0);

        // Cleanup previous tour
        if (tourRef.current) {
            tourRef.current.complete();
            tourRef.current = null;
        }
    }, [location.pathname]);

    const startTour = () => {
        const steps = getTourSteps(location.pathname);
        if (steps.length === 0) return;

        // Destroy any existing tour
        if (tourRef.current) {
            tourRef.current.complete();
        }

        const tour = new Shepherd.Tour({
            useModalOverlay: true,
            defaultStepOptions: {
                scrollTo: { behavior: 'smooth', block: 'center' },
                cancelIcon: { enabled: true },
                modalOverlayOpeningPadding: 8,
                modalOverlayOpeningRadius: 12,
            }
        });

        steps.forEach((step) => {
            const buttons = step.buttons.map(btn => ({
                text: btn.text,
                action: () => tour[btn.action](),
                classes: btn.classes || ''
            }));

            tour.addStep({
                id: step.id,
                title: step.title,
                text: step.text,
                attachTo: step.attachTo,
                buttons,
            });
        });

        tourRef.current = tour;
        tour.start();
    };

    if (!showFab) return null;

    return (
        <button className="tour-fab" onClick={startTour} aria-label="Start guided tour">
            <span className="tour-fab-icon">?</span>
            Tour Guide
        </button>
    );
};

export default TourGuide;

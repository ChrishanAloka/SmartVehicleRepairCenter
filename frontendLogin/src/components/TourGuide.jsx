import React, { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import Shepherd from 'shepherd.js';
import 'shepherd.js/dist/css/shepherd.css';
import './TourGuide.css';
import { FaQuestion } from 'react-icons/fa';

// Tour configurations for each page
const tourConfigs = {
    '/dashboard': {
        title: 'Dashboard Tour',
        steps: [
            {
                id: 'dashboard-welcome',
                text: `<div class="tour-content">
                    <h4>👋 Welcome to the Dashboard!</h4>
                    <p>This is your command center — a real-time overview of everything happening in your vehicle repair workshop.</p>
                    <p class="tour-tip">💡 The dashboard auto-refreshes every 60 seconds to keep data live.</p>
                </div>`,
                buttons: [
                    { text: 'Skip Tour', action: 'cancel', classes: 'shepherd-button-secondary' },
                    { text: 'Next →', action: 'next' }
                ]
            },
            {
                id: 'dashboard-workshop-status',
                attachTo: { element: '#tour-workshop-status', on: 'bottom' },
                text: `<div class="tour-content">
                    <h4>🔧 Workshop Status Cards</h4>
                    <p>These <strong>3 colored cards</strong> give you an instant pulse of your workshop:</p>
                    <ul>
                        <li><strong>🟡 Awaiting Service</strong> — Vehicles waiting in queue (pending approval)</li>
                        <li><strong>🟢 In Progress</strong> — Vehicles currently being repaired</li>
                        <li><strong>🔵 Ready for Billing</strong> — Repairs completed, waiting for invoice</li>
                    </ul>
                </div>`,
                buttons: [
                    { text: '← Back', action: 'back', classes: 'shepherd-button-secondary' },
                    { text: 'Next →', action: 'next' }
                ]
            },
            {
                id: 'dashboard-stats',
                attachTo: { element: '#tour-general-stats', on: 'bottom' },
                text: `<div class="tour-content">
                    <h4>📊 General Statistics</h4>
                    <p>Quick-glance stats showing:</p>
                    <ul>
                        <li><strong>Total Technicians</strong> — All registered technicians and how many are present today</li>
                        <li><strong>Today's Bookings</strong> — Total bookings made for today</li>
                        <li><strong>Pending</strong> — Jobs awaiting technician confirmation</li>
                        <li><strong>Customer Satisfaction</strong> — Average rating from customer feedback</li>
                    </ul>
                </div>`,
                buttons: [
                    { text: '← Back', action: 'back', classes: 'shepherd-button-secondary' },
                    { text: 'Next →', action: 'next' }
                ]
            },
            {
                id: 'dashboard-live-orders',
                attachTo: { element: '#tour-live-orders', on: 'top' },
                text: `<div class="tour-content">
                    <h4>🛠️ Live Workshop Orders</h4>
                    <p>This table shows the <strong>10 most recent bookings</strong> for today, including:</p>
                    <ul>
                        <li>Customer name & phone number</li>
                        <li>Vehicle number plate</li>
                        <li>Assigned technician (or "Queueing..." if not assigned yet)</li>
                        <li>Current status badge (Pending, Accepted, Repaired, etc.)</li>
                        <li>The booking time</li>
                    </ul>
                    <p>Click <strong>"View All"</strong> to go to the full Bookings page.</p>
                </div>`,
                buttons: [
                    { text: '← Back', action: 'back', classes: 'shepherd-button-secondary' },
                    { text: 'Next →', action: 'next' }
                ]
            },
            {
                id: 'dashboard-feedback',
                attachTo: { element: '#tour-feedback', on: 'top' },
                text: `<div class="tour-content">
                    <h4>⭐ Recent Feedback</h4>
                    <p>Customer reviews and ratings are shown here. This helps you track service quality.</p>
                    <p>Each review shows the customer name, star rating (1–5), their comment, vehicle number, and when it was submitted.</p>
                    <p class="tour-tip">💡 High ratings indicate great service — use this to reward your best technicians!</p>
                </div>`,
                buttons: [
                    { text: '← Back', action: 'back', classes: 'shepherd-button-secondary' },
                    { text: 'Done ✓', action: 'next' }
                ]
            }
        ]
    },

    '/bookings': {
        title: 'Bookings Management Tour',
        steps: [
            {
                id: 'bookings-welcome',
                text: `<div class="tour-content">
                    <h4>📅 Bookings Management</h4>
                    <p>This is where you manage all vehicle repair bookings. View, filter, and update the status of every booking.</p>
                </div>`,
                buttons: [
                    { text: 'Skip Tour', action: 'cancel', classes: 'shepherd-button-secondary' },
                    { text: 'Next →', action: 'next' }
                ]
            },
            {
                id: 'bookings-header',
                attachTo: { element: '#tour-bookings-header', on: 'bottom' },
                text: `<div class="tour-content">
                    <h4>📋 Page Header</h4>
                    <p>The <strong>Refresh</strong> button reloads booking data from the server instantly — useful when things change quickly during busy hours.</p>
                </div>`,
                buttons: [
                    { text: '← Back', action: 'back', classes: 'shepherd-button-secondary' },
                    { text: 'Next →', action: 'next' }
                ]
            },
            {
                id: 'bookings-stats',
                attachTo: { element: '#tour-bookings-stats', on: 'bottom' },
                text: `<div class="tour-content">
                    <h4>📊 Status Summary Cards</h4>
                    <p>Quick count of bookings by status:</p>
                    <ul>
                        <li><strong>Active Today</strong> — Total active (pending + accepted, unpaid)</li>
                        <li><strong>Pending</strong> — Waiting to be assigned / accepted</li>
                        <li><strong>In Progress</strong> — Currently being serviced</li>
                        <li><strong>Completed</strong> — Finished & paid out</li>
                    </ul>
                </div>`,
                buttons: [
                    { text: '← Back', action: 'back', classes: 'shepherd-button-secondary' },
                    { text: 'Next →', action: 'next' }
                ]
            },
            {
                id: 'bookings-filters',
                attachTo: { element: '#tour-bookings-filters', on: 'bottom' },
                text: `<div class="tour-content">
                    <h4>🔍 Filter Panel</h4>
                    <p>Powerful filtering options:</p>
                    <ul>
                        <li><strong>Date Picker</strong> — Choose a specific date. Days with bookings are highlighted!</li>
                        <li><strong>Status Filter</strong> — Show only Pending, Accepted, Declined, etc.</li>
                        <li><strong>Technician Filter</strong> — View bookings for a specific technician</li>
                    </ul>
                    <p>Hit <strong>Apply</strong> to filter, or <strong>Reset</strong> to see today's bookings again.</p>
                </div>`,
                buttons: [
                    { text: '← Back', action: 'back', classes: 'shepherd-button-secondary' },
                    { text: 'Next →', action: 'next' }
                ]
            },
            {
                id: 'bookings-table',
                attachTo: { element: '#tour-bookings-table', on: 'top' },
                text: `<div class="tour-content">
                    <h4>📋 Bookings Table</h4>
                    <p>All bookings are listed here with full details — date, customer, vehicle, problem description, assigned technician, status, and payment info.</p>
                    <p><strong>Action buttons</strong> for each row:</p>
                    <ul>
                        <li><strong>View</strong> — Opens full booking details in a popup</li>
                        <li><strong>Edit Status</strong> — Override status, assign technician, add notes</li>
                        <li><strong>Done</strong> — Quick-mark an in-progress repair as completed (appears only for "Accepted" bookings)</li>
                    </ul>
                </div>`,
                buttons: [
                    { text: '← Back', action: 'back', classes: 'shepherd-button-secondary' },
                    { text: 'Done ✓', action: 'next' }
                ]
            }
        ]
    },

    '/technicians': {
        title: 'Technicians Management Tour',
        steps: [
            {
                id: 'technicians-welcome',
                text: `<div class="tour-content">
                    <h4>👨‍🔧 Technicians Management</h4>
                    <p>Manage your entire team of technicians — add, edit, remove, and monitor their status and performance.</p>
                </div>`,
                buttons: [
                    { text: 'Skip Tour', action: 'cancel', classes: 'shepherd-button-secondary' },
                    { text: 'Next →', action: 'next' }
                ]
            },
            {
                id: 'technicians-add',
                attachTo: { element: '#tour-add-technician', on: 'bottom' },
                text: `<div class="tour-content">
                    <h4>➕ Add New Technician</h4>
                    <p>Click this button to register a new technician. You'll need to provide:</p>
                    <ul>
                        <li>Employee ID (unique identifier like TECH001)</li>
                        <li>Full name, email, and phone number</li>
                        <li>Specialization (optional — e.g., Engine, Electrical, Body Work)</li>
                    </ul>
                    <p>A <strong>QR code</strong> is automatically generated for attendance check-in!</p>
                </div>`,
                buttons: [
                    { text: '← Back', action: 'back', classes: 'shepherd-button-secondary' },
                    { text: 'Next →', action: 'next' }
                ]
            },
            {
                id: 'technicians-table',
                attachTo: { element: '#tour-technicians-table', on: 'top' },
                text: `<div class="tour-content">
                    <h4>📋 Technicians Table</h4>
                    <p>View all technicians with their details:</p>
                    <ul>
                        <li><strong>Employee ID</strong> — Unique identifier</li>
                        <li><strong>Name, Email, Phone</strong> — Contact info</li>
                        <li><strong>Total Coins</strong> — Reward points earned from completed repairs</li>
                        <li><strong>Status</strong> — Active/Inactive badge + "Present" if checked in today</li>
                        <li><strong>Last Check-in</strong> — When they last scanned their QR code</li>
                    </ul>
                    <p><strong>Actions per technician:</strong></p>
                    <ul>
                        <li>🔳 <strong>QR Code</strong> — View, download, or print their QR ID card</li>
                        <li>✏️ <strong>Edit</strong> — Update their details</li>
                        <li>⏸️ <strong>Activate/Deactivate</strong> — Toggle active status</li>
                        <li>🗑️ <strong>Delete</strong> — Remove technician permanently</li>
                    </ul>
                </div>`,
                buttons: [
                    { text: '← Back', action: 'back', classes: 'shepherd-button-secondary' },
                    { text: 'Done ✓', action: 'next' }
                ]
            }
        ]
    },

    '/customers': {
        title: 'Customers Management Tour',
        steps: [
            {
                id: 'customers-welcome',
                text: `<div class="tour-content">
                    <h4>👥 Customer Management</h4>
                    <p>View and manage all registered customers. Customers are automatically created when they make a booking.</p>
                </div>`,
                buttons: [
                    { text: 'Skip Tour', action: 'cancel', classes: 'shepherd-button-secondary' },
                    { text: 'Next →', action: 'next' }
                ]
            },
            {
                id: 'customers-count',
                attachTo: { element: '#tour-customer-count', on: 'bottom' },
                text: `<div class="tour-content">
                    <h4>🔢 Total Customer Count</h4>
                    <p>This badge shows the total number of registered customers in your system.</p>
                </div>`,
                buttons: [
                    { text: '← Back', action: 'back', classes: 'shepherd-button-secondary' },
                    { text: 'Next →', action: 'next' }
                ]
            },
            {
                id: 'customers-search',
                attachTo: { element: '#tour-customer-search', on: 'bottom' },
                text: `<div class="tour-content">
                    <h4>🔍 Search Customers</h4>
                    <p>Instantly search across all customers by:</p>
                    <ul>
                        <li>Customer name</li>
                        <li>Phone number</li>
                        <li>Vehicle number plate</li>
                        <li>ID number</li>
                    </ul>
                    <p>Results filter in real-time as you type!</p>
                </div>`,
                buttons: [
                    { text: '← Back', action: 'back', classes: 'shepherd-button-secondary' },
                    { text: 'Next →', action: 'next' }
                ]
            },
            {
                id: 'customers-table',
                attachTo: { element: '#tour-customers-table', on: 'top' },
                text: `<div class="tour-content">
                    <h4>📋 Customer Records</h4>
                    <p>Each row shows:</p>
                    <ul>
                        <li><strong>Customer Info</strong> — Name and ID number</li>
                        <li><strong>Vehicle Details</strong> — Number plate, model, and year</li>
                        <li><strong>Contact</strong> — Phone number and email</li>
                        <li><strong>Registered</strong> — When they first booked</li>
                    </ul>
                    <p><strong>Actions:</strong></p>
                    <ul>
                        <li>✏️ <strong>Edit</strong> — Update customer or vehicle details</li>
                        <li>🗑️ <strong>Delete</strong> — Remove customer record</li>
                    </ul>
                </div>`,
                buttons: [
                    { text: '← Back', action: 'back', classes: 'shepherd-button-secondary' },
                    { text: 'Done ✓', action: 'next' }
                ]
            }
        ]
    },

    '/invoices': {
        title: 'Invoices Tour',
        steps: [
            {
                id: 'invoices-welcome',
                text: `<div class="tour-content">
                    <h4>💰 Invoices Management</h4>
                    <p>Create, view, print, and manage all invoices for services and spare parts.</p>
                </div>`,
                buttons: [
                    { text: 'Skip Tour', action: 'cancel', classes: 'shepherd-button-secondary' },
                    { text: 'Next →', action: 'next' }
                ]
            },
            {
                id: 'invoices-create',
                attachTo: { element: '#tour-create-invoice', on: 'bottom' },
                text: `<div class="tour-content">
                    <h4>➕ Create New Invoice</h4>
                    <p>Click here to create a new invoice. The form allows you to:</p>
                    <ul>
                        <li>Choose invoice type — <strong>Service</strong>, <strong>Spare Parts</strong>, or <strong>Both</strong></li>
                        <li>Link to an existing booking (auto-fills customer info)</li>
                        <li>Add multiple line items with description, quantity, and price</li>
                        <li>Apply tax and discounts</li>
                        <li>Select payment method (Cash, Card, Bank Transfer)</li>
                    </ul>
                    <p class="tour-tip">💡 Linking a booking will automatically mark it as completed (paid out)!</p>
                </div>`,
                buttons: [
                    { text: '← Back', action: 'back', classes: 'shepherd-button-secondary' },
                    { text: 'Next →', action: 'next' }
                ]
            },
            {
                id: 'invoices-table',
                attachTo: { element: '#tour-invoices-table', on: 'top' },
                text: `<div class="tour-content">
                    <h4>📋 Invoice Records</h4>
                    <p>All invoices are listed with:</p>
                    <ul>
                        <li><strong>Invoice #</strong> — Auto-generated unique number</li>
                        <li><strong>Date</strong> — When the invoice was created</li>
                        <li><strong>Customer</strong> — Name & phone</li>
                        <li><strong>Type</strong> — Service / Spare Parts / Both</li>
                        <li><strong>Amount</strong> — Total invoice value</li>
                        <li><strong>Payment Method</strong> — How the customer paid</li>
                    </ul>
                    <p><strong>Actions:</strong></p>
                    <ul>
                        <li>👁️ <strong>View</strong> — See full invoice details + Print it</li>
                        <li>🗑️ <strong>Delete</strong> — Remove the invoice</li>
                    </ul>
                </div>`,
                buttons: [
                    { text: '← Back', action: 'back', classes: 'shepherd-button-secondary' },
                    { text: 'Done ✓', action: 'next' }
                ]
            }
        ]
    },

    '/settings': {
        title: 'Settings Tour',
        steps: [
            {
                id: 'settings-welcome',
                text: `<div class="tour-content">
                    <h4>⚙️ Shop Settings</h4>
                    <p>Configure your workshop's operating parameters — shop name, working hours, capacity, currency, and holidays.</p>
                </div>`,
                buttons: [
                    { text: 'Skip Tour', action: 'cancel', classes: 'shepherd-button-secondary' },
                    { text: 'Next →', action: 'next' }
                ]
            },
            {
                id: 'settings-shop',
                attachTo: { element: '#tour-shop-settings', on: 'bottom' },
                text: `<div class="tour-content">
                    <h4>🏪 Shop Configuration</h4>
                    <p>Set up your core business parameters:</p>
                    <ul>
                        <li><strong>Shop Name</strong> — Displayed across the system</li>
                        <li><strong>Opening / Closing Time</strong> — Defines when bookings can be made</li>
                        <li><strong>Max Bookings Per Day</strong> — Limits daily capacity</li>
                        <li><strong>Currency Symbol</strong> — Used in invoices and billing</li>
                    </ul>
                    <p>Click <strong>Save Settings</strong> to apply changes.</p>
                </div>`,
                buttons: [
                    { text: '← Back', action: 'back', classes: 'shepherd-button-secondary' },
                    { text: 'Next →', action: 'next' }
                ]
            },
            {
                id: 'settings-holidays',
                attachTo: { element: '#tour-holiday-settings', on: 'top' },
                text: `<div class="tour-content">
                    <h4>📅 Holiday Management</h4>
                    <p>Add holidays (days when the shop is closed) to prevent customers from booking on those dates.</p>
                    <ul>
                        <li>Enter a date and optional reason (e.g., "Vesak Day")</li>
                        <li>Past holidays are shown in gray and can't be removed</li>
                        <li>Upcoming holidays can be deleted if plans change</li>
                    </ul>
                    <p class="tour-tip">💡 Customers will see "Shop Closed" on holiday dates when trying to book.</p>
                </div>`,
                buttons: [
                    { text: '← Back', action: 'back', classes: 'shepherd-button-secondary' },
                    { text: 'Done ✓', action: 'next' }
                ]
            }
        ]
    },

    '/technician-portal': {
        title: 'Technician Portal Tour',
        steps: [
            {
                id: 'tech-portal-welcome',
                text: `<div class="tour-content">
                    <h4>🔧 Technician Portal</h4>
                    <p>This is the technician's workspace — where they manage their assigned repair jobs and update progress.</p>
                </div>`,
                buttons: [
                    { text: 'Skip Tour', action: 'cancel', classes: 'shepherd-button-secondary' },
                    { text: 'Next →', action: 'next' }
                ]
            },
            {
                id: 'tech-portal-select',
                attachTo: { element: '#tour-tech-select', on: 'bottom' },
                text: `<div class="tour-content">
                    <h4>👤 Technician Selection</h4>
                    <p>Select your name from the dropdown to view your jobs. Only <strong>present</strong> (checked-in) technicians appear here.</p>
                    <p class="tour-tip">💡 You must check in via QR code before you can access your jobs.</p>
                </div>`,
                buttons: [
                    { text: '← Back', action: 'back', classes: 'shepherd-button-secondary' },
                    { text: 'Next →', action: 'next' }
                ]
            },
            {
                id: 'tech-portal-summary',
                attachTo: { element: '#tour-tech-summary', on: 'bottom' },
                text: `<div class="tour-content">
                    <h4>📊 Job Summary Cards</h4>
                    <p>Once you select a technician, these cards show:</p>
                    <ul>
                        <li><strong>Pending</strong> — Jobs waiting for your acceptance</li>
                        <li><strong>In Progress</strong> — Jobs you're currently working on</li>
                        <li><strong>Completed Today</strong> — Jobs finished today</li>
                    </ul>
                </div>`,
                buttons: [
                    { text: '← Back', action: 'back', classes: 'shepherd-button-secondary' },
                    { text: 'Next →', action: 'next' }
                ]
            },
            {
                id: 'tech-portal-jobs',
                attachTo: { element: '#tour-tech-jobs', on: 'top' },
                text: `<div class="tour-content">
                    <h4>📋 My Assigned Jobs</h4>
                    <p>Your repair assignments are listed here. For each job you can:</p>
                    <ul>
                        <li><strong>Accept</strong> — Start working on the vehicle</li>
                        <li><strong>Decline</strong> — Refuse the job (with a reason)</li>
                        <li><strong>Mark as Repaired</strong> — Signal that the repair is done</li>
                    </ul>
                    <p>Each action opens a confirmation popup where you can add notes.</p>
                </div>`,
                buttons: [
                    { text: '← Back', action: 'back', classes: 'shepherd-button-secondary' },
                    { text: 'Done ✓', action: 'next' }
                ]
            }
        ]
    },

    '/attendance': {
        title: 'Attendance Tour',
        steps: [
            {
                id: 'attendance-welcome',
                text: `<div class="tour-content">
                    <h4>✅ Attendance Management</h4>
                    <p>Track technician check-ins and manage attendance manually when needed.</p>
                </div>`,
                buttons: [
                    { text: 'Skip Tour', action: 'cancel', classes: 'shepherd-button-secondary' },
                    { text: 'Next →', action: 'next' }
                ]
            },
            {
                id: 'attendance-search',
                attachTo: { element: '#tour-attendance-search', on: 'bottom' },
                text: `<div class="tour-content">
                    <h4>🔍 Search Technician</h4>
                    <p>Search by Employee ID or name to quickly find a technician for manual check-in/out.</p>
                </div>`,
                buttons: [
                    { text: '← Back', action: 'back', classes: 'shepherd-button-secondary' },
                    { text: 'Next →', action: 'next' }
                ]
            },
            {
                id: 'attendance-list',
                attachTo: { element: '#tour-attendance-list', on: 'top' },
                text: `<div class="tour-content">
                    <h4>📋 Technician Attendance</h4>
                    <p>All active technicians are listed with their current attendance status.</p>
                    <ul>
                        <li><strong>Check In</strong> — Mark a technician as present for today</li>
                        <li><strong>Check Out</strong> — Mark a technician as leaving for the day</li>
                        <li>View their last check-in time and attendance history</li>
                    </ul>
                    <p class="tour-tip">💡 Technicians can also self-check-in using the QR Scanner page!</p>
                </div>`,
                buttons: [
                    { text: '← Back', action: 'back', classes: 'shepherd-button-secondary' },
                    { text: 'Done ✓', action: 'next' }
                ]
            }
        ]
    },

    '/public': {
        title: 'Public View Tour',
        steps: [
            {
                id: 'public-welcome',
                text: `<div class="tour-content">
                    <h4>📺 Public Display View</h4>
                    <p>This page is designed to be shown on a TV screen in your workshop. It shows the real-time queue and technician status for customers waiting.</p>
                </div>`,
                buttons: [
                    { text: 'Skip Tour', action: 'cancel', classes: 'shepherd-button-secondary' },
                    { text: 'Next →', action: 'next' }
                ]
            },
            {
                id: 'public-status',
                attachTo: { element: '#tour-public-status', on: 'bottom' },
                text: `<div class="tour-content">
                    <h4>📊 Shop Status Cards</h4>
                    <p>Shows live workshop status to waiting customers:</p>
                    <ul>
                        <li>Active bookings count</li>
                        <li>Available technicians</li>
                        <li>Quick-action buttons (Book, Lookup, Scan QR)</li>
                    </ul>
                </div>`,
                buttons: [
                    { text: '← Back', action: 'back', classes: 'shepherd-button-secondary' },
                    { text: 'Next →', action: 'next' }
                ]
            },
            {
                id: 'public-queue',
                attachTo: { element: '#tour-public-queue', on: 'top' },
                text: `<div class="tour-content">
                    <h4>🔄 Live Queue Visualizer</h4>
                    <p>Customers can see their position in the service queue — waiting, being serviced, or in the pending queue. Each slot shows the vehicle number plate.</p>
                    <p class="tour-tip">💡 This view auto-refreshes to keep the queue display accurate in real-time.</p>
                </div>`,
                buttons: [
                    { text: '← Back', action: 'back', classes: 'shepherd-button-secondary' },
                    { text: 'Done ✓', action: 'next' }
                ]
            }
        ]
    },

    '/booking': {
        title: 'Booking Form Tour',
        steps: [
            {
                id: 'booking-welcome',
                text: `<div class="tour-content">
                    <h4>📝 New Booking Form</h4>
                    <p>This page is where customers (or staff) create a new vehicle repair booking.</p>
                </div>`,
                buttons: [
                    { text: 'Skip Tour', action: 'cancel', classes: 'shepherd-button-secondary' },
                    { text: 'Next →', action: 'next' }
                ]
            },
            {
                id: 'booking-form',
                attachTo: { element: '#tour-booking-form', on: 'top' },
                text: `<div class="tour-content">
                    <h4>📋 Booking Details</h4>
                    <p>Fill in the required information:</p>
                    <ul>
                        <li><strong>ID Number</strong> — If the customer exists, their details auto-fill!</li>
                        <li><strong>Name & Phone</strong> — Customer contact details</li>
                        <li><strong>Vehicle Number & Model</strong> — Vehicle identification</li>
                        <li><strong>Problem Description</strong> — What needs to be repaired</li>
                    </ul>
                    <p class="tour-tip">💡 Bookings can only be made during working hours and on non-holiday days.</p>
                </div>`,
                buttons: [
                    { text: '← Back', action: 'back', classes: 'shepherd-button-secondary' },
                    { text: 'Done ✓', action: 'next' }
                ]
            }
        ]
    },

    '/customer-lookup': {
        title: 'Customer Lookup Tour',
        steps: [
            {
                id: 'lookup-welcome',
                text: `<div class="tour-content">
                    <h4>🔍 Customer Lookup</h4>
                    <p>Customers use this page to check their repair status, view queue position, leave reviews, and rebook.</p>
                </div>`,
                buttons: [
                    { text: 'Skip Tour', action: 'cancel', classes: 'shepherd-button-secondary' },
                    { text: 'Next →', action: 'next' }
                ]
            },
            {
                id: 'lookup-search',
                attachTo: { element: '#tour-lookup-search', on: 'bottom' },
                text: `<div class="tour-content">
                    <h4>🔍 Search Your Record</h4>
                    <p>Enter your ID number, phone number, or vehicle number to find your booking and repair history.</p>
                </div>`,
                buttons: [
                    { text: '← Back', action: 'back', classes: 'shepherd-button-secondary' },
                    { text: 'Next →', action: 'next' }
                ]
            },
            {
                id: 'lookup-features',
                text: `<div class="tour-content">
                    <h4>🎯 Available Features</h4>
                    <p>After finding your record, you can:</p>
                    <ul>
                        <li>📊 <strong>View Queue Position</strong> — See where you are in the service queue</li>
                        <li>📝 <strong>Edit Profile</strong> — Update your contact details</li>
                        <li>⭐ <strong>Leave a Review</strong> — Rate your experience (1–5 stars + comment)</li>
                        <li>🔄 <strong>Rebook</strong> — Schedule another visit with pre-filled details</li>
                        <li>📜 <strong>Service History</strong> — View all past bookings and statuses</li>
                    </ul>
                </div>`,
                buttons: [
                    { text: '← Back', action: 'back', classes: 'shepherd-button-secondary' },
                    { text: 'Done ✓', action: 'next' }
                ]
            }
        ]
    },

    '/qr-scanner': {
        title: 'QR Scanner Tour',
        steps: [
            {
                id: 'qr-welcome',
                text: `<div class="tour-content">
                    <h4>📷 QR Code Scanner</h4>
                    <p>Technicians use this page to check in/out by scanning their QR code ID card.</p>
                </div>`,
                buttons: [
                    { text: 'Skip Tour', action: 'cancel', classes: 'shepherd-button-secondary' },
                    { text: 'Next →', action: 'next' }
                ]
            },
            {
                id: 'qr-scanner',
                attachTo: { element: '#tour-qr-scanner', on: 'top' },
                text: `<div class="tour-content">
                    <h4>📱 Scan or Manual Entry</h4>
                    <p>Two ways to check in:</p>
                    <ul>
                        <li><strong>Camera Scan</strong> — Point camera at the QR code on the technician's ID card</li>
                        <li><strong>Manual Entry</strong> — Type the Employee ID directly</li>
                    </ul>
                    <p>Recent check-ins are shown in the list below for reference.</p>
                    <p class="tour-tip">💡 This page is great on a tablet placed at the workshop entrance!</p>
                </div>`,
                buttons: [
                    { text: '← Back', action: 'back', classes: 'shepherd-button-secondary' },
                    { text: 'Done ✓', action: 'next' }
                ]
            }
        ]
    },

    '/login': {
        title: 'Login Tour',
        steps: [
            {
                id: 'login-welcome',
                text: `<div class="tour-content">
                    <h4>🔐 Login Page</h4>
                    <p>Enter your credentials to access the admin panel or technician portal.</p>
                    <ul>
                        <li><strong>Admin accounts</strong> — Get access to Dashboard, Bookings, Technicians, Customers, Invoices, and Settings</li>
                        <li><strong>Technician accounts</strong> — Access the Technician Portal and Attendance pages</li>
                    </ul>
                </div>`,
                buttons: [
                    { text: 'Got it ✓', action: 'next' }
                ]
            }
        ]
    }
};

const TourGuide = () => {
    const location = useLocation();
    const tourRef = useRef(null);

    const startTour = useCallback(() => {
        // Destroy existing tour if any
        if (tourRef.current) {
            tourRef.current.cancel();
            tourRef.current = null;
        }

        const config = tourConfigs[location.pathname];
        if (!config) return;

        const tour = new Shepherd.Tour({
            useModalOverlay: true,
            defaultStepOptions: {
                classes: 'shepherd-theme-custom',
                scrollTo: { behavior: 'smooth', block: 'center' },
                cancelIcon: { enabled: true },
                modalOverlayOpeningPadding: 8,
                modalOverlayOpeningRadius: 8,
            }
        });

        config.steps.forEach(step => {
            const buttons = step.buttons.map(btn => ({
                text: btn.text,
                action: () => tour[btn.action](),
                classes: btn.classes || 'shepherd-button-primary'
            }));

            tour.addStep({
                id: step.id,
                text: step.text,
                attachTo: step.attachTo || undefined,
                buttons,
                when: {
                    show() {
                        // Animate step entry
                        const el = this.el;
                        if (el) {
                            el.style.animation = 'tourSlideIn 0.3s ease-out';
                        }
                    }
                }
            });
        });

        tourRef.current = tour;
        tour.start();
    }, [location.pathname]);

    // Cleanup on unmount or path change
    useEffect(() => {
        return () => {
            if (tourRef.current) {
                tourRef.current.cancel();
                tourRef.current = null;
            }
        };
    }, [location.pathname]);

    // Check if current page has a tour
    const hasTour = tourConfigs[location.pathname];
    if (!hasTour) return null;

    return (
        <button
            id="tour-guide-trigger"
            className="tour-guide-fab"
            onClick={startTour}
            title={`Start ${hasTour.title}`}
        >
            <FaQuestion />
            <span className="tour-fab-label">Tour Guide</span>
        </button>
    );
};

export default TourGuide;

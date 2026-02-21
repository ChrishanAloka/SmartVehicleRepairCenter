const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const { errorHandler, notFound } = require('./middleware/error');

// Load env vars
dotenv.config();

// Connect to database
connectDB().then(() => {
    // Start notification reminder job
    const { startReminderJob } = require('./controllers/notificationController');
    startReminderJob();
});

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/technicians', require('./routes/technicianRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/customers', require('./routes/customerRoutes'));
app.use('/api/invoices', require('./routes/invoiceRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

// Health check
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
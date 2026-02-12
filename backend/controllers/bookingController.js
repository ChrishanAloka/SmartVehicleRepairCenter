const Booking = require('../models/Booking');
const Customer = require('../models/Customer');
const Technician = require('../models/Technician');
const ShopSettings = require('../models/ShopSettings');
const moment = require('moment');

const autoCleanupPending = async () => {
    try {
        const shopSettings = await ShopSettings.findOne();
        if (!shopSettings) return 0;

        const closingTime = shopSettings.closingTime || '18:00';
        const today = moment().startOf('day').toDate();
        const tomorrow = moment(today).add(1, 'day').toDate();
        const now = moment();

        const [closingHour, closingMinute] = closingTime.split(':');
        const closingDateTime = moment().hours(closingHour).minutes(closingMinute);

        // Only cleanup if past closing time
        if (now.isAfter(closingDateTime)) {
            const result = await Booking.updateMany(
                {
                    bookingDate: { $gte: today, $lt: tomorrow },
                    status: 'pending',
                    isPaidOut: false
                },
                {
                    $set: {
                        status: 'not_today',
                        notes: 'Automatically moved to "Not Today" - Not accepted before closing time'
                    }
                }
            );
            return result.modifiedCount;
        }
        return 0;
    } catch (error) {
        console.error('Auto-cleanup error:', error);
        return 0;
    }
};

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Public
const createBooking = async (req, res) => {
    try {
        const {
            name,
            phone,
            email,
            idNumber,
            vehicleNumber,
            vehicleModel,
            vehicleYear,
            bookingDate,
            problemDescription
        } = req.body;

        // Check if shop is open and within hours
        const shopSettings = await ShopSettings.findOne();
        if (shopSettings) {
            const bookingDateObj = new Date(bookingDate);
            const isToday = moment(bookingDateObj).isSame(moment(), 'day');

            // Check for holidays
            const isHoliday = shopSettings.holidays.some(holiday =>
                moment(holiday.date).format('YYYY-MM-DD') === moment(bookingDateObj).format('YYYY-MM-DD')
            );

            if (isHoliday) {
                return res.status(400).json({ message: 'The shop is closed for a holiday on this date.' });
            }

            // Check working hours only for same-day bookings
            if (isToday) {
                const now = moment();
                const [openH, openM] = shopSettings.openingTime.split(':');
                const [closeH, closeM] = shopSettings.closingTime.split(':');

                const openTime = moment().hours(openH).minutes(openM).seconds(0);
                const closeTime = moment().hours(closeH).minutes(closeM).seconds(0);

                if (!now.isBetween(openTime, closeTime, null, '[]')) {
                    return res.status(400).json({
                        message: `Same-day bookings are only allowed during working hours (${shopSettings.openingTime} - ${shopSettings.closingTime})`
                    });
                }
            }
        }

        // Find or create customer
        let customer = await Customer.findOne({
            $or: [{ idNumber }, { vehicleNumber: vehicleNumber.toUpperCase() }]
        });

        if (customer) {
            // Update customer info if needed
            customer.name = name;
            customer.phone = phone;
            customer.email = email || customer.email;
            customer.vehicleModel = vehicleModel || customer.vehicleModel;
            customer.vehicleYear = vehicleYear || customer.vehicleYear;
            await customer.save();
        } else {
            // Create new customer
            customer = await Customer.create({
                name,
                phone,
                email,
                idNumber,
                vehicleNumber: vehicleNumber.toUpperCase(),
                vehicleModel,
                vehicleYear
            });
        }

        // Create booking
        const booking = await Booking.create({
            customer: customer._id,
            bookingDate,
            problemDescription,
            status: 'pending'
        });

        const populatedBooking = await Booking.findById(booking._id).populate('customer');

        res.status(201).json(populatedBooking);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all bookings
// @route   GET /api/bookings
// @access  Private
const getBookings = async (req, res) => {
    try {
        const { date, status, technician } = req.query;

        let query = {};

        if (date) {
            const startDate = moment(date).startOf('day').toDate();
            const endDate = moment(date).endOf('day').toDate();
            query.bookingDate = { $gte: startDate, $lte: endDate };
        }

        if (status) {
            query.status = status;
        }

        if (technician) {
            query.technician = technician;
        }

        const bookings = await Booking.find(query)
            .populate('customer')
            .populate('technician')
            .sort({ bookingDate: -1 });

        res.json(bookings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get today's bookings
// @route   GET /api/bookings/today
// @access  Public
const getTodayBookings = async (req, res) => {
    try {
        // Automatically cleanup pending bookings if past closing time
        await autoCleanupPending();

        const startDate = moment().startOf('day').toDate();
        const endDate = moment().endOf('day').toDate();

        const bookings = await Booking.find({
            bookingDate: { $gte: startDate, $lte: endDate },
            status: { $nin: ['cancelled'] }
        })
            .populate('customer')
            .populate('technician')
            .sort({ createdAt: 1 });

        res.json(bookings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single booking
// @route   GET /api/bookings/:id
// @access  Public
const getBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate('customer')
            .populate('technician');

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        res.json(booking);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update booking status
// @route   PUT /api/bookings/:id/status
// @access  Public (Technician)
const updateBookingStatus = async (req, res) => {
    try {
        const { status, technicianId, notes } = req.body;

        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Verify technician if provided
        if (technicianId) {
            const technician = await Technician.findById(technicianId);
            if (!technician) {
                return res.status(404).json({ message: 'Technician not found' });
            }
            booking.technician = technicianId;
        }

        booking.status = status;
        if (notes) {
            booking.notes = notes;
        }

        if (status === 'declined' || status === 'not_today') {
            booking.technician = null;
        }

        await booking.save();

        const updatedBooking = await Booking.findById(booking._id)
            .populate('customer')
            .populate('technician');

        res.json(updatedBooking);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mark booking as paid
// @route   PUT /api/bookings/:id/payout
// @access  Private
const payoutBooking = async (req, res) => {
    try {
        const { amount } = req.body;

        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        if (booking.status !== 'accepted' && booking.status !== 'completed') {
            return res.status(400).json({ message: 'Cannot payout this booking' });
        }

        booking.isPaidOut = true;
        booking.amount = amount || booking.amount;
        booking.status = 'completed';

        await booking.save();

        const updatedBooking = await Booking.findById(booking._id)
            .populate('customer')
            .populate('technician');

        res.json(updatedBooking);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get customer bookings
// @route   GET /api/bookings/customer/:identifier
// @access  Public
const getCustomerBookings = async (req, res) => {
    try {
        const { identifier } = req.params; // Can be vehicleNumber or idNumber

        const customer = await Customer.findOne({
            $or: [
                { vehicleNumber: identifier.toUpperCase() },
                { idNumber: identifier }
            ]
        });

        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        const bookings = await Booking.find({ customer: customer._id })
            .populate('technician')
            .sort({ bookingDate: -1 });

        res.json({
            customer,
            bookings
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Cancel/Cleanup expired bookings manually
// @route   POST /api/bookings/cancel-expired
// @access  Private (Admin/Staff)
const cancelExpiredBookings = async (req, res) => {
    try {
        const count = await autoCleanupPending();
        res.json({
            message: count > 0 ? 'Pending bookings moved to "Not Today"' : 'No pending bookings to move or shop still open',
            count
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createBooking,
    getBookings,
    getTodayBookings,
    getBooking,
    updateBookingStatus,
    payoutBooking,
    getCustomerBookings,
    cancelExpiredBookings
};
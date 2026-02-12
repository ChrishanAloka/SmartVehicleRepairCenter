const express = require('express');
const router = express.Router();
const {
    createBooking,
    getBookings,
    getTodayBookings,
    getBooking,
    updateBookingStatus,
    payoutBooking,
    getCustomerBookings,
    cancelExpiredBookings
} = require('../controllers/bookingController');
const { protect } = require('../middleware/auth');

router.route('/')
    .get(protect, getBookings)
    .post(createBooking);

router.get('/today', getTodayBookings);
router.get('/customer/:identifier', getCustomerBookings);
router.post('/cancel-expired', protect, cancelExpiredBookings);

router.route('/:id')
    .get(getBooking);

router.put('/:id/status', updateBookingStatus);
router.put('/:id/payout', protect, payoutBooking);

module.exports = router;
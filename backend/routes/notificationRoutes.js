const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    getNotifications,
    markAsRead,
    markAllAsRead,
    subscribe,
    unsubscribe,
    getVapidPublicKey
} = require('../controllers/notificationController');

// Public: expose VAPID public key so browser can subscribe
router.get('/vapid-public-key', getVapidPublicKey);

// All notification routes require a logged-in user
router.get('/', protect, getNotifications);
router.put('/read-all', protect, markAllAsRead);
router.put('/:id/read', protect, markAsRead);

// Push subscription management
router.post('/subscribe', protect, subscribe);
router.delete('/subscribe', protect, unsubscribe);

module.exports = router;

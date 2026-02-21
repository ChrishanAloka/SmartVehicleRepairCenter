const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    getNotifications,
    markAsRead,
    markAllAsRead,
    subscribe,
    unsubscribe,
    getVapidPublicKey,
    getPushStatus,
    testPush
} = require('../controllers/notificationController');

// Public: VAPID public key (browser needs this to subscribe)
router.get('/vapid-public-key', getVapidPublicKey);

// Authenticated notification routes
router.get('/', protect, getNotifications);
router.put('/read-all', protect, markAllAsRead);
router.put('/:id/read', protect, markAsRead);

// Push subscription management
router.post('/subscribe', protect, subscribe);
router.delete('/subscribe', protect, unsubscribe);

// Diagnostic / debug
router.get('/push-status', protect, getPushStatus);
router.post('/test-push', protect, testPush);

module.exports = router;

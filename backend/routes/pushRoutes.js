const express = require('express');
const router = express.Router();
const PushSubscription = require('../models/PushSubscription');

/**
 * POST /api/push/subscribe
 * Register or update a push subscription. Called by the frontend after subscribing.
 * Body: { subscription, role, userId? }
 */
router.post('/subscribe', async (req, res) => {
    try {
        const { subscription, role = 'public', userId = null } = req.body;

        if (!subscription || !subscription.endpoint) {
            return res.status(400).json({ message: 'Invalid subscription object' });
        }

        // Upsert — if this endpoint already exists, update its role/userId
        await PushSubscription.findOneAndUpdate(
            { endpoint: subscription.endpoint },
            { subscription, role, userId },
            { upsert: true, new: true }
        );

        res.status(201).json({ message: 'Subscription saved' });
    } catch (error) {
        console.error('[Push] Subscribe error:', error);
        res.status(500).json({ message: error.message });
    }
});

/**
 * POST /api/push/unsubscribe
 * Remove a push subscription (e.g. on logout).
 * Body: { endpoint }
 */
router.post('/unsubscribe', async (req, res) => {
    try {
        const { endpoint } = req.body;
        if (!endpoint) return res.status(400).json({ message: 'Endpoint required' });

        await PushSubscription.deleteOne({ endpoint });
        res.json({ message: 'Unsubscribed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

/**
 * GET /api/push/vapid-public-key
 * Returns the VAPID public key so the client can subscribe.
 */
router.get('/vapid-public-key', (req, res) => {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

module.exports = router;

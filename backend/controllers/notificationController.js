const webpush = require('web-push');
const Notification = require('../models/Notification');
const User = require('../models/User');

// ─── VAPID setup ──────────────────────────────────────────────────────────────
webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:admin@smartrepair.local',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Get all users who should receive a notification based on audience
const getTargetUsers = async (audience) => {
    if (audience === 'all_staff') {
        return await User.find({ isActive: true, pushSubscriptions: { $exists: true, $ne: [] } });
    } else if (audience === 'admin_only') {
        return await User.find({ isActive: true, role: 'admin', pushSubscriptions: { $exists: true, $ne: [] } });
    }
    return [];
};

// Send a push notification to all subscriptions of a user, removing invalid ones
const pushToUser = async (user, payload) => {
    const validSubs = [];
    for (const sub of user.pushSubscriptions) {
        try {
            await webpush.sendNotification(sub, JSON.stringify(payload));
            validSubs.push(sub);
        } catch (err) {
            // 410 Gone = subscription expired/unsubscribed → remove it
            if (err.statusCode === 410 || err.statusCode === 404) {
                console.log(`Removing stale push subscription for user ${user._id}`);
            } else {
                console.error(`Push error for user ${user._id}:`, err.message);
                validSubs.push(sub); // keep on transient errors
            }
        }
    }
    // Clean up stale subscriptions if any were removed
    if (validSubs.length !== user.pushSubscriptions.length) {
        await User.findByIdAndUpdate(user._id, { pushSubscriptions: validSubs });
    }
};

// ─── Subscribe / Unsubscribe ──────────────────────────────────────────────────

// @desc    Save a push subscription for the logged-in user
// @route   POST /api/notifications/subscribe
// @access  Private
const subscribe = async (req, res) => {
    try {
        const { subscription } = req.body;
        if (!subscription || !subscription.endpoint) {
            return res.status(400).json({ message: 'Invalid subscription object' });
        }

        const user = await User.findById(req.user._id);

        // Avoid duplicate subscriptions (same endpoint)
        const alreadyExists = user.pushSubscriptions.some(s => s.endpoint === subscription.endpoint);
        if (!alreadyExists) {
            user.pushSubscriptions.push(subscription);
            await user.save();
        }

        res.json({ message: 'Subscribed to push notifications' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Remove a push subscription for the logged-in user
// @route   DELETE /api/notifications/subscribe
// @access  Private
const unsubscribe = async (req, res) => {
    try {
        const { endpoint } = req.body;
        if (!endpoint) return res.status(400).json({ message: 'endpoint required' });

        await User.findByIdAndUpdate(req.user._id, {
            $pull: { pushSubscriptions: { endpoint } }
        });

        res.json({ message: 'Unsubscribed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Return the VAPID public key (needed by frontend to subscribe)
// @route   GET /api/notifications/vapid-public-key
// @access  Public
const getVapidPublicKey = (req, res) => {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
};

// ─── Notification CRUD ───────────────────────────────────────────────────────

// @desc    Get notifications for the logged-in user (based on role)
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
    try {
        const userId = req.user._id;
        const userRole = req.user.role;

        let audienceFilter;
        if (userRole === 'admin') {
            audienceFilter = { audience: { $in: ['all_staff', 'admin_only'] } };
        } else {
            audienceFilter = { audience: 'all_staff' };
        }

        const notifications = await Notification.find(audienceFilter)
            .sort({ createdAt: -1 })
            .limit(50)
            .populate('bookingId', 'bookingDate status')
            .lean();

        const result = notifications.map(n => ({
            ...n,
            isRead: n.readBy.some(id => id.toString() === userId.toString())
        }));

        const unreadCount = result.filter(n => !n.isRead).length;

        res.json({ notifications: result, unreadCount });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mark a single notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res) => {
    try {
        const userId = req.user._id;
        const notification = await Notification.findById(req.params.id);
        if (!notification) return res.status(404).json({ message: 'Notification not found' });

        if (!notification.readBy.some(id => id.toString() === userId.toString())) {
            notification.readBy.push(userId);
            await notification.save();
        }

        res.json({ message: 'Marked as read' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mark all notifications as read for the current user
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user._id;
        const userRole = req.user.role;

        let audienceFilter;
        if (userRole === 'admin') {
            audienceFilter = { audience: { $in: ['all_staff', 'admin_only'] } };
        } else {
            audienceFilter = { audience: 'all_staff' };
        }

        await Notification.updateMany(
            { ...audienceFilter, readBy: { $ne: userId } },
            { $addToSet: { readBy: userId } }
        );

        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── Internal helper called by bookingController ─────────────────────────────

// Helper: Create a DB notification AND send native push to relevant users
const createNotification = async ({ type, audience, title, message, bookingId }) => {
    try {
        // 1. Save to database
        const notif = await Notification.create({ type, audience, title, message, bookingId });

        // 2. Send Web Push to all relevant users who have subscriptions
        const targetUsers = await getTargetUsers(audience);
        const pushPayload = {
            title,
            body: message,
            icon: '/logo.png',
            badge: '/logo.png',
            tag: `notif-${notif._id}`,     // replace same-type notifs on Android
            data: { notifId: notif._id, bookingId, type, url: '/' }
        };

        await Promise.all(targetUsers.map(user => pushToUser(user, pushPayload)));
    } catch (error) {
        console.error('Failed to create notification:', error.message);
    }
};

module.exports = {
    getVapidPublicKey,
    subscribe,
    unsubscribe,
    getNotifications,
    markAsRead,
    markAllAsRead,
    createNotification
};

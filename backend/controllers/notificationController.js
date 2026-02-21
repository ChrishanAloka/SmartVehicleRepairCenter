const webpush = require('web-push');
const Notification = require('../models/Notification');
const User = require('../models/User');

// ─── VAPID setup (lazy) ───────────────────────────────────────────────────────
// Never call setVapidDetails() at module load — it throws if env vars are absent.
// Instead call initVapid() lazily, right before any push is sent.

let vapidReady = false;

const initVapid = () => {
    if (vapidReady) return true;
    const pub = process.env.VAPID_PUBLIC_KEY;
    const priv = process.env.VAPID_PRIVATE_KEY;
    if (!pub || !priv) {
        console.warn('[Push] VAPID keys not set — native push notifications disabled.');
        return false;
    }
    try {
        webpush.setVapidDetails(
            process.env.VAPID_EMAIL || 'mailto:admin@smartrepair.local',
            pub,
            priv
        );
        vapidReady = true;
        console.log('[Push] VAPID initialised');
        return true;
    } catch (err) {
        console.error('[Push] VAPID init failed:', err.message);
        return false;
    }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Send a push to all subscriptions of one user; prune stale ones
const pushToUser = async (user, payload) => {
    if (!initVapid()) return; // VAPID not configured → skip silently
    if (!user.pushSubscriptions || user.pushSubscriptions.length === 0) return;

    const validSubs = [];
    for (const sub of user.pushSubscriptions) {
        try {
            await webpush.sendNotification(sub, JSON.stringify(payload));
            validSubs.push(sub);
        } catch (err) {
            if (err.statusCode === 410 || err.statusCode === 404) {
                console.log(`[Push] Stale subscription removed for user ${user._id}`);
            } else {
                console.error(`[Push] Send error for user ${user._id}:`, err.message);
                validSubs.push(sub); // keep on transient errors
            }
        }
    }
    if (validSubs.length !== user.pushSubscriptions.length) {
        await User.findByIdAndUpdate(user._id, { pushSubscriptions: validSubs });
    }
};

// Get users who should receive a push based on audience
const getTargetUsers = async (audience) => {
    if (audience === 'all_staff') {
        return await User.find({ isActive: true, pushSubscriptions: { $exists: true, $ne: [] } });
    }
    if (audience === 'admin_only') {
        return await User.find({ isActive: true, role: 'admin', pushSubscriptions: { $exists: true, $ne: [] } });
    }
    return [];
};

// ─── VAPID public key ─────────────────────────────────────────────────────────

// @desc    Return VAPID public key + whether push is configured
// @route   GET /api/notifications/vapid-public-key
// @access  Public
const getVapidPublicKey = (req, res) => {
    const key = process.env.VAPID_PUBLIC_KEY;
    res.json({
        publicKey: key || null,
        configured: !!key
    });
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
        if (!user) return res.status(404).json({ message: 'User not found' });

        const alreadyExists = user.pushSubscriptions.some(s => s.endpoint === subscription.endpoint);
        if (!alreadyExists) {
            user.pushSubscriptions.push(subscription);
            await user.save();
            console.log(`[Push] New subscription saved for user ${user.username}`);
        } else {
            console.log(`[Push] Subscription already exists for user ${user.username}`);
        }

        res.json({ message: 'Subscribed', totalSubscriptions: user.pushSubscriptions.length });
    } catch (error) {
        console.error('[Push] Subscribe error:', error.message);
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

// ─── Push Status (diagnostic) ─────────────────────────────────────────────────

// @desc    Return push subscription status for the logged-in user
// @route   GET /api/notifications/push-status
// @access  Private
const getPushStatus = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('pushSubscriptions username');
        res.json({
            vapidConfigured: !!process.env.VAPID_PUBLIC_KEY,
            subscriptionCount: user.pushSubscriptions.length,
            username: user.username,
            // Show only endpoints (not full keys) for security
            endpoints: user.pushSubscriptions.map(s => s.endpoint?.substring(0, 60) + '...')
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── Test Push ────────────────────────────────────────────────────────────────

// @desc    Send a test native push notification to the logged-in user's devices
// @route   POST /api/notifications/test-push
// @access  Private
const testPush = async (req, res) => {
    try {
        if (!initVapid()) {
            return res.status(503).json({
                message: 'Push notifications not configured. Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_EMAIL environment variables on the server.'
            });
        }

        const user = await User.findById(req.user._id);
        if (!user.pushSubscriptions || user.pushSubscriptions.length === 0) {
            return res.status(400).json({
                message: 'No push subscriptions found for this account. Make sure you have granted notification permission in the app.'
            });
        }

        const payload = {
            title: '🔔 Test Notification',
            body: 'Push notifications are working! You will receive alerts here.',
            icon: '/logo.png',
            badge: '/logo.png',
            tag: 'svrc-test',
            data: { url: '/', type: 'test' }
        };

        await pushToUser(user, payload);
        res.json({ message: 'Test push sent', subscriptions: user.pushSubscriptions.length });
    } catch (error) {
        console.error('[Push] Test push error:', error.message);
        res.status(500).json({ message: error.message });
    }
};

// ─── Notification CRUD ────────────────────────────────────────────────────────

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

// ─── Internal helper called by bookingController ──────────────────────────────

// Create a DB notification AND send native push to relevant staff
const createNotification = async ({ type, audience, title, message, bookingId }) => {
    try {
        // 1. Save to database
        const notif = await Notification.create({ type, audience, title, message, bookingId });

        // 2. Send Web Push to all relevant users who have subscriptions
        const targetUsers = await getTargetUsers(audience);
        console.log(`[Push] Sending to ${targetUsers.length} user(s) for audience: ${audience}`);

        const pushPayload = {
            title,
            body: message,
            icon: '/logo.png',
            badge: '/logo.png',
            tag: `notif-${notif._id}`,
            renotify: true,
            data: { notifId: notif._id, bookingId, type, url: '/' }
        };

        await Promise.all(targetUsers.map(user => pushToUser(user, pushPayload)));
    } catch (error) {
        console.error('[Push] createNotification error:', error.message);
    }
};

module.exports = {
    getVapidPublicKey,
    subscribe,
    unsubscribe,
    getPushStatus,
    testPush,
    getNotifications,
    markAsRead,
    markAllAsRead,
    createNotification
};

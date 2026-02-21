const webpush = require('web-push');
const Notification = require('../models/Notification');
const User = require('../models/User');

// ─── VAPID setup (lazy) ───────────────────────────────────────────────────────
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

const pushToUser = async (user, payload) => {
    if (!initVapid()) return;
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
                validSubs.push(sub);
            }
        }
    }
    if (validSubs.length !== user.pushSubscriptions.length) {
        await User.findByIdAndUpdate(user._id, { pushSubscriptions: validSubs });
    }
};

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

const getVapidPublicKey = (req, res) => {
    const key = process.env.VAPID_PUBLIC_KEY;
    res.json({
        publicKey: key || null,
        configured: !!key
    });
};

// ─── Subscribe / Unsubscribe ──────────────────────────────────────────────────

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
        }

        res.json({ message: 'Subscribed', totalSubscriptions: user.pushSubscriptions.length });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

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

const getPushStatus = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('pushSubscriptions username');
        res.json({
            vapidConfigured: !!process.env.VAPID_PUBLIC_KEY,
            subscriptionCount: user.pushSubscriptions.length,
            username: user.username,
            endpoints: user.pushSubscriptions.map(s => s.endpoint?.substring(0, 60) + '...')
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const testPush = async (req, res) => {
    try {
        if (!initVapid()) {
            return res.status(503).json({ message: 'Push notifications not configured.' });
        }

        const user = await User.findById(req.user._id);
        if (!user.pushSubscriptions || user.pushSubscriptions.length === 0) {
            return res.status(400).json({ message: 'No push subscriptions found.' });
        }

        const payload = {
            title: '🔔 Test Notification',
            body: 'Push notifications are working!',
            icon: '/logo.png',
            badge: '/logo.png',
            tag: 'svrc-test',
            data: { url: '/?openNotifs=true', type: 'test' }
        };

        await pushToUser(user, payload);
        res.json({ message: 'Test push sent', subscriptions: user.pushSubscriptions.length });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── Notification CRUD ────────────────────────────────────────────────────────

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

        res.json({ notifications: result, unreadCount: result.filter(n => !n.isRead).length });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

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

// ─── Internal helper ─────────────────────────────────────────────────────────

const createNotification = async ({ type, audience, title, message, bookingId }) => {
    try {
        const notif = await Notification.create({ type, audience, title, message, bookingId });
        const targetUsers = await getTargetUsers(audience);

        const pushPayload = {
            title,
            body: message,
            icon: '/logo.png',
            badge: '/logo.png',
            tag: `notif-${notif._id}`,
            renotify: true,
            data: { notifId: notif._id, bookingId, type, url: `/?openNotifs=true&notifId=${notif._id}` }
        };

        await Promise.all(targetUsers.map(user => pushToUser(user, pushPayload)));
    } catch (error) {
        console.error('[Push] createNotification error:', error.message);
    }
};

// ─── Reminder Job ─────────────────────────────────────────────────────────────

/**
 * Periodically checks for unread notifications and re-pushes them as a reminder.
 * Intervals: 30 minutes
 */
const startReminderJob = () => {
    console.log('[Reminder] Starting unread notification reminder job (every 30 min)');

    setInterval(async () => {
        try {
            // 1. Get all active users with push subscriptions
            const allUsers = await User.find({
                isActive: true,
                pushSubscriptions: { $exists: true, $ne: [] }
            });

            if (allUsers.length === 0) return;

            // 2. For each user, find their unread notifications
            for (const user of allUsers) {
                let audienceFilter;
                if (user.role === 'admin') {
                    audienceFilter = { audience: { $in: ['all_staff', 'admin_only'] } };
                } else {
                    audienceFilter = { audience: 'all_staff' };
                }

                // Find unread notifications for this specific user
                const unreadNotifications = await Notification.find({
                    ...audienceFilter,
                    readBy: { $ne: user._id }
                }).sort({ createdAt: -1 }).limit(3); // Just remind of the latest 3

                if (unreadNotifications.length === 0) continue;

                // 3. Send a summary push or individual pushes
                // User asked for "push that notifications by the title as remider"
                for (const notif of unreadNotifications) {
                    // Throttle: don't remind more than once every 25 mins for the same notif
                    const now = new Date();
                    const lastSent = notif.lastRemindedAt || notif.createdAt;
                    const diffMins = (now - lastSent) / (1000 * 60);

                    if (diffMins < 25) continue;

                    const reminderPayload = {
                        title: `🔔 Reminder: ${notif.title}`,
                        body: notif.message,
                        icon: '/logo.png',
                        badge: '/logo.png',
                        tag: `remind-${notif._id}`,
                        data: { notifId: notif._id, url: `/?openNotifs=true&notifId=${notif._id}` }
                    };

                    await pushToUser(user, reminderPayload);

                    // Update lastRemindedAt (using findByIdAndUpdate to avoid concurrent save issues)
                    await Notification.findByIdAndUpdate(notif._id, { lastRemindedAt: now });
                }
            }
        } catch (error) {
            console.error('[Reminder] Job error:', error.message);
        }
    }, 30 * 60 * 1000); // 30 minutes
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
    createNotification,
    startReminderJob
};

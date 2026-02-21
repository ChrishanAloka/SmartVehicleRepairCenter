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
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const alreadyExists = user.pushSubscriptions.some(s => s.endpoint === subscription.endpoint);
        if (!alreadyExists) {
            user.pushSubscriptions.push(subscription);
            await user.save();
        }
        res.json({ message: 'Subscribed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const unsubscribe = async (req, res) => {
    try {
        const { endpoint } = req.body;
        await User.findByIdAndUpdate(req.user._id, { $pull: { pushSubscriptions: { endpoint } } });
        res.json({ message: 'Unsubscribed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getPushStatus = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        res.json({
            vapidConfigured: !!process.env.VAPID_PUBLIC_KEY,
            subscriptionCount: user.pushSubscriptions.length
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const testPush = async (req, res) => {
    try {
        if (!initVapid()) return res.status(503).json({ message: 'Push not configured' });
        const user = await User.findById(req.user._id);

        const path = user.role === 'admin' ? '/dashboard' : '/technician-portal';

        await pushToUser(user, {
            title: '🔔 Test Notification',
            body: 'Push notifications are working!',
            icon: '/logo.png',
            tag: 'svrc-test',
            data: { url: `${path}?openNotifs=true`, type: 'test' }
        });
        res.json({ message: 'Test push sent' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── Notification CRUD ────────────────────────────────────────────────────────

const getNotifications = async (req, res) => {
    try {
        const userId = req.user._id;
        const userRole = req.user.role;
        let query = userRole === 'admin' ? { audience: { $in: ['all_staff', 'admin_only'] } } : { audience: 'all_staff' };

        const notifications = await Notification.find(query).sort({ createdAt: -1 }).limit(50).lean();
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
        await Notification.findByIdAndUpdate(req.params.id, { $addToSet: { readBy: req.user._id } });
        res.json({ message: 'Marked as read' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const markAllAsRead = async (req, res) => {
    try {
        const userRole = req.user.role;
        let query = userRole === 'admin' ? { audience: { $in: ['all_staff', 'admin_only'] } } : { audience: 'all_staff' };
        await Notification.updateMany({ ...query, readBy: { $ne: req.user._id } }, { $addToSet: { readBy: req.user._id } });
        res.json({ message: 'All read' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── Internal helper ─────────────────────────────────────────────────────────

const createNotification = async ({ type, audience, title, message, bookingId }) => {
    try {
        const notif = await Notification.create({ type, audience, title, message, bookingId });
        const targetUsers = await getTargetUsers(audience);

        for (const user of targetUsers) {
            const path = user.role === 'admin' ? '/dashboard' : '/technician-portal';
            await pushToUser(user, {
                title,
                body: message,
                icon: '/logo.png',
                tag: `notif-${notif._id}`,
                data: { notifId: notif._id, url: `${path}?openNotifs=true&notifId=${notif._id}` }
            });
        }
    } catch (error) {
        console.error('[Push] createNotification error:', error.message);
    }
};

// ─── Reminder Job (30 Minutes) ────────────────────────────────────────────────

const startReminderJob = () => {
    console.log('[Reminder] Starting 30-minute reminder job');
    setInterval(async () => {
        try {
            const users = await User.find({ isActive: true, 'pushSubscriptions.0': { $exists: true } });
            for (const user of users) {
                let query = user.role === 'admin' ? { audience: { $in: ['all_staff', 'admin_only'] } } : { audience: 'all_staff' };

                // Find latest unread notification
                const unreadNotif = await Notification.findOne({ ...query, readBy: { $ne: user._id } }).sort({ createdAt: -1 });

                if (unreadNotif) {
                    const now = new Date();
                    const lastReminded = unreadNotif.lastRemindedAt || unreadNotif.createdAt;
                    if ((now - lastReminded) > (29 * 60 * 1000)) { // ~30 mins
                        const path = user.role === 'admin' ? '/dashboard' : '/technician-portal';
                        await pushToUser(user, {
                            title: `🔔 Reminder: ${unreadNotif.title}`,
                            body: unreadNotif.message,
                            icon: '/logo.png',
                            tag: `remind-${unreadNotif._id}`,
                            data: { notifId: unreadNotif._id, url: `${path}?openNotifs=true&notifId=${unreadNotif._id}` }
                        });
                        await Notification.findByIdAndUpdate(unreadNotif._id, { lastRemindedAt: now });
                    }
                }
            }
        } catch (err) { console.error('[Reminder] Job error:', err.message); }
    }, 5 * 60 * 1000); // 5 mins
};

module.exports = {
    getVapidPublicKey, subscribe, unsubscribe, getPushStatus,
    testPush, getNotifications, markAsRead, markAllAsRead,
    createNotification, startReminderJob
};

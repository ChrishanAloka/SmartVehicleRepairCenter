const Notification = require('../models/Notification');

// @desc    Get notifications for the logged-in user (based on role)
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
    try {
        const userId = req.user._id;
        const userRole = req.user.role;

        // Build audience filter: admin sees all, office_staff sees only all_staff ones
        let audienceFilter;
        if (userRole === 'admin') {
            audienceFilter = { audience: { $in: ['all_staff', 'admin_only'] } };
        } else {
            audienceFilter = { audience: 'all_staff' };
        }

        // Fetch latest 50 notifications for this user's audience
        const notifications = await Notification.find(audienceFilter)
            .sort({ createdAt: -1 })
            .limit(50)
            .populate('bookingId', 'bookingDate status')
            .lean();

        // Add a per-user isRead field
        const result = notifications.map(n => ({
            ...n,
            isRead: n.readBy.some(id => id.toString() === userId.toString())
        }));

        // Count unread
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
        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        // Add user to readBy if not already there
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

        // Add userId to readBy for all unread notifications (those where readBy doesn't contain userId)
        await Notification.updateMany(
            { ...audienceFilter, readBy: { $ne: userId } },
            { $addToSet: { readBy: userId } }
        );

        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Helper: Create a notification (used internally by other controllers)
const createNotification = async ({ type, audience, title, message, bookingId }) => {
    try {
        await Notification.create({ type, audience, title, message, bookingId });
    } catch (error) {
        console.error('Failed to create notification:', error.message);
    }
};

module.exports = {
    getNotifications,
    markAsRead,
    markAllAsRead,
    createNotification
};

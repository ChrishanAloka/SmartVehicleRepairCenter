const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');

// Configure VAPID details
webpush.setVapidDetails(
    'mailto:admin@smartrepair.local',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

/**
 * Send a push notification to all subscribers matching a role filter.
 * @param {string[]} roles - Array of roles to target, e.g. ['admin', 'office_staff']
 * @param {object} payload - { title, body, icon, tag, url }
 */
const sendPushToRoles = async (roles, payload) => {
    try {
        const subs = await PushSubscription.find({ role: { $in: roles } });
        if (!subs.length) return;

        const message = JSON.stringify(payload);

        const results = await Promise.allSettled(
            subs.map(async (doc) => {
                try {
                    await webpush.sendNotification(doc.subscription, message);
                } catch (err) {
                    // 410 Gone = subscription is expired/unsubscribed, remove it
                    if (err.statusCode === 410 || err.statusCode === 404) {
                        await PushSubscription.deleteOne({ _id: doc._id });
                    }
                }
            })
        );

        const sent = results.filter(r => r.status === 'fulfilled').length;
        console.log(`[Push] Sent to ${sent}/${subs.length} ${roles.join(',')} subscribers`);
    } catch (error) {
        console.error('[Push] Error sending notifications:', error.message);
    }
};

/**
 * Send a push notification to all subscribers (regardless of role).
 */
const sendPushToAll = async (payload) => {
    await sendPushToRoles(['admin', 'office_staff', 'public'], payload);
};

module.exports = { sendPushToRoles, sendPushToAll };

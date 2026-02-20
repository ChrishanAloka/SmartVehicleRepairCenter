const mongoose = require('mongoose');

// Stores each browser's push subscription for a given user role
const pushSubscriptionSchema = new mongoose.Schema({
    // Which user this subscription belongs to (null = logged-out / public client)
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    role: {
        type: String,
        enum: ['admin', 'office_staff', 'public'],
        default: 'public'
    },
    subscription: {
        type: Object,  // { endpoint, keys: { p256dh, auth } }
        required: true
    },
    // Unique device fingerprint — we use the endpoint URL as the device key
    endpoint: {
        type: String,
        required: true,
        unique: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('PushSubscription', pushSubscriptionSchema);

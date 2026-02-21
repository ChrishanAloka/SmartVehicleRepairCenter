const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['new_booking', 'new_review', 'job_done'],
        required: true
    },
    // Who should see it: 'all_staff' (admin + office_staff) or 'admin_only'
    audience: {
        type: String,
        enum: ['all_staff', 'admin_only'],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    // Reference to the related booking (optional)
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking'
    },
    // Track which users have read this notification
    readBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, {
    timestamps: true
});

// Index for fast queries — most recent first, filter by audience
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ audience: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);

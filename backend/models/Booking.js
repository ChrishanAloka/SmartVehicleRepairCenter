const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    technician: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Technician'
    },
    bookingDate: {
        type: Date,
        required: true
    },
    problemDescription: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'declined', 'not_today', 'completed', 'cancelled'],
        default: 'pending'
    },
    isPaidOut: {
        type: Boolean,
        default: false
    },
    amount: {
        type: Number,
        default: 0
    },
    notes: {
        type: String,
        trim: true
    },
    cancelledReason: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Index for efficient queries
bookingSchema.index({ bookingDate: 1, status: 1 });
bookingSchema.index({ customer: 1, bookingDate: -1 });
bookingSchema.index({ technician: 1, bookingDate: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
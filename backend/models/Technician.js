const mongoose = require('mongoose');

const technicianSchema = new mongoose.Schema({
    employeeId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    specialization: {
        type: String,
        trim: true
    },
    qrCode: {
        type: String, // Base64 encoded QR code
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isPresent: {
        type: Boolean,
        default: false
    },
    lastCheckIn: {
        type: Date
    },
    totalCoins: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Technician', technicianSchema);
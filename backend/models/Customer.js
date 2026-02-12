const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    idNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    vehicleNumber: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    vehicleModel: {
        type: String,
        trim: true
    },
    vehicleYear: {
        type: Number
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Customer', customerSchema);
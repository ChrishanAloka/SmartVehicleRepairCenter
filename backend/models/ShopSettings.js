const mongoose = require('mongoose');

const shopSettingsSchema = new mongoose.Schema({
    openingTime: {
        type: String,
        required: true,
        default: '08:00'
    },
    closingTime: {
        type: String,
        required: true,
        default: '18:00'
    },
    holidays: [{
        date: {
            type: Date,
            required: true
        },
        reason: {
            type: String,
            required: true,
            trim: true
        }
    }],
    shopName: {
        type: String,
        default: 'Vehicle Service Center'
    },
    shopAddress: {
        type: String
    },
    shopPhone: {
        type: String
    },
    shopEmail: {
        type: String
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('ShopSettings', shopSettingsSchema);
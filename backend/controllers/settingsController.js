const ShopSettings = require('../models/ShopSettings');

// @desc    Get shop settings
// @route   GET /api/settings
// @access  Public
const getSettings = async (req, res) => {
    try {
        let settings = await ShopSettings.findOne();

        if (!settings) {
            // Create default settings if none exist
            settings = await ShopSettings.create({
                openingTime: '08:00',
                closingTime: '18:00',
                holidays: []
            });
        }

        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update shop settings
// @route   PUT /api/settings
// @access  Private/Admin
const updateSettings = async (req, res) => {
    try {
        const {
            openingTime,
            closingTime,
            shopName,
            shopAddress,
            shopPhone,
            shopEmail
        } = req.body;

        let settings = await ShopSettings.findOne();

        if (!settings) {
            settings = await ShopSettings.create(req.body);
        } else {
            if (openingTime) settings.openingTime = openingTime;
            if (closingTime) settings.closingTime = closingTime;
            if (shopName) settings.shopName = shopName;
            if (shopAddress) settings.shopAddress = shopAddress;
            if (shopPhone) settings.shopPhone = shopPhone;
            if (shopEmail) settings.shopEmail = shopEmail;

            await settings.save();
        }

        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Add holiday
// @route   POST /api/settings/holidays
// @access  Private/Admin
const addHoliday = async (req, res) => {
    try {
        const { date, reason } = req.body;

        let settings = await ShopSettings.findOne();

        if (!settings) {
            settings = await ShopSettings.create({
                openingTime: '08:00',
                closingTime: '18:00',
                holidays: [{ date, reason }]
            });
        } else {
            settings.holidays.push({ date, reason });
            await settings.save();
        }

        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Remove holiday
// @route   DELETE /api/settings/holidays/:holidayId
// @access  Private/Admin
const removeHoliday = async (req, res) => {
    try {
        const settings = await ShopSettings.findOne();

        if (!settings) {
            return res.status(404).json({ message: 'Settings not found' });
        }

        settings.holidays = settings.holidays.filter(
            holiday => holiday._id.toString() !== req.params.holidayId
        );

        await settings.save();

        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Check if shop is open
// @route   GET /api/settings/is-open
// @access  Public
const isShopOpen = async (req, res) => {
    try {
        const { date } = req.query;
        const checkDate = date ? new Date(date) : new Date();

        const settings = await ShopSettings.findOne();

        if (!settings) {
            return res.json({ isOpen: true });
        }

        // Check if date is a holiday
        const isHoliday = settings.holidays.some(holiday => {
            const holidayDate = new Date(holiday.date);
            return holidayDate.toDateString() === checkDate.toDateString();
        });

        res.json({
            isOpen: !isHoliday,
            openingTime: settings.openingTime,
            closingTime: settings.closingTime
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getSettings,
    updateSettings,
    addHoliday,
    removeHoliday,
    isShopOpen
};
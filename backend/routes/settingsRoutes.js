const express = require('express');
const router = express.Router();
const {
    getSettings,
    updateSettings,
    addHoliday,
    removeHoliday,
    isShopOpen
} = require('../controllers/settingsController');
const { protect, admin } = require('../middleware/auth');

router.route('/')
    .get(getSettings)
    .put(protect, admin, updateSettings);

router.get('/is-open', isShopOpen);

router.route('/holidays')
    .post(protect, admin, addHoliday);

router.delete('/holidays/:holidayId', protect, admin, removeHoliday);

module.exports = router;
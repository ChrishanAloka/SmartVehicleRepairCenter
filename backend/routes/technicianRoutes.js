const express = require('express');
const router = express.Router();
const {
    createTechnician,
    getTechnicians,
    getPresentTechnicians,
    getTechnician,
    updateTechnician,
    checkInTechnician,
    checkOutTechnician,
    deleteTechnician
} = require('../controllers/technicianController');
const { protect, admin } = require('../middleware/auth');

router.route('/')
    .get(getTechnicians)
    .post(protect, admin, createTechnician);

router.get('/present', getPresentTechnicians);
router.post('/checkin', checkInTechnician);
router.post('/checkout', checkOutTechnician);

router.route('/:id')
    .get(getTechnician)
    .put(protect, admin, updateTechnician)
    .delete(protect, admin, deleteTechnician);

module.exports = router;
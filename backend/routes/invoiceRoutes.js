const express = require('express');
const router = express.Router();
const {
    createInvoice,
    getInvoices,
    getInvoice,
    getInvoiceByNumber,
    deleteInvoice
} = require('../controllers/invoiceController');
const { protect, admin } = require('../middleware/auth');

router.route('/')
    .get(protect, getInvoices)
    .post(protect, createInvoice);

router.get('/number/:invoiceNumber', protect, getInvoiceByNumber);

router.route('/:id')
    .get(protect, getInvoice)
    .delete(protect, admin, deleteInvoice);

module.exports = router;
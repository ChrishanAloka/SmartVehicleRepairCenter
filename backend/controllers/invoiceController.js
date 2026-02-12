const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const Booking = require('../models/Booking');

// @desc    Create new invoice
// @route   POST /api/invoices
// @access  Private
const createInvoice = async (req, res) => {
    try {
        const {
            customerId,
            customerName,
            customerPhone,
            bookingId,
            items,
            tax,
            discount,
            paymentMethod,
            notes,
            type
        } = req.body;

        // Calculate totals
        const subtotal = items.reduce((sum, item) => sum + item.total, 0);
        const total = subtotal + (tax || 0) - (discount || 0);

        const invoiceData = {
            customerName,
            customerPhone,
            items,
            subtotal,
            tax: tax || 0,
            discount: discount || 0,
            total,
            paymentMethod: paymentMethod || 'cash',
            notes,
            type: type || 'service'
        };

        if (customerId) {
            invoiceData.customer = customerId;
        }

        if (bookingId) {
            invoiceData.booking = bookingId;

            // Mark booking as paid
            const booking = await Booking.findById(bookingId);
            if (booking) {
                booking.isPaidOut = true;
                booking.amount = total;
                booking.status = 'completed';
                await booking.save();
            }
        }

        const invoice = await Invoice.create(invoiceData);

        const populatedInvoice = await Invoice.findById(invoice._id)
            .populate('customer')
            .populate('booking');

        res.status(201).json(populatedInvoice);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private
const getInvoices = async (req, res) => {
    try {
        const { startDate, endDate, customer, type } = req.query;

        let query = {};

        if (startDate && endDate) {
            query.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        if (customer) {
            query.customer = customer;
        }

        if (type) {
            query.type = type;
        }

        const invoices = await Invoice.find(query)
            .populate('customer')
            .populate('booking')
            .sort({ createdAt: -1 });

        res.json(invoices);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single invoice
// @route   GET /api/invoices/:id
// @access  Private
const getInvoice = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id)
            .populate('customer')
            .populate('booking');

        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found' });
        }

        res.json(invoice);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get invoice by invoice number
// @route   GET /api/invoices/number/:invoiceNumber
// @access  Private
const getInvoiceByNumber = async (req, res) => {
    try {
        const invoice = await Invoice.findOne({ invoiceNumber: req.params.invoiceNumber })
            .populate('customer')
            .populate('booking');

        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found' });
        }

        res.json(invoice);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete invoice
// @route   DELETE /api/invoices/:id
// @access  Private/Admin
const deleteInvoice = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);

        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found' });
        }

        await invoice.deleteOne();
        res.json({ message: 'Invoice removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createInvoice,
    getInvoices,
    getInvoice,
    getInvoiceByNumber,
    deleteInvoice
};
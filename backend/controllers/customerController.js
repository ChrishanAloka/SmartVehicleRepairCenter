const Customer = require('../models/Customer');

// @desc    Get all customers
// @route   GET /api/customers
// @access  Private
const getCustomers = async (req, res) => {
    try {
        const customers = await Customer.find({}).sort({ createdAt: -1 });
        res.json(customers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single customer
// @route   GET /api/customers/:id
// @access  Private
const getCustomerById = async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id);
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        res.json(customer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private
const updateCustomer = async (req, res) => {
    try {
        const { name, phone, email, idNumber, vehicleNumber, vehicleModel, vehicleYear } = req.body;
        const customer = await Customer.findById(req.params.id);

        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        customer.name = name || customer.name;
        customer.phone = phone || customer.phone;
        customer.email = (email === '' || email) ? email : customer.email;
        customer.idNumber = idNumber || customer.idNumber;
        customer.vehicleNumber = vehicleNumber ? vehicleNumber.toUpperCase() : customer.vehicleNumber;
        customer.vehicleModel = (vehicleModel === '' || vehicleModel) ? vehicleModel : customer.vehicleModel;
        customer.vehicleYear = vehicleYear || customer.vehicleYear;

        const updatedCustomer = await customer.save();
        res.json(updatedCustomer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete customer
// @route   DELETE /api/customers/:id
// @access  Private
const deleteCustomer = async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id);
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        await Customer.deleteOne({ _id: req.params.id });
        res.json({ message: 'Customer removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getCustomers,
    getCustomerById,
    updateCustomer,
    deleteCustomer
};

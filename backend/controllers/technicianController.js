const Technician = require('../models/Technician');
const QRCode = require('qrcode');

// @desc    Create new technician
// @route   POST /api/technicians
// @access  Private/Admin
const createTechnician = async (req, res) => {
    try {
        const { employeeId, name, email, phone, specialization } = req.body;

        // Check if technician exists
        const technicianExists = await Technician.findOne({ $or: [{ employeeId }, { email }] });
        if (technicianExists) {
            return res.status(400).json({ message: 'Technician already exists' });
        }

        // Generate QR Code
        const qrData = JSON.stringify({ employeeId, name });
        const qrCode = await QRCode.toDataURL(qrData);

        // Create technician
        const technician = await Technician.create({
            employeeId,
            name,
            email,
            phone,
            specialization,
            qrCode
        });

        res.status(201).json(technician);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all technicians
// @route   GET /api/technicians
// @access  Public
const getTechnicians = async (req, res) => {
    try {
        const technicians = await Technician.find({ isActive: true });

        // Dynamic "Daily" presence check
        const today = new Date().setHours(0, 0, 0, 0);
        const processedTechs = technicians.map(tech => {
            const lastIn = tech.lastCheckIn ? new Date(tech.lastCheckIn).setHours(0, 0, 0, 0) : null;
            const isPresentToday = tech.isPresent && lastIn === today;

            // Convert to plain object if it's a mongoose doc to modify it
            const techObj = tech.toObject();
            return { ...techObj, isPresent: isPresentToday };
        });

        res.json(processedTechs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get present technicians
// @route   GET /api/technicians/present
// @access  Public
const getPresentTechnicians = async (req, res) => {
    try {
        const today = new Date().setHours(0, 0, 0, 0);
        const technicians = await Technician.find({ isActive: true, isPresent: true });

        const presentToday = technicians.filter(tech => {
            const lastIn = tech.lastCheckIn ? new Date(tech.lastCheckIn).setHours(0, 0, 0, 0) : null;
            return lastIn === today;
        });

        res.json(presentToday);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single technician
// @route   GET /api/technicians/:id
// @access  Public
const getTechnician = async (req, res) => {
    try {
        const technician = await Technician.findById(req.params.id);

        if (!technician) {
            return res.status(404).json({ message: 'Technician not found' });
        }

        res.json(technician);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update technician
// @route   PUT /api/technicians/:id
// @access  Private/Admin
const updateTechnician = async (req, res) => {
    try {
        const technician = await Technician.findById(req.params.id);

        if (!technician) {
            return res.status(404).json({ message: 'Technician not found' });
        }

        const { name, email, phone, specialization, isActive } = req.body;

        technician.name = name || technician.name;
        technician.email = email || technician.email;
        technician.phone = phone || technician.phone;
        technician.specialization = specialization || technician.specialization;
        if (typeof isActive !== 'undefined') {
            technician.isActive = isActive;
        }

        const updatedTechnician = await technician.save();
        res.json(updatedTechnician);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Check-in technician (scan QR code)
// @route   POST /api/technicians/checkin
// @access  Public
const checkInTechnician = async (req, res) => {
    try {
        const { employeeId } = req.body;

        const technician = await Technician.findOne({ employeeId });

        if (!technician) {
            return res.status(404).json({ message: 'Technician not found' });
        }

        if (!technician.isActive) {
            return res.status(400).json({ message: 'Technician account is inactive' });
        }

        technician.isPresent = true;
        technician.lastCheckIn = new Date();

        await technician.save();

        res.json({ message: 'Check-in successful', technician });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Check-out technician
// @route   POST /api/technicians/checkout
// @access  Public
const checkOutTechnician = async (req, res) => {
    try {
        const { employeeId } = req.body;

        const technician = await Technician.findOne({ employeeId });

        if (!technician) {
            return res.status(404).json({ message: 'Technician not found' });
        }

        technician.isPresent = false;

        await technician.save();

        res.json({ message: 'Check-out successful', technician });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete technician
// @route   DELETE /api/technicians/:id
// @access  Private/Admin
const deleteTechnician = async (req, res) => {
    try {
        const technician = await Technician.findById(req.params.id);

        if (!technician) {
            return res.status(404).json({ message: 'Technician not found' });
        }

        await technician.deleteOne();
        res.json({ message: 'Technician removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createTechnician,
    getTechnicians,
    getPresentTechnicians,
    getTechnician,
    updateTechnician,
    checkInTechnician,
    checkOutTechnician,
    deleteTechnician
};
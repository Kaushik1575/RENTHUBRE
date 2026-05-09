const SupabaseDB = require('../models/supabaseDB');

const getVehiclesByType = async (req, res) => {
    const { type } = req.params;
    try {
        const vehicles = await SupabaseDB.getVehicles(type);
        res.json(vehicles);
    } catch (error) {
        console.error(`Error fetching ${type}:`, error);
        res.status(500).json({ error: `Error fetching ${type}` });
    }
};

const getVehicleById = async (req, res) => {
    try {
        let { type, id } = req.params;
        console.log('Requested type:', type, 'Requested id:', id);
        if (type === 'car') type = 'cars';
        if (type === 'bike') type = 'bikes';
        if (type === 'scooty') type = 'scooty';
        console.log('Mapped type:', type, 'ID:', id);
        const vehicle = await SupabaseDB.getVehicleById(type, id);
        console.log('Vehicle result:', vehicle);
        if (!vehicle) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }
        res.json(vehicle);
    } catch (error) {
        console.error(`Error fetching vehicle:`, error);
        res.status(500).json({ error: 'Error fetching vehicle' });
    }
};

module.exports = {
    getVehiclesByType,
    getVehicleById
};

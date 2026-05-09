const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicle.controller');

router.get('/:type', vehicleController.getVehiclesByType);
router.get('/:type/:id', vehicleController.getVehicleById);

module.exports = router;

const express = require('express');
const router = express.Router();
const multer = require('multer');
const sponsorController = require('../controllers/sponsor.controller');
const { verifySponsor } = require('../middleware/authMiddleware');

// Configure Multer for memory storage (files processed in controller)
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Auth Routes
router.post('/register', sponsorController.registerSponsor);
router.post('/login', sponsorController.loginSponsor);

// Vehicle Management Routes
router.post('/add-vehicle/:type',
    verifySponsor,
    upload.fields([
        { name: 'image', maxCount: 1 },
        { name: 'rc', maxCount: 1 },
        { name: 'insurance', maxCount: 1 },
        { name: 'puc', maxCount: 1 }
    ]),
    sponsorController.addVehicle
);

router.get('/my-vehicles', verifySponsor, sponsorController.getMyVehicles);

module.exports = router;

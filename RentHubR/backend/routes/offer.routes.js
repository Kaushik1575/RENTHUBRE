const express = require('express');
const router = express.Router();
const offerController = require('../controllers/offer.controller');
const { verifyToken, verifyAdminToken } = require('../middleware/authMiddleware');
const uploadOffer = require('../middleware/uploadOffer');

// Public routes
router.get('/active', offerController.getActiveOffers);
router.post('/validate', verifyToken, offerController.validateOffer);

// Admin routes (protected)
router.get('/all', verifyAdminToken, offerController.getAllOffers);
router.post('/create', verifyAdminToken, offerController.createOffer);
router.post('/upload-image', verifyAdminToken, (req, res, next) => {
    uploadOffer.single('image')(req, res, (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ success: false, error: 'Image is too large (max 5MB)' });
            }
            return res.status(400).json({ success: false, error: err.message });
        }
        next();
    });
}, offerController.uploadOfferImage);
router.put('/:id', verifyAdminToken, offerController.updateOffer);
router.delete('/:id', verifyAdminToken, offerController.deleteOffer);

module.exports = router;

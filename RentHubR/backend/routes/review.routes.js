const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review.controller');
const { verifyToken } = require('../middleware/authMiddleware');

// Get reviews for a vehicle
router.get('/:type/:id', reviewController.getReviews);

// Submit a review (Protected)
router.post('/', verifyToken, reviewController.createReview);

// Delete a review (Protected)
router.delete('/:id', verifyToken, reviewController.deleteReview);

module.exports = router;

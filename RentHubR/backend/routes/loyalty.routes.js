const express = require('express');
const router = express.Router();
const loyaltyController = require('../controllers/loyalty.controller');
const { verifyToken: authenticateUser, verifyAdminToken: authorizeAdmin } = require('../middleware/authMiddleware');

// Public/User routes
router.get('/user/coins', authenticateUser, loyaltyController.getUserCoins);
router.get('/user/rewards', authenticateUser, loyaltyController.getRewards);
router.post('/reward/redeem', authenticateUser, loyaltyController.redeemReward);

// Admin routes
router.get('/admin/loyalty-settings', authenticateUser, authorizeAdmin, loyaltyController.getSettings);

module.exports = router;

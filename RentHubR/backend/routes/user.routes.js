const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/profile', verifyToken, userController.getUserProfile);
router.put('/profile', verifyToken, userController.updateUserProfile);
router.get('/rewards', verifyToken, userController.getUserRewards);
router.post('/redeem', verifyToken, userController.redeemReward);
router.post('/scratch-claim', verifyToken, userController.claimScratchCard);


module.exports = router;

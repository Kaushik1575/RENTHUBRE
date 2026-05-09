const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// User Registration
// User Registration
router.post('/register/send-otp', authController.registerSendOtp);
router.post('/register/user', authController.registerUser);
router.post('/register/send-mobile-otp', authController.registerSendMobileOtp);
router.post('/register/verify-otp', authController.verifyOtp);

// Admin Registration
router.post('/register/admin', authController.registerAdmin);

const { verifyToken } = require('../middleware/authMiddleware');

// Logins
router.post('/login', authController.loginUser);
router.post('/login/admin', authController.loginAdmin);
router.post('/logout', verifyToken, authController.logoutUser);

// Password Management
router.post('/forgot-password', authController.forgotPassword);
router.post('/admin/forgot-password', authController.adminForgotPassword);
router.post('/reset-password', authController.resetPassword);

// Debug
router.get('/debug/user/:email', authController.debugUser);

module.exports = router;

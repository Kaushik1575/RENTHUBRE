const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/create-order', verifyToken, paymentController.createOrder);

module.exports = router;

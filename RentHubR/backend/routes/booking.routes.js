const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/booking.controller');
const { verifyToken } = require('../middleware/authMiddleware');

// Check availability
router.post('/check-availability', verifyToken, bookingController.checkAvailability);

// Bookings
router.post('/', verifyToken, bookingController.createBooking);
router.get('/user', verifyToken, bookingController.getUserBookings);

// Booking actions
router.post('/:id/cancel', verifyToken, bookingController.cancelBooking);
router.post('/:id/refund-details', verifyToken, bookingController.submitRefundDetails);
router.get('/:id', verifyToken, bookingController.getBookingById);

module.exports = router;

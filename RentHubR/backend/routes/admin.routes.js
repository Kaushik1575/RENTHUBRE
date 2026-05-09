const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const loyaltyController = require('../controllers/loyalty.controller');
const { verifyAdminToken } = require('../middleware/authMiddleware');

// Loyalty Settings
router.get('/loyalty-settings', verifyAdminToken, loyaltyController.getSettings);
router.put('/loyalty-settings', verifyAdminToken, loyaltyController.updateSettings);

// Bookings
router.get('/bookings', verifyAdminToken, adminController.getAllBookings);
router.get('/bookings/:id', verifyAdminToken, adminController.getBookingById);
router.delete('/bookings/:id', verifyAdminToken, adminController.deleteBooking);
router.put('/bookings/:id', verifyAdminToken, adminController.updateBooking);

// Booking actions
router.post('/bookings/:id/confirm', verifyAdminToken, adminController.confirmBooking);

router.post('/bookings/:id/cancel', verifyAdminToken, adminController.cancelBookingAdmin);
router.post('/bookings/:id/refund-complete', verifyAdminToken, adminController.markRefundComplete);
router.post('/scan-qr', verifyAdminToken, adminController.handleQRScan);

// SOS
router.post('/send-sos', verifyAdminToken, adminController.sendSOS);

// Users
router.get('/users', verifyAdminToken, adminController.getAllUsers);
router.get('/users/:id', verifyAdminToken, adminController.getUserById);
router.put('/users/:id', verifyAdminToken, adminController.updateUser);
router.patch('/users/:id/block', verifyAdminToken, adminController.blockUser);


// Vehicles
router.get('/vehicle-requests', verifyAdminToken, adminController.getVehicleRequests);
router.post('/vehicle-requests/:id/approve', verifyAdminToken, adminController.approveVehicle);
router.post('/vehicle-requests/:id/reject', verifyAdminToken, adminController.rejectVehicle);
router.delete('/vehicle-requests/:id', verifyAdminToken, adminController.deleteVehicleRequest);

router.get('/vehicles', verifyAdminToken, adminController.getAllVehicles);
router.post('/vehicles/:type', verifyAdminToken, adminController.addVehicle);
router.get('/vehicles/:type/:id', verifyAdminToken, adminController.getVehicleById);
router.put('/vehicles/:type/:id', verifyAdminToken, adminController.updateVehicle);
router.delete('/vehicles/:type/:id', verifyAdminToken, adminController.deleteVehicle);

// Policies
router.get('/policies', verifyAdminToken, adminController.getPolicies);

// Sponsor Earnings
router.get('/sponsor-earnings', verifyAdminToken, adminController.getSponsorEarnings);

// Withdrawals
router.get('/withdrawal/requests', verifyAdminToken, adminController.getAllWithdrawalRequests);
router.put('/withdrawal/requests/:id', verifyAdminToken, adminController.updateWithdrawalStatus);

// Reminders (Cron & Manual)
// Schedule manual reminder check
router.post('/cron/reminders/manual', verifyAdminToken, adminController.manualReminderCheck);
router.get('/cron/reminders', adminController.cronReminderCheck); // No token, uses query secret

// Delivery Agents
router.get('/delivery-agents', verifyAdminToken, adminController.getDeliveryAgents);
router.post('/delivery-agents/:id/approve', verifyAdminToken, adminController.approveDeliveryAgent);
router.delete('/delivery-agents/:id', verifyAdminToken, adminController.deleteDeliveryAgent);
router.post('/bookings/:id/assign-agent', verifyAdminToken, adminController.assignAgent);

module.exports = router;

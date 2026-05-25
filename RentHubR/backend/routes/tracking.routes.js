const express = require('express');
const router = express.Router();
const trackingController = require('../controllers/tracking.controller');
const { verifyToken } = require('../middleware/authMiddleware');

// Agent location update (POST - called frequently during delivery)
router.post('/update-location', verifyToken, trackingController.updateAgentLocation);

// Get specific agent's current location
router.get('/agent/:agentId', trackingController.getAgentLocation);

// Get all active agents (for admin/user to see nearby agents)
router.get('/active-agents', trackingController.getActiveAgents);

// Get agent location for a specific booking (user tracking their delivery)
router.get('/booking/:bookingId', verifyToken, trackingController.getBookingAgentLocation);

// Get tracking history for a booking
router.get('/history/:bookingId', verifyToken, trackingController.getTrackingHistory);

// Stop tracking when agent goes offline
router.post('/stop-tracking', verifyToken, trackingController.stopTracking);

module.exports = router;

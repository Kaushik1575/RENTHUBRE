const express = require('express');
const router = express.Router();
const agentLocationController = require('../controllers/agentLocation.controller');

router.post('/location', agentLocationController.updateDeliveryAgentLocation);
router.get('/location/:agentId', agentLocationController.getDeliveryAgentLocation);

module.exports = router;

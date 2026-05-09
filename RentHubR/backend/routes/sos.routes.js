const express = require('express');
const router = express.Router();
const sosController = require('../controllers/sos.controller');

router.post('/sos-activate', sosController.activateSOS);

module.exports = router;

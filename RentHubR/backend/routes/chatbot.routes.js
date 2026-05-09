const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbot.controller');

const { optionalVerifyToken } = require('../middleware/authMiddleware');

router.post('/chat', optionalVerifyToken, chatbotController.chat);
router.post('/weather', chatbotController.checkWeather);

module.exports = router;

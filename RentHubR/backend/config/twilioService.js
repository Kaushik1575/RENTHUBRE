const twilio = require('twilio');
require('dotenv').config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// Initialize Twilio client only if credentials are present
const client = (accountSid && authToken) ? twilio(accountSid, authToken) : null;

// Format phone number to E.164 format
const formatPhoneNumber = (phoneNumber) => {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');

    // If number starts with country code, ensure it has +
    if (cleaned.startsWith('91') && cleaned.length === 12) {
        return '+' + cleaned;
    }

    // If number is 10 digits (Indian mobile), add +91
    if (cleaned.length === 10) {
        return '+91' + cleaned;
    }

    // If it already has +, return as is
    if (phoneNumber.startsWith('+')) {
        return phoneNumber;
    }

    // Default: assume it needs +91 (India)
    return '+91' + cleaned;
};

const sendSMS = async (to, body) => {
    try {
        if (!client) {
            console.error('Twilio credentials missing');
            return { success: false, error: 'Twilio not configured' };
        }

        // Format phone number to E.164
        const formattedNumber = formatPhoneNumber(to);
        console.log(`📱 Sending SMS to: ${formattedNumber}`);

        const message = await client.messages.create({
            body: body,
            from: fromPhoneNumber,
            to: formattedNumber
        });

        console.log('SMS sent successfully:', message.sid);
        return { success: true, sid: message.sid };
    } catch (error) {
        console.error('Error sending SMS:', error);
        return { success: false, error: error.message };
    }
};

module.exports = {
    sendSMS
};

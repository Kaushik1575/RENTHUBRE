const twilio = require('twilio');

// NOTE: You must add these variables to your RentHubR/backend/.env file
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

const sendSMS = async (to, message) => {
    try {
        if (!accountSid || !authToken || !twilioNumber) {
            console.warn('⚠️ Twilio credentials missing in .env. SMS skipped.');
            return;
        }

        const client = new twilio(accountSid, authToken);
        const phoneStr = String(to).trim();
        
        const response = await client.messages.create({
            body: message,
            from: twilioNumber,
            to: phoneStr.startsWith('+') ? phoneStr : `+91${phoneStr}`
        });

        console.log('✅ SMS sent successfully. Message SID:', response.sid);
        return response;
    } catch (error) {
        console.error('❌ Twilio SMS Error:', error.message);
        return { success: false, error: error.message };
    }
};

module.exports = { sendSMS };

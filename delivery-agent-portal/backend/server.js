require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Resend } = require('resend');
const twilio = require('twilio');

const app = express();
const port = process.env.PORT || 3006;

app.use(cors());
app.use(express.json());

// Services Initialization
const resend = new Resend(process.env.RESEND_API_KEY);
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// In-memory OTP storage (For demo/dev - use Redis/DB for production)
const otpStore = new Map();

// --- OTP ENDPOINTS ---

// 1. Send Email OTP
app.post('/api/register/send-otp', async (req, res) => {
  const { email } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  try {
    console.log(`📧 Attempting to send OTP to: ${email}`);
    otpStore.set(`email_${email}`, { otp, expires: Date.now() + 600000 });
    
    const response = await resend.emails.send({
      from: `${process.env.SENDER_NAME} <${process.env.SENDER_EMAIL}>`,
      to: email,
      subject: 'Verification Code - Delivery Agent Portal',
      html: `<div style="font-family: sans-serif; padding: 20px;">
              <h2>Verification Code</h2>
              <p>Your code for registering as a Delivery Agent is:</p>
              <h1 style="color: #0284c7; letter-spacing: 5px;">${otp}</h1>
              <p>This code expires in 10 minutes.</p>
             </div>`
    });
    
    console.log('✅ Resend Response:', response);
    res.json({ message: 'OTP sent to email' });
  } catch (error) {
    console.error('❌ Email API Error:', error);
    res.status(500).json({ error: 'Failed to send email OTP. Please try again in 1 minute.' });
  }
});

// 2. Send Mobile OTP
app.post('/api/register/send-mobile-otp', async (req, res) => {
  let { phoneNumber } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  try {
    // CLEAN: Remove any non-digit characters (spaces, dashes, etc.)
    phoneNumber = phoneNumber.replace(/\D/g, '');

    // Auto-format: If number is 10 digits and doesn't start with +, add +91
    if (phoneNumber.length === 10) {
      phoneNumber = `+91${phoneNumber}`;
    } else if (!phoneNumber.startsWith('+')) {
      phoneNumber = `+${phoneNumber}`;
    }

    console.log(`📱 Sending OTP to: ${phoneNumber}`);
    
    otpStore.set(`mobile_${phoneNumber}`, { otp, expires: Date.now() + 600000 });
    
    await twilioClient.messages.create({
      body: `Your RentHub Delivery Agent verification code is: ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });
    
    res.json({ message: 'OTP sent to mobile' });
  } catch (error) {
    console.error('❌ Twilio Error:', error.message);
    res.status(500).json({ 
      error: `SMS Error: ${error.message}. Please use format: +91XXXXXXXXXX` 
    });
  }
});

// 3. Verify OTP
app.post('/api/register/verify-otp', (req, res) => {
  let { type, identifier, otp } = req.body;
  
  // Apply same formatting for verification lookup
  if (type === 'mobile') {
    if (identifier.length === 10 && !identifier.startsWith('+')) {
      identifier = `+91${identifier}`;
    } else if (!identifier.startsWith('+')) {
      identifier = `+${identifier}`;
    }
  }

  const stored = otpStore.get(`${type}_${identifier}`);
  
  if (!stored) return res.status(400).json({ error: 'OTP expired or not sent' });
  if (stored.expires < Date.now()) {
    otpStore.delete(`${type}_${identifier}`);
    return res.status(400).json({ error: 'OTP expired' });
  }
  
  if (stored.otp === otp) {
    otpStore.delete(`${type}_${identifier}`);
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Invalid verification code' });
  }
});

app.listen(port, () => {
  console.log(`Delivery Agent Backend running on port ${port}`);
});

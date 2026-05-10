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

// --- DELIVERY ENDPOINTS ---

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Accept Delivery Task
app.post('/api/bookings/:bookingId/accept-delivery', async (req, res) => {
  const { bookingId } = req.params;
  const { agentId } = req.body;

  try {
    console.log(`🤝 Agent ${agentId} is accepting booking ${bookingId}`);

    // 1. Update Booking Status to accepted
    const { data: booking, error: uError } = await supabase
      .from('bookings')
      .update({ delivery_status: 'accepted' })
      .eq('id', bookingId)
      .select('*, users:user_id(full_name, email)')
      .single();

    if (uError) throw uError;

    // 2. Fetch Agent Details
    const { data: agent, error: aError } = await supabase
      .from('delivery_agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (aError) throw aError;

    // 3. Notify User with Tracking Link
    try {
      const trackingLink = `${process.env.FRONTEND_URL}/my-bookings?track=${bookingId}`;
      const html = `
        <div style="font-family: sans-serif; max-width: 600px; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
            <h2 style="color: #16a34a;">✅ Delivery Agent Confirmed!</h2>
            <p>Hello ${booking.users.full_name},</p>
            <p>Great news! Your delivery agent <b>${agent.full_name}</b> has accepted your request and is preparing for pickup.</p>
            
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0;"><b>Agent Name:</b> ${agent.full_name}</p>
                <p style="margin: 5px 0;"><b>Contact:</b> <a href="tel:${agent.mobile}">${agent.mobile}</a></p>
            </div>

            <p>You can track the live position of your vehicle using the link below:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${trackingLink}" style="background: #16a34a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 1.1em; box-shadow: 0 4px 10px rgba(22,163,74,0.3);">📍 Track Your Ride Live</a>
            </div>
            <p style="color: #666; font-size: 0.85em;">The tracking will become active as soon as the agent starts the ride.</p>
        </div>
      `;

      await resend.emails.send({
        from: `${process.env.SENDER_NAME} <${process.env.SENDER_EMAIL}>`,
        to: booking.users.email,
        subject: `Delivery Update for Booking #${booking.booking_id || bookingId}`,
        html: html
      });
      
      console.log('✅ Tracking email sent to customer');
    } catch (emailErr) {
      console.error('⚠️ Failed to send tracking email:', emailErr);
    }

    res.json({ success: true, message: 'Task accepted and customer notified.' });
  } catch (error) {
    console.error('❌ Accept Delivery Error:', error);
    res.status(500).json({ error: 'Failed to accept delivery: ' + error.message });
  }
});

app.listen(port, () => {
  console.log(`Delivery Agent Backend running on port ${port}`);
});

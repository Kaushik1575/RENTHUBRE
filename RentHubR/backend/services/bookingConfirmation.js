const express = require('express');
const router = express.Router();
const dayjs = require('dayjs');
const { sendEmail } = require('../config/emailService');
const supabase = require('../config/supabase');
const { generateInvoiceBuffer } = require('../utils/invoiceGenerator');

// POST /api/confirmBooking
router.post('/confirmBooking', async (req, res) => {
    try {
        const body = req.body || {};
        const bookingId = body.bookingId || `BK-${Date.now()}`;
        const userName = body.userName || 'Customer';
        const userEmail = body.userEmail;
        const vehicleName = body.vehicleName || 'Vehicle';

        if (!userEmail) return res.status(400).json({ error: 'userEmail required' });

        const duration = parseFloat(body.duration) || 1;
        const startDateTime = body.startDateTime || dayjs().add(1, 'day').format();
        const totalAmount = parseFloat(body.totalAmount) || 0;
        const advancePayment = parseFloat(body.advancePayment) || 0;

        // Generate PDF using central utility
        const pdfBuffer = await generateInvoiceBuffer(
            bookingId,
            userName,
            userEmail,
            vehicleName,
            duration,
            startDateTime,
            totalAmount,
            advancePayment,
            body.terms // Optional terms
        );

        // Build Google Calendar link
        const start = dayjs(startDateTime);
        const end = start.add(duration, 'hour');
        const formatForCal = (d) => {
            const iso = (new Date(d)).toISOString();
            return iso.replace(/[-:]/g, '').split('.')[0] + 'Z';
        };
        const gcalDates = `${formatForCal(start)}/${formatForCal(end)}`;
        const gcalBase = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
        const gcalText = encodeURIComponent(`RentHub booking ${bookingId} — ${vehicleName}`);
        const gcalDetails = encodeURIComponent(`Booking ID: ${bookingId}\nVehicle: ${vehicleName}\nPickup: ${startDateTime}`);
        const gcalUrl = `${gcalBase}&text=${gcalText}&dates=${gcalDates}&details=${gcalDetails}`;

        const mailHtml = `
            <div style="font-family: Arial, sans-serif; color: #222;">
              <h2 style="color:#0b5cff;">Hello ${userName},</h2>
              <p>Your booking is confirmed. Please find the invoice attached.</p>
              <h3>Booking details</h3>
              <table style="width:100%; border-collapse: collapse;">
                <tr><td style="padding:6px; border:1px solid #eee;"><b>Booking ID</b></td><td style="padding:6px; border:1px solid #eee;">${bookingId}</td></tr>
                <tr><td style="padding:6px; border:1px solid #eee;"><b>Vehicle</b></td><td style="padding:6px; border:1px solid #eee;">${vehicleName}</td></tr>
                <tr><td style="padding:6px; border:1px solid #eee;"><b>Pickup</b></td><td style="padding:6px; border:1px solid #eee;">${startDateTime}</td></tr>
                <tr><td style="padding:6px; border:1px solid #eee;"><b>Duration</b></td><td style="padding:6px; border:1px solid #eee;">${duration} hours</td></tr>
                <tr><td style="padding:6px; border:1px solid #eee;"><b>Total</b></td><td style="padding:6px; border:1px solid #eee;">₹${totalAmount}</td></tr>
              </table>
              <p style="margin-top:12px;">
                <a href="${gcalUrl}" style="display:inline-block;padding:10px 14px;background:#0b5cff;color:#fff;border-radius:4px;text-decoration:none;">Add to Google Calendar</a>
              </p>
              <hr style="margin-top:18px;" />
              <p style="font-size:12px;color:#666;">Pickup instructions: Please bring a valid ID and a printed or digital copy of this invoice. If you have any questions call us.</p>
              <p style="font-size:12px;color:#666;">If you find this email in spam, please mark as <b>Not Spam</b> to ensure future delivery.</p>
              <footer style="margin-top:18px;padding-top:8px;border-top:1px solid #eee;color:#999;font-size:12px;">
                <div>RentHub — Bike & Vehicle Rentals</div>
                <div><a href="mailto:renthub.otp@gmail.com" style="color: #999; text-decoration: none;">renthub.otp@gmail.com</a> | <a href="tel:+919040757683" style="color: #999; text-decoration: none;">+91 9040757683</a></div>
                <div>123 RentHub Street, City, Country</div>
              </footer>
            </div>
        `;

        const mailOptions = {
            to: userEmail,
            subject: 'Booking Confirmed – RentHub',
            html: mailHtml,
            attachments: [
                { filename: 'booking_invoice.pdf', content: pdfBuffer }
            ]
        };

        await sendEmail(mailOptions);

        // Optionally store a copy or update Supabase booking record (if booking id exists)
        try {
            if (body.bookingId && body.bookingId.startsWith('BK-') === false) {
                const { data, error } = await supabase.from('bookings').select('*').eq('id', body.bookingId).single();
                if (!error && data) {
                    await supabase.from('bookings').update({ status: 'confirmed', confirmation_timestamp: dayjs().format('YYYY-MM-DD HH:mm:ss') }).eq('id', body.bookingId);
                }
            }
        } catch (e) {
            console.warn('Supabase update skipped:', e.message);
        }

        res.json({ success: true, message: 'Invoice generated and email sent' });
    } catch (err) {
        console.error('Error in /confirmBooking:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/trackBooking?id=xxxxx
router.get('/trackBooking', async (req, res) => {
    try {
        const id = req.query.id;
        if (!id) return res.status(400).json({ error: 'id required' });
        // Try to fetch booking from supabase
        try {
            console.log(`🔍 [TrackBooking] Request received for ID: '${id}'`);
            let query = supabase.from('bookings').select('id, user_id, status, start_date, start_time, duration, vehicle_id, vehicle_type, advance_payment, created_at, booking_id, refund_amount, refund_status, confirmation_timestamp, delivery_option, delivery_status, agent_id, delivery_fee');

            // Check if input looks like a string booking ID (starts with RH or BK)
            const idStr = id.toString().trim();
            if (idStr.toUpperCase().startsWith('RH') || idStr.toUpperCase().startsWith('BK')) {
                console.log(`   -> Detected STRING ID (RH/BK). Querying 'booking_id' = '${idStr}'`);
                query = query.eq('booking_id', idStr);
            } else {
                console.log(`   -> Detected NUMERIC ID. Querying 'id' = '${idStr}'`);
                query = query.eq('id', idStr);
            }

            const { data, error } = await query.single();

            if (data) console.log(`   ✅ Booking Found: ID ${data.id} / ${data.booking_id}`);
            if (error) console.error(`   ❌ Supabase Error:`, error.message);
            if (error || !data) {
                return res.json({ id, status: 'unknown', message: 'Booking not found in DB (demo response)' });
            }
            return res.json({ success: true, booking: data });
        } catch (e) {
            return res.json({ id, status: 'unknown', message: 'Unable to fetch booking' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

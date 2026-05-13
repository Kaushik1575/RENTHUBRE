const supabase = require('../config/supabase');
const SupabaseDB = require('../models/supabaseDB');
const { getISTTimestamp } = require('../utils/dateUtils');
const { generateInvoiceBuffer } = require('../utils/invoiceGenerator');
const { 
    sendEmail, 
    sendRefundCompleteEmail, 
    sendSOSLinkEmail, 
    sendRideCompletedEmail, 
    sendVehicleApprovedEmail,
    sendAgentApprovedEmail 
} = require('../config/emailService');
const { sendWithdrawalPaidEmail } = require('../config/sponsorEmailService');
const { makeBookingConfirmationCall } = require('../config/retellCallService');
const { sendImmediateReminderIfNeeded, checkAndSendReminders } = require('../services/reminderService');
const { normalizeVehicleType } = require('../utils/vehicleTypeNormalizer');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const ADMIN_EMAILS = ['jyoti2006@gmail.com']; // Replace with env or config if needed

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Admin: Get all bookings (enriched)
const getAllBookings = async (req, res) => {
    try {
        const { data: bookings, error } = await supabase
            .from('bookings')
            .select(`
                *,
                users:user_id (
                    full_name,
                    email,
                    phone_number
                ),
                rewards:reward_id (
                    coupon_code,
                    reward_type
                )
            `)
            .order('id', { ascending: false });

        if (error) throw error;

        // Get all vehicles
        const { data: bikes } = await supabase.from('bikes').select('*');
        const { data: cars } = await supabase.from('cars').select('*');
        const { data: scooty } = await supabase.from('scooty').select('*');

        const allVehicles = [
            ...(bikes || []).map(v => ({ ...v, type: 'bike' })),
            ...(cars || []).map(v => ({ ...v, type: 'car' })),
            ...(scooty || []).map(v => ({ ...v, type: 'scooty' }))
        ];

        const enrichedBookings = bookings.map(booking => {
            const vehicle = allVehicles.find(v => v.id === booking.vehicle_id);
            const duration = parseInt(booking.duration) || 0;
            const vehiclePrice = vehicle ? parseFloat(vehicle.price) || 0 : 0;
            const totalAmount = duration * vehiclePrice;
            const advancePayment = parseFloat(booking.advance_payment) || Math.ceil(totalAmount * 0.3);
            const finalTotalAmount = booking.total_amount ? parseFloat(booking.total_amount) : totalAmount;
            const remainingAmount = finalTotalAmount - advancePayment;

            return {
                id: booking.id,
                booking_id: booking.booking_id || null,
                customerName: booking.users?.full_name || 'N/A',
                customerEmail: booking.users?.email || 'N/A',
                customerPhone: booking.users?.phone_number || 'N/A',
                vehicleName: vehicle ? vehicle.name : 'N/A',
                vehicleType: vehicle ? vehicle.type : booking.vehicle_type || 'N/A',
                vehicleCategory: vehicle ? vehicle.category : booking.vehicle_category || 'N/A',
                start_date: booking.start_date || 'N/A',
                start_time: booking.start_time || 'N/A',
                duration: duration,
                // Use DB total_amount if available (captures dynamic billing), else fallback to calculated
                total_amount: finalTotalAmount,
                advance_payment: advancePayment,
                remaining_amount: remainingAmount,
                status: booking.status || 'pending',
                refund_amount: parseFloat(booking.refund_amount) || 0,
                refund_status: booking.refund_status || 'N/A',
                refund_timestamp: booking.refund_timestamp || null,
                refund_details: booking.refund_details || null,
                refund_deduction: booking.refund_deduction !== undefined && booking.refund_deduction !== null ? parseFloat(booking.refund_deduction) : 0,
                created_at: booking.created_at || null,
                confirmation_timestamp: booking.confirmation_timestamp || null,
                cancelled_timestamp: booking.cancelled_timestamp || null,
                transaction_id: booking.transaction_id || 'N/A',
                ride_start_time: booking.ride_start_time || null,
                ride_end_time: booking.ride_end_time || null,
                extra_hours: booking.extra_hours || 0,
                extra_amount: booking.extra_amount || 0,
                refund_id: booking.refund_id || null,
                ride_end_time: booking.ride_end_time || null,
                extra_hours: booking.extra_hours || 0,
                extra_amount: booking.extra_amount || 0,
                refund_id: booking.refund_id || null,
                coins_earned: booking.coins_earned || 0,
                coupon_code: booking.rewards?.coupon_code || null,
                reward_type: booking.rewards?.reward_type || null,
                delivery_option: booking.delivery_option || 'pickup',
                delivery_address: booking.delivery_address || null,
                distance: booking.distance || 0,
                delivery_fee: booking.delivery_fee || 0,
                agent_id: booking.agent_id || null,
                // Intelligent Scheduling Fields (Drop-off)
                est_travel_time: booking.distance ? Math.ceil((parseFloat(booking.distance) / 20) * 60) : 0,
                est_departure_time: (booking.start_date && booking.start_time && booking.distance) ? 
                    new Date(new Date(`${booking.start_date}T${booking.start_time}`).getTime() - (Math.ceil((parseFloat(booking.distance) / 20) * 60) * 60000)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
                est_return_to_shop: (booking.start_date && booking.start_time && booking.distance) ? 
                    new Date(new Date(`${booking.start_date}T${booking.start_time}`).getTime() + ((10 + Math.ceil((parseFloat(booking.distance) / 20) * 60)) * 60000)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
                busy_until: (booking.start_date && booking.start_time && booking.distance) ? 
                    new Date(new Date(`${booking.start_date}T${booking.start_time}`).getTime() + ((10 + Math.ceil((parseFloat(booking.distance) / 20) * 60) + 15) * 60000)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,

                // Return Pickup Scheduling (Collection)
                pickup_est_departure: (booking.start_date && booking.start_time && booking.distance) ? 
                    new Date(new Date(`${booking.start_date}T${booking.start_time}`).getTime() + (duration * 3600000) - (Math.ceil((parseFloat(booking.distance) / 20) * 60) * 60000)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
                pickup_est_return: (booking.start_date && booking.start_time && booking.distance) ? 
                    new Date(new Date(`${booking.start_date}T${booking.start_time}`).getTime() + (duration * 3600000) + ((10 + Math.ceil((parseFloat(booking.distance) / 20) * 60)) * 60000)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null
            };
        });

        res.json({
            data: enrichedBookings,
            pagination: {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20,
                total: bookings.length,
                pages: Math.ceil(bookings.length / (parseInt(req.query.limit) || 20))
            }
        });
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ error: 'Error fetching bookings' });
    }
};

// Admin: Get single booking
const getBookingById = async (req, res) => {
    try {
        const { data: booking, error } = await supabase
            .from('bookings')
            .select(`
                *,
                users:user_id (
                    full_name,
                    email,
                    phone_number
                ),
                rewards:reward_id (
                    coupon_code,
                    reward_type
                )
            `)
            .eq('id', req.params.id)
            .single();

        if (error) throw error;
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        let vehicle;
        if (booking.vehicle_type === 'bike') {
            const { data } = await supabase.from('bikes').select('*').eq('id', booking.vehicle_id).single();
            vehicle = data;
        } else if (booking.vehicle_type === 'car') {
            const { data } = await supabase.from('cars').select('*').eq('id', booking.vehicle_id).single();
            vehicle = data;
        } else if (booking.vehicle_type === 'scooty') {
            const { data } = await supabase.from('scooty').select('*').eq('id', booking.vehicle_id).single();
            vehicle = data;
        }

        const duration = parseInt(booking.duration) || 0;
        const vehiclePrice = vehicle ? parseFloat(vehicle.price) || 0 : 0;
        const calculatedTotal = duration * vehiclePrice;
        const totalAmount = booking.total_amount ? parseFloat(booking.total_amount) : calculatedTotal;
        const advancePayment = parseFloat(booking.advance_payment) || Math.ceil(calculatedTotal * 0.3);
        const remainingAmount = totalAmount - advancePayment;

        const enrichedBooking = {
            id: booking.id,
            booking_id: booking.booking_id || null,
            customerName: booking.users?.full_name || 'N/A',
            customerEmail: booking.users?.email || 'N/A',
            customerPhone: booking.users?.phone_number || 'N/A',
            vehicleName: vehicle ? vehicle.name : 'N/A',
            vehicleType: vehicle ? vehicle.type : booking.vehicle_type || 'N/A',
            vehicleCategory: vehicle ? vehicle.category : booking.vehicle_category || 'N/A',
            start_date: booking.start_date || 'N/A',
            start_time: booking.start_time || 'N/A',
            duration: duration,
            total_amount: totalAmount,
            advance_payment: advancePayment,
            remaining_amount: remainingAmount,
            status: booking.status || 'pending',
            refund_amount: parseFloat(booking.refund_amount) || 0,
            refund_status: booking.refund_status || 'N/A',
            refund_timestamp: booking.refund_timestamp || null,
            refund_details: booking.refund_details || null,
            refund_deduction: booking.refund_deduction !== undefined && booking.refund_deduction !== null ? parseFloat(booking.refund_deduction) : 0,
            created_at: booking.created_at || null,
            confirmation_timestamp: booking.confirmation_timestamp || null,
            cancelled_timestamp: booking.cancelled_timestamp || null,
            transaction_id: booking.transaction_id || 'N/A',
            refund_id: booking.refund_id || null,
            transaction_id: booking.transaction_id || 'N/A',
            refund_id: booking.refund_id || null,
            coins_earned: booking.coins_earned || 0,
            coupon_code: booking.rewards?.coupon_code || null,
            reward_type: booking.rewards?.reward_type || null,
            delivery_option: booking.delivery_option || 'pickup',
            delivery_address: booking.delivery_address || null,
            distance: booking.distance || 0,
            delivery_fee: booking.delivery_fee || 0,
            agent_id: booking.agent_id || null,
            // Intelligent Scheduling Fields (Drop-off)
            est_travel_time: booking.distance ? Math.ceil((parseFloat(booking.distance) / 20) * 60) : 0,
            est_departure_time: (booking.start_date && booking.start_time && booking.distance) ? 
                new Date(new Date(`${booking.start_date}T${booking.start_time}`).getTime() - (Math.ceil((parseFloat(booking.distance) / 20) * 60) * 60000)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
            est_return_to_shop: (booking.start_date && booking.start_time && booking.distance) ? 
                new Date(new Date(`${booking.start_date}T${booking.start_time}`).getTime() + ((10 + Math.ceil((parseFloat(booking.distance) / 20) * 60)) * 60000)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
            busy_until: (booking.start_date && booking.start_time && booking.distance) ? 
                new Date(new Date(`${booking.start_date}T${booking.start_time}`).getTime() + ((10 + Math.ceil((parseFloat(booking.distance) / 20) * 60) + 15) * 60000)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,

            // Return Pickup Scheduling (Collection)
            pickup_est_departure: (booking.start_date && booking.start_time && booking.distance) ? 
                new Date(new Date(`${booking.start_date}T${booking.start_time}`).getTime() + (duration * 3600000) - (Math.ceil((parseFloat(booking.distance) / 20) * 60) * 60000)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
            pickup_est_return: (booking.start_date && booking.start_time && booking.distance) ? 
                new Date(new Date(`${booking.start_date}T${booking.start_time}`).getTime() + (duration * 3600000) + ((10 + Math.ceil((parseFloat(booking.distance) / 20) * 60)) * 60000)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null
        };

        res.json(enrichedBooking);
    } catch (error) {
        console.error('Error fetching booking:', error);
        res.status(500).json({ error: 'Error fetching booking' });
    }
};

// Admin: Delete booking
const deleteBooking = async (req, res) => {
    try {
        const { error } = await supabase.from('bookings').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ message: 'Booking deleted successfully' });
    } catch (error) {
        console.error('Error deleting booking:', error);
        res.status(500).json({ error: 'Error deleting booking' });
    }
};

// Admin: Update booking
const updateBooking = async (req, res) => {
    try {
        const { 
            startDate, start_date,
            startTime, start_time,
            duration, 
            status, 
            deliveryStatus, delivery_status,
            totalAmount, total_amount,
            advancePayment, advance_payment,
            remainingAmount, remaining_amount
        } = req.body;

        const { data, error } = await supabase
            .from('bookings')
            .update({
                start_date: start_date || startDate,
                start_time: start_time || startTime,
                duration: duration,
                status: status,
                delivery_status: delivery_status || deliveryStatus,
                total_amount: total_amount || totalAmount,
                advance_payment: advance_payment || advancePayment,
                remaining_amount: remaining_amount || remainingAmount,
                updated_at: new Date().toISOString()
            })
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error updating booking:', error);
        res.status(500).json({ error: 'Error updating booking' });
    }
};

// Admin: Confirm booking
const confirmBooking = async (req, res) => {
    try {
        const bookingId = req.params.id;
        console.log('Confirming booking with ID:', bookingId);

        const { data: booking, error: fetchError } = await supabase
            .from('bookings')
            .select(`
                *,
                users:user_id (
                    email,
                    full_name,
                    phone_number
                )
            `)
            .eq('id', bookingId)
            .single();

        if (fetchError) {
            console.error('Error fetching booking:', fetchError);
            return res.status(500).json({ error: 'Error fetching booking details' });
        }
        if (!booking) return res.status(404).json({ error: 'Booking not found' });

        let vehicle;
        if (booking.vehicle_type === 'bike') {
            const { data } = await supabase.from('bikes').select('*').eq('id', booking.vehicle_id).single();
            vehicle = data;
        } else if (booking.vehicle_type === 'car') {
            const { data } = await supabase.from('cars').select('*').eq('id', booking.vehicle_id).single();
            vehicle = data;
        } else if (booking.vehicle_type === 'scooty') {
            const { data } = await supabase.from('scooty').select('*').eq('id', booking.vehicle_id).single();
            vehicle = data;
        }

        const { data: updatedBooking, error: updateError } = await supabase
            .from('bookings')
            .update({
                status: 'confirmed',
                confirmation_timestamp: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', bookingId)
            .select()
            .single();

        if (updateError) throw updateError;

        // --- NEW: AUTO-ASSIGN DELIVERY AGENT ---
        if (updatedBooking.delivery_option === 'home_delivery') {
            try {
                const { autoAssignAgent } = require('../utils/autoAssigner');
                await autoAssignAgent(bookingId);
            } catch (assignError) {
                console.error('Auto-assignment failed:', assignError);
            }
        }

        if (updateError) {
            console.error('Error updating booking:', updateError);
            return res.status(500).json({ error: 'Error updating booking status' });
        }

        // Send confirmation email
        if (booking.users?.email && booking.users?.full_name) {
            try {
                const duration = parseInt(booking.duration) || 0;
                const vehiclePrice = vehicle ? parseFloat(vehicle.price) || 0 : 0;
                const totalAmount = duration * vehiclePrice;
                const advancePayment = parseFloat(booking.advance_payment) || Math.ceil(totalAmount * 0.3);
                const remainingAmount = totalAmount - advancePayment;

                const pdfBuffer = await generateInvoiceBuffer(
                    booking.booking_id || booking.id,
                    booking.users.full_name,
                    booking.users.email,
                    vehicle ? vehicle.name : 'Vehicle',
                    duration,
                    `${booking.start_date} ${booking.start_time}`,
                    totalAmount,
                    advancePayment
                );

                // Build Google Calendar link
                const dayjs = require('dayjs');
                const start = dayjs(`${booking.start_date}T${booking.start_time}`);
                const end = start.add(duration, 'hour');
                const formatForCal = (d) => {
                    const iso = (new Date(d)).toISOString();
                    return iso.replace(/[-:]/g, '').split('.')[0] + 'Z';
                };
                const gcalDates = `${formatForCal(start)}/${formatForCal(end)}`;
                const gcalBase = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
                const gcalText = encodeURIComponent(`RentHub booking ${bookingId} — ${vehicle ? vehicle.name : 'Vehicle'}`);
                const gcalDetails = encodeURIComponent(`Booking ID: ${bookingId}\nVehicle: ${vehicle ? vehicle.name : 'Vehicle'}\nPickup: ${booking.start_date} ${booking.start_time}`);
                const gcalUrl = `${gcalBase}&text=${gcalText}&dates=${gcalDates}&details=${gcalDetails}`;

                const mailHtml = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Booking Confirmed</title>
                    </head>
                    <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                                <td style="padding: 20px 0;">
                                    <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                                        <!-- Header -->
                                        <tr>
                                            <td align="center" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px;">
                                                <div style="font-size: 48px; margin-bottom: 10px;">✅</div>
                                                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Booking Confirmed!</h1>
                                                <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">Your ride is ready, ${booking.users.full_name}!</p>
                                            </td>
                                        </tr>
                                        
                                        <!-- Main Content -->
                                        <tr>
                                            <td style="padding: 40px 30px;">
                                                <div style="background-color: #f8f9fa; border-left: 5px solid #667eea; padding: 15px; margin-bottom: 25px; border-radius: 4px;">
                                                    <p style="margin: 0; color: #495057; font-size: 15px;">
                                                        <strong>Great news!</strong> Your booking has been confirmed by our team. Your invoice is attached to this email.
                                                    </p>
                                                </div>

                                                <!-- Booking ID Badge -->
                                                <div style="text-align: center; margin: 25px 0;">
                                                    <div style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; border-radius: 50px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
                                                        📋 Booking ID: ${bookingId}
                                                    </div>
                                                </div>

                                                <!-- Booking Details Card -->
                                                <h3 style="color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-top: 30px;">📝 Booking Details</h3>
                                                <table width="100%" style="margin-bottom: 25px; background: #f8fbff; border-radius: 8px; overflow: hidden;">
                                                    <tr style="background: #e3f2fd;">
                                                        <td style="padding: 12px 15px; color: #1976d2; font-weight: bold; width: 40%;">🚗 Vehicle</td>
                                                        <td style="padding: 12px 15px; color: #333; font-weight: bold;">${vehicle ? vehicle.name : 'Vehicle'}</td>
                                                    </tr>
                                                    <tr>
                                                        <td style="padding: 12px 15px; color: #666; border-top: 1px solid #e0e0e0;">📅 Pickup Date</td>
                                                        <td style="padding: 12px 15px; color: #333; border-top: 1px solid #e0e0e0;">${booking.start_date}</td>
                                                    </tr>
                                                    <tr style="background: #f8f9fa;">
                                                        <td style="padding: 12px 15px; color: #666; border-top: 1px solid #e0e0e0;">🕐 Pickup Time</td>
                                                        <td style="padding: 12px 15px; color: #333; border-top: 1px solid #e0e0e0;">${booking.start_time}</td>
                                                    </tr>
                                                    <tr>
                                                        <td style="padding: 12px 15px; color: #666; border-top: 1px solid #e0e0e0;">⏱️ Duration</td>
                                                        <td style="padding: 12px 15px; color: #333; border-top: 1px solid #e0e0e0;">${duration} hours</td>
                                                    </tr>
                                                </table>

                                                <!-- Payment Summary -->
                                                <h3 style="color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px;">💰 Payment Summary</h3>
                                                <table width="100%" style="margin-bottom: 25px; background: #fff8e1; border-radius: 8px; overflow: hidden; border: 2px solid #ffd54f;">
                                                    <tr>
                                                        <td style="padding: 12px 15px; color: #666; width: 40%;">Total Amount</td>
                                                        <td style="padding: 12px 15px; color: #333; font-size: 18px; font-weight: bold;">₹${totalAmount}</td>
                                                    </tr>
                                                    <tr style="background: #fff9c4;">
                                                        <td style="padding: 12px 15px; color: #666; border-top: 1px solid #ffe082;">Advance Paid</td>
                                                        <td style="padding: 12px 15px; color: #2e7d32; font-size: 18px; font-weight: bold; border-top: 1px solid #ffe082;">₹${advancePayment} ✓</td>
                                                    </tr>
                                                    <tr>
                                                        <td style="padding: 12px 15px; color: #666; border-top: 2px solid #ffd54f;">Remaining to Pay</td>
                                                        <td style="padding: 12px 15px; color: #d84315; font-size: 20px; font-weight: bold; border-top: 2px solid #ffd54f;">₹${remainingAmount}</td>
                                                    </tr>
                                                </table>

                                                <!-- Action Buttons -->
                                                <div style="text-align: center; margin: 30px 0;">
                                                    <a href="${gcalUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px; margin: 5px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
                                                        📅 Add to Calendar
                                                    </a>
                                                </div>

                                                <!-- Important Notice -->
                                                <div style="background-color: #fff3cd; border-left: 5px solid #ffc107; padding: 15px; margin: 25px 0; border-radius: 4px;">
                                                    <p style="margin: 0 0 10px 0; color: #856404; font-weight: bold; font-size: 15px;">📌 Important Reminders:</p>
                                                    <ul style="margin: 0; padding-left: 20px; color: #856404;">
                                                        <li style="margin-bottom: 5px;">Bring a valid ID proof at pickup</li>
                                                        <li style="margin-bottom: 5px;">Keep your invoice ready (attached)</li>
                                                        <li style="margin-bottom: 5px;">Pay remaining ₹${remainingAmount} at pickup</li>
                                                        <li>Arrive 10 minutes early for a smooth experience</li>
                                                    </ul>
                                                </div>

                                                <!-- Contact Support -->
                                                <div style="text-align: center; margin: 30px 0; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                                                    <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Need help or want to make changes?</p>
                                                    <a href="tel:+919040757683" style="color: #667eea; text-decoration: none; font-weight: bold; font-size: 16px;">📞 Call Support (+91 9040757683)</a>
                                                </div>
                                            </td>
                                        </tr>
                                        
                                        <!-- Footer -->
                                        <tr>
                                            <td style="background-color: #333; color: #fff; padding: 25px; text-align: center; font-size: 14px;">
                                                <p style="margin: 0 0 10px 0; font-weight: bold;">RentHub - Your Journey, Our Priority</p>
                                                <p style="margin: 0; color: #999; font-size: 12px;">renthub.otp@gmail.com | +91 9040757683</p>
                                                <p style="margin: 10px 0 0 0; color: #666; font-size: 11px;">If this email is in spam, please mark it as "Not Spam"</p>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </body>
                    </html>
                `;

                const mailOptions = {
                    to: booking.users.email,
                    html: mailHtml,
                    attachments: [
                        { filename: 'booking_invoice.pdf', content: pdfBuffer }
                    ]
                };

                await sendEmail(mailOptions);
                console.log('✅ Booking confirmation email sent');
            } catch (emailError) {
                console.error('❌ Error sending confirmation email:', emailError);
            }
        }

        // Retell call
        if (booking.users?.phone_number) {
            try {
                const duration = parseInt(booking.duration) || 0;
                const vehiclePrice = vehicle ? parseFloat(vehicle.price) || 0 : 0;
                const totalAmount = duration * vehiclePrice;
                const advancePayment = parseFloat(booking.advance_payment) || Math.ceil(totalAmount * 0.3);
                const remainingAmount = totalAmount - advancePayment;

                const bookingDetails = {
                    bookingId,
                    vehicleName: vehicle ? vehicle.name : 'N/A',
                    vehicleType: vehicle ? vehicle.type : booking.vehicle_type || 'N/A',
                    startDate: booking.start_date || 'N/A',
                    startTime: booking.start_time || 'N/A',
                    duration,
                    totalAmount,
                    advancePayment,
                    remainingAmount,
                    userName: booking.users.full_name || 'Customer'
                };
                await makeBookingConfirmationCall(booking.users.phone_number, bookingDetails);
                console.log('📞 Call initiated');
            } catch (callError) {
                console.error('❌ Call error:', callError);
            }
        }

        // Immediate reminder check
        try {
            await sendImmediateReminderIfNeeded(bookingId);
        } catch (reminderError) {
            console.error('❌ Reminder error:', reminderError);
        }

        res.json(updatedBooking);

    } catch (error) {
        console.error('Error confirming booking:', error);
        res.status(500).json({ error: 'Error confirming booking' });
    }
};



// Admin: Cancel booking
const cancelBookingAdmin = async (req, res) => {
    try {
        const bookingId = parseInt(req.params.id);
        const { data: booking, error: fetchError } = await supabase.from('bookings').select('*, users:user_id(*)').eq('id', bookingId).single();

        if (fetchError || !booking) return res.status(404).json({ error: 'Booking not found' });
        if (booking.status !== 'confirmed') return res.status(400).json({ error: 'Only confirmed bookings can be cancelled' });

        const now = new Date();
        const confirmationTime = booking.confirmation_timestamp ? new Date(booking.confirmation_timestamp) : now;
        const hoursSinceConfirmation = (now - confirmationTime) / (1000 * 60 * 60);

        const advancePayment = parseFloat(booking.advance_payment) || 100;
        let refundAmount = hoursSinceConfirmation <= 2 ? advancePayment : Math.round(advancePayment * 0.7);
        let deductionAmount = hoursSinceConfirmation > 2 ? Math.round(advancePayment * 0.3) : 0;
        const localCancelTimestamp = new Date().toISOString();

        let refundStatus = 'processing';
        let razorpayRefundId = null;

        if (booking.transaction_id && refundAmount > 0) {
            try {
                console.log('Initiating Razorpay refund (Admin Cancel)...', { transaction_id: booking.transaction_id, amount: refundAmount * 100 });
                const refundResponse = await razorpay.payments.refund(booking.transaction_id, {
                    amount: refundAmount * 100,
                    notes: { booking_id: bookingId, reason: 'Booking cancelled by admin', cancelled_at: localCancelTimestamp }
                });
                console.log('✅ Razorpay Refund SUCCESS (Admin Cancel):', JSON.stringify(refundResponse, null, 2));
                refundStatus = 'completed';
                razorpayRefundId = refundResponse.id;
            } catch (e) {
                console.error('❌ Razorpay Refund FAILED (Admin Cancel):', e);
                if (e.error) {
                    console.error('Razorpay Error Details:', JSON.stringify(e.error, null, 2));
                }
            }
        } else if (refundAmount === 0) refundStatus = 'not_applicable';

        const { data: updatedBooking, error: updateError } = await supabase.from('bookings').update({
            status: 'cancelled',
            refund_amount: refundAmount,
            refund_status: refundStatus,
            refund_id: razorpayRefundId,
            refund_details: req.body && req.body.refundDetails ? req.body.refundDetails : null,
            cancelled_timestamp: localCancelTimestamp,
            refund_deduction: deductionAmount,
            refund_timestamp: refundStatus === 'completed' ? localCancelTimestamp : null
        }).eq('id', bookingId).select().single();

        if (updateError) throw updateError;

        if (booking.vehicle_id && booking.vehicle_type) {
            let vehicleTable = booking.vehicle_type;
            if (vehicleTable === 'car') vehicleTable = 'cars';
            if (vehicleTable === 'bike') vehicleTable = 'bikes';
            await supabase.from(vehicleTable).update({ is_available: true }).eq('id', booking.vehicle_id);
        }

        res.json({ message: 'Booking cancelled successfully', refundAmount, booking: updatedBooking });

    } catch (error) {
        console.error('Error in cancel booking endpoint:', error);
        res.status(500).json({ error: 'Error cancelling booking' });
    }
};

// Admin: Mark refund complete
const markRefundComplete = async (req, res) => {
    try {
        const bookingId = parseInt(req.params.id);
        const adminId = req.user.id;

        const { data: admin } = await supabase.from('users').select('is_admin').eq('id', adminId).single();
        if (!admin || !admin.is_admin) return res.status(403).json({ error: 'Unauthorized' });

        const { data: booking, error: updateError } = await supabase.from('bookings').update({
            refund_status: 'completed',
            refund_timestamp: new Date().toISOString(),
            refund_completed_by: adminId
        }).eq('id', bookingId).select('*, users:user_id(email, full_name)').single();

        if (updateError) throw updateError;

        // Log
        await supabase.from('activity_log').insert({
            admin_id: adminId, action: 'refund_completed', booking_id: bookingId, details: { refund_amount: booking.refund_amount }
        });

        // Email
        if (booking.users?.email) {
            await sendRefundCompleteEmail(booking.users.email, booking.users.full_name, booking.booking_id || booking.id, booking.refund_amount, booking.refund_timestamp, booking.refund_details);
        }

        res.json({ message: 'Refund marked as completed', booking });
    } catch (error) {
        console.error('Error completing refund:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Admin: Send SOS
const sendSOS = async (req, res) => {
    try {
        const { bookingId } = req.body;
        const { data: booking } = await supabase.from('bookings').select('*, users:user_id(email, full_name, phone_number)').eq('id', bookingId).single();

        if (!booking) return res.status(404).json({ error: 'Booking not found' });
        const status = (booking.status || '').toLowerCase();
        if (status !== 'confirmed' && status !== 'ride_started') {
            return res.status(400).json({ error: 'SOS can only be sent for confirmed or active rides' });
        }

        const userEmail = booking.users?.email || ((Array.isArray(booking.users) && booking.users[0]?.email) ? booking.users[0].email : null);
        const userName = booking.users?.full_name || 'User';

        if (!userEmail) return res.status(404).json({ error: 'User email not found' });

        const sosToken = crypto.randomBytes(32).toString('hex');
        const frontendUrl = process.env.FRONTEND_URL || 'https://rent-hub-r.vercel.app';
        // Use RH format for frontend display if available
        const displayBookingId = booking.booking_id || booking.id;
        const sosActivationLink = `${frontendUrl}/sos-activate?token=${sosToken}&bookingId=${displayBookingId}`;

        if (!global.sosTokens) global.sosTokens = {};
        global.sosTokens[sosToken] = { bookingId: booking.id, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() };

        await sendSOSLinkEmail(userEmail, userName, sosActivationLink);
        res.json({ success: true, message: 'SOS activation link sent to ' + userEmail });

    } catch (error) {
        res.status(500).json({ error: 'Error sending SOS: ' + error.message });
    }
};



// Admin: Handle QR Scan (Start/End Ride)
const handleQRScan = async (req, res) => {
    try {
        let { bookingId } = req.body;
        console.log('📷 QR Scan received for Booking ID:', bookingId);

        // 0. Parse Booking ID if it's a JSON string (Fix for QR codes containing full JSON)
        try {
            if (bookingId && typeof bookingId === 'string' && bookingId.trim().startsWith('{')) {
                const parsed = JSON.parse(bookingId);
                if (parsed.bookingId) {
                    bookingId = parsed.bookingId;
                    console.log('✅ Extracted Booking ID from JSON:', bookingId);
                }
            }
        } catch (e) {
            console.log('⚠️ Failed to parse Booking ID as JSON, using raw value');
        }

        if (!bookingId) {
            return res.status(400).json({ error: 'Booking ID is required' });
        }

        // 1. Fetch Booking
        // Try searching by booking_id string first, then fallback to id if numeric
        let query = supabase.from('bookings').select('*, users:user_id(full_name, email)').eq('booking_id', bookingId).single();
        let { data: booking, error } = await query;

        // If not found by booking_id, and input is numeric, try searching by numeric id
        if (!booking && !Number.isNaN(Number(bookingId))) {
            const { data: bookingById } = await supabase.from('bookings').select('*, users:user_id(full_name, email)').eq('id', bookingId).single();
            booking = bookingById;
        }

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        const now = new Date();
        const localTimestamp = getISTTimestamp();

        // 2. Logic: Confirmed -> RIDE_STARTED
        if (booking.status === 'confirmed') {
            // ---------------------------------------------------------
            // RIDE START LOGIC
            // ---------------------------------------------------------
            const nowISO = new Date().toISOString();

            // Validate: Don't start if already started
            if (booking.ride_start_time) {
                return res.status(400).json({ success: false, message: 'Ride already started for this booking.' });
            }

            const { error: updateError } = await supabase
                .from('bookings')
                .update({
                    status: 'ride_started',
                    ride_start_time: nowISO, // Store UTC ISO
                    updated_at: nowISO
                })
                .eq('id', booking.id);

            if (updateError) throw updateError;

            return res.json({
                success: true,
                message: 'Ride started successfully',
                type: 'ride_start',
                booking: { ...booking, status: 'ride_started', ride_start_time: nowISO }
            });
        }

        // 3. Logic: RIDE_STARTED -> RIDE_COMPLETED
        if (booking.status === 'ride_started') {
            const startTimeStr = booking.ride_start_time || booking.updated_at;
            let startTime = new Date(startTimeStr);

            // Check for Invalid Date (fallback logic)
            if (isNaN(startTime.getTime())) {
                // Try manual IST fix as last resort if old data exists
                startTime = new Date(startTimeStr.replace(' ', 'T') + '+05:30');
            }

            const endTime = now; // 'now' is new Date()
            const localTimestamp = now.toISOString(); // Store UTC ISO

            // Calculate duration in milliseconds
            const durationMs = endTime - startTime;

            // Safety: Ensure non-negative duration
            if (durationMs < 0) {
                // This should theoretically not happen with UTC-UTC math, but if it does, clamp to 0 or 1 min
                console.warn("Negative duration detected:", durationMs);
            }

            const totalMinutes = Math.max(0, Math.floor(durationMs / (1000 * 60)));
            const totalHours = Math.floor(totalMinutes / 60);
            const remainingMinutes = totalMinutes % 60;

            // ---------------------------------------------------------
            // USAGE-BASED BILLING LOGIC
            // ---------------------------------------------------------

            // 1. Get Vehicle Price
            let vehiclePricePerHour = 0;
            let vehicleTable = booking.vehicle_type;
            if (vehicleTable === 'car') vehicleTable = 'cars';
            if (vehicleTable === 'bike') vehicleTable = 'bikes';
            if (vehicleTable === 'scooty') vehicleTable = 'scooty';

            const { data: vehicle } = await supabase.from(vehicleTable).select('price').eq('id', booking.vehicle_id).single();
            if (vehicle) {
                vehiclePricePerHour = parseFloat(vehicle.price) || 0;
            }

            // 2. Calculate Actual Billable Amount
            // POLICY UPDATE: "No Refund for Early Return"
            // If used time < booked time, charge for full booked time.
            // If used time > booked time, charge for actual used time (Booked + Extra).
            const bookedDurationHours = parseFloat(booking.duration) || 0; // Use parseFloat to handle half hours if any
            const bookedDurationMinutes = Math.floor(bookedDurationHours * 60);

            // The Effective Billable Minutes is whichever is larger
            const effectiveBillableMinutes = Math.max(totalMinutes, bookedDurationMinutes);

            const pricePerMinute = vehiclePricePerHour / 60;
            const actualBillableAmount = Math.ceil(effectiveBillableMinutes * pricePerMinute);

            // 3. Calculate Extra Stats (for record keeping)
            // Extra minutes only exist if strict usage exceeded booked duration
            let extraMinutes = Math.max(0, totalMinutes - bookedDurationMinutes);
            let extraAmount = 0;

            if (extraMinutes > 0) {
                extraAmount = Math.ceil(extraMinutes * pricePerMinute);
            }

            // 4. Calculate Final Payments
            const advancePaid = parseFloat(booking.advance_payment) || 0;
            const finalBalance = actualBillableAmount - advancePaid;

            // 5. Construct Message
            let durationText = `${totalHours} hr ${remainingMinutes} mins`;
            let message = `Ride Completed.\nDuration: ${durationText}.\nActual Cost: ₹${actualBillableAmount}.\nAdvance: ₹${advancePaid}.`;

            if (finalBalance < 0) {
                message += `\nREFUND: ₹${Math.abs(finalBalance)}`;
            } else {
                message += `\nTOTAL PAYABLE: ₹${finalBalance}`;
            }

            // 6. Update Database
            // const updatedRemainingAmount = finalBalance > 0 ? finalBalance : 0; // Uncomment after running migration
            const { error: updateError } = await supabase
                .from('bookings')
                .update({
                    status: 'ride_completed',
                    ride_end_time: now.toISOString(), // Store UTC ISO for consistency
                    actual_duration_hours: totalHours,
                    extra_hours: parseFloat((extraMinutes / 60).toFixed(2)),
                    extra_amount: extraAmount,
                    total_amount: actualBillableAmount,
                    updated_at: now.toISOString()
                })
                .eq('id', booking.id);

            if (updateError) throw updateError;

            // 7. Prepare Response
            const responseData = {
                rideStartTime: startTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), // Format for user
                rideEndTime: endTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
                durationText: durationText,
                totalHoursUsed: totalHours,
                totalMinutesUsed: totalMinutes,
                bookedDuration: bookedDurationHours,
                extraMinutes: extraMinutes,
                extraHours: parseFloat((extraMinutes / 60).toFixed(2)), // Decimal hours for display
                extraAmount: extraAmount,
                // Payment Details
                totalBaseAmount: actualBillableAmount, // Now strictly usage based
                advancePaid: advancePaid,
                pendingBase: 0, // Deprecated in favor of direct balance
                totalPayable: finalBalance
            };

            return res.json({
                success: true,
                message: message,
                type: 'ride_end',
                data: responseData
            });
        }

        // 4. Validation: Already Completed
        if (booking.status === 'ride_completed' || booking.status === 'completed') {
            // Instead of error, return success with booking info
            const total = parseFloat(booking.total_amount) || 0;
            const advance = parseFloat(booking.advance_payment) || 0;
            const balance = total - advance;

            return res.json({
                success: true,
                message: `Ride already completed for this booking`,
                type: 'already_completed',
                data: {
                    bookingId: booking.booking_id || booking.id,
                    status: booking.status,
                    totalAmount: total,
                    advancePaid: advance,
                    balance: balance,
                    rideStartTime: booking.ride_start_time,
                    rideEndTime: booking.ride_end_time
                }
            });
        }

        // 5. Validation: Other statuses (cancelled, rejected, pending)
        return res.status(400).json({ error: `Cannot scan QR. Current status: ${booking.status}` });

    } catch (error) {
        console.error('Error processing QR Scan:', error);
        res.status(500).json({ error: 'Internal Server Error processing QR' });
    }
};

// Dashboard Stats
const getDashboardStats = async (req, res) => {
    try {
        console.log('📊 Fetching dashboard stats...');

        const { count: bikeCount, error: bikeError } = await supabase.from('bikes').select('id', { count: 'exact', head: true });
        if (bikeError) console.error('Bike count error:', bikeError);

        const { count: carCount, error: carError } = await supabase.from('cars').select('id', { count: 'exact', head: true });
        if (carError) console.error('Car count error:', carError);

        const { count: scootyCount, error: scootyError } = await supabase.from('scooty').select('id', { count: 'exact', head: true });
        if (scootyError) console.error('Scooty count error:', scootyError);

        const totalVehicles = (bikeCount || 0) + (carCount || 0) + (scootyCount || 0);
        console.log(`Vehicles: ${totalVehicles} (Bikes: ${bikeCount}, Cars: ${carCount}, Scooty: ${scootyCount})`);

        const { count: activeUsers, error: userError } = await supabase.from('users').select('id', { count: 'exact', head: true });
        if (userError) console.error('User count error:', userError);
        console.log(`Active Users: ${activeUsers}`);

        const { count: totalBookingsMonth, error: monthError } = await supabase.from('bookings').select('id', { count: 'exact', head: true })
            .gte('start_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
        if (monthError) console.error('Month bookings error:', monthError);

        const { count: pendingBookings } = await supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'pending');
        const { count: confirmedBookings } = await supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'confirmed');
        const { count: cancelledBookings } = await supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'cancelled');
        const { count: pendingRefunds } = await supabase.from('bookings').select('id', { count: 'exact', head: true }).in('status', ['cancelled', 'rejected']).eq('refund_status', 'processing');

        console.log(`Bookings: Pending=${pendingBookings}, Confirmed=${confirmedBookings}, Cancelled=${cancelledBookings}, Refunds=${pendingRefunds}`);

        const today = new Date().toISOString().split('T')[0];
        const { count: todaysBookings } = await supabase.from('bookings').select('id', { count: 'exact', head: true })
            .gte('created_at', today + 'T00:00:00').lt('created_at', today + 'T23:59:59');

        const { data: recentBookings } = await supabase.from('bookings').select(`id, booking_id, status, created_at, users (full_name), vehicle_type`).order('created_at', { ascending: false }).limit(5);

        const recentActivity = (recentBookings || []).map(b => {
            let description = '';
            const userName = b.users?.full_name || 'User';
            let type = 'created';
            if (b.status === 'confirmed') type = 'confirmed';
            else if (b.status === 'cancelled') type = 'cancelled';
            else if (b.status === 'rejected') type = 'rejected';

            const displayId = b.booking_id || `#${b.id}`;

            if (b.status === 'confirmed') description = `Booking ${displayId} confirmed for ${userName}`;
            else if (b.status === 'cancelled') description = `Booking ${displayId} cancelled by ${userName}`;
            else if (b.status === 'rejected') description = `Booking ${displayId} rejected`;
            else description = `New booking ${displayId} from ${userName}`;

            return { type, description, timestamp: b.created_at };
        });

        const todayDate = new Date().toISOString();
        const { count: activeOffers } = await supabase.from('offers').select('id', { count: 'exact', head: true })
            .eq('is_active', true)
            .or(`valid_until.gte.${todayDate},valid_until.is.null`);

        res.json({ totalVehicles, totalBookingsMonth, activeUsers, pendingBookings, confirmedBookings, cancelledBookings, pendingRefunds, todaysBookings, activeOffers, recentActivity });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Error fetching dashboard stats' });
    }
};

// Users management
const getAllUsers = async (req, res) => {
    try {
        const { data } = await supabase.from('users').select('*');
        const mapped = (data || []).map(u => ({
            id: u.id, fullName: u.full_name, adminName: u.admin_name, email: u.email, phoneNumber: u.phone_number, isAdmin: u.is_admin, isBlocked: u.is_blocked
        }));
        res.json(mapped);
    } catch (error) { res.status(500).json({ error: 'Error' }); }
};

const getUserById = async (req, res) => {
    try {
        const { data } = await supabase.from('users').select('*').eq('id', req.params.id).single();
        res.json({ id: data.id, fullName: data.full_name, email: data.email, phoneNumber: data.phone_number, isAdmin: data.is_admin, isBlocked: data.is_blocked, createdAt: data.created_at });
    } catch (error) { res.status(500).json({ error: 'Error' }); }
};

const updateUser = async (req, res) => {
    try {
        const { fullName, email, phoneNumber } = req.body;
        const { data } = await supabase.from('users').update({ full_name: fullName, email, phone_number: phoneNumber }).eq('id', req.params.id).select().single();
        res.json(data);
    } catch (error) { res.status(500).json({ error: 'Error' }); }
};

const blockUser = async (req, res) => {
    try {
        const { isBlocked } = req.body;
        const { data } = await supabase.from('users').update({ is_blocked: isBlocked }).eq('id', req.params.id).select().single();
        res.json(data);
    } catch (error) { res.status(500).json({ error: 'Error' }); }
};

// Vehicles management
const getAllVehicles = async (req, res) => {
    try {
        const bikes = await supabase.from('bikes').select('*');
        const cars = await supabase.from('cars').select('*');
        const scooty = await supabase.from('scooty').select('*');
        const allVehicles = [
            ...(bikes.data || []).map(v => ({ ...v, type: 'bike' })),
            ...(cars.data || []).map(v => ({ ...v, type: 'car' })),
            ...(scooty.data || []).map(v => ({ ...v, type: 'scooty' }))
        ];
        res.json(allVehicles);
    } catch (error) { res.status(500).json({ error: 'Error' }); }
};

const getVehicleById = async (req, res) => {
    try {
        let { type, id } = req.params;
        if (type === 'car') type = 'cars';
        if (type === 'bike') type = 'bikes';
        if (type === 'scooty') type = 'scooty';
        const { data } = await supabase.from(type).select('*').eq('id', id).single();
        res.json(data);
    } catch (error) { res.status(500).json({ error: 'Error' }); }
};

const updateVehicle = async (req, res) => {
    try {
        let { type, id } = req.params;
        if (type === 'car') type = 'cars';
        if (type === 'bike') type = 'bikes';
        if (type === 'scooty') type = 'scooty';

        const { status, type: payloadType, ...updates } = req.body;

        // Map status to is_available if present
        if (status) {
            updates.is_available = status === 'available';
        }

        const { data } = await supabase.from(type).update(updates).eq('id', id).select().single();
        res.json(data);
    } catch (error) { res.status(500).json({ error: 'Error' }); }
};

const deleteVehicle = async (req, res) => {
    try {
        let { type, id } = req.params;
        if (type === 'car') type = 'cars';
        if (type === 'bike') type = 'bikes';
        if (type === 'scooty') type = 'scooty';
        await supabase.from(type).delete().eq('id', id);
        res.json({ message: 'Vehicle deleted successfully' });
    } catch (error) { res.status(500).json({ error: 'Error' }); }
};

const addVehicle = async (req, res) => {
    try {
        let { type } = req.params;
        // Fields from the form/request
        const {
            requestId,
            status,
            type: payloadType, // exclude
            ...bodyData
        } = req.body;

        if (type === 'car') type = 'cars';
        else if (type === 'bike' || type === 'bikes') type = 'bikes';
        else if (type === 'scooty') type = 'scooty';
        else return res.status(400).json({ error: 'Invalid vehicle type' });

        // --- IDEMPOTENCY & DUPLICATE CHECKS ---
        if (requestId) {
            // 1. Check if request is already approved
            const { data: requestCheck, error: checkError } = await supabase
                .from('sponsor_vehicle_requests')
                .select('status')
                .eq('id', requestId)
                .single();

            if (checkError) {
                console.error('Error checking request status:', checkError);
                return res.status(500).json({ error: 'Error validating request' });
            }

            if (requestCheck && requestCheck.status === 'approved') {
                console.log(`⚠️ Request ${requestId} is already approved. Preventing duplicate.`);
                return res.status(200).json({ message: 'Vehicle already approved', alreadyApproved: true });
            }
        }

        // 2. Check if Registration Number already exists in the target table
        if (bodyData.registration_number) {
            const { data: existingVehicle, error: existError } = await supabase
                .from(type)
                .select('id')
                .eq('registration_number', bodyData.registration_number)
                .single();

            if (existingVehicle) {
                console.log(`⚠️ Vehicle with Reg No ${bodyData.registration_number} already exists.`);
                return res.status(409).json({ error: 'Vehicle with this registration number already exists' });
            }
        }
        // --------------------------------------

        // Define allowed columns based on known schema
        const allowedColumns = [
            'name',
            'price',
            'image_url',
            'is_available',
            'is_approved',
            'sponsor_id',
            'fuel_type',
            'engine',
            'rc_url',
            'insurance_url',
            'puc_url',
            'registration_number', // Ensure this is allowed
            'model',
            'year',
            'category'
        ];

        // Construct insert object
        const insertData = {};

        // 1. Map fields directly if they exist in allowedColumns
        Object.keys(bodyData).forEach(key => {
            if (allowedColumns.includes(key)) {
                insertData[key] = bodyData[key];
            }
        });

        // 2. Explicit mappings
        // Map 'status' from form to 'is_available' in DB
        insertData.is_available = status === 'available';

        // Ensure default fields
        insertData.is_approved = true;

        // Insert into main table
        const { data, error } = await supabase
            .from(type)
            .insert([insertData])
            .select()
            .single();

        if (error) throw error;

        // If this was a sponsor request, approve it and send email
        if (requestId) {
            // 1. Update status
            const { error: updateReqError } = await supabase
                .from('sponsor_vehicle_requests')
                .update({ status: 'approved' })
                .eq('id', requestId);

            if (updateReqError) console.error("Error updating request status:", updateReqError);

            // 2. Send notification email
            try {
                // Fetch full request details to get sponsor ID and vehicle info
                const { data: request, error: reqError } = await supabase
                    .from('sponsor_vehicle_requests')
                    .select('sponsor_id, vehicle_type, name, price, model, year')
                    .eq('id', requestId)
                    .single();

                if (reqError) {
                    console.error('Error fetching request for email:', reqError);
                } else if (request) {
                    const { data: sponsor } = await supabase
                        .from('sponsors')
                        .select('email, full_name')
                        .eq('id', request.sponsor_id)
                        .single();

                    if (sponsor && sponsor.email) {
                        const { sendVehicleApprovedEmail } = require('../config/emailService');

                        // Construct vehicle name with model if available
                        let vehicleName = request.name || 'Vehicle';
                        if (request.model) vehicleName += ` ${request.model}`;
                        if (request.year) vehicleName += ` (${request.year})`;

                        console.log(`📧 Sending approval email to ${sponsor.email} for ${vehicleName}`);

                        const emailResult = await sendVehicleApprovedEmail(
                            sponsor.email,
                            sponsor.full_name,
                            {
                                vehicleName: vehicleName,
                                type: request.vehicle_type,
                                price: request.price
                            }
                        );

                        if (emailResult && emailResult.success) {
                            console.log('✅ Approval email sent successfully');
                        } else {
                            console.error('❌ Email sending failed:', emailResult);
                        }
                    } else {
                        console.error('❌ Sponsor email not found');
                    }
                } else {
                    console.error('❌ Request not found for email notification');
                }
            } catch (emailError) {
                console.error('❌ Error sending approval email:', emailError);
            }
        }

        res.status(201).json(data);

    } catch (error) {
        console.error('Error adding vehicle:', error);
        res.status(500).json({ error: 'Error adding vehicle' });
    }
};

const getVehicleRequests = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('sponsor_vehicle_requests')
            .select('*, sponsors(full_name, phone_number)')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const formattedData = data.map(r => ({
            id: r.id, // Request ID
            sponsor_id: r.sponsor_id,
            vehicleType: r.vehicle_type,
            name: r.name,
            registration_number: r.registration_number,
            model: r.model,
            year: r.year,
            price: r.price,
            image_url: r.image_url,
            rc_url: r.rc_url,
            insurance_url: r.insurance_url,
            puc_url: r.puc_url,
            status: r.status,
            sponsors: r.sponsors
        }));

        res.json(formattedData);
    } catch (error) {
        console.error('Error fetching vehicle requests:', error);
        res.status(500).json({ error: 'Failed to fetch requests' });
    }
};

const approveVehicle = async (req, res) => {
    try {
        const requestId = req.params.id;

        // 1. Get the request
        const { data: request, error: reqError } = await supabase
            .from('sponsor_vehicle_requests')
            .select('*')
            .eq('id', requestId)
            .single();

        if (reqError) throw reqError;
        if (!request) return res.status(404).json({ error: 'Request not found' });

        // 2. Prepare data for main table
        // 2. Prepare data for main table
        const vehicleData = {
            name: request.name,
            registration_number: request.registration_number,
            model: request.model,
            year: request.year,
            price: request.price,
            image_url: request.image_url,
            rc_url: request.rc_url,
            insurance_url: request.insurance_url,
            puc_url: request.puc_url,
            sponsor_id: request.sponsor_id,
            is_approved: true,
            is_available: true
        };

        // Determine table
        let tableName;
        if (request.vehicle_type === 'bike') tableName = 'bikes';
        else if (request.vehicle_type === 'car') tableName = 'cars';
        else if (request.vehicle_type === 'scooty') tableName = 'scooty';
        else return res.status(400).json({ error: 'Invalid vehicle type' });

        // 3. Insert into main table
        const { error: insertError } = await supabase
            .from(tableName)
            .insert([vehicleData]);

        if (insertError) throw insertError;

        // 4. Update request status
        await supabase
            .from('sponsor_vehicle_requests')
            .update({ status: 'approved' })
            .eq('id', requestId);

        // 5. Send Email
        try {
            const { data: sponsor } = await supabase
                .from('sponsors')
                .select('email, full_name')
                .eq('id', request.sponsor_id)
                .single();

            if (sponsor && sponsor.email) {
                await sendVehicleApprovedEmail(
                    sponsor.email,
                    sponsor.full_name,
                    {
                        vehicleName: request.vehicle_details.name,
                        type: request.vehicle_type,
                        price: request.vehicle_details.price
                    }
                );
            }
        } catch (emailError) {
            console.error('Error sending approval email:', emailError);
        }

        res.json({ message: 'Vehicle approved successfully' });
    } catch (error) {
        console.error('Error approving vehicle:', error);
        res.status(500).json({ error: 'Error approving vehicle' });
    }
};

const rejectVehicle = async (req, res) => {
    try {
        const { error } = await supabase
            .from('sponsor_vehicle_requests')
            .update({ status: 'rejected' })
            .eq('id', req.params.id);

        if (error) throw error;
        res.json({ message: 'Vehicle rejected/removed successfully' });
    } catch (error) {
        console.error('Error rejecting vehicle:', error);
        res.status(500).json({ error: 'Failed to reject vehicle' });
    }
};

const deleteVehicleRequest = async (req, res) => {
    try {
        const { error } = await supabase
            .from('sponsor_vehicle_requests')
            .delete()
            .eq('id', req.params.id);

        if (error) throw error;
        res.json({ message: 'Request deleted successfully' });
    } catch (error) {
        console.error('Error deleting request:', error);
        res.status(500).json({ error: 'Failed to delete request' });
    }
};

const getPolicies = async (req, res) => {
    try {
        const { data } = await supabase.from('policies').select('*');
        res.json(data || []);
    } catch (error) { res.status(500).json({ error: 'Error' }); }
};

// Scheduler / Reminder methods
const manualReminderCheck = async (req, res) => {
    try {
        console.log('📧 Manual reminder check triggered by admin');
        const result = await checkAndSendReminders();
        res.json(result);
    } catch (error) {
        console.error('Error in manual reminder check:', error);
        res.status(500).json({ error: 'Error checking reminders', details: error.message });
    }
};

const cronReminderCheck = async (req, res) => {
    // Check for secret key in query params
    const secret = req.query.secret;
    const CRON_SECRET = process.env.CRON_SECRET || 'renthub_cron_secret_2024';

    if (secret !== CRON_SECRET) {
        return res.status(401).json({ error: 'Unauthorized: Invalid Cron Secret' });
    }

    try {
        console.log('⏰ External Cron triggered reminder check');
        const result = await checkAndSendReminders();
        res.json(result);
    } catch (error) {
        console.error('Error in cron reminder check:', error);
        res.status(500).json({ error: 'Error checking reminders', details: error.message });
    }
};

const getSponsorEarnings = async (req, res) => {
    try {
        console.log('🔍 Generating Sponsor Earnings Report...');

        // 1. Get all sponsors
        const { data: sponsors, error: sError } = await supabase.from('sponsors').select('id, full_name, email');
        if (sError) throw sError;

        // 2. Get all vehicles
        const [bikesRes, carsRes, scootyRes] = await Promise.all([
            supabase.from('bikes').select('id, sponsor_id'),
            supabase.from('cars').select('id, sponsor_id'),
            supabase.from('scooty').select('id, sponsor_id')
        ]);

        const bikes = bikesRes.data || [];
        const cars = carsRes.data || [];
        const scooty = scootyRes.data || [];

        // Map Vehicle -> Sponsor & Count Vehicles
        const vehicleSponsorMap = new Map(); // Key: "id-type" -> sponsorId
        const vehicleIdOnlyMap = new Map();  // Key: id -> sponsorId (fallback)
        const sponsorVehicleCounts = {};

        const processVehicles = (list, type) => {
            list.forEach(v => {
                const sId = v.sponsor_id || 'unassigned';
                const idStr = String(v.id);

                // Maps
                vehicleSponsorMap.set(`${idStr}-${type}`, sId); // e.g. "10-bike"
                vehicleIdOnlyMap.set(idStr, sId);

                // Count (only count each vehicle once)
                if (!sponsorVehicleCounts[sId]) sponsorVehicleCounts[sId] = 0;
                sponsorVehicleCounts[sId]++;
            });
        };

        processVehicles(bikes, 'bike');
        processVehicles(cars, 'car');
        processVehicles(scooty, 'scooty');

        // 3. Get all bookings
        const { data: bookings, error: bError } = await supabase
            .from('bookings')
            .select('id, total_amount, status, created_at, vehicle_id, vehicle_type, booking_id, advance_payment')
            .order('created_at', { ascending: false });

        if (bError) throw bError;

        // 4. Get Withdrawals
        const { data: withdrawals, error: wError } = await supabase
            .from('withdrawal_requests')
            .select('sponsor_id, amount, status');

        if (wError) console.error('Error fetching withdrawals:', wError);

        const withdrawalMap = {}; // sponsorId -> totalWithdrawn
        (withdrawals || []).forEach(w => {
            if (['approved', 'completed'].includes(w.status)) {
                const amt = parseFloat(w.amount) || 0;
                if (!withdrawalMap[w.sponsor_id]) withdrawalMap[w.sponsor_id] = 0;
                withdrawalMap[w.sponsor_id] += amt;
            }
        });

        // 5. Initialize Earnings Structure
        const earnings = {};
        const initSponsor = (id, name, email) => ({
            id, name, email,
            totalRevenue: 0,
            sponsorShare: 0,
            platformShare: 0,
            bookingsCount: 0,
            totalWithdrawn: 0,
            currentBalance: 0,
            totalVehicles: sponsorVehicleCounts[id] || 0
        });

        (sponsors || []).forEach(s => {
            earnings[s.id] = initSponsor(s.id, s.full_name, s.email);
        });

        // Ensure 'unassigned' exists
        if (!earnings['unassigned']) {
            earnings['unassigned'] = initSponsor('unassigned', 'Unassigned / RentHub', '---');
        }

        // 6. Process Bookings
        (bookings || []).forEach(b => {
            // Only count revenue for COMPLETED bookings (must match sponsor dashboard logic)
            const validStatus = ['completed', 'ride_completed', 'ride_ended', 'payment_success'];
            if (!validStatus.includes(b.status)) return;

            // Determine Amount: Use total_amount. If partial payment flow, ensure this logic matches requirements.
            // For revenue report, we usually want the Total Booked Value or Actual Revenue.
            const amount = parseFloat(b.total_amount) || 0;

            // Find Sponsor - Normalize vehicle type to handle plural forms
            const vId = String(b.vehicle_id);
            const vType = normalizeVehicleType(b.vehicle_type); // normalize "bikes" → "bike", "cars" → "car"

            let sponsorId = vehicleSponsorMap.get(`${vId}-${vType}`);

            // Fallback 1: Try ID-only lookup (if types mismatch or missing)
            if (!sponsorId) {
                sponsorId = vehicleIdOnlyMap.get(vId);
            }

            // Fallback 2: Check variations if specific known types
            if (!sponsorId) {
                sponsorId = vehicleSponsorMap.get(`${vId}-bike`) ||
                    vehicleSponsorMap.get(`${vId}-car`) ||
                    vehicleSponsorMap.get(`${vId}-scooty`);
            }

            if (!sponsorId) sponsorId = 'unassigned';

            // If sponsor deleted but historical booking exists, attribute to unassigned or basic placeholder
            if (!earnings[sponsorId]) {
                if (!earnings['unassigned']) earnings['unassigned'] = initSponsor('unassigned', 'Unassigned', '---');
                sponsorId = 'unassigned';
            }

            earnings[sponsorId].totalRevenue += amount;
            earnings[sponsorId].bookingsCount += 1;
        });

        // 7. Calculate Final Stats
        const result = Object.values(earnings).map(e => {
            const platformShare = Math.round(e.totalRevenue * 0.70); // Corrected: Sponsor gets 70%
            const platformFee = Math.round(e.totalRevenue * 0.30);   // Platform gets 30%
            const withdrawn = withdrawalMap[e.id] || 0;
            const balance = platformShare - withdrawn; // Sponsor Share - Withdrawn

            return {
                ...e,
                platformShare: platformFee, // Renamed to platformFee in usage usually, but keeping var name consistent
                sponsorShare: platformShare,
                totalWithdrawn: withdrawn,
                currentBalance: balance
            };
        });

        // Sort by revenue desc
        result.sort((a, b) => b.totalRevenue - a.totalRevenue);

        res.json(result);

    } catch (error) {
        console.error('Error fetching sponsor earnings:', error);
        res.status(500).json({ error: 'Failed to fetch earnings' });
    }
};



// Admin: Get all withdrawal requests
const getAllWithdrawalRequests = async (req, res) => {
    try {
        console.log('🔍 [ADMIN API] Fetching withdrawal requests...');

        // Fetch requests with sponsor details
        // Note: We need to make sure the relationship is defined in Supabase or handle manual join if needed
        // Assuming 'sponsors' table exists and is linked via sponsor_id

        const { data: requests, error } = await supabase
            .from('withdrawal_requests')
            .select(`
                *,
                sponsors:sponsor_id (
                    id,
                    full_name,
                    email,
                    phone_number
                )
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Error fetching withdrawal requests:', error);
            // If relationship error, try fetching raw and manual join (fallback)
            if (error.code === 'PGRST200') {
                console.log('⚠️ Relationship error, attempting manual fetch...');
                const { data: rawRequests } = await supabase
                    .from('withdrawal_requests')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (!rawRequests) return res.status(500).json({ error: 'Failed to fetch' });

                // Get unique sponsor IDs
                const sponsorIds = [...new Set(rawRequests.map(r => r.sponsor_id))];

                // Fetch sponsors
                const { data: sponsors } = await supabase
                    .from('sponsors')
                    .select('id, full_name, email, phone_number')
                    .in('id', sponsorIds);

                // Map sponsors to requests
                const enrichedRequests = rawRequests.map(req => ({
                    ...req,
                    sponsors: sponsors?.find(s => s.id === req.sponsor_id) || null
                }));

                return res.json({ requests: enrichedRequests });
            }

            return res.status(500).json({ error: 'Failed to fetch withdrawal requests' });
        }

        console.log(`✅ Found ${requests?.length || 0} withdrawal requests`);
        res.json({ requests });
    } catch (error) {
        console.error('❌ Error in getAllWithdrawalRequests:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Admin: Update withdrawal status (Approve/Reject/Complete)
const updateWithdrawalStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, adminNotes, transactionReference } = req.body;

        console.log(`📝 Updating withdrawal ${id} to ${status}`);

        if (!['approved', 'rejected', 'completed'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const updateData = {
            status,
            updated_at: new Date().toISOString()
        };

        if (adminNotes) updateData.admin_notes = adminNotes;
        if (transactionReference) updateData.transaction_reference = transactionReference;
        if (status === 'completed') updateData.processed_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('withdrawal_requests')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('❌ Error updating withdrawal:', error);
            return res.status(500).json({ error: 'Failed to update withdrawal request' });
        }

        // Send Email Notification if Completed (Paid)
        if (status === 'completed' && data.sponsor_id) {
            try {
                // Manually fetch sponsor details to be safe (handles missing DB relationships)
                const { data: sponsor } = await supabase
                    .from('sponsors')
                    .select('email, full_name')
                    .eq('id', data.sponsor_id)
                    .single();

                const sponsorEmail = sponsor?.email;
                const sponsorName = sponsor?.full_name || 'Partner';

                if (sponsorEmail) {
                    await sendWithdrawalPaidEmail(
                        sponsorEmail,
                        sponsorName,
                        {
                            amount: data.amount,
                            transactionReference: data.transaction_reference || transactionReference,
                            date: data.processed_at || new Date(),
                            paymentMethod: data.payment_method,
                            bankName: data.bank_name,
                            upiId: data.upi_id,
                            bankAccountNumber: data.bank_account_number,
                            ifscCode: data.ifsc_code,
                            accountHolderName: data.account_holder_name
                        }
                    );
                    console.log(`📧 [EMAIL] Withdrawal confirmation sent to ${sponsorEmail}`);
                } else {
                    console.warn('⚠️ [EMAIL] Sponsor email not found, skipping notification');
                }
            } catch (emailErr) {
                console.error('❌ [EMAIL] Failed to send withdrawal email:', emailErr);
            }
        }

        console.log('✅ Withdrawal updated successfully');
        res.json({ message: 'Status updated successfully', request: data });
    } catch (error) {
        console.error('Error updating withdrawal status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Admin: Get all delivery agents
const getDeliveryAgents = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('delivery_agents')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error fetching delivery agents:', error);
        res.status(500).json({ error: 'Error fetching delivery agents' });
    }
};

// Admin: Approve delivery agent
const approveDeliveryAgent = async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('delivery_agents')
            .update({ is_verified: true, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Send Welcome/Approval Email to the Agent
        if (data && data.email) {
            await sendAgentApprovedEmail(data.email, data.full_name);
            console.log(`📩 Approval email sent to agent: ${data.email}`);
        }

        res.json({ message: 'Agent approved and notified successfully', agent: data });
    } catch (error) {
        console.error('Error approving agent:', error);
        res.status(500).json({ error: 'Error approving agent' });
    }
};

// Admin: Reject/Delete delivery agent applicant
const deleteDeliveryAgent = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('delivery_agents')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Agent application removed' });
    } catch (error) {
        console.error('Error deleting agent:', error);
        res.status(500).json({ error: 'Error deleting agent' });
    }
};

// Admin: Assign delivery agent to a booking
const assignAgent = async (req, res) => {
    try {
        const { id } = req.params; // booking id
        const { agentId } = req.body;

        console.log(`🚚 Assigning agent ${agentId} to booking ${id}`);

        const { data, error } = await supabase
            .from('bookings')
            .update({ 
                agent_id: agentId, 
                delivery_status: 'pending',
                updated_at: new Date().toISOString() 
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Optionally send notification to agent (Supabase Realtime handles UI, but email/push is good)
        // For now, we'll assume the agent sees it on their dashboard via Realtime/Polling.

        res.json({ message: 'Agent assigned successfully', booking: data });
    } catch (error) {
        console.error('Error assigning agent:', error);
        res.status(500).json({ error: 'Error assigning agent' });
    }
};

module.exports = {
    getAllBookings,
    getBookingById,
    deleteBooking,
    updateBooking,
    confirmBooking,
    cancelBookingAdmin,
    markRefundComplete,
    sendSOS,
    getDashboardStats,
    getAllUsers,
    getUserById,
    updateUser,
    blockUser,
    getAllVehicles,
    getVehicleById,
    updateVehicle,
    deleteVehicle,
    addVehicle,
    getVehicleRequests,
    approveVehicle,
    rejectVehicle,
    getPolicies,
    manualReminderCheck,
    cronReminderCheck,
    handleQRScan,
    getSponsorEarnings,
    deleteVehicleRequest,
    getAllWithdrawalRequests,
    updateWithdrawalStatus,
    getDeliveryAgents,
    approveDeliveryAgent,
    deleteDeliveryAgent,
    assignAgent
};

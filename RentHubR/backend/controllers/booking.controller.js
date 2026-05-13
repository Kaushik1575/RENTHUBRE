const dayjs = require('dayjs');
const crypto = require('crypto');
const supabase = require('../config/supabase');
const SupabaseDB = require('../models/supabaseDB');
const { getISTTimestamp } = require('../utils/dateUtils');
const { generateInvoiceBuffer } = require('../utils/invoiceGenerator');
const { sendImmediateReminderIfNeeded } = require('../services/reminderService');
const { makeBookingConfirmationCall } = require('../config/retellCallService');
const { generateBookingId } = require('../utils/bookingIdGenerator');
const { normalizeVehicleType } = require('../utils/vehicleTypeNormalizer');
const Razorpay = require('razorpay');
const { sendAddressUpdateEmail } = require('../config/emailService');

// Helpers
async function checkTimeConflict(vehicleId, startDate, startTime, duration) {
    try {
        const { data: existingBookings, error } = await supabase
            .from('bookings')
            .select('*')
            .eq('vehicle_id', vehicleId)
            .eq('start_date', startDate)
            .neq('status', 'cancelled')
            .neq('status', 'rejected');

        if (error) {
            console.error('Supabase error in checkTimeConflict:', error);
            throw error;
        }

        if (!Array.isArray(existingBookings)) {
            console.error('existingBookings is not an array:', existingBookings);
            return { conflict: false };
        }

        // Convert start time to minutes for easier comparison
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const startTimeMinutes = startHour * 60 + startMinute;
        const endTimeMinutes = startTimeMinutes + (duration * 60);
        // Add 1-hour buffer before and after
        const bufferStartTime = startTimeMinutes - 60;
        const bufferEndTime = endTimeMinutes + 60;
        for (const booking of existingBookings) {
            // Check if start_time exists
            if (!booking.start_time) continue;

            const [existingHour, existingMinute] = booking.start_time.split(':').map(Number);
            const existingStartTimeMinutes = existingHour * 60 + existingMinute;
            const existingEndTimeMinutes = existingStartTimeMinutes + (booking.duration * 60);

            // Calculate existing end time for the message
            const existingEndTotalMinutes = existingStartTimeMinutes + (booking.duration * 60);
            const existingEndHour = Math.floor(existingEndTotalMinutes / 60) % 24;
            const existingEndMinute = existingEndTotalMinutes % 60;
            const formattedEndTime = `${existingEndHour.toString().padStart(2, '0')}:${existingEndMinute.toString().padStart(2, '0')}`;

            // Check for overlap (including 1 hour buffer)
            if (existingStartTimeMinutes < bufferEndTime && existingEndTimeMinutes > bufferStartTime) {
                // Format the date in a readable format
                const bookingDate = new Date(booking.start_date);
                const formattedDate = bookingDate.toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });

                return {
                    conflict: true,
                    existingBooking: booking,
                    message: `This vehicle is already booked on ${formattedDate} from ${booking.start_time} to ${formattedEndTime}. Please try another vehicle or choose a different time slot. (Note: A 1-hour gap is required before and after each booking)`
                };
            }
        }
        return { conflict: false };
    } catch (error) {
        console.error('Error checking time conflict:', error);
        throw error;
    }
}

// Controller Methods

// Check availability
const checkAvailability = async (req, res) => {
    try {
        const { vehicleId, startDate, startTime, duration } = req.body;

        // Validate time format (HH:mm)
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(startTime)) {
            return res.status(400).json({ error: 'Invalid time format. Please use HH:mm format (24-hour)' });
        }

        // Convert startTime to 24-hour format if needed
        const [hours, minutes] = startTime.split(':').map(Number);
        const formattedStartTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

        // Validate that booking is not in the past
        const now = new Date();
        const istNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
        const currentIso = istNow.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:mm"
        const bookingIso = `${startDate}T${formattedStartTime}`;

        if (bookingIso < currentIso) {
            console.log(`❌ Rejected past booking attempt: ${bookingIso} < ${currentIso}`);
            return res.status(400).json({ error: 'Cannot book for a past date or time.' });
        }

        const conflict = await checkTimeConflict(vehicleId, startDate, formattedStartTime, duration);
        if (conflict.conflict) {
            return res.status(409).json(conflict);
        }

        res.status(200).json({ available: true, message: 'Vehicle is available' });
    } catch (error) {
        console.error('Error checking availability:', error);
        res.status(500).json({ error: 'Error checking availability' });
    }
};

// Create booking
const createBooking = async (req, res) => {
    try {
        console.log('--- Booking Request Received ---');
        console.log('User:', req.user);
        console.log('Body:', req.body);
        let { 
            vehicleId, startDate, startTime, duration, vehicleType, 
            transactionId, couponCode, razorpayPaymentId, razorpayOrderId, razorpaySignature,
            deliveryOption, deliveryAddress, distance, deliveryFee, lat, lng
        } = req.body;

        // Normalize vehicle type (ensure singular form 'car', 'bike', 'scooty')
        vehicleType = normalizeVehicleType(vehicleType);
        if (!vehicleType) {
            return res.status(400).json({ error: 'Invalid vehicle type.' });
        }

        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });

        // Verify Razorpay Payment if present and not a free ride
        if (razorpayPaymentId && razorpayPaymentId !== 'FREE_RIDE' && razorpayOrderId && razorpaySignature) {
            const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
            shasum.update(`${razorpayOrderId}|${razorpayPaymentId}`);
            const digest = shasum.digest('hex');

            if (digest !== razorpaySignature) {
                return res.status(400).json({ error: 'Payment verification failed! Invalid signature.' });
            }
            console.log('✅ Payment verified successfully');

            // Fetch actual payment amount from Razorpay
            try {
                const payment = await razorpay.payments.fetch(razorpayPaymentId);
                const actualAmountPaid = payment.amount / 100; // Convert paise to rupees
                console.log(`Razorpay payment fetched: ₹${actualAmountPaid}`);
                req.body.actualAdvancePayment = actualAmountPaid;
            } catch (fetchError) {
                console.error('Error fetching payment from Razorpay:', fetchError);
            }
        }
        // Validate time format (HH:mm)
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(startTime)) {
            return res.status(400).json({ error: 'Invalid time format. Please use HH:mm format (24-hour)' });
        }
        // Convert startTime to 24-hour format if needed
        const [hours, minutes] = startTime.split(':').map(Number);
        const formattedStartTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        // Check for time conflicts
        const conflict = await checkTimeConflict(vehicleId, startDate, formattedStartTime, duration);
        if (conflict.conflict) {
            return res.status(409).json(conflict);
        }

        // Validate that booking is not in the past
        const now = new Date();
        const istNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
        const bookingDateTime = new Date(`${startDate}T${formattedStartTime}:00`);

        const currentIso = istNow.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:mm"
        const bookingIso = `${startDate}T${formattedStartTime}`;

        if (bookingIso < currentIso) {
            return res.status(400).json({ error: 'Cannot book for a past date or time.' });
        }
        // Use actual payment amount from Razorpay if available, otherwise use frontend value
        const totalAmount = req.body.totalAmount || 0;
        const advancePayment = req.body.actualAdvancePayment || Math.ceil(totalAmount * 0.3);

        // Generate professional Booking ID (format: RHYYMMDD-XXX)
        let bookingId;
        try {
            bookingId = await generateBookingId();
            console.log(`📋 Generated Booking ID: ${bookingId}`);
        } catch (idError) {
            console.error('❌ Failed to generate Booking ID:', idError);
            return res.status(500).json({ error: 'Failed to generate booking ID. Please try again.' });
        }

        // --- Loyalty Reward Logic ---
        let finalTotalAmount = totalAmount;
        let finalAdvancePayment = advancePayment;
        let usedRewardId = null;
        let isFreeRide = false;

        if (req.body.rewardId) {
            try {
                const reward = await SupabaseDB.getRewardById(req.body.rewardId);
                // Validate Reward
                if (reward && reward.user_id === req.user.id && !reward.is_used && new Date(reward.expires_at) > new Date()) {
                    if (reward.reward_type === 'FREE_2_HOUR_RIDE') {
                        console.log('🎁 Applying Free 2-Hour Ride Reward');
                        isFreeRide = true;
                        usedRewardId = reward.id;

                        // Get vehicle price (needed to recalc)
                        let vehiclePrice = 0;
                        if (vehicleType === 'bike') {
                            const { data } = await supabase.from('bikes').select('price').eq('id', vehicleId).single();
                            vehiclePrice = parseFloat(data?.price || 0);
                        } else if (vehicleType === 'car') {
                            const { data } = await supabase.from('cars').select('price').eq('id', vehicleId).single();
                            vehiclePrice = parseFloat(data?.price || 0);
                        } else if (vehicleType === 'scooty') {
                            const { data } = await supabase.from('scooty').select('price').eq('id', vehicleId).single();
                            vehiclePrice = parseFloat(data?.price || 0);
                        }

                        // Recalculate
                        const billableHours = Math.max(0, duration - 2);
                        finalTotalAmount = billableHours * vehiclePrice;

                        // If fully free
                        if (finalTotalAmount === 0) {
                            finalAdvancePayment = 0;
                            // Ensure payment verification passes or skip for free ride?
                            // If fully free, Razorpay ID might be skipped or dummy. 
                            // But usually, user might pay 0 or small amount? 
                            // Requirement says "total cost = 0". So verified payment step above might differ?
                            // However, createBooking is called AFTER payment.
                            // If total is 0, frontend should bypass payment gateway.
                            // So we assume frontend handles 0 payment.
                        } else {
                            // If partial, recalc advance
                            finalAdvancePayment = req.body.actualAdvancePayment || Math.ceil(finalTotalAmount * 0.3);
                        }

                        // Mark reward as used
                        await SupabaseDB.markRewardAsUsed(reward.id);
                    }
                } else {
                    console.warn('Invalid or expired reward provided:', req.body.rewardId);
                }
            } catch (rewardErr) {
                console.error('Error processing reward:', rewardErr);
            }
        }

        // Generate unique transaction ID for free rides to avoid conflicts
        let finalTransactionId = req.body.razorpayPaymentId;
        if (!finalTransactionId) {
            if (finalTotalAmount === 0) {
                // Generate unique ID for free rides: FREE_RIDE_[timestamp]_[random]
                finalTransactionId = `FREE_RIDE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            } else {
                finalTransactionId = 'PENDING';
            }
        }

        const bookingData = {
            booking_id: bookingId,
            user_id: req.user.id,
            vehicle_id: vehicleId,
            start_date: startDate,
            start_time: formattedStartTime, // Use formatted time
            duration,
            status: 'confirmed', // Confirmed since payment is verified
            vehicle_type: vehicleType,
            transaction_id: finalTransactionId,
            confirmation_timestamp: getISTTimestamp(), // Add confirmation timestamp in IST
            advance_payment: finalAdvancePayment, // 30% advance payment
            total_amount: finalTotalAmount, // Store total amount
            reward_id: usedRewardId,
            is_free_ride: isFreeRide,
            coupon_code: couponCode || null,
            delivery_option: deliveryOption || 'pickup',
            delivery_address: deliveryAddress || null,
            distance: distance || 0,
            delivery_fee: deliveryFee || 0,
            lat: lat || null,
            lng: lng || null,
            delivery_status: deliveryOption === 'home_delivery' ? 'pending' : null
        };
        console.log('Booking data to insert:', bookingData);
        let { data, error } = await supabase
            .from('bookings')
            .insert([bookingData])
            .select()
            .single();

        // SMART RETRY: If the coupon_code column is missing, try inserting without it
        if (error && (error.message?.includes('coupon_code') || error.details?.includes('coupon_code') || error.code === 'PGRST204')) {
            console.warn('⚠️ coupon_code column missing, retrying booking without it...');
            const backupBookingData = { ...bookingData };
            delete backupBookingData.coupon_code;
            
            const retry = await supabase
                .from('bookings')
                .insert([backupBookingData])
                .select()
                .single();
            
            if (retry.data) {
                data = retry.data;
                error = null; // Clear the error if retry succeeds
            } else {
                error = retry.error;
            }
        }

        if (error) {
            console.error('Error creating booking:', error);
            // Check for unique constraint violation
            if (error.code === '23505' && (error.details?.includes('transaction_id') || error.message?.includes('transaction_id'))) {
                return res.status(409).json({ error: 'Transaction ID already exists.' });
            }
            return res.status(500).json({ error: 'Error creating booking', details: error.message, code: error.code, hint: error.hint });
        }

        console.log('Booking created:', data);

        // --- NEW: AUTO-ASSIGN DELIVERY AGENT ---
        if (data.delivery_option === 'home_delivery') {
            (async () => {
                try {
                    const { autoAssignAgent } = require('../utils/autoAssigner');
                    await autoAssignAgent(data.id);
                } catch (err) {
                    console.error('Initial auto-assignment failed:', err);
                }
            })();
        }

        // Async Background Notification: Email & Call
        (async () => {
            try {
                // 1. Fetch User Details
                const { data: userDetails } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', req.user.id)
                    .single();

                if (!userDetails) {
                    console.error('User not found for notification.');
                    return;
                }

                // 2. Fetch Vehicle Details (Name, etc.)
                let vehicleName = `Vehicle ${vehicleId}`;
                try {
                    const { data: vehicleData } = await supabase
                        .from(vehicleType) // 'bikes', 'cars', etc.
                        .select('name')
                        .eq('id', vehicleId)
                        .single();
                    if (vehicleData) vehicleName = vehicleData.name;
                } catch (vError) {
                    console.log('Could not fetch vehicle name:', vError);
                }

                // 4. Send Rich Email with Invoice
                try {
                    // Generate PDF invoice buffer
                    const pdfBuffer = await generateInvoiceBuffer(
                        data.booking_id, // Professional Booking ID (e.g., RH251222-001)
                        userDetails.full_name, // userName
                        userDetails.email, // userEmail
                        vehicleName,
                        duration,
                        `${startDate} ${formattedStartTime}`,
                        req.body.totalAmount || 0,
                        req.body.advancePayment || 0
                    );

                    // Build Google Calendar link
                    const dayjs = require('dayjs');
                    const start = dayjs(`${startDate}T${formattedStartTime}`);
                    const end = start.add(duration, 'hour');
                    const formatForCal = (d) => {
                        const iso = (new Date(d)).toISOString();
                        return iso.replace(/[-:]/g, '').split('.')[0] + 'Z';
                    };
                    const gcalDates = `${formatForCal(start)}/${formatForCal(end)}`;
                    const gcalBase = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
                    const gcalText = encodeURIComponent(`RentHub booking ${data.booking_id} — ${vehicleName}`);
                    const gcalDetails = encodeURIComponent(`Booking ID: ${data.booking_id}\nVehicle: ${vehicleName}\nPickup: ${startDate} ${formattedStartTime}`);
                    const gcalUrl = `${gcalBase}&text=${gcalText}&dates=${gcalDates}&details=${gcalDetails}`;

                    // Construct Rich HTML Email
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
                                                    <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">Your ride is ready, ${userDetails.full_name}!</p>
                                                </td>
                                            </tr>
                                            
                                            <!-- Main Content -->
                                            <tr>
                                                <td style="padding: 40px 30px;">
                                                    <div style="background-color: #f8f9fa; border-left: 5px solid #667eea; padding: 15px; margin-bottom: 25px; border-radius: 4px;">
                                                        <p style="margin: 0; color: #495057; font-size: 15px;">
                                                            <strong>Great news!</strong> Your booking has been confirmed. ${deliveryOption === 'home_delivery' ? `Your vehicle will be delivered to: <strong>${deliveryAddress}</strong>.` : ''} Your invoice is attached to this email.
                                                        </p>
                                                    </div>

                                                    <!-- Booking ID Badge -->
                                                    <div style="text-align: center; margin: 25px 0;">
                                                        <div style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; border-radius: 50px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
                                                            📋 Booking ID: ${data.booking_id}
                                                        </div>
                                                    </div>

                                                    <!-- Booking Details Card -->
                                                    <h3 style="color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-top: 30px;">📝 Booking Details</h3>
                                                    <table width="100%" style="margin-bottom: 25px; background: #f8fbff; border-radius: 8px; overflow: hidden;">
                                                        <tr style="background: #e3f2fd;">
                                                            <td style="padding: 12px 15px; color: #1976d2; font-weight: bold; width: 40%;">🚗 Vehicle</td>
                                                            <td style="padding: 12px 15px; color: #333; font-weight: bold;">${vehicleName}</td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding: 12px 15px; color: #666; border-top: 1px solid #e0e0e0;">📅 Pickup Date</td>
                                                            <td style="padding: 12px 15px; color: #333; border-top: 1px solid #e0e0e0;">${startDate}</td>
                                                        </tr>
                                                        <tr style="background: #f8f9fa;">
                                                            <td style="padding: 12px 15px; color: #666; border-top: 1px solid #e0e0e0;">🕐 Pickup Time</td>
                                                            <td style="padding: 12px 15px; color: #333; border-top: 1px solid #e0e0e0;">${formattedStartTime}</td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding: 12px 15px; color: #666; border-top: 1px solid #e0e0e0;">⏱️ Duration</td>
                                                            <td style="padding: 12px 15px; color: #333; border-top: 1px solid #e0e0e0;">${duration} hours</td>
                                                        </tr>
                                                    </table>
                                                    ${deliveryOption === 'home_delivery' ? `
                                                    <h3 style="color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-top: 30px;">🚚 Delivery Information</h3>
                                                    <table width="100%" style="margin-bottom: 25px; background: #fff7ed; border-radius: 8px; overflow: hidden;">
                                                        <tr style="background: #ffedd5;">
                                                            <td style="padding: 12px 15px; color: #9a3412; font-weight: bold; width: 40%;">📍 Delivery Address</td>
                                                            <td style="padding: 12px 15px; color: #333;">${deliveryAddress}</td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding: 12px 15px; color: #666; border-top: 1px solid #fed7aa;">📏 Distance</td>
                                                            <td style="padding: 12px 15px; color: #333; border-top: 1px solid #fed7aa;">${distance} KM (One Way)</td>
                                                        </tr>
                                                        <tr style="background: #fffaf0;">
                                                            <td style="padding: 12px 15px; color: #666; border-top: 1px solid #fed7aa;">💸 Delivery Fee</td>
                                                            <td style="padding: 12px 15px; color: #166534; font-weight: bold; border-top: 1px solid #fed7aa;">₹${deliveryFee} (Pay at Delivery)</td>
                                                        </tr>
                                                    </table>
                                                    <p style="color: #666; font-size: 14px; margin-top: -15px; margin-bottom: 25px; font-style: italic;">
                                                        ℹ️ Note: Our delivery agent will reach your address by <strong>${formattedStartTime}</strong>.
                                                    </p>
                                                    ` : ''}

                                                    <!-- Payment Summary -->
                                                    <h3 style="color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px;">💰 Payment Summary</h3>
                                                    <table width="100%" style="margin-bottom: 25px; background: #fff8e1; border-radius: 8px; overflow: hidden; border: 2px solid #ffd54f;">
                                                        <tr>
                                                            <td style="padding: 12px 15px; color: #666; width: 40%;">Total Amount</td>
                                                            <td style="padding: 12px 15px; color: #333; font-size: 18px; font-weight: bold;">₹${req.body.totalAmount || 0}</td>
                                                        </tr>
                                                        <tr style="background: #fff9c4;">
                                                            <td style="padding: 12px 15px; color: #666; border-top: 1px solid #ffe082;">Advance Paid</td>
                                                            <td style="padding: 12px 15px; color: #2e7d32; font-size: 18px; font-weight: bold; border-top: 1px solid #ffe082;">₹${req.body.advancePayment || 0} ✓</td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding: 12px 15px; color: #666; border-top: 2px solid #ffd54f;">Remaining to Pay</td>
                                                            <td style="padding: 12px 15px; color: #d84315; font-size: 20px; font-weight: bold; border-top: 2px solid #ffd54f;">₹${req.body.remainingAmount || 0}</td>
                                                        </tr>
                                                    </table>

                                                    <!-- Action Buttons -->
                                                    <div style="text-align: center; margin: 30px 0;">
                                                        <a href="${gcalUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px; margin: 5px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
                                                            📅 Add to Calendar
                                                        </a>
                                                        ${deliveryOption === 'home_delivery' ? `
                                                        <a href="${process.env.FRONTEND_URL}/my-bookings" style="display: inline-block; background: linear-gradient(135deg, #166534 0%, #15803d 100%); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px; margin: 5px; box-shadow: 0 4px 12px rgba(22, 101, 52, 0.3);">
                                                            📍 Change Address
                                                        </a>
                                                        ` : ''}
                                                    </div>

                                                    <!-- Important Notice -->
                                                    <div style="background-color: #fff3cd; border-left: 5px solid #ffc107; padding: 15px; margin: 25px 0; border-radius: 4px;">
                                                        <p style="margin: 0 0 10px 0; color: #856404; font-weight: bold; font-size: 15px;">📌 Important Reminders:</p>
                                                        <ul style="margin: 0; padding-left: 20px; color: #856404;">
                                                            <li style="margin-bottom: 5px;">Bring a valid ID proof at pickup</li>
                                                            <li style="margin-bottom: 5px;">Keep your invoice ready (attached)</li>
                                                            <li style="margin-bottom: 5px;">Pay remaining ₹${req.body.remainingAmount || 0} at pickup</li>
                                                            ${req.body.deliveryOption === 'home_delivery' ? `<li style="margin-bottom: 5px;">Address changes allowed up to 2 hours before pickup</li>` : ''}
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
                        to: userDetails.email,
                        subject: 'Booking Confirmed – RentHub',
                        html: mailHtml,
                        attachments: [
                            { filename: 'booking_invoice.pdf', content: pdfBuffer }
                        ]
                    };

                    const { sendEmail } = require('../config/emailService');
                    const { sendSMS } = require('../services/twilioService');
                    await sendEmail(mailOptions);

                    // --- NEW: TWILIO SMS NOTIFICATION (SMART FIELD CHECK) ---
                    const targetPhone = userDetails.phoneNumber || userDetails.phone_number || userDetails.mobile;
                    
                    if (targetPhone) {
                        const smsMessage = 
`RentHubR - CONFIRMED! ✅
Booking: ${data.booking_id}
Vehicle: ${vehicleName}
Pickup: ${startDate} at ${formattedStartTime}
Check your email for the invoice.
Happy Riding! 🚗`;
                        await sendSMS(targetPhone, smsMessage);
                    }

                    console.log(`📧 Rich confirmation email with PDF sent to ${userDetails.email}`);

                } catch (emailError) {
                    console.error('❌ Error generating invoice or sending email:', emailError);
                }

                // 5. Trigger Retell AI Call
                if (userDetails.phone_number) {
                    const detailsForCall = {
                        bookingId: data.booking_id,
                        vehicleName: vehicleName,
                        vehicleType: vehicleType,
                        startDate: startDate,
                        startTime: formattedStartTime,
                        duration: duration,
                        userName: userDetails.full_name
                    };
                    await makeBookingConfirmationCall(userDetails.phone_number, detailsForCall);
                    console.log(`📞 Confirmation call triggered for ${userDetails.phone_number}`);
                }

                // 6. Check if immediate reminder needed (for bookings within 2 hours)
                try {
                    // Wait 2 seconds to ensure confirmation email is sent first
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    await sendImmediateReminderIfNeeded(data.id);
                } catch (reminderError) {
                    console.error('❌ Error sending immediate reminder:', reminderError);
                }

            } catch (notifyError) {
                console.error('❌ Error in background notification task:', notifyError);
            }
        })();

        res.status(201).json(data);
    } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({ error: 'Error creating booking', details: error.message || error });
    }
};

const getUserBookings = async (req, res) => {
    try {
        const bookings = await SupabaseDB.getBookingsByUser(req.user.id);
        res.json(bookings);
    } catch (error) {
        console.error('Error fetching user bookings:', error);
        res.status(500).json({ error: 'Error fetching bookings' });
    }
};

const cancelBooking = async (req, res) => {
    try {
        const bookingId = parseInt(req.params.id);
        const userId = req.user.id;
        const { refundDetails } = req.body;
        console.log('Processing user booking cancellation for ID:', bookingId);

        // First, fetch the booking
        const { data: booking, error: fetchError } = await supabase
            .from('bookings')
            .select('*, users:user_id(*)')
            .eq('id', bookingId)
            .single();

        if (fetchError) {
            console.error('Error fetching booking query:', fetchError);
            return res.status(500).json({ error: 'Error fetching booking details' });
        }

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        // Check ownership
        console.log('--- SECURITY CHECK ---');
        console.log('Booking Owner:', booking.user_id);
        console.log('Current User :', userId);

        if (booking.user_id !== userId) {
            return res.status(403).json({ error: 'Unauthorized: This booking belongs to a different user.' });
        }

        if (booking.status !== 'confirmed') {
            return res.status(400).json({ error: 'Only confirmed bookings can be cancelled' });
        }

        // Calculate refund amount based on time since confirmation
        const now = new Date();
        const confirmationTime = booking.confirmation_timestamp ? new Date(booking.confirmation_timestamp) : now;
        const hoursSinceConfirmation = (now - confirmationTime) / (1000 * 60 * 60);

        console.log('Booking cancellation debug:', {
            confirmation_timestamp: booking.confirmation_timestamp,
            now: new Date().toISOString(),
            advance_payment: booking.advance_payment
        });

        let refundAmount = 0;
        // Calculate refund based on advance payment only
        const advancePayment = parseFloat(booking.advance_payment) || 100; // Default to 100 if not set
        if (hoursSinceConfirmation <= 2) {
            // Full refund of advance payment
            refundAmount = advancePayment;
        } else {
            // 70% refund of advance payment
            refundAmount = Math.round(advancePayment * 0.7);
        }

        console.log('hoursSinceConfirmation:', hoursSinceConfirmation);

        // Calculate deduction
        let deductionAmount = 0;
        if (hoursSinceConfirmation > 2) {
            deductionAmount = Math.round(advancePayment * 0.3);
        }
        // Use local time for cancelled_timestamp
        const nowCancel = new Date();
        const localCancelTimestamp = nowCancel.getFullYear() + '-' +
            String(nowCancel.getMonth() + 1).padStart(2, '0') + '-' +
            String(nowCancel.getDate()).padStart(2, '0') + ' ' +
            String(nowCancel.getHours()).padStart(2, '0') + ':' +
            String(nowCancel.getMinutes()).padStart(2, '0') + ':' +
            String(nowCancel.getSeconds()).padStart(2, '0');

        let refundStatus = 'processing';

        if (refundAmount === 0) {
            refundStatus = 'not_applicable';
        } else if (!refundDetails) {
            // Require refund details if there is a refund amount
            return res.status(400).json({ error: 'Refund details are required for cancellation with refund.' });
        }

        // Update booking status to cancelled with refund details, timestamps, and deduction
        const updateData = {
            status: 'cancelled',
            refund_amount: refundAmount,
            refund_status: refundStatus,
            cancelled_timestamp: localCancelTimestamp,
            refund_deduction: deductionAmount,
            refund_details: refundDetails || null // Store the manual refund details (UPI/Bank)
        };

        const { data: updatedBooking, error: updateError } = await supabase
            .from('bookings')
            .update(updateData)
            .eq('id', bookingId)
            .select('*, users:user_id(*)')
            .single();

        if (updateError) {
            console.error('Error updating booking:', updateError);
            return res.status(500).json({ error: 'Error updating booking status' });
        }

        // Update vehicle availability back to true
        if (booking.vehicle_id && booking.vehicle_type) {
            let vehicleTable = booking.vehicle_type;
            if (vehicleTable === 'car') vehicleTable = 'cars';
            if (vehicleTable === 'bike') vehicleTable = 'bikes';
            if (vehicleTable === 'scooty') vehicleTable = 'scooty';

            const { error: vehicleError } = await supabase
                .from(vehicleTable)
                .update({ is_available: true })
                .eq('id', booking.vehicle_id);

            if (vehicleError) {
                console.error('Error updating vehicle:', vehicleError);
            }
        }

        console.log('Booking cancelled successfully (Manual Refund Initiated):', updatedBooking);

        res.json({
            message: 'Booking cancelled successfully. Refund processing initiated.',
            refundAmount,
            deduction: deductionAmount,
            refundStatus,
            booking: updatedBooking
        });

    } catch (error) {
        console.error('Error cancelling booking:', error);
        res.status(500).json({
            error: 'Error cancelling booking',
            details: error.message
        });
    }
};

const submitRefundDetails = async (req, res) => {
    try {
        const bookingId = parseInt(req.params.id);
        const userId = req.user.id;

        // Fetch the booking
        const { data: booking, error: fetchError } = await supabase
            .from('bookings')
            .select('*')
            .eq('id', bookingId)
            .eq('user_id', userId)
            .single();

        if (fetchError) {
            console.error('Fetch error in refund-details endpoint:', fetchError);
            return res.status(500).json({ error: 'Error fetching booking details' });
        }
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found or unauthorized' });
        }
        if (booking.status !== 'rejected') {
            return res.status(400).json({ error: 'Refund details can only be submitted for rejected bookings' });
        }
        if (!req.body || !req.body.refundDetails) {
            return res.status(400).json({ error: 'Missing refund details' });
        }

        // Set refund_amount and refundAmount to full advance payment (default 100 if not set)
        const advancePayment = booking.advance_payment || booking.advancePayment || 100;

        // Update the booking with refund details, refund amount, and set refund_status to 'processing'
        const { data: updatedBooking, error: updateError } = await supabase
            .from('bookings')
            .update({
                refund_details: req.body.refundDetails,
                refund_amount: advancePayment,
                refund_status: 'processing',
                refund_deduction: 0 // Set deduction to 0 for rejected refunds
            })
            .eq('id', bookingId)
            .select('*')
            .single();

        if (updateError) {
            console.error('Update error in refund-details endpoint:', updateError);
            return res.status(500).json({ error: 'Error updating refund details' });
        }

        res.json({ message: 'Refund details submitted successfully', booking: updatedBooking });
    } catch (error) {
        console.error('Catch error in refund-details endpoint:', error);
        res.status(500).json({ error: 'Error submitting refund details', details: error.message });
    }
};

const getBookingById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const { data: booking, error } = await supabase
            .from('bookings')
            .select('*, users:user_id(full_name, email)') // Fetch status etc.
            .eq('booking_id', id.trim().toUpperCase())
            .single();

        if (error || !booking) {
            return res.status(404).json({ error: 'Booking not found. Please check your ID.' });
        }

        // Security check: Only the owner or an admin can view details
        if (booking.user_id !== userId && !req.user.isAdmin) {
            return res.status(403).json({ error: 'Unauthorized to view this booking.' });
        }

        res.json({ success: true, booking });
    } catch (error) {
        console.error('Error fetching booking by id:', error);
        res.status(500).json({ error: 'Error fetching booking details' });
    }
};

const updateAddress = async (req, res) => {
    try {
        const { id } = req.params;
        const { deliveryAddress } = req.body;
        const userId = req.user.id;

        // Fetch the booking to check the start time
        const { data: booking, error: fetchError } = await supabase
            .from('bookings')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        if (booking.user_id !== userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Check if more than 2 hours before start time
        const startDateTime = new Date(`${booking.start_date}T${booking.start_time}:00`);
        const now = new Date();
        const istNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
        const diffHours = (startDateTime - istNow) / (1000 * 60 * 60);

        if (diffHours < 2) {
            return res.status(400).json({ error: 'Cannot change address within 2 hours of pickup. Please contact support.' });
        }

        const { distance, deliveryFee, lat, lng } = req.body;
        
        // Calculate the difference in fee to update total and remaining amounts
        const oldFee = parseFloat(booking.delivery_fee || 0);
        const newFee = parseFloat(deliveryFee || oldFee);
        const feeDifference = newFee - oldFee;

        // Update address, distance, delivery fee, and totals
        const newTotal = parseFloat(booking.total_amount || 0) + feeDifference;
        const newRemaining = newTotal - parseFloat(booking.advance_payment || 0);

        const { data: updatedBooking, error: updateError } = await supabase
            .from('bookings')
            .update({ 
                delivery_address: deliveryAddress,
                distance: distance || booking.distance,
                delivery_fee: newFee,
                total_amount: newTotal,
                remaining_amount: newRemaining,
                lat: lat !== undefined ? lat : booking.lat,
                lng: lng !== undefined ? lng : booking.lng
            })
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            return res.status(500).json({ error: 'Failed to update address' });
        }

        // Trigger background notification
        (async () => {
            console.log('--- STARTING ADDRESS UPDATE EMAIL TASK ---');
            try {
                // 1. Fetch User
                const { data: userDetails, error: userError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', userId)
                    .single();

                if (userError || !userDetails) {
                    console.error('Error fetching user for email:', userError);
                    return;
                }

                // 2. Fetch Vehicle Details
                let vehicleName = 'Your Vehicle';
                try {
                    const { normalizeVehicleType } = require('../utils/vehicleTypeNormalizer');
                    const normalizedSingular = normalizeVehicleType(updatedBooking.vehicle_type);
                    
                    // Map singular to plural table names
                    let table = 'bikes';
                    if (normalizedSingular === 'car') table = 'cars';
                    if (normalizedSingular === 'scooty') table = 'scooty';
                    if (normalizedSingular === 'bike') table = 'bikes';

                    const { data: vehicleData } = await supabase
                        .from(table)
                        .select('name')
                        .eq('id', updatedBooking.vehicle_id)
                        .single();
                    if (vehicleData) vehicleName = vehicleData.name;
                } catch (vErr) {
                    console.log('Error fetching vehicle name for update notification:', vErr);
                }

                // 3. Send Email
                await sendAddressUpdateEmail(
                    userDetails.email,
                    userDetails.full_name,
                    {
                        bookingId: updatedBooking.booking_id || updatedBooking.id,
                        newAddress: updatedBooking.delivery_address,
                        newFee: updatedBooking.delivery_fee,
                        newTotal: updatedBooking.total_amount,
                        remainingAmount: updatedBooking.remaining_amount,
                        vehicleName: vehicleName
                    }
                );
            } catch (err) {
                console.error('CRITICAL Error in address update notification:', err);
            }
        })();

        res.json({ success: true, message: 'Address updated successfully', booking: updatedBooking });
    } catch (error) {
        console.error('Error updating address:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

const acceptDelivery = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { agentId } = req.body;

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
            const { sendUserTrackingEmail } = require('../config/emailService');
            await sendUserTrackingEmail(
                booking.users.email,
                booking.users.full_name,
                agent.full_name,
                agent.phone_number,
                booking.booking_id || bookingId
            );
        } catch (emailErr) {
            console.error('Failed to send tracking email:', emailErr);
        }

        res.json({ success: true, message: 'Task accepted and customer notified.' });
    } catch (error) {
        console.error('Accept Delivery Error:', error);
        res.status(500).json({ error: 'Failed to accept delivery' });
    }
};

module.exports = {
    checkAvailability,
    createBooking,
    getUserBookings,
    cancelBooking,
    submitRefundDetails,
    updateAddress,
    getBookingById,
    acceptDelivery
};

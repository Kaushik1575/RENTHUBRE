const supabase = require('../config/supabase');
const { sendEmail } = require('../config/emailService');
const dayjs = require('dayjs');

// Helper function to get IST timestamp
function getISTTimestamp() {
    const now = new Date();
    // Convert to IST (UTC+5:30) using toLocaleString with Asia/Kolkata
    const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    return istTime.getFullYear() + '-' +
        String(istTime.getMonth() + 1).padStart(2, '0') + '-' +
        String(istTime.getDate()).padStart(2, '0') + ' ' +
        String(istTime.getHours()).padStart(2, '0') + ':' +
        String(istTime.getMinutes()).padStart(2, '0') + ':' +
        String(istTime.getSeconds()).padStart(2, '0');
}

/**
 * Send pickup reminder email
 * @param {string} userEmail - User's email address
 * @param {string} userName - User's full name
 * @param {object} bookingDetails - Booking information
 */
async function sendPickupReminderEmail(userEmail, userName, bookingDetails) {
    const { bookingId, vehicleName, vehicleType, startDate, startTime, duration, pickupLocation, hoursUntilPickup } = bookingDetails;

    // Determine message based on how soon the pickup is
    let urgencyMessage = '';
    if (hoursUntilPickup < 0.5) {
        urgencyMessage = '<p style="background:#fff3cd;padding:12px;border-left:4px solid #ffc107;margin:16px 0;"><strong>⚠️ Your booking starts very soon!</strong> Please be ready for pickup.</p>';
    } else {
        urgencyMessage = '<p style="background:#d1ecf1;padding:12px;border-left:4px solid #0dcaf0;margin:16px 0;"><strong>📢 Reminder:</strong> Your booking starts in about 1 hour.</p>';
    }

    const html = `
        <div style="font-family: Arial, sans-serif; color: #222; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🔔 Pickup Reminder</h1>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1f2937; margin-top: 0;">Hello ${userName}!</h2>
            
            ${urgencyMessage}
            
            <p style="font-size: 16px; line-height: 1.6; color: #374151;">
              This is a friendly reminder about your upcoming vehicle pickup in <strong>1 hour</strong>:
            </p>

            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Booking ID:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-weight: bold;">${bookingId}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Vehicle:</td>
                  <td style="padding: 8px 0; color: #1f2937;">${vehicleName} (${vehicleType})</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Pickup Date:</td>
                  <td style="padding: 8px 0; color: #1f2937;">${startDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Pickup Time:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-size: 18px; font-weight: bold;">${startTime}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Duration:</td>
                  <td style="padding: 8px 0; color: #1f2937;">${duration} hours</td>
                </tr>
                ${pickupLocation ? `
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Pickup Location:</td>
                  <td style="padding: 8px 0; color: #1f2937;">${pickupLocation}</td>
                </tr>
                ` : ''}
              </table>
            </div>

            <div style="text-align: center; margin: 25px 0;">
                <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pickupLocation || 'GITA Autonomous College BBSR')}" 
                   style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                   📍 View Pickup Location
                </a>
            </div>

            <div style="background: #fef3c7; padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #92400e; font-size: 16px;">📋 Important Reminders:</h3>
              <ul style="margin: 0; padding-left: 20px; color: #78350f;">
                <li style="margin: 6px 0;">Bring a valid government-issued ID (Aadhar Card/Driving License)</li>
                <li style="margin: 6px 0;">Carry a printed or digital copy of your booking confirmation</li>
                <li style="margin: 6px 0;">Arrive 10-15 minutes early for vehicle inspection</li>
                <li style="margin: 6px 0;">Ensure you have the remaining payment amount ready</li>
              </ul>
            </div>

            <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">
              If you have any questions or need to make changes to your booking, please contact us immediately.
            </p>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 5px 0;">
                RentHub — Premium Bike & Vehicle Rentals
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 5px 0;">
                support@renthub.in | +91 98765 43210
              </p>
            </div>
          </div>
        </div>
    `;

    return sendEmail({
        to: userEmail,
        subject: `🔔 Reminder: Your ${vehicleName} pickup is in 1 hour!`,
        html: html
    });
}

/**
 * Check and send reminder emails for bookings
 * This function should be called periodically (e.g., every 15 minutes)
 */
async function checkAndSendReminders() {
    try {
        // Initialize Dayjs plugins locally if not global
        const utc = require('dayjs/plugin/utc');
        const timezone = require('dayjs/plugin/timezone');
        const customParseFormat = require('dayjs/plugin/customParseFormat');
        dayjs.extend(utc);
        dayjs.extend(timezone);
        dayjs.extend(customParseFormat);

        console.log('🔍 Checking for bookings that need reminder emails...');

        // Get current time in IST
        const now = dayjs().tz('Asia/Kolkata');

        // Fetch all confirmed bookings that haven't received a reminder yet
        // Fetch all confirmed bookings that haven't received a reminder yet
        let bookings = [];
        let fetchError = null;

        // Retry logic for network stability (3 attempts)
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const { data, error } = await supabase
                    .from('bookings')
                    .select(`
                        *,
                        users:user_id (
                            email,
                            full_name,
                            phone_number
                        )
                    `)
                    .eq('status', 'confirmed')
                    .or('reminder_sent.is.null,reminder_sent.eq.false');

                if (error) throw error;

                bookings = data;
                fetchError = null;
                break; // Success, exit loop
            } catch (err) {
                fetchError = err;
                console.warn(`⚠️ Attempt ${attempt} to fetch bookings failed: ${err.message || err}`);
                if (attempt < 3) {
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
                }
            }
        }

        if (fetchError) {
            console.error('❌ Error fetching bookings after 3 attempts:', fetchError);
            return { success: false, error: fetchError.message };
        }

        if (!bookings || bookings.length === 0) {
            console.log('✅ No bookings need reminders at this time.');
            return { success: true, remindersSent: 0 };
        }

        console.log(`📋 Found ${bookings.length} bookings to check`);

        let remindersSent = 0;
        const errors = [];

        for (const booking of bookings) {
            try {
                // Parse booking start time explicitely as IST
                // Input format in DB is YYYY-MM-DD and HH:mm
                const dateTimeString = `${booking.start_date} ${booking.start_time}`;
                // We use .tz with a second argument to specify "Keep this time, but treat it as IST"
                // Actually dayjs.tz(string, zone) does exactly that: parses string AS that zone.
                const bookingDateTime = dayjs.tz(dateTimeString, 'YYYY-MM-DD HH:mm', 'Asia/Kolkata');

                // Calculate hours until pickup
                const hoursUntilPickup = bookingDateTime.diff(now, 'hour', true);

                console.log(`📅 Booking #${booking.id}: ${hoursUntilPickup.toFixed(2)} hours until pickup (IST)`);

                // Skip if booking is in the past
                if (hoursUntilPickup < 0) {
                    console.log(`⏭️  Skipping booking #${booking.id} - already passed`);
                    continue;
                }

                // Skip if booking is more than 1.5 hours away (to avoid sending too early)
                if (hoursUntilPickup > 1.5) {
                    console.log(`⏭️  Skipping booking #${booking.id} - too far in future (${hoursUntilPickup.toFixed(2)} hours)`);
                    continue;
                }

                // Determine if we should send reminder
                let shouldSendReminder = false;

                // Normal mode: 0-1 hour before pickup
                if (hoursUntilPickup <= 1 && hoursUntilPickup >= 0) {
                    shouldSendReminder = true;
                }

                if (!shouldSendReminder) {
                    continue;
                }

                // Fetch vehicle details
                let vehicleName = 'Vehicle';
                let vehicleType = booking.vehicle_type || 'bike';
                let tableName = 'bikes';

                // Determine correct table name based on vehicle type
                if (vehicleType) {
                    const typeLower = vehicleType.toLowerCase();
                    if (typeLower === 'car') tableName = 'cars';
                    else if (typeLower === 'scooty') tableName = 'scooty';
                    else tableName = 'bikes';
                }

                try {
                    const { data: vehicle } = await supabase
                        .from(tableName)
                        .select('name, type')
                        .eq('id', booking.vehicle_id)
                        .single();

                    if (vehicle) {
                        vehicleName = vehicle.name;
                        vehicleType = vehicle.type || vehicleType;
                    }
                } catch (vError) {
                    console.log(`⚠️  Could not fetch vehicle details for booking #${booking.id}`);
                }

                // Send reminder email
                if (booking.users && booking.users.email) {
                    const bookingDetails = {
                        bookingId: booking.booking_id || booking.id,
                        vehicleName: vehicleName,
                        vehicleType: vehicleType,
                        startDate: booking.start_date,
                        startTime: booking.start_time,
                        duration: booking.duration,
                        pickupLocation: booking.pickup_location || 'GITA Autonomous College BBSR',
                        hoursUntilPickup: hoursUntilPickup
                    };

                    const emailResult = await sendPickupReminderEmail(
                        booking.users.email,
                        booking.users.full_name || 'Customer',
                        bookingDetails
                    );

                    if (emailResult.success) {
                        // Mark reminder as sent
                        const { error: updateError } = await supabase
                            .from('bookings')
                            .update({
                                reminder_sent: true,
                                reminder_sent_at: getISTTimestamp()
                            })
                            .eq('id', booking.id);

                        if (updateError) {
                            console.error(`❌ Error updating booking #${booking.id}:`, updateError);
                            errors.push({ bookingId: booking.id, error: updateError.message });
                        } else {
                            console.log(`✅ Reminder sent for booking #${booking.id} to ${booking.users.email}`);
                            remindersSent++;
                        }
                    } else {
                        console.error(`❌ Failed to send email for booking #${booking.id}:`, emailResult.error);
                        errors.push({ bookingId: booking.id, error: emailResult.error });
                    }
                } else {
                    console.log(`⚠️  No email found for booking #${booking.id}`);
                }

            } catch (bookingError) {
                console.error(`❌ Error processing booking #${booking.id}:`, bookingError);
                errors.push({ bookingId: booking.id, error: bookingError.message });
            }
        }

        console.log(`✅ Reminder check complete. Sent ${remindersSent} reminders.`);

        return {
            success: true,
            remindersSent: remindersSent,
            errors: errors.length > 0 ? errors : null
        };

    } catch (error) {
        console.error('❌ Error in checkAndSendReminders:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send immediate reminder for bookings made close to pickup time
 * Called when admin confirms a booking
 */
async function sendImmediateReminderIfNeeded(bookingId) {
    try {
        // Fetch booking details
        const { data: booking, error } = await supabase
            .from('bookings')
            .select(`
                *,
                users:user_id (
                    email,
                    full_name
                )
            `)
            .eq('id', bookingId)
            .single();

        if (error || !booking) {
            console.error('Error fetching booking for immediate reminder:', error);
            return { success: false, error: error?.message || 'Booking not found' };
        }

        // Check if reminder already sent
        if (booking.reminder_sent) {
            console.log(`Reminder already sent for booking #${bookingId}`);
            return { success: true, alreadySent: true };
        }

        // Calculate hours until pickup
        // Ensure plugins are available (idempotent)
        const utc = require('dayjs/plugin/utc');
        const timezone = require('dayjs/plugin/timezone');
        dayjs.extend(utc);
        dayjs.extend(timezone);

        const now = dayjs().tz('Asia/Kolkata');
        const bookingDateTime = dayjs.tz(`${booking.start_date} ${booking.start_time}`, 'YYYY-MM-DD HH:mm', 'Asia/Kolkata');
        const hoursUntilPickup = bookingDateTime.diff(now, 'hour', true);

        // LOGIC UPDATE:
        // 1. If booking is < 1 hour away: Suppress reminder (mark as sent) to avoid redundancy with Confirmation Email.
        // 2. If booking is >= 1 hour away: Do nothing. Let the scheduled Cron job send the reminder when it's 1 hour away.
        // This prevents "Confirmation + Reminder" arriving simultaneously.

        if (hoursUntilPickup < 1.0) {
            console.log(`Booking #${bookingId} starts in ${hoursUntilPickup.toFixed(2)}h (< 1h). Suppressing reminder (marking as sent).`);

            // Mark as sent so Cron doesn't send it
            await supabase
                .from('bookings')
                .update({
                    reminder_sent: true,
                    reminder_sent_at: getISTTimestamp()
                })
                .eq('id', bookingId);

            return { success: true, suppressed: true };
        } else {
            console.log(`Booking #${bookingId} starts in ${hoursUntilPickup.toFixed(2)}h (> 1h). Deferring reminder to scheduler.`);
            return { success: true, deferred: true };
        }

        // Unreachable code removed (legacy email sending logic)

    } catch (error) {
        console.error('Error in sendImmediateReminderIfNeeded:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    sendPickupReminderEmail,
    checkAndSendReminders,
    sendImmediateReminderIfNeeded
};

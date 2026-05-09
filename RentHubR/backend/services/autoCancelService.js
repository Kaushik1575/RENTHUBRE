const supabase = require('../config/supabase');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const customParseFormat = require('dayjs/plugin/customParseFormat');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

/**
 * Check for "No Show" bookings
 * If a booking is Confirmed but the Scheduled End Time has passed (and it wasn't started),
 * mark it as 'rider_not_come'.
 *
 * User Request: "if the qr code scan not do untill is ride end time than in this case the staus confirmed converted to rider not come"
 */
async function checkAndCancelNoShows() {
    try {
        console.log('🔍 Checking for No-Show bookings...');

        // Current time in IST for comparison
        const now = dayjs().tz('Asia/Kolkata');

        // Fetch all 'confirmed' bookings
        // We fetch ALL confirmed bookings and filter in code to handle the date+time+duration logic accurately
        // (SQL query for dynamic end time calculation is complex with date/time split columns)
        // Optimization: We could filter by start_date <= today to reduce checking future bookings
        const todayStr = now.format('YYYY-MM-DD');

        const { data: bookings, error } = await supabase
            .from('bookings')
            .select('*')
            .eq('status', 'confirmed')
            .lte('start_date', todayStr); // Optimization: Start date must be today or past

        if (error) throw error;

        if (!bookings || bookings.length === 0) {
            return { success: true, processed: 0 };
        }

        let processedCount = 0;

        for (const booking of bookings) {
            try {
                // Construct Start DateTime (IST)
                const startDateTimeStr = `${booking.start_date} ${booking.start_time}`;
                const startDateTime = dayjs.tz(startDateTimeStr, 'YYYY-MM-DD HH:mm', 'Asia/Kolkata');

                // Calculate End DateTime
                // Duration is in hours
                const durationHours = parseFloat(booking.duration) || 0;
                const endDateTime = startDateTime.add(durationHours, 'hour');

                // Check if Now > EndDateTime
                // If the ride was supposed to end by now, and it's still 'confirmed' (not 'ride_started'), it's a No Show.
                if (now.isAfter(endDateTime)) {
                    console.log(`❌ Booking #${booking.id} is a No-Show. Ended at ${endDateTime.format()} (IST). Now is ${now.format()} (IST).`);

                    // Update Status
                    const { error: updateError } = await supabase
                        .from('bookings')
                        .update({
                            status: 'rider_not_come',
                            // Optional: Add a note or updated_at
                            cancelled_timestamp: now.format(), // ISO string? Or just keep it separate
                            updated_at: now.format()
                        })
                        .eq('id', booking.id);

                    if (updateError) {
                        console.error(`Failed to update booking #${booking.id}:`, updateError);
                    } else {
                        console.log(`✅ Booking #${booking.id} marked as 'rider_not_come'.`);
                        processedCount++;
                    }
                }
            } catch (err) {
                console.error(`Error processing booking #${booking.id} for no-show:`, err);
            }
        }

        if (processedCount > 0) {
            console.log(`👉 Processed ${processedCount} No-Show bookings.`);
        }

        return { success: true, processed: processedCount };

    } catch (error) {
        console.error('Error in checkAndCancelNoShows:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    checkAndCancelNoShows
};

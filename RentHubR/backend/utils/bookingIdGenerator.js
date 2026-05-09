const supabase = require('../config/supabase');

/**
 * Generates a professional Booking ID in the format RHYYMMDD-XXX
 * 
 * Format breakdown:
 * - RH: Fixed prefix for RentHub
 * - YY: Last two digits of current year
 * - MM: Current month (01-12)
 * - DD: Current date (01-31)
 * - XXX: Global sequential number (001, 002, 003, etc.)
 * 
 * Example: RH251222-001, RH251222-002, RH251223-003, RH260101-004
 * 
 * The sequence number NEVER resets, even when date/month/year changes.
 * This ensures globally unique booking IDs.
 * 
 * @returns {Promise<string>} The generated booking ID (e.g., "RH251222-001")
 * @throws {Error} If unable to generate booking ID
 */
async function generateBookingId() {
    const maxRetries = 5;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // Get current date in IST (India Standard Time)
            const now = new Date();
            const istDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

            // Extract date components
            const year = istDate.getFullYear().toString().slice(-2); // Last 2 digits (e.g., "25")
            const month = String(istDate.getMonth() + 1).padStart(2, '0'); // 01-12
            const day = String(istDate.getDate()).padStart(2, '0'); // 01-31

            // Format: RHYYMMDD
            const datePrefix = `RH${year}${month}${day}`;

            // Atomically increment the sequence counter
            // This uses a database transaction to ensure thread-safety
            const { data: sequenceData, error: sequenceError } = await supabase.rpc(
                'increment_booking_sequence',
                {}
            );

            if (sequenceError) {
                // If the RPC function doesn't exist, fall back to manual increment
                console.log('RPC function not found, using manual increment method...');

                // Fetch current sequence value
                const { data: currentSeq, error: fetchError } = await supabase
                    .from('booking_id_sequence')
                    .select('current_value')
                    .eq('id', 1)
                    .single();

                if (fetchError) {
                    throw new Error(`Failed to fetch sequence: ${fetchError.message}`);
                }

                const newValue = (currentSeq?.current_value || 0) + 1;

                // Update sequence value
                const { data: updatedSeq, error: updateError } = await supabase
                    .from('booking_id_sequence')
                    .update({
                        current_value: newValue,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', 1)
                    .select('current_value')
                    .single();

                if (updateError) {
                    throw new Error(`Failed to update sequence: ${updateError.message}`);
                }

                const sequenceNumber = String(updatedSeq.current_value).padStart(3, '0');
                const bookingId = `${datePrefix}-${sequenceNumber}`;

                console.log(`✅ Generated Booking ID: ${bookingId} (attempt ${attempt})`);
                return bookingId;
            }

            // If RPC function exists and worked
            const sequenceNumber = String(sequenceData).padStart(3, '0');
            const bookingId = `${datePrefix}-${sequenceNumber}`;

            console.log(`✅ Generated Booking ID: ${bookingId}`);
            return bookingId;

        } catch (error) {
            lastError = error;
            console.error(`❌ Booking ID generation attempt ${attempt} failed:`, error.message);

            // Wait before retrying (exponential backoff)
            if (attempt < maxRetries) {
                const waitTime = Math.min(100 * Math.pow(2, attempt - 1), 1000);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }

    // All retries failed
    console.error('❌ Failed to generate Booking ID after all retries');
    throw new Error(`Unable to generate Booking ID: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Creates the increment_booking_sequence RPC function in Supabase
 * This should be run once during setup
 * 
 * SQL to create the function:
 * 
 * CREATE OR REPLACE FUNCTION increment_booking_sequence()
 * RETURNS INTEGER AS $$
 * DECLARE
 *   new_value INTEGER;
 * BEGIN
 *   UPDATE booking_id_sequence
 *   SET current_value = current_value + 1,
 *       updated_at = NOW()
 *   WHERE id = 1
 *   RETURNING current_value INTO new_value;
 *   
 *   RETURN new_value;
 * END;
 * $$ LANGUAGE plpgsql;
 */

module.exports = {
    generateBookingId
};

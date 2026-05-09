const supabase = require('../config/supabase');

async function recalculateCoins() {
    console.log('🔄 Starting Coin Recalculation...');

    // 1. Fetch completed bookings
    const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*')
        .in('status', ['ride_completed', 'completed'])
        .not('ride_start_time', 'is', null)
        .not('ride_end_time', 'is', null);

    if (error) {
        console.error('❌ Error fetching bookings:', error);
        return;
    }

    console.log(`📋 Found ${bookings.length} completed bookings to check.`);

    let updatedCount = 0;

    for (const booking of bookings) {
        const start = new Date(booking.ride_start_time);
        const end = new Date(booking.ride_end_time);

        // Calculate duration in minutes
        const diffMs = end - start;
        const minutes = Math.floor(diffMs / (1000 * 60));

        // Coins = 1 per minute (assuming earning rate 1)
        // If you have a specific rate in DB, you'd fetch it, but 1 is standard
        const correctCoins = Math.max(0, minutes);

        // Check if update is needed
        if (booking.coins_earned !== correctCoins) {
            console.log(`⚠️ Booking #${booking.booking_id || booking.id}: Current=${booking.coins_earned}, Correct=${correctCoins} (Duration: ${minutes}m)`);

            const { error: updateError } = await supabase
                .from('bookings')
                .update({ coins_earned: correctCoins })
                .eq('id', booking.id);

            if (updateError) {
                console.error(`   ❌ Failed to update: ${updateError.message}`);
            } else {
                console.log(`   ✅ Fixed!`);
                updatedCount++;
            }
        }
    }

    console.log(`\n🎉 Done! Updated ${updatedCount} bookings.`);
}

recalculateCoins();

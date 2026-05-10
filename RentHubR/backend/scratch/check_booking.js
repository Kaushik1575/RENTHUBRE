require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkBooking() {
    const { data, error } = await supabase
        .from('bookings')
        .select('delivery_option, delivery_status, agent_id')
        .eq('booking_id', 'RH260509-140')
        .single();
    
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Booking Data:', data);
    }
}

checkBooking();

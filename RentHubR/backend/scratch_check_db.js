const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function check() {
    const { data, error } = await supabase
        .from('bookings')
        .select('id, booking_id, agent_id, delivery_status, delivery_option')
        .eq('booking_id', 'RH260509-140')
        .single();
    
    console.log(JSON.stringify(data, null, 2));
}

check();

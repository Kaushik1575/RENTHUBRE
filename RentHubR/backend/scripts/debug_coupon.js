const supabase = require('../config/supabase');

async function checkStatus() {
    const userId = 43; // From logs

    console.log('--- Checking Rewards ---');
    const { data: rewards, error: rError } = await supabase
        .from('rewards')
        .select('*')
        .eq('user_id', userId);

    if (rError) console.error(rError);
    else console.log(rewards);

    console.log('\n--- Checking Latest Booking ---');
    const { data: booking, error: bError } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', userId)
        .order('id', { ascending: false })
        .limit(1)
        .single();

    if (bError) console.error(bError);
    else console.log(booking);
}

checkStatus();

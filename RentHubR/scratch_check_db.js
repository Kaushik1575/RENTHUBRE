const supabase = require('./backend/config/supabase');

async function checkSchema() {
    console.log("Checking delivery_agents table...");
    const { data: agents, error: aError } = await supabase.from('delivery_agents').select('*').limit(1);
    if (aError) console.error("Error fetching agents:", aError);
    else console.log("Agent Sample:", agents);

    console.log("\nChecking bookings table delivery fields...");
    const { data: bookings, error: bError } = await supabase.from('bookings').select('id, delivery_option, delivery_status, start_date, start_time, distance, agent_id').limit(5);
    if (bError) console.error("Error fetching bookings:", bError);
    else console.log("Booking Sample:", bookings);
}

checkSchema();

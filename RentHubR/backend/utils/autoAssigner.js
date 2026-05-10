const supabase = require('../config/supabase');

/**
 * Automatically assigns a delivery agent to a booking
 * Logic: Round-robin among online agents at the shop with the least workload
 */
const autoAssignAgent = async (bookingId) => {
    try {
        console.log(`🤖 Starting Auto-Assignment for Booking: ${bookingId}`);

        // 1. Get the booking details to check if it's home delivery
        const { data: booking, error: bError } = await supabase
            .from('bookings')
            .select('*')
            .eq('id', bookingId)
            .single();

        if (bError || !booking) throw new Error('Booking not found');
        if (booking.delivery_option !== 'home_delivery') {
            console.log('ℹ️ Not a home delivery booking. Skipping auto-assignment.');
            return null;
        }

        // 2. Find all eligible agents
        // Criteria: Verified, Online, and Currently At Shop
        const { data: eligibleAgents, error: aError } = await supabase
            .from('delivery_agents')
            .select('id, full_name')
            .eq('is_verified', true)
            .eq('availability_status', 'Online') // From existing schema
            .eq('current_status', 'AT_SHOP'); // New state we are introducing

        if (aError) throw aError;

        if (!eligibleAgents || eligibleAgents.length === 0) {
            console.log('⚠️ No eligible agents found at the shop right now.');
            return null;
        }

        // 3. Find the agent with the least active jobs
        // We'll count active jobs for each eligible agent
        const agentWorkloads = await Promise.all(eligibleAgents.map(async (agent) => {
            const { count } = await supabase
                .from('bookings')
                .select('*', { count: 'exact', head: true })
                .eq('agent_id', agent.id)
                .in('delivery_status', ['pending', 'picked_up', 'out_for_delivery']);
            
            return { id: agent.id, count: count || 0 };
        }));

        // Sort by count (ascending) to find the least busy
        agentWorkloads.sort((a, b) => a.count - b.count);
        const bestAgent = agentWorkloads[0];

        // 4. Assign the agent to the booking
        const { error: updateError } = await supabase
            .from('bookings')
            .update({ 
                agent_id: bestAgent.id,
                delivery_status: 'assigned' // Changed from pending to assigned
            })
            .eq('id', bookingId);

        if (updateError) throw updateError;

        // 5. Update agent status to show they are now handling a delivery
        await supabase
            .from('delivery_agents')
            .update({ current_status: 'PREPARING' })
            .eq('id', bestAgent.id);

        console.log(`✅ Automatically assigned Agent ${bestAgent.id} to Booking ${bookingId}`);
        return bestAgent.id;

    } catch (error) {
        console.error('❌ Auto-Assignment Error:', error.message);
        return null;
    }
};

module.exports = { autoAssignAgent };

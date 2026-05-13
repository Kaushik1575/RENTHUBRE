const supabase = require('../config/supabase');

/**
 * Helper to calculate the two busy windows for an agent for a specific booking.
 * 1. Drop-off Window: Travel to customer -> Handover -> Travel back to shop.
 * 2. Pickup Window: Travel to customer -> Collection -> Travel back to shop.
 */
const calculateWindows = (booking) => {
    const AVG_SPEED_KMH = 20;
    const HANDOVER_MINS = 10;
    const SAFETY_BUFFER_MINS = 15;
    const distance = parseFloat(booking.distance) || 5;
    const duration = parseInt(booking.duration) || 0;
    const travelTimeMins = Math.ceil((distance / AVG_SPEED_KMH) * 60);

    const rideStart = new Date(`${booking.start_date}T${booking.start_time}`);
    const rideEnd = new Date(rideStart.getTime() + (duration * 3600000));

    // Window 1: Drop-off
    const dropoffStart = new Date(rideStart.getTime() - (travelTimeMins * 60000));
    const dropoffEnd = new Date(rideStart.getTime() + ((HANDOVER_MINS + travelTimeMins + SAFETY_BUFFER_MINS) * 60000));

    // Window 2: Pickup (Collection)
    const pickupStart = new Date(rideEnd.getTime() - (travelTimeMins * 60000));
    const pickupEnd = new Date(rideEnd.getTime() + ((HANDOVER_MINS + travelTimeMins + SAFETY_BUFFER_MINS) * 60000));

    return {
        dropoff: { start: dropoffStart, end: dropoffEnd },
        pickup: { start: pickupStart, end: pickupEnd },
        travelTimeMins
    };
};

/**
 * Automatically assigns a delivery agent to a booking
 * Logic: Checks for agent availability across BOTH delivery and pickup windows.
 */
const autoAssignAgent = async (bookingId) => {
    try {
        console.log(`🤖 Starting Full-Service Auto-Assignment for Booking: ${bookingId}`);

        // 1. Get the booking details
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

        const windows = calculateWindows(booking);
        console.log(`⏱️ Travel: ${windows.travelTimeMins}m | Windows: [${windows.dropoff.start.toLocaleTimeString()} - ${windows.dropoff.end.toLocaleTimeString()}] & [${windows.pickup.start.toLocaleTimeString()} - ${windows.pickup.end.toLocaleTimeString()}]`);

        // 2. Find all Online & Verified agents
        const { data: onlineAgents, error: aError } = await supabase
            .from('delivery_agents')
            .select('id, full_name, current_status')
            .eq('is_verified', true)
            .eq('availability_status', 'Online');

        if (aError) throw aError;
        if (!onlineAgents || onlineAgents.length === 0) {
            console.log('⚠️ No online agents found.');
            return null;
        }

        // 3. Filter agents by checking for conflicts
        const availableAgents = [];

        for (const agent of onlineAgents) {
            // Get other bookings assigned to this agent on the same day
            const { data: agentJobs } = await supabase
                .from('bookings')
                .select('id, start_date, start_time, duration, distance')
                .eq('agent_id', agent.id)
                .eq('start_date', booking.start_date)
                .neq('id', bookingId)
                .in('status', ['confirmed', 'ride_started', 'ride_completed']); // Include ride_completed to ensure return windows are checked

            let hasConflict = false;

            if (agentJobs && agentJobs.length > 0) {
                for (const job of agentJobs) {
                    const jobWindows = calculateWindows(job);
                    
                    // Overlap Check for BOTH windows of the NEW booking against BOTH windows of EXISTING jobs
                    const windowsToCheck = [windows.dropoff, windows.pickup];
                    const existingWindows = [jobWindows.dropoff, jobWindows.pickup];

                    for (const nw of windowsToCheck) {
                        for (const ew of existingWindows) {
                            if (nw.start < ew.end && nw.end > ew.start) {
                                hasConflict = true;
                                console.log(`❌ Conflict for Agent ${agent.full_name} with Job ${job.id} (${nw.start.toLocaleTimeString()} overlaps ${ew.start.toLocaleTimeString()})`);
                                break;
                            }
                        }
                        if (hasConflict) break;
                    }
                    if (hasConflict) break;
                }
            }

            // Real-time check for immediate deliveries
            const isSoon = (windows.dropoff.start - new Date()) < (30 * 60000); 
            if (isSoon && agent.current_status !== 'AT_SHOP') {
                console.log(`⏳ Agent ${agent.full_name} is currently out. Skipping for near-term delivery.`);
                continue;
            }

            if (!hasConflict) {
                availableAgents.push(agent);
            }
        }

        if (availableAgents.length === 0) {
            console.log('⚠️ No available agents found for this time slot (conflict or no agents at shop).');
            return null;
        }

        // 4. Assign the agent with the least workload for the day
        const agentWorkloads = await Promise.all(availableAgents.map(async (agent) => {
            const { count } = await supabase
                .from('bookings')
                .select('*', { count: 'exact', head: true })
                .eq('agent_id', agent.id)
                .eq('start_date', booking.start_date);
            
            return { id: agent.id, count: count || 0 };
        }));

        agentWorkloads.sort((a, b) => a.count - b.count);
        const bestAgentId = agentWorkloads[0].id;

        // 5. Update Booking
        const { error: updateError } = await supabase
            .from('bookings')
            .update({ 
                agent_id: bestAgentId,
                delivery_status: 'assigned'
            })
            .eq('id', bookingId);

        if (updateError) throw updateError;

        // 6. Notify the Agent via Email
        try {
            const { data: agentData } = await supabase
                .from('delivery_agents')
                .select('full_name, email')
                .eq('id', bestAgentId)
                .single();

            if (agentData) {
                const { sendAgentAssignmentEmail } = require('../config/emailService');
                
                // Calculate end time display
                const rideStart = new Date(`${booking.start_date}T${booking.start_time}`);
                const durationHours = parseInt(booking.duration) || 0;
                const rideEnd = new Date(rideStart.getTime() + (durationHours * 3600000));
                
                const formatTime = (date) => {
                    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                };

                await sendAgentAssignmentEmail(agentData.email, agentData.full_name, booking.booking_id || bookingId, {
                    startTime: `${booking.start_date} (${booking.start_time})`,
                    endTime: `${rideEnd.toISOString().split('T')[0]} (${formatTime(rideEnd)})`,
                    distance: booking.distance,
                    address: booking.delivery_address
                });
                console.log(`📧 Notification sent to agent ${agentData.full_name}`);
            }
        } catch (emailErr) {
            console.error('⚠️ Failed to send assignment email:', emailErr.message);
        }

        console.log(`✅ Full-Service Assignment: Agent ${bestAgentId} assigned to Booking ${bookingId}`);
        return bestAgentId;

    } catch (error) {
        console.error('❌ Auto-Assignment Error:', error.message);
        return null;
    }
};

module.exports = { autoAssignAgent };

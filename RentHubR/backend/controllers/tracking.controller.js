const supabase = require('../config/supabase');
const { getISTTimestamp } = require('../utils/dateUtils');

// Update agent location (real-time tracking)
const updateAgentLocation = async (req, res) => {
    try {
        const { agentId, latitude, longitude, accuracy = null, speed = null } = req.body;

        if (!agentId || latitude === undefined || longitude === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: agentId, latitude, longitude'
            });
        }

        // Validate coordinates
        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            return res.status(400).json({
                success: false,
                message: 'Invalid coordinates'
            });
        }

        const timestamp = getISTTimestamp();

        // Upsert agent location (insert or update)
        const { data, error } = await supabase
            .from('agent_tracking')
            .upsert(
                {
                    agent_id: agentId,
                    latitude,
                    longitude,
                    accuracy,
                    speed,
                    last_updated: timestamp,
                    is_active: true
                },
                { onConflict: 'agent_id' }
            )
            .select();

        if (error) {
            console.error('Supabase error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to update location',
                error: error.message
            });
        }

        res.json({
            success: true,
            message: 'Location updated successfully',
            data: data[0]
        });
    } catch (error) {
        console.error('Error updating agent location:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Get agent's current location
const getAgentLocation = async (req, res) => {
    try {
        const { agentId } = req.params;

        if (!agentId) {
            return res.status(400).json({
                success: false,
                message: 'Agent ID is required'
            });
        }

        const { data, error } = await supabase
            .from('agent_tracking')
            .select('*')
            .eq('agent_id', agentId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
            console.error('Supabase error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch location',
                error: error.message
            });
        }

        if (!data) {
            return res.status(404).json({
                success: false,
                message: 'Agent location not found'
            });
        }

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error fetching agent location:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Get active agents (for displaying on user's map)
const getActiveAgents = async (req, res) => {
    try {
        const { latitude, longitude, radiusKm = 50 } = req.query;

        // Basic query to get all active agents
        let query = supabase
            .from('agent_tracking')
            .select(`
                *,
                users:users(id, name, phone, profile_image)
            `)
            .eq('is_active', true);

        const { data, error } = await query;

        if (error) {
            console.error('Supabase error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch active agents',
                error: error.message
            });
        }

        // If latitude and longitude provided, filter by distance
        if (latitude && longitude) {
            const filteredAgents = data.filter(agent => {
                const distance = calculateDistance(
                    parseFloat(latitude),
                    parseFloat(longitude),
                    agent.latitude,
                    agent.longitude
                );
                return distance <= radiusKm;
            });
            return res.json({
                success: true,
                count: filteredAgents.length,
                data: filteredAgents
            });
        }

        res.json({
            success: true,
            count: data.length,
            data
        });
    } catch (error) {
        console.error('Error fetching active agents:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Get booking agent's location (user tracking their delivery agent)
const getBookingAgentLocation = async (req, res) => {
    try {
        const { bookingId } = req.params;

        if (!bookingId) {
            return res.status(400).json({
                success: false,
                message: 'Booking ID is required'
            });
        }

        // Get booking details to find agent
        const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .select('agent_id')
            .eq('id', bookingId)
            .single();

        if (bookingError || !booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        if (!booking.agent_id) {
            return res.status(404).json({
                success: false,
                message: 'No agent assigned to this booking'
            });
        }

        // Get agent's location
        const { data: location, error: locationError } = await supabase
            .from('agent_tracking')
            .select(`
                *,
                users:users(id, name, phone, profile_image, rating)
            `)
            .eq('agent_id', booking.agent_id)
            .single();

        if (locationError || !location) {
            return res.status(404).json({
                success: false,
                message: 'Agent location not available'
            });
        }

        res.json({
            success: true,
            data: location
        });
    } catch (error) {
        console.error('Error fetching booking agent location:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Stop tracking (agent goes offline)
const stopTracking = async (req, res) => {
    try {
        const { agentId } = req.body;

        if (!agentId) {
            return res.status(400).json({
                success: false,
                message: 'Agent ID is required'
            });
        }

        const { data, error } = await supabase
            .from('agent_tracking')
            .update({ is_active: false, last_updated: getISTTimestamp() })
            .eq('agent_id', agentId)
            .select();

        if (error) {
            console.error('Supabase error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to stop tracking',
                error: error.message
            });
        }

        res.json({
            success: true,
            message: 'Tracking stopped',
            data: data[0]
        });
    } catch (error) {
        console.error('Error stopping tracking:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// Get tracking history for a booking
const getTrackingHistory = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { limit = 100 } = req.query;

        if (!bookingId) {
            return res.status(400).json({
                success: false,
                message: 'Booking ID is required'
            });
        }

        // Get booking to find agent
        const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .select('agent_id')
            .eq('id', bookingId)
            .single();

        if (bookingError || !booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        // Get tracking history
        const { data, error } = await supabase
            .from('tracking_history')
            .select('*')
            .eq('agent_id', booking.agent_id)
            .eq('booking_id', bookingId)
            .order('timestamp', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Supabase error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch tracking history',
                error: error.message
            });
        }

        res.json({
            success: true,
            count: data.length,
            data
        });
    } catch (error) {
        console.error('Error fetching tracking history:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

module.exports = {
    updateAgentLocation,
    getAgentLocation,
    getActiveAgents,
    getBookingAgentLocation,
    stopTracking,
    getTrackingHistory
};

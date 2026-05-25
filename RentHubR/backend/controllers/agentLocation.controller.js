const supabase = require('../config/supabase');

/** Agent apps push GPS here (service role — bypasses RLS). */
const updateDeliveryAgentLocation = async (req, res) => {
    try {
        const { agentId, latitude, longitude, accuracy, speed } = req.body;

        if (!agentId || latitude === undefined || longitude === undefined) {
            return res.status(400).json({
                success: false,
                message: 'agentId, latitude, and longitude are required'
            });
        }

        const lat = Number(latitude);
        const lng = Number(longitude);
        if (Number.isNaN(lat) || Number.isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return res.status(400).json({ success: false, message: 'Invalid coordinates' });
        }

        const { data, error } = await supabase
            .from('delivery_agents')
            .update({
                current_lat: lat,
                current_lng: lng,
                last_active: new Date().toISOString(),
                ...(accuracy != null && { location_accuracy: Number(accuracy) }),
                ...(speed != null && { location_speed: Number(speed) })
            })
            .eq('id', agentId)
            .select('id, current_lat, current_lng, last_active, full_name, mobile')
            .single();

        if (error) {
            console.error('[agent/location] update failed:', error.message);
            return res.status(500).json({ success: false, message: error.message });
        }

        res.json({ success: true, data });
    } catch (err) {
        console.error('[agent/location] error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/** Customer tracking page — read agent position (no auth). */
const getDeliveryAgentLocation = async (req, res) => {
    try {
        const { agentId } = req.params;
        if (!agentId) {
            return res.status(400).json({ success: false, message: 'agentId required' });
        }

        const { data, error } = await supabase
            .from('delivery_agents')
            .select('id, current_lat, current_lng, last_active, full_name, mobile, availability_status')
            .eq('id', agentId)
            .single();

        if (error || !data) {
            return res.status(404).json({ success: false, message: 'Agent not found' });
        }

        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = {
    updateDeliveryAgentLocation,
    getDeliveryAgentLocation
};

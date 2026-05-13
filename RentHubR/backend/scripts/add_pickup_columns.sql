-- Add pickup-related columns for the Full-Service Dispatch System
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pickup_est_departure TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pickup_est_return TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pickup_status TEXT DEFAULT 'pending'; -- 'pending', 'picked_up', 'returned'
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pickup_agent_id UUID REFERENCES delivery_agents(id);

COMMENT ON COLUMN bookings.pickup_est_departure IS 'Estimated time agent leaves for collection';
COMMENT ON COLUMN bookings.pickup_est_return IS 'Estimated time agent returns to shop after collection';

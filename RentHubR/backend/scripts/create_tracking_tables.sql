-- Create agent_tracking table for real-time agent locations
CREATE TABLE IF NOT EXISTS agent_tracking (
    id BIGSERIAL PRIMARY KEY,
    agent_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(10, 2),
    speed DECIMAL(10, 2),
    is_active BOOLEAN DEFAULT TRUE,
    last_updated TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT valid_latitude CHECK (latitude >= -90 AND latitude <= 90),
    CONSTRAINT valid_longitude CHECK (longitude >= -180 AND longitude <= 180)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_agent_tracking_agent_id ON agent_tracking(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_tracking_is_active ON agent_tracking(is_active);
CREATE INDEX IF NOT EXISTS idx_agent_tracking_last_updated ON agent_tracking(last_updated);

-- Create tracking_history table for historical data
CREATE TABLE IF NOT EXISTS tracking_history (
    id BIGSERIAL PRIMARY KEY,
    agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(10, 2),
    speed DECIMAL(10, 2),
    timestamp TIMESTAMP DEFAULT NOW(),
    CONSTRAINT valid_latitude_history CHECK (latitude >= -90 AND latitude <= 90),
    CONSTRAINT valid_longitude_history CHECK (longitude >= -180 AND longitude <= 180)
);

-- Create indexes for tracking history
CREATE INDEX IF NOT EXISTS idx_tracking_history_agent_id ON tracking_history(agent_id);
CREATE INDEX IF NOT EXISTS idx_tracking_history_booking_id ON tracking_history(booking_id);
CREATE INDEX IF NOT EXISTS idx_tracking_history_timestamp ON tracking_history(timestamp);

-- Create agent_tracking_stats table for analytics
CREATE TABLE IF NOT EXISTS agent_tracking_stats (
    id BIGSERIAL PRIMARY KEY,
    agent_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    total_distance_km DECIMAL(10, 2) DEFAULT 0,
    total_deliveries INT DEFAULT 0,
    average_speed DECIMAL(10, 2),
    last_active_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add delivery tracking status column to bookings if it doesn't exist
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tracking_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS agent_accepted_time TIMESTAMP;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS agent_started_delivery_time TIMESTAMP;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS agent_at_pickup_time TIMESTAMP;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS agent_at_dropoff_time TIMESTAMP;

-- Create RLS (Row Level Security) policies for tracking
ALTER TABLE agent_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_history ENABLE ROW LEVEL SECURITY;

-- Allow agents to see their own tracking data
CREATE POLICY IF NOT EXISTS "Agents can see their own tracking" 
ON agent_tracking FOR SELECT 
USING (auth.uid() = agent_id);

-- Allow authenticated users to see active agent tracking (for map display)
CREATE POLICY IF NOT EXISTS "Authenticated users can see active tracking"
ON agent_tracking FOR SELECT 
USING (is_active = TRUE AND auth.role() = 'authenticated');

-- Allow tracking_history to be read by authorized users
CREATE POLICY IF NOT EXISTS "Users can see their booking tracking history"
ON tracking_history FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM bookings 
        WHERE bookings.id = tracking_history.booking_id 
        AND bookings.user_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM bookings 
        WHERE bookings.id = tracking_history.booking_id 
        AND bookings.agent_id = auth.uid()
    )
);

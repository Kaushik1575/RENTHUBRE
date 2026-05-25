-- Run once in Supabase SQL Editor (Dashboard → SQL → New query)

-- GPS columns on delivery agents
ALTER TABLE delivery_agents ADD COLUMN IF NOT EXISTS current_lat DOUBLE PRECISION;
ALTER TABLE delivery_agents ADD COLUMN IF NOT EXISTS current_lng DOUBLE PRECISION;
ALTER TABLE delivery_agents ADD COLUMN IF NOT EXISTS last_active TIMESTAMPTZ;
ALTER TABLE delivery_agents ADD COLUMN IF NOT EXISTS location_accuracy DOUBLE PRECISION;
ALTER TABLE delivery_agents ADD COLUMN IF NOT EXISTS location_speed DOUBLE PRECISION;

-- Booking delivery coordinates (if missing)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_address TEXT;

-- Enable Realtime for live map (required)
-- If this errors "already member", skip — Realtime is already enabled.
-- Or use Dashboard: Database → Publications → supabase_realtime → add delivery_agents
-- ALTER PUBLICATION supabase_realtime ADD TABLE delivery_agents;

-- Optional: allow agents to update own row when using Supabase client directly
-- (Backend API uses service role and does not need this.)
-- CREATE POLICY "agents_update_own_location" ON delivery_agents
--   FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

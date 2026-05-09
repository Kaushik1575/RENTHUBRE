-- 1. Update bookings table with delivery-related columns
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_option TEXT DEFAULT 'pickup';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS distance NUMERIC;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES delivery_agents(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'pending'; -- 'pending', 'picked_up', 'out_for_delivery', 'delivered', 'returned'

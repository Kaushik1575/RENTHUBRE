-- Create Offers Table
CREATE TABLE IF NOT EXISTS public.offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    code TEXT UNIQUE NOT NULL,
    offer_type TEXT DEFAULT 'GENERAL', -- GENERAL, HOURLY, VOLUME, CATEGORY
    discount_percentage NUMERIC,
    flat_discount NUMERIC,
    min_booking_amount NUMERIC DEFAULT 0,
    min_duration NUMERIC DEFAULT 0, -- Minimum hours required (for HOURLY type)
    min_monthly_bookings INTEGER DEFAULT 0, -- Min bookings in last 30 days (for VOLUME type)
    target_month INTEGER, -- Target month for volume offers (1-12, NULL for current)
    target_category TEXT DEFAULT 'ALL', -- ALL, bike, car, scooty
    max_discount NUMERIC,
    usage_limit_per_user INTEGER DEFAULT 1,
    valid_until TIMESTAMP WITH TIME ZONE,
    valid_from_hour INTEGER, -- 0-23 (for time-based offers like Night Owl)
    valid_to_hour INTEGER,   -- 0-23
    valid_days TEXT,         -- Comma separated days (e.g., '6,0' for weekends, where 0 is Sunday)
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Clear old samples
DELETE FROM public.offers WHERE code IN ('FESTIVE20', 'EARLYBIRD15', 'WEEKEND20', 'LOYALTY200', 'LONGHAUL25');

-- Add Strategic Festive Offers
INSERT INTO public.offers (title, description, code, offer_type, discount_percentage, flat_discount, min_booking_amount, min_duration, min_monthly_bookings, target_category, image_url)
VALUES 
('Festive Season Sale', 'Get 20% OFF on all bookings this festive season! Limited time offer.', 'FESTIVE20', 'GENERAL', 20, NULL, 0, 0, 0, 'ALL', 'https://images.unsplash.com/photo-1512909006721-3d6018887383?auto=format&fit=crop&q=80&w=800'),
('Early Bird Special', 'Plan ahead and save! Get 15% off when you book at least 24 hours in advance.', 'EARLYBIRD15', 'GENERAL', 15, NULL, 500, 0, 0, 'ALL', 'https://images.unsplash.com/photo-1495562569060-2eec283d3391?auto=format&fit=crop&q=80&w=800'),
('Weekend Warrior', 'Make your weekends extra special with 20% OFF on all rentals.', 'WEEKEND20', 'GENERAL', 20, NULL, 0, 0, 0, 'ALL', 'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?auto=format&fit=crop&q=80&w=800'),
('Loyalty Milestone', 'Thanks for being a regular! ₹200 off for users with 5+ bookings this month.', 'LOYALTY200', 'VOLUME', NULL, 200, 1000, 0, 5, 'ALL', 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&q=80&w=800'),
('The Long Haul', 'Going far? Get 25% OFF on rentals longer than 12 hours.', 'LONGHAUL25', 'HOURLY', 25, NULL, 0, 12, 0, 'ALL', 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=800');

-- Enable RLS
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Public can view active offers
CREATE POLICY "Public can view active offers" ON public.offers
    FOR SELECT USING (is_active = true);

-- Admins can do everything
-- We use email comparison to avoid bigint vs uuid issues
CREATE POLICY "Admins can manage offers" ON public.offers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.email = (auth.jwt() ->> 'email')::text 
            AND users.is_admin = true
        )
    );

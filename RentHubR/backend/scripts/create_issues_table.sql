-- =============================================
-- RentHub Support / E-Query System
-- Supabase SQL Setup
-- Run this in your Supabase SQL Editor
-- =============================================

-- Create the issues table
CREATE TABLE IF NOT EXISTS public.issues (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    issue_id    TEXT NOT NULL UNIQUE,           -- e.g. RH1702456789012
    user_id     TEXT NOT NULL,                   -- FK to users.id (string uuid)
    email       TEXT NOT NULL,                   -- User email for notifications
    booking_id  TEXT,                            -- Optional related booking
    category    TEXT NOT NULL,                   -- Refund | Booking Issue | etc.
    sub_category TEXT,                           -- Dynamic sub-category
    description TEXT NOT NULL,                   -- User's description
    status      TEXT NOT NULL DEFAULT 'Pending', -- Pending | In Progress | Resolved
    admin_reply TEXT,                            -- Admin's reply message
    created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_issues_issue_id  ON public.issues (issue_id);
CREATE INDEX IF NOT EXISTS idx_issues_user_id   ON public.issues (user_id);
CREATE INDEX IF NOT EXISTS idx_issues_status    ON public.issues (status);
CREATE INDEX IF NOT EXISTS idx_issues_created   ON public.issues (created_at DESC);

-- Auto-update updated_at on changes
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_issues_updated_at ON public.issues;
CREATE TRIGGER update_issues_updated_at
    BEFORE UPDATE ON public.issues
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Row Level Security (optional but recommended)
-- Uncomment if you use Supabase Auth on frontend
-- =============================================
-- ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their own issues
-- CREATE POLICY "Users can read own issues"
--   ON public.issues FOR SELECT
--   USING (auth.uid()::text = user_id);

-- Allow authenticated users to insert issues
-- CREATE POLICY "Users can insert issues"
--   ON public.issues FOR INSERT
--   WITH CHECK (auth.uid()::text = user_id);

-- Allow service role to do everything (backend uses service role key)
-- This is automatically true for service_role. No policy needed.

-- =============================================
-- Verify
-- =============================================
SELECT 'issues table created successfully' AS status;

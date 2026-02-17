-- Migration: Create registrations table
-- Date: 2026-02-17

-- Create registrations table
CREATE TABLE IF NOT EXISTS registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create unique indexes for case-insensitive duplicate prevention
CREATE UNIQUE INDEX idx_registrations_email_lower ON registrations (lower(email));
CREATE UNIQUE INDEX idx_registrations_full_name_lower ON registrations (lower(full_name));

-- Enable Row Level Security
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to insert their own registration
CREATE POLICY "Allow authenticated users to insert"
ON registrations
FOR INSERT
TO authenticated
WITH CHECK (
    auth.jwt() ->> 'email' = email
);

-- RLS Policy: Allow authenticated users to read their own registration
CREATE POLICY "Allow authenticated users to read own registration"
ON registrations
FOR SELECT
TO authenticated
USING (
    auth.jwt() ->> 'email' = email
);

-- RLS Policy: Allow service role full access (for admin CSV export)
-- Note: service_role bypasses RLS by default, so no explicit policy needed

-- Create index for faster lookups
CREATE INDEX idx_registrations_created_at ON registrations (created_at DESC);

COMMENT ON TABLE registrations IS 'Stores user registrations with email verification';
COMMENT ON COLUMN registrations.full_name IS 'User full name (English letters only, 3-50 chars)';
COMMENT ON COLUMN registrations.email IS 'Verified email address from Supabase Auth';

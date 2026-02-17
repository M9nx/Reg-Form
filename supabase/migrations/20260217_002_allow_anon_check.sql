-- Migration: Allow anon users to check registration existence
-- Date: 2026-02-17

-- RLS Policy: Allow anyone to check if email/name exists (for pre-validation)
CREATE POLICY "Allow anon to check existence"
ON registrations
FOR SELECT
TO anon
USING (true);

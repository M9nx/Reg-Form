-- Migration: Allow anon users to check registration existence
-- Date: 2026-02-17

-- RLS Policy: Allow anyone to check if email/name exists (for pre-validation)
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_policies
		WHERE schemaname = 'public'
		  AND tablename = 'registrations'
		  AND policyname = 'Allow anon to check existence'
	) THEN
		CREATE POLICY "Allow anon to check existence"
		ON registrations
		FOR SELECT
		TO anon
		USING (true);
	END IF;
END $$;

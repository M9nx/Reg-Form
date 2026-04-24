-- Migration: Repair passwords objects, grant service_role access, and refresh API schema
-- Date: 2026-04-24

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.passwords (
	id SMALLINT PRIMARY KEY CHECK (id = 1),
	password_hash TEXT NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.passwords (id, password_hash)
VALUES (
	1,
	'ca7bebe4c2016774cea44431f29bfdd664b78b74ee68c80e63ce20ff5091934f'
)
ON CONFLICT (id)
DO UPDATE SET
	password_hash = EXCLUDED.password_hash,
	updated_at = now();

ALTER TABLE public.passwords ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_policies
		WHERE schemaname = 'public'
			AND tablename = 'passwords'
			AND policyname = 'Deny direct access to passwords'
	) THEN
		CREATE POLICY "Deny direct access to passwords"
		ON public.passwords
		FOR ALL
		TO anon, authenticated
		USING (false)
		WITH CHECK (false);
	END IF;
END $$;

CREATE OR REPLACE FUNCTION public.verify_admin_password(p_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
	v_expected_hash TEXT;
BEGIN
	IF p_password IS NULL OR btrim(p_password) = '' THEN
		RETURN false;
	END IF;

	SELECT password_hash
	INTO v_expected_hash
	FROM public.passwords
	WHERE id = 1;

	IF v_expected_hash IS NULL THEN
		RETURN false;
	END IF;

	RETURN encode(digest(p_password, 'sha256'), 'hex') = v_expected_hash;
END;
$$;

REVOKE ALL ON TABLE public.passwords FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.verify_admin_password(TEXT) FROM PUBLIC;

GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT ON TABLE public.passwords TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_admin_password(TEXT) TO service_role;

GRANT EXECUTE ON FUNCTION public.verify_admin_password(TEXT) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

-- Migration: Add pgcrypto-free admin password verification RPC
-- Date: 2026-04-24

CREATE OR REPLACE FUNCTION public.verify_admin_password_hash(p_password_hash TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expected_hash TEXT;
BEGIN
  IF p_password_hash IS NULL OR btrim(p_password_hash) = '' THEN
    RETURN false;
  END IF;

  SELECT password_hash
  INTO v_expected_hash
  FROM public.passwords
  WHERE id = 1;

  IF v_expected_hash IS NULL THEN
    RETURN false;
  END IF;

  RETURN lower(btrim(p_password_hash)) = lower(v_expected_hash);
END;
$$;

REVOKE ALL ON FUNCTION public.verify_admin_password_hash(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_admin_password_hash(TEXT) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

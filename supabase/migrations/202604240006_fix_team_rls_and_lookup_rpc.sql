-- Migration: Fix team RLS flow and add secure token lookup RPC
-- Date: 2026-04-24

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Make existing write RPCs run with definer privileges so RLS does not block anon clients.
ALTER FUNCTION public.create_team_with_members(TEXT, TEXT[])
  SECURITY DEFINER;
ALTER FUNCTION public.create_team_with_members(TEXT, TEXT[])
  SET search_path = public;

ALTER FUNCTION public.update_team_with_members(TEXT, TEXT, TEXT[])
  SECURITY DEFINER;
ALTER FUNCTION public.update_team_with_members(TEXT, TEXT, TEXT[])
  SET search_path = public;

-- Token-based lookup for edit page without direct table SELECT from anon clients.
CREATE OR REPLACE FUNCTION public.get_team_by_token(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id UUID;
  v_team_name TEXT;
  v_team_token TEXT;
BEGIN
  IF p_token IS NULL OR btrim(p_token) = '' THEN
    RAISE EXCEPTION 'Invalid token';
  END IF;

  SELECT t.id, t.team_name, t.token
  INTO v_team_id, v_team_name, v_team_token
  FROM public.teams t
  WHERE t.token = p_token;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Invalid token';
  END IF;

  RETURN json_build_object(
    'id', v_team_id::text,
    'team_name', v_team_name,
    'token', v_team_token,
    'team_members', COALESCE(
      (
        SELECT json_agg(json_build_object('member_name', tm.member_name) ORDER BY tm.id)
        FROM public.team_members tm
        WHERE tm.team_id = v_team_id
      ),
      '[]'::json
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_team_with_members(TEXT, TEXT[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_team_with_members(TEXT, TEXT, TEXT[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_team_by_token(TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_team_with_members(TEXT, TEXT[]) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_team_with_members(TEXT, TEXT, TEXT[]) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_team_by_token(TEXT) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

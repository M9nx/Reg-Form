-- Migration: Enforce 5-6 member count in team RPCs
-- Date: 2026-04-24

CREATE OR REPLACE FUNCTION public.create_team_with_members(
  p_team_name TEXT,
  p_members TEXT[]
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id UUID;
  v_token TEXT;
  v_member TEXT;
  v_duplicate_count INT;
  v_members TEXT[];
BEGIN
  IF p_team_name IS NULL OR btrim(p_team_name) = '' THEN
    RAISE EXCEPTION 'Project name is required';
  END IF;

  IF p_members IS NULL OR array_length(p_members, 1) IS NULL THEN
    RAISE EXCEPTION 'Member count out of range';
  END IF;

  IF array_length(p_members, 1) < 5 OR array_length(p_members, 1) > 6 THEN
    RAISE EXCEPTION 'Member count out of range';
  END IF;

  SELECT array_agg(regexp_replace(btrim(m), '\s+', ' ', 'g'))
  INTO v_members
  FROM unnest(p_members) AS m;

  IF EXISTS (SELECT 1 FROM unnest(v_members) AS m WHERE m = '') THEN
    RAISE EXCEPTION 'Member name is required';
  END IF;

  -- Check for duplicate names in input array (case-insensitive)
  SELECT COUNT(*) - COUNT(DISTINCT lower(m)) INTO v_duplicate_count
  FROM unnest(v_members) AS m;

  IF v_duplicate_count > 0 THEN
    RAISE EXCEPTION 'Duplicate member names in input array';
  END IF;

  -- Check if project name already exists (case-insensitive)
  IF EXISTS (SELECT 1 FROM public.teams WHERE lower(team_name) = lower(p_team_name)) THEN
    RAISE EXCEPTION 'team_name_exists' USING ERRCODE = '23505';
  END IF;

  -- Check if any member already exists in DB (case-insensitive)
  IF EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE lower(tm.member_name) IN (SELECT lower(m) FROM unnest(v_members) AS m)
  ) THEN
    RAISE EXCEPTION 'member_name_exists' USING ERRCODE = '23505';
  END IF;

  -- Generate token
  v_token := gen_random_uuid()::TEXT;

  -- Insert team
  INSERT INTO public.teams (team_name, token)
  VALUES (btrim(p_team_name), v_token)
  RETURNING id INTO v_team_id;

  -- Insert members
  FOREACH v_member IN ARRAY v_members
  LOOP
    INSERT INTO public.team_members (team_id, member_name)
    VALUES (v_team_id, v_member);
  END LOOP;

  -- Return token and team data
  RETURN json_build_object('token', v_token, 'team_id', v_team_id::text);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_team_with_members(
  p_token TEXT,
  p_team_name TEXT,
  p_members TEXT[]
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id UUID;
  v_member TEXT;
  v_duplicate_count INT;
  v_members TEXT[];
BEGIN
  IF p_token IS NULL OR btrim(p_token) = '' THEN
    RAISE EXCEPTION 'Invalid token';
  END IF;

  SELECT id INTO v_team_id FROM public.teams WHERE token = p_token;
  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Invalid token';
  END IF;

  IF p_team_name IS NULL OR btrim(p_team_name) = '' THEN
    RAISE EXCEPTION 'Project name is required';
  END IF;

  IF p_members IS NULL OR array_length(p_members, 1) IS NULL THEN
    RAISE EXCEPTION 'Member count out of range';
  END IF;

  IF array_length(p_members, 1) < 5 OR array_length(p_members, 1) > 6 THEN
    RAISE EXCEPTION 'Member count out of range';
  END IF;

  SELECT array_agg(regexp_replace(btrim(m), '\s+', ' ', 'g'))
  INTO v_members
  FROM unnest(p_members) AS m;

  IF EXISTS (SELECT 1 FROM unnest(v_members) AS m WHERE m = '') THEN
    RAISE EXCEPTION 'Member name is required';
  END IF;

  -- Check for duplicate names in input array (case-insensitive)
  SELECT COUNT(*) - COUNT(DISTINCT lower(m)) INTO v_duplicate_count
  FROM unnest(v_members) AS m;

  IF v_duplicate_count > 0 THEN
    RAISE EXCEPTION 'Duplicate member names in input array';
  END IF;

  -- Check if project name already exists (case-insensitive) for another team
  IF EXISTS (
    SELECT 1
    FROM public.teams
    WHERE id <> v_team_id
      AND lower(team_name) = lower(p_team_name)
  ) THEN
    RAISE EXCEPTION 'team_name_exists' USING ERRCODE = '23505';
  END IF;

  -- Check if any member already exists in DB (case-insensitive) for another team
  IF EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.team_id <> v_team_id
      AND lower(tm.member_name) IN (SELECT lower(m) FROM unnest(v_members) AS m)
  ) THEN
    RAISE EXCEPTION 'member_name_exists' USING ERRCODE = '23505';
  END IF;

  UPDATE public.teams
  SET team_name = btrim(p_team_name)
  WHERE id = v_team_id;

  DELETE FROM public.team_members WHERE team_id = v_team_id;

  FOREACH v_member IN ARRAY v_members
  LOOP
    INSERT INTO public.team_members (team_id, member_name)
    VALUES (v_team_id, v_member);
  END LOOP;

  RETURN json_build_object('token', p_token, 'team_id', v_team_id::text);
END;
$$;

REVOKE ALL ON FUNCTION public.create_team_with_members(TEXT, TEXT[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_team_with_members(TEXT, TEXT, TEXT[]) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_team_with_members(TEXT, TEXT[]) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_team_with_members(TEXT, TEXT, TEXT[]) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

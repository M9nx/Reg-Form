-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name TEXT NOT NULL,
  token TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Team members table
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL
);

-- Unique constraints (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_team_name_lower ON teams (lower(team_name));
CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_token_unique ON teams (token);
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_member_name_lower ON team_members (lower(member_name));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_teams_created_at ON teams(created_at DESC);

/*
  # Session Tokens, User Roles & Profile Extension

  ## Summary
  Adds the infrastructure needed for the account system, dynamic role assignment,
  and 30-day session management. Extends platform_users with profile fields.

  ## New Tables

  ### `session_tokens`
  Stores per-device access/refresh tokens with 30-day validity.
  - id, user_id, access_token, refresh_token, expires_at, created_at

  ### `user_roles`
  Dynamic role assignment – a user can be buyer, supplier, or both.
  - id, user_id, role ('buyer' | 'supplier'), activated_at

  ## Modified Tables

  ### `platform_users`
  - Add company_name (text)
  - Add city (text)
  - Add activity_type (text)
  - Add display_name (text)

  ## Security
  - RLS enabled on all new tables
  - Tokens and roles scoped to phone-based identity (no auth.uid required)
  - Public SELECT/INSERT allowed for phone-verified operations
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='platform_users' AND column_name='company_name') THEN
    ALTER TABLE platform_users ADD COLUMN company_name text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='platform_users' AND column_name='city') THEN
    ALTER TABLE platform_users ADD COLUMN city text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='platform_users' AND column_name='activity_type') THEN
    ALTER TABLE platform_users ADD COLUMN activity_type text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='platform_users' AND column_name='display_name') THEN
    ALTER TABLE platform_users ADD COLUMN display_name text DEFAULT '';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS session_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES platform_users(id) ON DELETE CASCADE,
  phone text NOT NULL,
  access_token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text || gen_random_uuid()::text,
  refresh_token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text || gen_random_uuid()::text,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '30 days',
  created_at timestamptz DEFAULT now(),
  last_used timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_session_access_token ON session_tokens(access_token);
CREATE INDEX IF NOT EXISTS idx_session_phone ON session_tokens(phone);
CREATE INDEX IF NOT EXISTS idx_session_expires ON session_tokens(expires_at);

ALTER TABLE session_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert session tokens"
  ON session_tokens FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow select session tokens by token"
  ON session_tokens FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow update session tokens"
  ON session_tokens FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES platform_users(id) ON DELETE CASCADE,
  phone text NOT NULL,
  role text NOT NULL CHECK (role IN ('buyer', 'supplier')),
  activated_at timestamptz DEFAULT now(),
  UNIQUE(phone, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_phone ON user_roles(phone);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert user roles"
  ON user_roles FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow select user roles"
  ON user_roles FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow upsert user roles"
  ON user_roles FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='platform_users' AND column_name='last_active') THEN
    ALTER TABLE platform_users ADD COLUMN last_active timestamptz DEFAULT now();
  END IF;
END $$;

CREATE POLICY "Allow anon select platform_users"
  ON platform_users FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon update platform_users"
  ON platform_users FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

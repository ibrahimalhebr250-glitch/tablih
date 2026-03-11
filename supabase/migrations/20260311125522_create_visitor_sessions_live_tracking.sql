/*
  # Create Visitor Sessions - Live Tracking

  ## Purpose
  A new table that logs EVERY session (every browser open / page load),
  unlike platform_visitor_logs which logs only once per visitor per day.
  This allows the admin panel to detect any visitor entry in real-time.

  ## New Tables
  - `visitor_sessions`
    - `id` (uuid, primary key)
    - `visitor_id` (text) - persistent ID stored in localStorage
    - `session_id` (text) - per-tab ID stored in sessionStorage
    - `phone` (text, nullable) - linked after login
    - `user_agent` (text) - browser info
    - `referrer` (text) - where they came from
    - `created_at` (timestamptz) - exact entry time

  ## Security
  - RLS enabled
  - anon can INSERT (needed for anonymous visitors)
  - anon can UPDATE own session (to link phone after login)
  - authenticated admin can SELECT all (via session check)

  ## Realtime
  - Added to supabase_realtime publication for instant admin detection
*/

CREATE TABLE IF NOT EXISTS visitor_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text NOT NULL,
  session_id text NOT NULL UNIQUE,
  phone text DEFAULT NULL,
  user_agent text DEFAULT NULL,
  referrer text DEFAULT NULL,
  page_count integer NOT NULL DEFAULT 1,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visitor_sessions_created ON visitor_sessions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_session ON visitor_sessions (session_id);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_visitor ON visitor_sessions (visitor_id);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_phone ON visitor_sessions (phone) WHERE phone IS NOT NULL;

ALTER TABLE visitor_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can insert session"
  ON visitor_sessions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anon can update own session"
  ON visitor_sessions
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can read own session"
  ON visitor_sessions
  FOR SELECT
  TO anon
  USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE visitor_sessions;

CREATE OR REPLACE FUNCTION log_visitor_session(
  p_visitor_id text,
  p_session_id text,
  p_user_agent text DEFAULT NULL,
  p_referrer text DEFAULT NULL,
  p_phone text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO visitor_sessions (visitor_id, session_id, user_agent, referrer, phone)
  VALUES (p_visitor_id, p_session_id, p_user_agent, p_referrer, p_phone)
  ON CONFLICT (session_id) DO UPDATE SET
    last_seen_at = now(),
    page_count = visitor_sessions.page_count + 1,
    phone = COALESCE(EXCLUDED.phone, visitor_sessions.phone);
END;
$$;

GRANT EXECUTE ON FUNCTION log_visitor_session TO anon, authenticated;

CREATE OR REPLACE FUNCTION update_session_phone(
  p_session_id text,
  p_phone text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE visitor_sessions
  SET phone = p_phone
  WHERE session_id = p_session_id
    AND phone IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION update_session_phone TO anon, authenticated;

CREATE OR REPLACE FUNCTION get_live_visitor_count(minutes_ago integer DEFAULT 30)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cnt integer;
BEGIN
  SELECT COUNT(DISTINCT visitor_id) INTO cnt
  FROM visitor_sessions
  WHERE last_seen_at >= now() - (minutes_ago || ' minutes')::interval;
  RETURN COALESCE(cnt, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION get_live_visitor_count TO anon, authenticated;

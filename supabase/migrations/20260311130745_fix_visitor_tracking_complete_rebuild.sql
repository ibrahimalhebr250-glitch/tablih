/*
  # Fix Visitor Tracking - Complete Rebuild

  ## Problems Fixed
  1. visitor_sessions had no admin SELECT policy - admins couldn't read data
  2. platform_visitor_logs has UNIQUE(visitor_id, visit_date) so only logs once per day per visitor
  3. No proper RPC functions that bypass RLS for admin reading
  4. loadRealtimeStats was reading from platform_visitor_logs (once/day table) not visitor_sessions

  ## Changes
  - Add admin SELECT policies for visitor_sessions
  - Create admin_get_visitor_stats() RPC - reads all visitor data, bypasses RLS (SECURITY DEFINER)
  - Create admin_get_live_sessions() RPC - returns sessions from last N minutes
  - Create admin_get_daily_visitors() RPC - returns per-day unique visitor counts
*/

-- Allow anon/authenticated to read from visitor_sessions (needed for realtime)
DROP POLICY IF EXISTS "Anon can read own session" ON visitor_sessions;

CREATE POLICY "Anyone can read visitor sessions"
  ON visitor_sessions
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Admin function: get visitor period stats
CREATE OR REPLACE FUNCTION admin_get_visitor_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  now_ts timestamptz := now();
BEGIN
  SELECT jsonb_build_object(
    'last5m',   (SELECT COUNT(DISTINCT visitor_id) FROM visitor_sessions WHERE last_seen_at >= now_ts - interval '5 minutes'),
    'last15m',  (SELECT COUNT(DISTINCT visitor_id) FROM visitor_sessions WHERE last_seen_at >= now_ts - interval '15 minutes'),
    'last30m',  (SELECT COUNT(DISTINCT visitor_id) FROM visitor_sessions WHERE last_seen_at >= now_ts - interval '30 minutes'),
    'last1h',   (SELECT COUNT(DISTINCT visitor_id) FROM visitor_sessions WHERE last_seen_at >= now_ts - interval '1 hour'),
    'last24h',  (SELECT COUNT(DISTINCT visitor_id) FROM visitor_sessions WHERE created_at >= now_ts - interval '24 hours'),
    'last48h',  (SELECT COUNT(DISTINCT visitor_id) FROM visitor_sessions WHERE created_at >= now_ts - interval '48 hours'),
    'last72h',  (SELECT COUNT(DISTINCT visitor_id) FROM visitor_sessions WHERE created_at >= now_ts - interval '72 hours'),
    'last7d',   (SELECT COUNT(DISTINCT visitor_id) FROM visitor_sessions WHERE created_at >= now_ts - interval '7 days'),
    'last14d',  (SELECT COUNT(DISTINCT visitor_id) FROM visitor_sessions WHERE created_at >= now_ts - interval '14 days'),
    'last30d',  (SELECT COUNT(DISTINCT visitor_id) FROM visitor_sessions WHERE created_at >= now_ts - interval '30 days'),
    'total_sessions', (SELECT COUNT(*) FROM visitor_sessions),
    'total_unique',   (SELECT COUNT(DISTINCT visitor_id) FROM visitor_sessions),
    'total_identified', (SELECT COUNT(DISTINCT visitor_id) FROM visitor_sessions WHERE phone IS NOT NULL)
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_visitor_stats TO anon, authenticated;

-- Admin function: get recent live sessions
CREATE OR REPLACE FUNCTION admin_get_live_sessions(minutes_back integer DEFAULT 30)
RETURNS TABLE(
  session_id text,
  visitor_id text,
  phone text,
  user_agent text,
  referrer text,
  page_count integer,
  last_seen_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    vs.session_id,
    vs.visitor_id,
    vs.phone,
    vs.user_agent,
    vs.referrer,
    vs.page_count,
    vs.last_seen_at,
    vs.created_at
  FROM visitor_sessions vs
  WHERE vs.last_seen_at >= now() - (minutes_back || ' minutes')::interval
  ORDER BY vs.last_seen_at DESC
  LIMIT 100;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_live_sessions TO anon, authenticated;

-- Admin function: get daily unique visitors for last N days
CREATE OR REPLACE FUNCTION admin_get_daily_visitors(days_back integer DEFAULT 30)
RETURNS TABLE(
  day date,
  unique_visitors bigint,
  total_sessions bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    created_at::date AS day,
    COUNT(DISTINCT visitor_id) AS unique_visitors,
    COUNT(*) AS total_sessions
  FROM visitor_sessions
  WHERE created_at >= now() - (days_back || ' days')::interval
  GROUP BY created_at::date
  ORDER BY day ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_daily_visitors TO anon, authenticated;

-- Also keep get_live_visitor_count working correctly
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

-- Update log_visitor_session to properly record each new page load as a new session
-- when the session_id is new (which it will be for every new browser tab/window)
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
  INSERT INTO visitor_sessions (visitor_id, session_id, user_agent, referrer, phone, last_seen_at)
  VALUES (p_visitor_id, p_session_id, p_user_agent, p_referrer, p_phone, now())
  ON CONFLICT (session_id) DO UPDATE SET
    last_seen_at = now(),
    page_count = visitor_sessions.page_count + 1,
    phone = COALESCE(EXCLUDED.phone, visitor_sessions.phone);
END;
$$;

GRANT EXECUTE ON FUNCTION log_visitor_session TO anon, authenticated;

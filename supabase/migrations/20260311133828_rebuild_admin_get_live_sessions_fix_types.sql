/*
  # Rebuild admin_get_live_sessions with correct types

  Drops all overloads and rebuilds with correct column types
  matching the visitor_sessions table structure.
*/

DROP FUNCTION IF EXISTS admin_get_live_sessions(integer);
DROP FUNCTION IF EXISTS admin_get_live_sessions(int);

CREATE OR REPLACE FUNCTION admin_get_live_sessions(minutes_back integer DEFAULT 60)
RETURNS TABLE (
  session_id    text,
  visitor_id    text,
  phone         text,
  user_agent    text,
  device_type   text,
  referrer      text,
  page_count    integer,
  last_seen_at  timestamptz,
  created_at    timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    vs.session_id::text,
    vs.visitor_id::text,
    vs.phone,
    vs.user_agent,
    COALESCE(vs.device_type, 'desktop'),
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

GRANT EXECUTE ON FUNCTION admin_get_live_sessions(integer) TO anon, authenticated;

-- Also fix admin_get_visitor_stats to include last5m and last15m
DROP FUNCTION IF EXISTS admin_get_visitor_stats();

CREATE OR REPLACE FUNCTION admin_get_visitor_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'last5m',         COUNT(DISTINCT CASE WHEN last_seen_at >= now() - interval '5 minutes'  THEN session_id END),
    'last15m',        COUNT(DISTINCT CASE WHEN last_seen_at >= now() - interval '15 minutes' THEN session_id END),
    'last30m',        COUNT(DISTINCT CASE WHEN last_seen_at >= now() - interval '30 minutes' THEN session_id END),
    'last1h',         COUNT(DISTINCT CASE WHEN last_seen_at >= now() - interval '1 hour'     THEN session_id END),
    'last24h',        COUNT(DISTINCT CASE WHEN last_seen_at >= now() - interval '24 hours'   THEN session_id END),
    'last48h',        COUNT(DISTINCT CASE WHEN last_seen_at >= now() - interval '48 hours'   THEN session_id END),
    'last72h',        COUNT(DISTINCT CASE WHEN last_seen_at >= now() - interval '72 hours'   THEN session_id END),
    'last7d',         COUNT(DISTINCT CASE WHEN last_seen_at >= now() - interval '7 days'     THEN session_id END),
    'last14d',        COUNT(DISTINCT CASE WHEN last_seen_at >= now() - interval '14 days'    THEN session_id END),
    'last30d',        COUNT(DISTINCT CASE WHEN last_seen_at >= now() - interval '30 days'    THEN session_id END),
    'total_sessions', COUNT(*),
    'total_unique',   COUNT(DISTINCT visitor_id),
    'total_identified', COUNT(DISTINCT CASE WHEN phone IS NOT NULL THEN visitor_id END),
    'mobile_sessions', COUNT(CASE WHEN device_type = 'mobile' THEN 1 END),
    'desktop_sessions', COUNT(CASE WHEN device_type = 'desktop' THEN 1 END)
  )
  INTO result
  FROM visitor_sessions;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_visitor_stats() TO anon, authenticated;

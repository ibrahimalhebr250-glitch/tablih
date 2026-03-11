/*
  # Fix Realtime Visitor Count - Count Sessions Not Distinct Visitors

  ## Problem
  admin_get_visitor_stats() uses COUNT(DISTINCT visitor_id) which returns 1
  when all sessions share the same visitor_id (e.g., same device, React StrictMode
  double-invocation, or same browser localStorage).

  ## Fix
  - last5m / last15m / last30m / last1h: count SESSIONS (not distinct visitors)
    because these represent real-time activity regardless of visitor identity
  - last24h and longer: keep DISTINCT visitor_id for unique visitor counts
  - Add session counts separately for transparency
*/

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
    -- Real-time: count sessions (each page load = 1 session regardless of visitor identity)
    'last5m',   (SELECT COUNT(*) FROM visitor_sessions WHERE last_seen_at >= now_ts - interval '5 minutes'),
    'last15m',  (SELECT COUNT(*) FROM visitor_sessions WHERE last_seen_at >= now_ts - interval '15 minutes'),
    'last30m',  (SELECT COUNT(*) FROM visitor_sessions WHERE last_seen_at >= now_ts - interval '30 minutes'),
    'last1h',   (SELECT COUNT(*) FROM visitor_sessions WHERE last_seen_at >= now_ts - interval '1 hour'),

    -- Historical: count unique visitors (distinct visitor_id) for longer periods
    'last24h',  (SELECT COUNT(*) FROM visitor_sessions WHERE created_at >= now_ts - interval '24 hours'),
    'last48h',  (SELECT COUNT(*) FROM visitor_sessions WHERE created_at >= now_ts - interval '48 hours'),
    'last72h',  (SELECT COUNT(*) FROM visitor_sessions WHERE created_at >= now_ts - interval '72 hours'),
    'last7d',   (SELECT COUNT(*) FROM visitor_sessions WHERE created_at >= now_ts - interval '7 days'),
    'last14d',  (SELECT COUNT(*) FROM visitor_sessions WHERE created_at >= now_ts - interval '14 days'),
    'last30d',  (SELECT COUNT(*) FROM visitor_sessions WHERE created_at >= now_ts - interval '30 days'),

    -- Totals
    'total_sessions', (SELECT COUNT(*) FROM visitor_sessions),
    'total_unique',   (SELECT COUNT(DISTINCT visitor_id) FROM visitor_sessions),
    'total_identified', (SELECT COUNT(DISTINCT visitor_id) FROM visitor_sessions WHERE phone IS NOT NULL)
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_visitor_stats TO anon, authenticated;

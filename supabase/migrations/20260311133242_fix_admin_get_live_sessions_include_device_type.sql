/*
  # Fix admin_get_live_sessions to include device_type

  Returns device_type column so the frontend can accurately show mobile vs desktop
  without re-parsing user_agent strings.
*/

DROP FUNCTION IF EXISTS admin_get_live_sessions(integer);

CREATE OR REPLACE FUNCTION admin_get_live_sessions(minutes_back integer DEFAULT 60)
RETURNS TABLE (
  session_id    uuid,
  visitor_id    uuid,
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
    vs.session_id,
    vs.visitor_id,
    vs.phone,
    vs.user_agent,
    vs.device_type,
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

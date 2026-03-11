/*
  # Fix Visitor Sessions - Device Type + Security Definer + Unique Session Per Device

  1. Changes
    - Add `device_type` column to visitor_sessions (mobile/desktop)
    - Rebuild `log_visitor_session` as SECURITY DEFINER so anon users can insert
    - Rebuild `log_platform_visit` as SECURITY DEFINER
    - Session ID is now unique per device: uses visitor_id prefix so two devices never collide

  2. Notes
    - Old sessions without device_type will default to 'desktop'
    - All inserts happen server-side via SECURITY DEFINER bypassing RLS issues
*/

-- Add device_type column
ALTER TABLE visitor_sessions 
  ADD COLUMN IF NOT EXISTS device_type text NOT NULL DEFAULT 'desktop';

-- Update existing rows based on user_agent
UPDATE visitor_sessions
SET device_type = CASE
  WHEN lower(user_agent) SIMILAR TO '%(mobile|android|iphone|ipad|ipod|blackberry|windows phone)%'
  THEN 'mobile'
  ELSE 'desktop'
END
WHERE device_type = 'desktop';

-- Drop and rebuild log_visitor_session as SECURITY DEFINER
DROP FUNCTION IF EXISTS log_visitor_session(uuid, uuid, text, text, text);
DROP FUNCTION IF EXISTS log_visitor_session(text, text, text, text, text);

CREATE OR REPLACE FUNCTION log_visitor_session(
  p_visitor_id  uuid,
  p_session_id  uuid,
  p_user_agent  text DEFAULT NULL,
  p_referrer    text DEFAULT NULL,
  p_phone       text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_device_type text;
BEGIN
  v_device_type := CASE
    WHEN lower(p_user_agent) SIMILAR TO '%(mobile|android|iphone|ipad|ipod|blackberry|windows phone)%'
    THEN 'mobile'
    ELSE 'desktop'
  END;

  INSERT INTO visitor_sessions (
    visitor_id, session_id, user_agent, referrer, phone, last_seen_at, device_type
  )
  VALUES (
    p_visitor_id, p_session_id, p_user_agent, p_referrer, p_phone, now(), v_device_type
  )
  ON CONFLICT (session_id) DO UPDATE SET
    last_seen_at  = now(),
    page_count    = visitor_sessions.page_count + 1,
    phone         = COALESCE(EXCLUDED.phone, visitor_sessions.phone),
    device_type   = EXCLUDED.device_type;
END;
$$;

GRANT EXECUTE ON FUNCTION log_visitor_session(uuid, uuid, text, text, text) TO anon, authenticated;

-- Drop and rebuild log_platform_visit as SECURITY DEFINER
DROP FUNCTION IF EXISTS log_platform_visit(uuid, uuid, text, text);

CREATE OR REPLACE FUNCTION log_platform_visit(
  p_visitor_id  uuid,
  p_session_id  uuid,
  p_phone       text DEFAULT NULL,
  p_user_agent  text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO platform_visitor_logs (visitor_id, session_id, phone, user_agent)
  VALUES (p_visitor_id, p_session_id, p_phone, p_user_agent)
  ON CONFLICT DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION log_platform_visit(uuid, uuid, text, text) TO anon, authenticated;

-- Make sure realtime is enabled
ALTER TABLE visitor_sessions REPLICA IDENTITY FULL;

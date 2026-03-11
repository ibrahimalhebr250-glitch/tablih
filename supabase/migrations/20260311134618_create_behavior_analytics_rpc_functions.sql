/*
  # Behavior Analytics RPC Functions

  Creates a suite of RPC functions to power the behavior analytics tab:
  - admin_get_behavior_summary: key metrics summary
  - admin_get_top_pages: top visited pages with session counts
  - admin_get_hourly_activity: events per hour for last 24h
  - admin_get_live_behavior_feed: latest 50 events (live feed)
  - admin_get_page_flow: page-to-page navigation flow
  - admin_get_session_depth: pages per session distribution
*/

-- 1. Summary metrics
CREATE OR REPLACE FUNCTION admin_get_behavior_summary(days_back integer DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_events',         COUNT(*),
    'total_sessions',       COUNT(DISTINCT session_id),
    'total_page_views',     COUNT(*) FILTER (WHERE event_type = 'page_view'),
    'events_today',         COUNT(*) FILTER (WHERE created_at >= date_trunc('day', now())),
    'events_last_hour',     COUNT(*) FILTER (WHERE created_at >= now() - interval '1 hour'),
    'events_last_5min',     COUNT(*) FILTER (WHERE created_at >= now() - interval '5 minutes'),
    'avg_pages_per_session',
      ROUND(
        COUNT(*) FILTER (WHERE event_type = 'page_view')::numeric
        / NULLIF(COUNT(DISTINCT session_id), 0), 1
      ),
    'peak_hour_today',
      (SELECT EXTRACT(HOUR FROM created_at)::int
       FROM user_behavior_tracking
       WHERE created_at >= date_trunc('day', now())
       GROUP BY EXTRACT(HOUR FROM created_at)
       ORDER BY COUNT(*) DESC LIMIT 1),
    'period_days', days_back
  )
  INTO result
  FROM user_behavior_tracking
  WHERE created_at >= now() - (days_back || ' days')::interval;

  RETURN result;
END;
$$;
GRANT EXECUTE ON FUNCTION admin_get_behavior_summary(integer) TO anon, authenticated;

-- 2. Top pages
CREATE OR REPLACE FUNCTION admin_get_top_pages(days_back integer DEFAULT 7, lim integer DEFAULT 15)
RETURNS TABLE (
  page_path     text,
  page_title    text,
  views         bigint,
  unique_sessions bigint,
  pct           numeric
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE total_views bigint;
BEGIN
  SELECT COUNT(*) INTO total_views
  FROM user_behavior_tracking
  WHERE event_type = 'page_view'
    AND created_at >= now() - (days_back || ' days')::interval;

  RETURN QUERY
  SELECT
    COALESCE(event_data->>'path', 'unknown') AS page_path,
    COALESCE(event_data->>'title', '') AS page_title,
    COUNT(*) AS views,
    COUNT(DISTINCT session_id) AS unique_sessions,
    ROUND(COUNT(*) * 100.0 / NULLIF(total_views, 0), 1) AS pct
  FROM user_behavior_tracking
  WHERE event_type = 'page_view'
    AND created_at >= now() - (days_back || ' days')::interval
  GROUP BY event_data->>'path', event_data->>'title'
  ORDER BY views DESC
  LIMIT lim;
END;
$$;
GRANT EXECUTE ON FUNCTION admin_get_top_pages(integer, integer) TO anon, authenticated;

-- 3. Hourly activity (last 24h, one row per hour)
CREATE OR REPLACE FUNCTION admin_get_hourly_activity()
RETURNS TABLE (
  hour_label  text,
  hour_num    integer,
  events      bigint,
  sessions    bigint
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH hours AS (
    SELECT generate_series(
      date_trunc('hour', now()) - interval '23 hours',
      date_trunc('hour', now()),
      interval '1 hour'
    ) AS h
  )
  SELECT
    TO_CHAR(h, 'HH24') || ':00' AS hour_label,
    EXTRACT(HOUR FROM h)::integer AS hour_num,
    COALESCE(COUNT(b.id), 0) AS events,
    COALESCE(COUNT(DISTINCT b.session_id), 0) AS sessions
  FROM hours
  LEFT JOIN user_behavior_tracking b
    ON date_trunc('hour', b.created_at) = h
    AND b.created_at >= now() - interval '24 hours'
  GROUP BY h
  ORDER BY h;
END;
$$;
GRANT EXECUTE ON FUNCTION admin_get_hourly_activity() TO anon, authenticated;

-- 4. Live behavior feed (latest events)
CREATE OR REPLACE FUNCTION admin_get_live_behavior_feed(lim integer DEFAULT 50)
RETURNS TABLE (
  id          uuid,
  event_type  text,
  page_path   text,
  page_title  text,
  session_id  text,
  user_phone  text,
  created_at  timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.event_type,
    COALESCE(b.event_data->>'path', '') AS page_path,
    COALESCE(b.event_data->>'title', '') AS page_title,
    b.session_id,
    b.user_phone,
    b.created_at
  FROM user_behavior_tracking b
  ORDER BY b.created_at DESC
  LIMIT lim;
END;
$$;
GRANT EXECUTE ON FUNCTION admin_get_live_behavior_feed(integer) TO anon, authenticated;

-- 5. Session depth distribution
CREATE OR REPLACE FUNCTION admin_get_session_depth(days_back integer DEFAULT 7)
RETURNS TABLE (
  depth_range text,
  session_count bigint,
  pct numeric
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE total_sessions bigint;
BEGIN
  SELECT COUNT(DISTINCT session_id) INTO total_sessions
  FROM user_behavior_tracking
  WHERE created_at >= now() - (days_back || ' days')::interval;

  RETURN QUERY
  WITH session_pages AS (
    SELECT session_id, COUNT(*) FILTER (WHERE event_type = 'page_view') AS pages
    FROM user_behavior_tracking
    WHERE created_at >= now() - (days_back || ' days')::interval
    GROUP BY session_id
  ),
  buckets AS (
    SELECT
      CASE
        WHEN pages = 1 THEN '1 صفحة'
        WHEN pages BETWEEN 2 AND 3 THEN '2-3 صفحات'
        WHEN pages BETWEEN 4 AND 6 THEN '4-6 صفحات'
        WHEN pages BETWEEN 7 AND 10 THEN '7-10 صفحات'
        ELSE '10+ صفحات'
      END AS depth_range,
      CASE
        WHEN pages = 1 THEN 1
        WHEN pages BETWEEN 2 AND 3 THEN 2
        WHEN pages BETWEEN 4 AND 6 THEN 3
        WHEN pages BETWEEN 7 AND 10 THEN 4
        ELSE 5
      END AS sort_order,
      COUNT(*) AS cnt
    FROM session_pages
    GROUP BY depth_range, sort_order
  )
  SELECT
    b.depth_range,
    b.cnt AS session_count,
    ROUND(b.cnt * 100.0 / NULLIF(total_sessions, 0), 1) AS pct
  FROM buckets b
  ORDER BY b.sort_order;
END;
$$;
GRANT EXECUTE ON FUNCTION admin_get_session_depth(integer) TO anon, authenticated;

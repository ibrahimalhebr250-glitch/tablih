/*
  # Fix Admin Ratings Functions to Work with Email Parameter
  
  1. Overview
    - Drop old admin_get_all_ratings completely
    - Create new version with p_caller_email parameter
    - Updates admin_get_ratings_analytics to accept email parameter
*/

-- Drop ALL versions of admin_get_all_ratings
DROP FUNCTION IF EXISTS admin_get_all_ratings(text, text, text, text, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS admin_get_all_ratings(text, text, text, text, text, integer, integer) CASCADE;

-- Drop admin_get_ratings_analytics
DROP FUNCTION IF EXISTS admin_get_ratings_analytics() CASCADE;
DROP FUNCTION IF EXISTS admin_get_ratings_analytics(text) CASCADE;

-- Create admin_get_all_ratings with email parameter
CREATE OR REPLACE FUNCTION admin_get_all_ratings(
  p_caller_email text,
  p_filter_type text DEFAULT 'all',
  p_filter_status text DEFAULT 'all',
  p_rating_type text DEFAULT 'all',
  p_search_phone text DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  rating_id uuid,
  deal_id uuid,
  deal_ref text,
  rater_phone text,
  rater_name text,
  rated_phone text,
  rated_name text,
  rating_value integer,
  comment_text text,
  rating_type text,
  item_type text,
  is_confirmed boolean,
  admin_reviewed_by text,
  admin_reviewed_at timestamptz,
  created_at timestamptz,
  has_comment boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate admin
  IF NOT EXISTS (
    SELECT 1 FROM admin_staff 
    WHERE email = p_caller_email 
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'غير مصرح - مسموح للإدارة فقط';
  END IF;

  RETURN QUERY
  SELECT 
    r.id as rating_id,
    r.deal_id,
    d.deal_ref,
    r.rater_phone,
    COALESCE(u1.display_name, r.rater_phone) as rater_name,
    r.rated_phone,
    COALESCE(u2.display_name, r.rated_phone) as rated_name,
    r.rating as rating_value,
    r.comment as comment_text,
    COALESCE(r.rating_type, 'deal') as rating_type,
    r.item_type,
    COALESCE(r.is_confirmed, false) as is_confirmed,
    r.admin_reviewed_by,
    r.admin_reviewed_at,
    r.created_at,
    EXISTS(SELECT 1 FROM ratings_comments WHERE rating_id = r.id) as has_comment
  FROM user_ratings r
  LEFT JOIN deals d ON d.id = r.deal_id
  LEFT JOIN platform_users u1 ON u1.phone = r.rater_phone
  LEFT JOIN platform_users u2 ON u2.phone = r.rated_phone
  WHERE 
    (p_filter_type = 'all' OR r.item_type = p_filter_type)
    AND (p_filter_status = 'all' OR 
      (p_filter_status = 'confirmed' AND COALESCE(r.is_confirmed, false) = true) OR
      (p_filter_status = 'pending' AND COALESCE(r.is_confirmed, false) = false))
    AND (p_rating_type = 'all' OR COALESCE(r.rating_type, 'deal') = p_rating_type)
    AND (p_search_phone IS NULL OR 
      r.rater_phone LIKE '%' || p_search_phone || '%' OR
      r.rated_phone LIKE '%' || p_search_phone || '%')
  ORDER BY r.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Create admin_get_ratings_analytics with email parameter
CREATE OR REPLACE FUNCTION admin_get_ratings_analytics(
  p_caller_email text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
  v_total integer;
  v_confirmed integer;
  v_pending integer;
  v_deal_ratings integer;
  v_visitor_ratings integer;
  v_avg_rating numeric;
  v_with_comments integer;
  v_today integer;
  v_week integer;
  v_month integer;
BEGIN
  -- Validate admin
  IF NOT EXISTS (
    SELECT 1 FROM admin_staff 
    WHERE email = p_caller_email 
      AND is_active = true
  ) THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  -- Get counts
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE is_confirmed = true),
    COUNT(*) FILTER (WHERE is_confirmed = false),
    COUNT(*) FILTER (WHERE rating_type = 'deal'),
    COUNT(*) FILTER (WHERE rating_type = 'visitor'),
    COALESCE(AVG(rating), 0),
    COUNT(*) FILTER (WHERE comment IS NOT NULL AND comment != ''),
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE),
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'),
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days')
  INTO v_total, v_confirmed, v_pending, v_deal_ratings, v_visitor_ratings, 
       v_avg_rating, v_with_comments, v_today, v_week, v_month
  FROM user_ratings;

  -- Build result
  v_result := json_build_object(
    'success', true,
    'analytics', json_build_object(
      'total_ratings', v_total,
      'confirmed_ratings', v_confirmed,
      'pending_ratings', v_pending,
      'deal_ratings', v_deal_ratings,
      'visitor_ratings', v_visitor_ratings,
      'average_rating', ROUND(v_avg_rating, 1),
      'ratings_with_comments', v_with_comments,
      'ratings_today', v_today,
      'ratings_this_week', v_week,
      'ratings_this_month', v_month,
      'rating_distribution', (
        SELECT json_object_agg(rating::text, count)
        FROM (
          SELECT rating, COUNT(*) as count
          FROM user_ratings
          GROUP BY rating
        ) dist
      ),
      'top_rated_users', (
        SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
        FROM (
          SELECT 
            u.phone,
            u.display_name,
            u.trust_rating,
            COUNT(r.id) as rating_count,
            ROUND(AVG(r.rating), 1) as avg_rating
          FROM platform_users u
          INNER JOIN user_ratings r ON r.rated_phone = u.phone
          GROUP BY u.phone, u.display_name, u.trust_rating
          HAVING COUNT(r.id) >= 1
          ORDER BY AVG(r.rating) DESC, COUNT(r.id) DESC
          LIMIT 10
        ) t
      )
    )
  );

  RETURN v_result;
END;
$$;

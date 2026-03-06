/*
  # Fix Admin Ratings and Comments JWT Handling

  ## Changes
  1. Update all admin functions to handle JWT properly
  2. Add better error handling for missing JWT claims
  3. Ensure functions work with current_setting properly
  4. Add fallback for testing scenarios

  ## Security
  - Maintains admin-only access
  - Better JWT handling
  - Clear error messages
*/

-- Fix admin_get_all_ratings to handle JWT better
CREATE OR REPLACE FUNCTION admin_get_all_ratings(
  p_filter_type text DEFAULT 'all',
  p_filter_status text DEFAULT 'all',
  p_search_phone text DEFAULT NULL,
  p_rating_type text DEFAULT 'all',
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
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
DECLARE
  v_is_admin boolean;
  v_caller_phone text;
BEGIN
  BEGIN
    v_caller_phone := nullif(current_setting('request.jwt.claims', true)::json->>'phone', '');
  EXCEPTION WHEN OTHERS THEN
    v_caller_phone := NULL;
  END;

  IF v_caller_phone IS NULL THEN
    RAISE EXCEPTION 'غير مصرح - يجب تسجيل الدخول';
  END IF;
  
  SELECT user_type = 'admin' INTO v_is_admin
  FROM platform_users WHERE phone = v_caller_phone;

  IF NOT COALESCE(v_is_admin, false) THEN
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

-- Fix admin_get_all_comments to handle JWT better
CREATE OR REPLACE FUNCTION admin_get_all_comments(
  p_filter_status text DEFAULT 'all',
  p_search_text text DEFAULT NULL,
  p_search_phone text DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  comment_id uuid,
  rating_id uuid,
  deal_id uuid,
  deal_ref text,
  commenter_phone text,
  commenter_name text,
  rated_phone text,
  rated_name text,
  comment_text text,
  is_visible boolean,
  moderation_status text,
  flagged_reason text,
  moderated_by text,
  moderated_at timestamptz,
  created_at timestamptz,
  rating_value integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin boolean;
  v_caller_phone text;
BEGIN
  BEGIN
    v_caller_phone := nullif(current_setting('request.jwt.claims', true)::json->>'phone', '');
  EXCEPTION WHEN OTHERS THEN
    v_caller_phone := NULL;
  END;

  IF v_caller_phone IS NULL THEN
    RAISE EXCEPTION 'غير مصرح - يجب تسجيل الدخول';
  END IF;
  
  SELECT user_type = 'admin' INTO v_is_admin
  FROM platform_users WHERE phone = v_caller_phone;

  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'غير مصرح - مسموح للإدارة فقط';
  END IF;

  RETURN QUERY
  SELECT 
    rc.id as comment_id,
    rc.rating_id,
    r.deal_id,
    d.deal_ref,
    rc.commenter_phone,
    COALESCE(u1.display_name, rc.commenter_phone) as commenter_name,
    r.rated_phone,
    COALESCE(u2.display_name, r.rated_phone) as rated_name,
    rc.comment_text,
    COALESCE(rc.is_visible, true) as is_visible,
    COALESCE(rc.moderation_status, 'pending') as moderation_status,
    rc.flagged_reason,
    rc.moderated_by,
    rc.moderated_at,
    rc.created_at,
    r.rating as rating_value
  FROM ratings_comments rc
  JOIN user_ratings r ON r.id = rc.rating_id
  LEFT JOIN deals d ON d.id = r.deal_id
  LEFT JOIN platform_users u1 ON u1.phone = rc.commenter_phone
  LEFT JOIN platform_users u2 ON u2.phone = r.rated_phone
  WHERE 
    (p_filter_status = 'all' OR COALESCE(rc.moderation_status, 'pending') = p_filter_status)
    AND (p_search_text IS NULL OR rc.comment_text ILIKE '%' || p_search_text || '%')
    AND (p_search_phone IS NULL OR 
      rc.commenter_phone LIKE '%' || p_search_phone || '%' OR
      r.rated_phone LIKE '%' || p_search_phone || '%')
  ORDER BY rc.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Fix admin_get_ratings_analytics
CREATE OR REPLACE FUNCTION admin_get_ratings_analytics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin boolean;
  v_caller_phone text;
  v_result json;
BEGIN
  BEGIN
    v_caller_phone := nullif(current_setting('request.jwt.claims', true)::json->>'phone', '');
  EXCEPTION WHEN OTHERS THEN
    v_caller_phone := NULL;
  END;

  IF v_caller_phone IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح - يجب تسجيل الدخول');
  END IF;
  
  SELECT user_type = 'admin' INTO v_is_admin
  FROM platform_users WHERE phone = v_caller_phone;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح - مسموح للإدارة فقط');
  END IF;

  SELECT json_build_object(
    'success', true,
    'analytics', json_build_object(
      'total_ratings', (SELECT COUNT(*) FROM user_ratings),
      'confirmed_ratings', (SELECT COUNT(*) FROM user_ratings WHERE COALESCE(is_confirmed, false) = true),
      'pending_ratings', (SELECT COUNT(*) FROM user_ratings WHERE COALESCE(is_confirmed, false) = false),
      'deal_ratings', (SELECT COUNT(*) FROM user_ratings WHERE COALESCE(rating_type, 'deal') = 'deal'),
      'visitor_ratings', (SELECT COUNT(*) FROM user_ratings WHERE COALESCE(rating_type, 'deal') = 'visitor'),
      'average_rating', COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM user_ratings WHERE COALESCE(is_confirmed, false) = true), 0),
      'ratings_with_comments', (SELECT COUNT(*) FROM user_ratings WHERE comment IS NOT NULL AND char_length(trim(comment)) > 0),
      'ratings_today', (SELECT COUNT(*) FROM user_ratings WHERE created_at >= CURRENT_DATE),
      'ratings_this_week', (SELECT COUNT(*) FROM user_ratings WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'),
      'ratings_this_month', (SELECT COUNT(*) FROM user_ratings WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'),
      'rating_distribution', (
        SELECT COALESCE(json_object_agg(rating, count), '{}'::json)
        FROM (
          SELECT rating, COUNT(*) as count
          FROM user_ratings
          WHERE COALESCE(is_confirmed, false) = true
          GROUP BY rating
          ORDER BY rating
        ) dist
      ),
      'top_rated_users', COALESCE((
        SELECT json_agg(row_to_json(t))
        FROM (
          SELECT 
            u.phone,
            u.display_name,
            COALESCE(u.trust_rating, 0) as trust_rating,
            COUNT(r.id) as rating_count,
            ROUND(AVG(r.rating)::numeric, 2) as avg_rating
          FROM platform_users u
          JOIN user_ratings r ON r.rated_phone = u.phone
          WHERE COALESCE(r.is_confirmed, false) = true
          GROUP BY u.phone, u.display_name, u.trust_rating
          HAVING COUNT(r.id) >= 1
          ORDER BY avg_rating DESC, rating_count DESC
          LIMIT 10
        ) t
      ), '[]'::json)
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Fix admin_get_comments_analytics
CREATE OR REPLACE FUNCTION admin_get_comments_analytics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin boolean;
  v_caller_phone text;
  v_result json;
BEGIN
  BEGIN
    v_caller_phone := nullif(current_setting('request.jwt.claims', true)::json->>'phone', '');
  EXCEPTION WHEN OTHERS THEN
    v_caller_phone := NULL;
  END;

  IF v_caller_phone IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح - يجب تسجيل الدخول');
  END IF;
  
  SELECT user_type = 'admin' INTO v_is_admin
  FROM platform_users WHERE phone = v_caller_phone;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح - مسموح للإدارة فقط');
  END IF;

  SELECT json_build_object(
    'success', true,
    'analytics', json_build_object(
      'total_comments', (SELECT COUNT(*) FROM ratings_comments),
      'approved_comments', (SELECT COUNT(*) FROM ratings_comments WHERE COALESCE(moderation_status, 'pending') = 'approved'),
      'pending_comments', (SELECT COUNT(*) FROM ratings_comments WHERE COALESCE(moderation_status, 'pending') = 'pending'),
      'flagged_comments', (SELECT COUNT(*) FROM ratings_comments WHERE COALESCE(moderation_status, 'pending') = 'flagged'),
      'rejected_comments', (SELECT COUNT(*) FROM ratings_comments WHERE COALESCE(moderation_status, 'pending') = 'rejected'),
      'visible_comments', (SELECT COUNT(*) FROM ratings_comments WHERE COALESCE(is_visible, true) = true),
      'hidden_comments', (SELECT COUNT(*) FROM ratings_comments WHERE COALESCE(is_visible, true) = false),
      'comments_today', (SELECT COUNT(*) FROM ratings_comments WHERE created_at >= CURRENT_DATE),
      'comments_this_week', (SELECT COUNT(*) FROM ratings_comments WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'),
      'comments_this_month', (SELECT COUNT(*) FROM ratings_comments WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'),
      'avg_comment_length', COALESCE((SELECT ROUND(AVG(char_length(comment_text))) FROM ratings_comments), 0),
      'moderation_status_distribution', (
        SELECT COALESCE(json_object_agg(moderation_status, count), '{}'::json)
        FROM (
          SELECT COALESCE(moderation_status, 'pending') as moderation_status, COUNT(*) as count
          FROM ratings_comments
          GROUP BY COALESCE(moderation_status, 'pending')
        ) dist
      ),
      'most_active_commenters', COALESCE((
        SELECT json_agg(row_to_json(t))
        FROM (
          SELECT 
            u.phone,
            u.display_name,
            COUNT(rc.id) as comment_count,
            COUNT(CASE WHEN COALESCE(rc.moderation_status, 'pending') = 'approved' THEN 1 END) as approved_count,
            COUNT(CASE WHEN COALESCE(rc.moderation_status, 'pending') = 'rejected' THEN 1 END) as rejected_count
          FROM platform_users u
          JOIN ratings_comments rc ON rc.commenter_phone = u.phone
          GROUP BY u.phone, u.display_name
          ORDER BY comment_count DESC
          LIMIT 10
        ) t
      ), '[]'::json)
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;
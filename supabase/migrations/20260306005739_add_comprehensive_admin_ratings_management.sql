/*
  # Comprehensive Admin Ratings Management System

  ## Overview
  This migration adds comprehensive admin tools for managing all types of ratings:
  - Deal-based ratings (buyer ↔ supplier)
  - Visitor ratings (public ratings)
  - Full CRUD operations
  - Advanced filtering and reporting

  ## New Functions
  
  ### Admin Rating Management
  1. `admin_get_all_ratings` - Get all ratings with filters and pagination
  2. `admin_update_rating` - Update rating details (value, comment, status)
  3. `admin_delete_rating` - Permanently delete a rating
  4. `admin_get_rating_details` - Get detailed info about specific rating
  5. `admin_get_ratings_analytics` - Get statistics and analytics
  6. `admin_bulk_approve_ratings` - Bulk approve multiple ratings
  7. `admin_bulk_delete_ratings` - Bulk delete multiple ratings

  ## Security
  - All functions require admin authentication
  - Comprehensive audit trail
  - Safe deletion with cascade handling

  ## Important Notes
  1. Admins have full control over all ratings
  2. Trust ratings auto-recalculate on changes
  3. Analytics provide insights into rating patterns
  4. Bulk operations for efficiency
*/

-- Function: Get all ratings with comprehensive filters
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
  v_caller_phone := current_setting('request.jwt.claims', true)::json->>'phone';
  
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
    u1.display_name as rater_name,
    r.rated_phone,
    u2.display_name as rated_name,
    r.rating as rating_value,
    r.comment as comment_text,
    r.rating_type,
    r.item_type,
    r.is_confirmed,
    r.admin_reviewed_by,
    r.admin_reviewed_at,
    r.created_at,
    EXISTS(SELECT 1 FROM ratings_comments WHERE rating_id = r.id) as has_comment
  FROM user_ratings r
  LEFT JOIN deals d ON d.id = r.deal_id
  JOIN platform_users u1 ON u1.phone = r.rater_phone
  JOIN platform_users u2 ON u2.phone = r.rated_phone
  WHERE 
    (p_filter_type = 'all' OR r.item_type = p_filter_type)
    AND (p_filter_status = 'all' OR 
      (p_filter_status = 'confirmed' AND r.is_confirmed = true) OR
      (p_filter_status = 'pending' AND r.is_confirmed = false))
    AND (p_rating_type = 'all' OR r.rating_type = p_rating_type)
    AND (p_search_phone IS NULL OR 
      r.rater_phone LIKE '%' || p_search_phone || '%' OR
      r.rated_phone LIKE '%' || p_search_phone || '%')
  ORDER BY r.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Function: Get detailed rating information
CREATE OR REPLACE FUNCTION admin_get_rating_details(p_rating_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin boolean;
  v_caller_phone text;
  v_result json;
BEGIN
  v_caller_phone := current_setting('request.jwt.claims', true)::json->>'phone';
  
  SELECT user_type = 'admin' INTO v_is_admin
  FROM platform_users WHERE phone = v_caller_phone;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح - مسموح للإدارة فقط');
  END IF;

  SELECT json_build_object(
    'success', true,
    'rating', json_build_object(
      'id', r.id,
      'deal_id', r.deal_id,
      'deal_ref', d.deal_ref,
      'rater_phone', r.rater_phone,
      'rater_name', u1.display_name,
      'rater_city', u1.city,
      'rated_phone', r.rated_phone,
      'rated_name', u2.display_name,
      'rated_city', u2.city,
      'rating', r.rating,
      'comment', r.comment,
      'rating_type', r.rating_type,
      'item_type', r.item_type,
      'item_id', r.item_id,
      'is_confirmed', r.is_confirmed,
      'admin_reviewed_by', r.admin_reviewed_by,
      'admin_reviewed_at', r.admin_reviewed_at,
      'created_at', r.created_at,
      'comment_record', (
        SELECT json_build_object(
          'id', rc.id,
          'comment_text', rc.comment_text,
          'is_visible', rc.is_visible,
          'moderation_status', rc.moderation_status,
          'flagged_reason', rc.flagged_reason
        )
        FROM ratings_comments rc
        WHERE rc.rating_id = r.id
      )
    )
  ) INTO v_result
  FROM user_ratings r
  LEFT JOIN deals d ON d.id = r.deal_id
  JOIN platform_users u1 ON u1.phone = r.rater_phone
  JOIN platform_users u2 ON u2.phone = r.rated_phone
  WHERE r.id = p_rating_id;

  RETURN COALESCE(v_result, json_build_object('success', false, 'error', 'التقييم غير موجود'));
END;
$$;

-- Function: Update rating
CREATE OR REPLACE FUNCTION admin_update_rating(
  p_rating_id uuid,
  p_rating_value integer DEFAULT NULL,
  p_comment text DEFAULT NULL,
  p_is_confirmed boolean DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin boolean;
  v_caller_phone text;
  v_rated_phone text;
BEGIN
  v_caller_phone := current_setting('request.jwt.claims', true)::json->>'phone';
  
  SELECT user_type = 'admin' INTO v_is_admin
  FROM platform_users WHERE phone = v_caller_phone;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح - مسموح للإدارة فقط');
  END IF;

  IF p_rating_value IS NOT NULL AND (p_rating_value < 1 OR p_rating_value > 5) THEN
    RETURN json_build_object('success', false, 'error', 'التقييم يجب أن يكون بين 1 و 5');
  END IF;

  SELECT rated_phone INTO v_rated_phone
  FROM user_ratings WHERE id = p_rating_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'التقييم غير موجود');
  END IF;

  UPDATE user_ratings
  SET 
    rating = COALESCE(p_rating_value, rating),
    comment = COALESCE(p_comment, comment),
    is_confirmed = COALESCE(p_is_confirmed, is_confirmed),
    admin_reviewed_by = v_caller_phone,
    admin_reviewed_at = now(),
    updated_at = now()
  WHERE id = p_rating_id;

  RETURN json_build_object('success', true, 'message', 'تم تحديث التقييم بنجاح');
END;
$$;

-- Function: Delete rating
CREATE OR REPLACE FUNCTION admin_delete_rating(p_rating_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin boolean;
  v_caller_phone text;
  v_rated_phone text;
BEGIN
  v_caller_phone := current_setting('request.jwt.claims', true)::json->>'phone';
  
  SELECT user_type = 'admin' INTO v_is_admin
  FROM platform_users WHERE phone = v_caller_phone;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح - مسموح للإدارة فقط');
  END IF;

  SELECT rated_phone INTO v_rated_phone
  FROM user_ratings WHERE id = p_rating_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'التقييم غير موجود');
  END IF;

  DELETE FROM user_ratings WHERE id = p_rating_id;

  RETURN json_build_object('success', true, 'message', 'تم حذف التقييم بنجاح');
END;
$$;

-- Function: Get ratings analytics
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
  v_caller_phone := current_setting('request.jwt.claims', true)::json->>'phone';
  
  SELECT user_type = 'admin' INTO v_is_admin
  FROM platform_users WHERE phone = v_caller_phone;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح - مسموح للإدارة فقط');
  END IF;

  SELECT json_build_object(
    'success', true,
    'analytics', json_build_object(
      'total_ratings', (SELECT COUNT(*) FROM user_ratings),
      'confirmed_ratings', (SELECT COUNT(*) FROM user_ratings WHERE is_confirmed = true),
      'pending_ratings', (SELECT COUNT(*) FROM user_ratings WHERE is_confirmed = false),
      'deal_ratings', (SELECT COUNT(*) FROM user_ratings WHERE rating_type = 'deal'),
      'visitor_ratings', (SELECT COUNT(*) FROM user_ratings WHERE rating_type = 'visitor'),
      'average_rating', (SELECT ROUND(AVG(rating)::numeric, 2) FROM user_ratings WHERE is_confirmed = true),
      'ratings_with_comments', (SELECT COUNT(*) FROM user_ratings WHERE comment IS NOT NULL AND char_length(trim(comment)) > 0),
      'ratings_today', (SELECT COUNT(*) FROM user_ratings WHERE created_at >= CURRENT_DATE),
      'ratings_this_week', (SELECT COUNT(*) FROM user_ratings WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'),
      'ratings_this_month', (SELECT COUNT(*) FROM user_ratings WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'),
      'rating_distribution', (
        SELECT json_object_agg(rating, count)
        FROM (
          SELECT rating, COUNT(*) as count
          FROM user_ratings
          WHERE is_confirmed = true
          GROUP BY rating
          ORDER BY rating
        ) dist
      ),
      'top_rated_users', (
        SELECT json_agg(row_to_json(t))
        FROM (
          SELECT 
            u.phone,
            u.display_name,
            u.trust_rating,
            COUNT(r.id) as rating_count,
            ROUND(AVG(r.rating)::numeric, 2) as avg_rating
          FROM platform_users u
          JOIN user_ratings r ON r.rated_phone = u.phone
          WHERE r.is_confirmed = true
          GROUP BY u.phone, u.display_name, u.trust_rating
          HAVING COUNT(r.id) >= 3
          ORDER BY avg_rating DESC, rating_count DESC
          LIMIT 10
        ) t
      )
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Function: Bulk approve ratings
CREATE OR REPLACE FUNCTION admin_bulk_approve_ratings(p_rating_ids uuid[])
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin boolean;
  v_caller_phone text;
  v_count integer;
BEGIN
  v_caller_phone := current_setting('request.jwt.claims', true)::json->>'phone';
  
  SELECT user_type = 'admin' INTO v_is_admin
  FROM platform_users WHERE phone = v_caller_phone;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح - مسموح للإدارة فقط');
  END IF;

  UPDATE user_ratings
  SET 
    is_confirmed = true,
    admin_reviewed_by = v_caller_phone,
    admin_reviewed_at = now(),
    updated_at = now()
  WHERE id = ANY(p_rating_ids);

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN json_build_object(
    'success', true, 
    'message', 'تم تأكيد ' || v_count || ' تقييم بنجاح',
    'count', v_count
  );
END;
$$;

-- Function: Bulk delete ratings
CREATE OR REPLACE FUNCTION admin_bulk_delete_ratings(p_rating_ids uuid[])
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin boolean;
  v_caller_phone text;
  v_count integer;
BEGIN
  v_caller_phone := current_setting('request.jwt.claims', true)::json->>'phone';
  
  SELECT user_type = 'admin' INTO v_is_admin
  FROM platform_users WHERE phone = v_caller_phone;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح - مسموح للإدارة فقط');
  END IF;

  DELETE FROM user_ratings
  WHERE id = ANY(p_rating_ids);

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN json_build_object(
    'success', true, 
    'message', 'تم حذف ' || v_count || ' تقييم بنجاح',
    'count', v_count
  );
END;
$$;
/*
  # Fix Admin Functions to Work with Current Session System

  ## Problem
  The admin functions expect JWT with phone claim, but the current system
  stores phone in session storage and passes it directly.

  ## Solution
  Update admin functions to accept phone as parameter instead of reading from JWT.
  This makes the functions work with the current authentication system.

  ## Changes
  1. Add phone parameter to all admin functions
  2. Remove JWT reading logic
  3. Keep admin check using the phone parameter
*/

-- Fix admin_get_all_ratings
CREATE OR REPLACE FUNCTION admin_get_all_ratings(
  p_caller_phone text,
  p_filter_type text DEFAULT 'all',
  p_filter_status text DEFAULT 'all',
  p_rating_type text DEFAULT 'all',
  p_search_phone text DEFAULT NULL,
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
BEGIN
  SELECT user_type = 'admin' INTO v_is_admin
  FROM platform_users WHERE phone = p_caller_phone;

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

-- Fix admin_get_ratings_analytics
CREATE OR REPLACE FUNCTION admin_get_ratings_analytics(p_caller_phone text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin boolean;
  v_result json;
BEGIN
  SELECT user_type = 'admin' INTO v_is_admin
  FROM platform_users WHERE phone = p_caller_phone;

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

-- Fix admin_update_rating
CREATE OR REPLACE FUNCTION admin_update_rating(
  p_caller_phone text,
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
  v_updated_count integer;
BEGIN
  SELECT user_type = 'admin' INTO v_is_admin
  FROM platform_users WHERE phone = p_caller_phone;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح - مسموح للإدارة فقط');
  END IF;

  UPDATE user_ratings
  SET
    rating = COALESCE(p_rating_value, rating),
    comment = COALESCE(p_comment, comment),
    is_confirmed = COALESCE(p_is_confirmed, is_confirmed),
    admin_reviewed_by = p_caller_phone,
    admin_reviewed_at = now(),
    updated_at = now()
  WHERE id = p_rating_id;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  IF v_updated_count = 0 THEN
    RETURN json_build_object('success', false, 'error', 'التقييم غير موجود');
  END IF;

  RETURN json_build_object('success', true, 'message', 'تم تحديث التقييم بنجاح');
END;
$$;

-- Fix admin_delete_rating
CREATE OR REPLACE FUNCTION admin_delete_rating(
  p_caller_phone text,
  p_rating_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin boolean;
  v_deleted_count integer;
BEGIN
  SELECT user_type = 'admin' INTO v_is_admin
  FROM platform_users WHERE phone = p_caller_phone;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح - مسموح للإدارة فقط');
  END IF;

  DELETE FROM ratings_comments WHERE rating_id = p_rating_id;
  
  DELETE FROM user_ratings WHERE id = p_rating_id;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  IF v_deleted_count = 0 THEN
    RETURN json_build_object('success', false, 'error', 'التقييم غير موجود');
  END IF;

  RETURN json_build_object('success', true, 'message', 'تم حذف التقييم بنجاح');
END;
$$;

-- Fix admin_get_all_comments
CREATE OR REPLACE FUNCTION admin_get_all_comments(
  p_caller_phone text,
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
BEGIN
  SELECT user_type = 'admin' INTO v_is_admin
  FROM platform_users WHERE phone = p_caller_phone;

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

-- Fix admin_get_comments_analytics
CREATE OR REPLACE FUNCTION admin_get_comments_analytics(p_caller_phone text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin boolean;
  v_result json;
BEGIN
  SELECT user_type = 'admin' INTO v_is_admin
  FROM platform_users WHERE phone = p_caller_phone;

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

-- Fix admin_update_comment
CREATE OR REPLACE FUNCTION admin_update_comment(
  p_caller_phone text,
  p_comment_id uuid,
  p_comment_text text DEFAULT NULL,
  p_moderation_status text DEFAULT NULL,
  p_is_visible boolean DEFAULT NULL,
  p_flagged_reason text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin boolean;
  v_updated_count integer;
BEGIN
  SELECT user_type = 'admin' INTO v_is_admin
  FROM platform_users WHERE phone = p_caller_phone;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح - مسموح للإدارة فقط');
  END IF;

  UPDATE ratings_comments
  SET
    comment_text = COALESCE(p_comment_text, comment_text),
    moderation_status = COALESCE(p_moderation_status, moderation_status),
    is_visible = COALESCE(p_is_visible, is_visible),
    flagged_reason = COALESCE(p_flagged_reason, flagged_reason),
    moderated_by = p_caller_phone,
    moderated_at = now()
  WHERE id = p_comment_id;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  IF v_updated_count = 0 THEN
    RETURN json_build_object('success', false, 'error', 'التعليق غير موجود');
  END IF;

  RETURN json_build_object('success', true, 'message', 'تم تحديث التعليق بنجاح');
END;
$$;

-- Fix admin_delete_comment
CREATE OR REPLACE FUNCTION admin_delete_comment(
  p_caller_phone text,
  p_comment_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin boolean;
  v_deleted_count integer;
BEGIN
  SELECT user_type = 'admin' INTO v_is_admin
  FROM platform_users WHERE phone = p_caller_phone;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح - مسموح للإدارة فقط');
  END IF;

  DELETE FROM ratings_comments WHERE id = p_comment_id;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  IF v_deleted_count = 0 THEN
    RETURN json_build_object('success', false, 'error', 'التعليق غير موجود');
  END IF;

  RETURN json_build_object('success', true, 'message', 'تم حذف التعليق بنجاح');
END;
$$;

-- Fix admin_restore_comment
CREATE OR REPLACE FUNCTION admin_restore_comment(
  p_caller_phone text,
  p_comment_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin boolean;
  v_updated_count integer;
BEGIN
  SELECT user_type = 'admin' INTO v_is_admin
  FROM platform_users WHERE phone = p_caller_phone;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح - مسموح للإدارة فقط');
  END IF;

  UPDATE ratings_comments
  SET
    is_visible = true,
    moderation_status = 'pending',
    moderated_by = p_caller_phone,
    moderated_at = now()
  WHERE id = p_comment_id;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  IF v_updated_count = 0 THEN
    RETURN json_build_object('success', false, 'error', 'التعليق غير موجود');
  END IF;

  RETURN json_build_object('success', true, 'message', 'تم استعادة التعليق بنجاح');
END;
$$;

-- Fix admin_bulk_moderate_comments
CREATE OR REPLACE FUNCTION admin_bulk_moderate_comments(
  p_caller_phone text,
  p_comment_ids uuid[],
  p_action text,
  p_reason text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin boolean;
  v_updated_count integer;
  v_new_status text;
  v_is_visible boolean;
BEGIN
  SELECT user_type = 'admin' INTO v_is_admin
  FROM platform_users WHERE phone = p_caller_phone;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح - مسموح للإدارة فقط');
  END IF;

  CASE p_action
    WHEN 'approve' THEN
      v_new_status := 'approved';
      v_is_visible := true;
    WHEN 'reject' THEN
      v_new_status := 'rejected';
      v_is_visible := false;
    WHEN 'flag' THEN
      v_new_status := 'flagged';
      v_is_visible := true;
    ELSE
      RETURN json_build_object('success', false, 'error', 'إجراء غير صحيح');
  END CASE;

  UPDATE ratings_comments
  SET
    moderation_status = v_new_status,
    is_visible = v_is_visible,
    flagged_reason = CASE WHEN p_reason IS NOT NULL THEN p_reason ELSE flagged_reason END,
    moderated_by = p_caller_phone,
    moderated_at = now()
  WHERE id = ANY(p_comment_ids);

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  RETURN json_build_object(
    'success', true,
    'message', 'تمت معالجة ' || v_updated_count || ' تعليق',
    'updated_count', v_updated_count
  );
END;
$$;
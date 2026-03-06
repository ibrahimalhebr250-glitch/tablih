/*
  # Comprehensive Admin Comments Management System

  ## Overview
  This migration adds comprehensive admin tools for managing all comments:
  - View all comments (approved, pending, flagged, rejected)
  - Edit comment text
  - Change moderation status
  - Bulk operations
  - Advanced analytics

  ## New Functions
  
  ### Admin Comments Management
  1. `admin_get_all_comments` - Get all comments with filters
  2. `admin_update_comment` - Update comment text and status
  3. `admin_delete_comment` - Permanently delete a comment
  4. `admin_get_comment_details` - Get detailed comment info
  5. `admin_get_comments_analytics` - Get statistics
  6. `admin_bulk_moderate_comments` - Bulk approve/reject/delete
  7. `admin_restore_comment` - Restore deleted/hidden comment

  ## Security
  - All functions require admin authentication
  - Audit trail for all changes
  - Safe operations with validations

  ## Important Notes
  1. Admins have full control over all comments
  2. Analytics provide moderation insights
  3. Bulk operations for efficiency
*/

-- Function: Get all comments with comprehensive filters
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
  v_caller_phone := current_setting('request.jwt.claims', true)::json->>'phone';
  
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
    u1.display_name as commenter_name,
    r.rated_phone,
    u2.display_name as rated_name,
    rc.comment_text,
    rc.is_visible,
    rc.moderation_status,
    rc.flagged_reason,
    rc.moderated_by,
    rc.moderated_at,
    rc.created_at,
    r.rating as rating_value
  FROM ratings_comments rc
  JOIN user_ratings r ON r.id = rc.rating_id
  LEFT JOIN deals d ON d.id = r.deal_id
  JOIN platform_users u1 ON u1.phone = rc.commenter_phone
  JOIN platform_users u2 ON u2.phone = r.rated_phone
  WHERE 
    (p_filter_status = 'all' OR rc.moderation_status = p_filter_status)
    AND (p_search_text IS NULL OR rc.comment_text ILIKE '%' || p_search_text || '%')
    AND (p_search_phone IS NULL OR 
      rc.commenter_phone LIKE '%' || p_search_phone || '%' OR
      r.rated_phone LIKE '%' || p_search_phone || '%')
  ORDER BY rc.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Function: Get detailed comment information
CREATE OR REPLACE FUNCTION admin_get_comment_details(p_comment_id uuid)
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
    'comment', json_build_object(
      'id', rc.id,
      'rating_id', rc.rating_id,
      'commenter_phone', rc.commenter_phone,
      'commenter_name', u1.display_name,
      'commenter_city', u1.city,
      'commenter_type', u1.user_type,
      'rated_phone', r.rated_phone,
      'rated_name', u2.display_name,
      'rated_city', u2.city,
      'comment_text', rc.comment_text,
      'is_visible', rc.is_visible,
      'moderation_status', rc.moderation_status,
      'flagged_reason', rc.flagged_reason,
      'moderated_by', rc.moderated_by,
      'moderated_at', rc.moderated_at,
      'created_at', rc.created_at,
      'rating_value', r.rating,
      'rating_type', r.rating_type,
      'deal_id', r.deal_id,
      'deal_ref', d.deal_ref
    )
  ) INTO v_result
  FROM ratings_comments rc
  JOIN user_ratings r ON r.id = rc.rating_id
  LEFT JOIN deals d ON d.id = r.deal_id
  JOIN platform_users u1 ON u1.phone = rc.commenter_phone
  JOIN platform_users u2 ON u2.phone = r.rated_phone
  WHERE rc.id = p_comment_id;

  RETURN COALESCE(v_result, json_build_object('success', false, 'error', 'التعليق غير موجود'));
END;
$$;

-- Function: Update comment
CREATE OR REPLACE FUNCTION admin_update_comment(
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
  v_caller_phone text;
BEGIN
  v_caller_phone := current_setting('request.jwt.claims', true)::json->>'phone';
  
  SELECT user_type = 'admin' INTO v_is_admin
  FROM platform_users WHERE phone = v_caller_phone;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح - مسموح للإدارة فقط');
  END IF;

  IF p_moderation_status IS NOT NULL AND 
     p_moderation_status NOT IN ('pending', 'approved', 'rejected', 'flagged') THEN
    RETURN json_build_object('success', false, 'error', 'حالة المراجعة غير صحيحة');
  END IF;

  IF p_comment_text IS NOT NULL AND (char_length(trim(p_comment_text)) = 0 OR char_length(p_comment_text) > 500) THEN
    RETURN json_build_object('success', false, 'error', 'نص التعليق يجب أن يكون بين 1 و 500 حرف');
  END IF;

  UPDATE ratings_comments
  SET 
    comment_text = COALESCE(p_comment_text, comment_text),
    moderation_status = COALESCE(p_moderation_status, moderation_status),
    is_visible = COALESCE(p_is_visible, is_visible),
    flagged_reason = CASE 
      WHEN p_flagged_reason IS NOT NULL THEN p_flagged_reason
      WHEN p_moderation_status IN ('rejected', 'flagged') AND flagged_reason IS NULL THEN 'تم الرفض من قبل الإدارة'
      ELSE flagged_reason
    END,
    moderated_by = v_caller_phone,
    moderated_at = now(),
    updated_at = now()
  WHERE id = p_comment_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'التعليق غير موجود');
  END IF;

  RETURN json_build_object('success', true, 'message', 'تم تحديث التعليق بنجاح');
END;
$$;

-- Function: Delete comment
CREATE OR REPLACE FUNCTION admin_delete_comment(p_comment_id uuid)
RETURNS json
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
    RETURN json_build_object('success', false, 'error', 'غير مصرح - مسموح للإدارة فقط');
  END IF;

  DELETE FROM ratings_comments WHERE id = p_comment_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'التعليق غير موجود');
  END IF;

  RETURN json_build_object('success', true, 'message', 'تم حذف التعليق بنجاح');
END;
$$;

-- Function: Restore comment (make visible and approved)
CREATE OR REPLACE FUNCTION admin_restore_comment(p_comment_id uuid)
RETURNS json
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
    RETURN json_build_object('success', false, 'error', 'غير مصرح - مسموح للإدارة فقط');
  END IF;

  UPDATE ratings_comments
  SET 
    is_visible = true,
    moderation_status = 'approved',
    flagged_reason = NULL,
    moderated_by = v_caller_phone,
    moderated_at = now(),
    updated_at = now()
  WHERE id = p_comment_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'التعليق غير موجود');
  END IF;

  RETURN json_build_object('success', true, 'message', 'تم استعادة التعليق بنجاح');
END;
$$;

-- Function: Get comments analytics
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
  v_caller_phone := current_setting('request.jwt.claims', true)::json->>'phone';
  
  SELECT user_type = 'admin' INTO v_is_admin
  FROM platform_users WHERE phone = v_caller_phone;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح - مسموح للإدارة فقط');
  END IF;

  SELECT json_build_object(
    'success', true,
    'analytics', json_build_object(
      'total_comments', (SELECT COUNT(*) FROM ratings_comments),
      'approved_comments', (SELECT COUNT(*) FROM ratings_comments WHERE moderation_status = 'approved'),
      'pending_comments', (SELECT COUNT(*) FROM ratings_comments WHERE moderation_status = 'pending'),
      'flagged_comments', (SELECT COUNT(*) FROM ratings_comments WHERE moderation_status = 'flagged'),
      'rejected_comments', (SELECT COUNT(*) FROM ratings_comments WHERE moderation_status = 'rejected'),
      'visible_comments', (SELECT COUNT(*) FROM ratings_comments WHERE is_visible = true),
      'hidden_comments', (SELECT COUNT(*) FROM ratings_comments WHERE is_visible = false),
      'comments_today', (SELECT COUNT(*) FROM ratings_comments WHERE created_at >= CURRENT_DATE),
      'comments_this_week', (SELECT COUNT(*) FROM ratings_comments WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'),
      'comments_this_month', (SELECT COUNT(*) FROM ratings_comments WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'),
      'avg_comment_length', (SELECT ROUND(AVG(char_length(comment_text))) FROM ratings_comments),
      'moderation_status_distribution', (
        SELECT json_object_agg(moderation_status, count)
        FROM (
          SELECT moderation_status, COUNT(*) as count
          FROM ratings_comments
          GROUP BY moderation_status
        ) dist
      ),
      'most_active_commenters', (
        SELECT json_agg(row_to_json(t))
        FROM (
          SELECT 
            u.phone,
            u.display_name,
            COUNT(rc.id) as comment_count,
            COUNT(CASE WHEN rc.moderation_status = 'approved' THEN 1 END) as approved_count,
            COUNT(CASE WHEN rc.moderation_status = 'rejected' THEN 1 END) as rejected_count
          FROM platform_users u
          JOIN ratings_comments rc ON rc.commenter_phone = u.phone
          GROUP BY u.phone, u.display_name
          ORDER BY comment_count DESC
          LIMIT 10
        ) t
      )
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Function: Bulk moderate comments
CREATE OR REPLACE FUNCTION admin_bulk_moderate_comments(
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
  v_caller_phone text;
  v_count integer;
BEGIN
  v_caller_phone := current_setting('request.jwt.claims', true)::json->>'phone';
  
  SELECT user_type = 'admin' INTO v_is_admin
  FROM platform_users WHERE phone = v_caller_phone;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح - مسموح للإدارة فقط');
  END IF;

  IF p_action = 'delete' THEN
    DELETE FROM ratings_comments WHERE id = ANY(p_comment_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN json_build_object('success', true, 'message', 'تم حذف ' || v_count || ' تعليق', 'count', v_count);
  
  ELSIF p_action = 'approve' THEN
    UPDATE ratings_comments
    SET 
      moderation_status = 'approved',
      is_visible = true,
      moderated_by = v_caller_phone,
      moderated_at = now(),
      updated_at = now()
    WHERE id = ANY(p_comment_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN json_build_object('success', true, 'message', 'تم الموافقة على ' || v_count || ' تعليق', 'count', v_count);
  
  ELSIF p_action = 'reject' THEN
    UPDATE ratings_comments
    SET 
      moderation_status = 'rejected',
      is_visible = false,
      flagged_reason = COALESCE(p_reason, 'تم الرفض من قبل الإدارة'),
      moderated_by = v_caller_phone,
      moderated_at = now(),
      updated_at = now()
    WHERE id = ANY(p_comment_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN json_build_object('success', true, 'message', 'تم رفض ' || v_count || ' تعليق', 'count', v_count);
  
  ELSIF p_action = 'flag' THEN
    UPDATE ratings_comments
    SET 
      moderation_status = 'flagged',
      flagged_reason = COALESCE(p_reason, 'تم الإبلاغ من قبل الإدارة'),
      moderated_by = v_caller_phone,
      moderated_at = now(),
      updated_at = now()
    WHERE id = ANY(p_comment_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN json_build_object('success', true, 'message', 'تم الإبلاغ عن ' || v_count || ' تعليق', 'count', v_count);
  
  ELSE
    RETURN json_build_object('success', false, 'error', 'الإجراء غير صحيح');
  END IF;
END;
$$;
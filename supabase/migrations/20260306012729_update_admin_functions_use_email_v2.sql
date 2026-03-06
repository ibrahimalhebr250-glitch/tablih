/*
  # تحديث دوال الإدارة لاستخدام البريد الإلكتروني

  تحديث جميع دوال الإدارة لاستخدام email بدلاً من phone
*/

-- حذف الدوال القديمة
DROP FUNCTION IF EXISTS admin_get_all_ratings(text,text,text,text,text,integer,integer);
DROP FUNCTION IF EXISTS admin_update_rating(text,uuid,integer,text,boolean);
DROP FUNCTION IF EXISTS admin_delete_rating(text,uuid);
DROP FUNCTION IF EXISTS admin_get_ratings_analytics(text);
DROP FUNCTION IF EXISTS admin_get_all_comments(text,text,text,text,integer,integer);
DROP FUNCTION IF EXISTS admin_approve_comment(text,uuid);
DROP FUNCTION IF EXISTS admin_reject_comment(text,uuid,text);
DROP FUNCTION IF EXISTS admin_delete_comment(text,uuid);
DROP FUNCTION IF EXISTS admin_get_comments_analytics(text);

-- إعادة إنشاء دالة التقييمات
CREATE FUNCTION admin_get_all_ratings(
  p_caller_email text,
  p_filter_type text DEFAULT NULL,
  p_filter_status text DEFAULT NULL,
  p_rating_type text DEFAULT NULL,
  p_search_phone text DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS jsonb[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_permission boolean;
BEGIN
  SELECT can_view INTO v_has_permission
  FROM admin_permissions ap
  JOIN admin_staff ast ON ast.role = ap.role
  WHERE ast.email = p_caller_email
    AND ast.is_active = true
    AND ap.section = 'ratings';

  IF NOT COALESCE(v_has_permission, false) THEN
    RAISE EXCEPTION 'غير مصرح لك بالوصول';
  END IF;

  RETURN ARRAY(
    SELECT jsonb_build_object(
      'rating_id', r.id,
      'rater_phone', r.rater_phone,
      'rated_phone', r.rated_phone,
      'rating_value', r.rating,
      'comment_text', c.comment_text,
      'deal_id', r.deal_id,
      'rating_type', COALESCE(r.rating_type, 'deal'),
      'is_confirmed', r.is_confirmed,
      'created_at', r.created_at,
      'updated_at', r.updated_at
    )
    FROM user_ratings r
    LEFT JOIN ratings_comments c ON c.rating_id = r.id
    WHERE (p_rating_type IS NULL OR r.rating_type = p_rating_type)
      AND (p_search_phone IS NULL OR r.rater_phone LIKE '%' || p_search_phone || '%' OR r.rated_phone LIKE '%' || p_search_phone || '%')
      AND (p_filter_status IS NULL OR 
        (p_filter_status = 'confirmed' AND r.is_confirmed = true) OR
        (p_filter_status = 'unconfirmed' AND r.is_confirmed = false))
    ORDER BY r.created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  );
END;
$$;

-- دالة تحديث التقييم
CREATE FUNCTION admin_update_rating(
  p_caller_email text,
  p_rating_id uuid,
  p_rating_value int,
  p_comment text DEFAULT NULL,
  p_is_confirmed boolean DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_permission boolean;
BEGIN
  SELECT can_edit INTO v_has_permission
  FROM admin_permissions ap
  JOIN admin_staff ast ON ast.role = ap.role
  WHERE ast.email = p_caller_email
    AND ast.is_active = true
    AND ap.section = 'ratings';

  IF NOT COALESCE(v_has_permission, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'ليس لديك صلاحية التعديل');
  END IF;

  UPDATE user_ratings
  SET
    rating = p_rating_value,
    is_confirmed = COALESCE(p_is_confirmed, is_confirmed),
    admin_reviewed_by = p_caller_email,
    admin_reviewed_at = now(),
    updated_at = now()
  WHERE id = p_rating_id;

  IF p_comment IS NOT NULL THEN
    UPDATE ratings_comments
    SET
      comment_text = p_comment,
      moderated_by = p_caller_email,
      moderated_at = now(),
      updated_at = now()
    WHERE rating_id = p_rating_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- دالة حذف التقييم
CREATE FUNCTION admin_delete_rating(
  p_caller_email text,
  p_rating_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_permission boolean;
BEGIN
  SELECT can_delete INTO v_has_permission
  FROM admin_permissions ap
  JOIN admin_staff ast ON ast.role = ap.role
  WHERE ast.email = p_caller_email
    AND ast.is_active = true
    AND ap.section = 'ratings';

  IF NOT COALESCE(v_has_permission, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'ليس لديك صلاحية الحذف');
  END IF;

  DELETE FROM user_ratings WHERE id = p_rating_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- دالة تحليلات التقييمات
CREATE FUNCTION admin_get_ratings_analytics(
  p_caller_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_permission boolean;
  v_analytics jsonb;
BEGIN
  SELECT can_view INTO v_has_permission
  FROM admin_permissions ap
  JOIN admin_staff ast ON ast.role = ap.role
  WHERE ast.email = p_caller_email
    AND ast.is_active = true
    AND ap.section = 'ratings';

  IF NOT COALESCE(v_has_permission, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح لك');
  END IF;

  SELECT jsonb_build_object(
    'total_ratings', COUNT(*),
    'confirmed_ratings', COUNT(*) FILTER (WHERE is_confirmed = true),
    'unconfirmed_ratings', COUNT(*) FILTER (WHERE is_confirmed = false),
    'deal_ratings', COUNT(*) FILTER (WHERE rating_type = 'deal'),
    'visitor_ratings', COUNT(*) FILTER (WHERE rating_type = 'visitor'),
    'average_rating', ROUND(AVG(rating)::numeric, 2),
    'ratings_today', COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE),
    'ratings_this_week', COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'),
    'ratings_this_month', COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE))
  )
  INTO v_analytics
  FROM user_ratings;

  RETURN jsonb_build_object('success', true, 'analytics', v_analytics);
END;
$$;

-- دالة التعليقات
CREATE FUNCTION admin_get_all_comments(
  p_caller_email text,
  p_filter_status text DEFAULT NULL,
  p_filter_visibility text DEFAULT NULL,
  p_search_text text DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS jsonb[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_permission boolean;
BEGIN
  SELECT can_view INTO v_has_permission
  FROM admin_permissions ap
  JOIN admin_staff ast ON ast.role = ap.role
  WHERE ast.email = p_caller_email
    AND ast.is_active = true
    AND ap.section = 'comments';

  IF NOT COALESCE(v_has_permission, false) THEN
    RAISE EXCEPTION 'غير مصرح لك بالوصول';
  END IF;

  RETURN ARRAY(
    SELECT jsonb_build_object(
      'comment_id', c.id,
      'rating_id', c.rating_id,
      'deal_id', r.deal_id,
      'deal_ref', d.deal_ref,
      'commenter_phone', c.commenter_phone,
      'commenter_name', u1.display_name,
      'rated_phone', r.rated_phone,
      'rated_name', u2.display_name,
      'comment_text', c.comment_text,
      'is_visible', c.is_visible,
      'moderation_status', c.moderation_status,
      'flagged_reason', c.flagged_reason,
      'moderated_by', c.moderated_by,
      'moderated_at', c.moderated_at,
      'created_at', c.created_at,
      'rating_value', r.rating
    )
    FROM ratings_comments c
    JOIN user_ratings r ON r.id = c.rating_id
    LEFT JOIN deals d ON d.id = r.deal_id
    LEFT JOIN platform_users u1 ON u1.phone = c.commenter_phone
    LEFT JOIN platform_users u2 ON u2.phone = r.rated_phone
    WHERE (p_filter_status IS NULL OR c.moderation_status = p_filter_status)
      AND (p_filter_visibility IS NULL OR 
        (p_filter_visibility = 'visible' AND c.is_visible = true) OR
        (p_filter_visibility = 'hidden' AND c.is_visible = false))
      AND (p_search_text IS NULL OR c.comment_text ILIKE '%' || p_search_text || '%')
    ORDER BY c.created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  );
END;
$$;

-- دالة الموافقة على التعليق
CREATE FUNCTION admin_approve_comment(
  p_caller_email text,
  p_comment_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_permission boolean;
BEGIN
  SELECT can_edit INTO v_has_permission
  FROM admin_permissions ap
  JOIN admin_staff ast ON ast.role = ap.role
  WHERE ast.email = p_caller_email
    AND ast.is_active = true
    AND ap.section = 'comments';

  IF NOT COALESCE(v_has_permission, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'ليس لديك صلاحية التعديل');
  END IF;

  UPDATE ratings_comments
  SET
    moderation_status = 'approved',
    is_visible = true,
    moderated_by = p_caller_email,
    moderated_at = now(),
    updated_at = now()
  WHERE id = p_comment_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- دالة رفض التعليق
CREATE FUNCTION admin_reject_comment(
  p_caller_email text,
  p_comment_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_permission boolean;
BEGIN
  SELECT can_edit INTO v_has_permission
  FROM admin_permissions ap
  JOIN admin_staff ast ON ast.role = ap.role
  WHERE ast.email = p_caller_email
    AND ast.is_active = true
    AND ap.section = 'comments';

  IF NOT COALESCE(v_has_permission, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'ليس لديك صلاحية التعديل');
  END IF;

  UPDATE ratings_comments
  SET
    moderation_status = 'rejected',
    is_visible = false,
    flagged_reason = p_reason,
    moderated_by = p_caller_email,
    moderated_at = now(),
    updated_at = now()
  WHERE id = p_comment_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- دالة حذف التعليق
CREATE FUNCTION admin_delete_comment(
  p_caller_email text,
  p_comment_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_permission boolean;
BEGIN
  SELECT can_delete INTO v_has_permission
  FROM admin_permissions ap
  JOIN admin_staff ast ON ast.role = ap.role
  WHERE ast.email = p_caller_email
    AND ast.is_active = true
    AND ap.section = 'comments';

  IF NOT COALESCE(v_has_permission, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'ليس لديك صلاحية الحذف');
  END IF;

  DELETE FROM ratings_comments WHERE id = p_comment_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- دالة تحليلات التعليقات
CREATE FUNCTION admin_get_comments_analytics(
  p_caller_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_permission boolean;
  v_analytics jsonb;
BEGIN
  SELECT can_view INTO v_has_permission
  FROM admin_permissions ap
  JOIN admin_staff ast ON ast.role = ap.role
  WHERE ast.email = p_caller_email
    AND ast.is_active = true
    AND ap.section = 'comments';

  IF NOT COALESCE(v_has_permission, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح لك');
  END IF;

  SELECT jsonb_build_object(
    'total_comments', COUNT(*),
    'approved_comments', COUNT(*) FILTER (WHERE moderation_status = 'approved'),
    'pending_comments', COUNT(*) FILTER (WHERE moderation_status = 'pending'),
    'flagged_comments', COUNT(*) FILTER (WHERE moderation_status = 'flagged'),
    'rejected_comments', COUNT(*) FILTER (WHERE moderation_status = 'rejected'),
    'visible_comments', COUNT(*) FILTER (WHERE is_visible = true),
    'hidden_comments', COUNT(*) FILTER (WHERE is_visible = false),
    'comments_today', COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE),
    'comments_this_week', COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'),
    'comments_this_month', COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)),
    'avg_comment_length', ROUND(AVG(LENGTH(comment_text))::numeric, 0)
  )
  INTO v_analytics
  FROM ratings_comments;

  RETURN jsonb_build_object('success', true, 'analytics', v_analytics);
END;
$$;

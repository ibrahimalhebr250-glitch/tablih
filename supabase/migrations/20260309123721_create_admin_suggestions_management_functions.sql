/*
  # وظائف إدارة الاقتراحات للأدمن

  ## الوصف
  وظائف تتيح للأدمن:
  1. جلب جميع الاقتراحات مع فلترة حسب الحالة
  2. تحديث حالة الاقتراح (pending -> reviewed -> resolved)
  3. إحصائيات الاقتراحات

  ## الجداول المستخدمة
  - `user_suggestions` - جدول الاقتراحات (id, user_phone, display_name, message, status, created_at)

  ## الوظائف الجديدة
  - `admin_get_suggestions` - جلب الاقتراحات مع فلترة وبحث
  - `admin_update_suggestion_status` - تحديث حالة اقتراح
  - `admin_get_suggestions_stats` - إحصائيات الاقتراحات
*/

-- ==============================
-- دالة: جلب الاقتراحات
-- ==============================
CREATE OR REPLACE FUNCTION admin_get_suggestions(
  p_admin_email text,
  p_status text DEFAULT 'all',
  p_search text DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  user_phone text,
  display_name text,
  message text,
  status text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_staff WHERE email = p_admin_email AND is_active = true) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    us.id,
    us.user_phone,
    COALESCE(us.display_name, us.user_phone) as display_name,
    us.message,
    us.status,
    us.created_at
  FROM user_suggestions us
  WHERE
    (p_status = 'all' OR us.status = p_status)
    AND (
      p_search IS NULL
      OR us.message ILIKE '%' || p_search || '%'
      OR us.display_name ILIKE '%' || p_search || '%'
      OR us.user_phone ILIKE '%' || p_search || '%'
    )
  ORDER BY
    CASE us.status WHEN 'pending' THEN 1 WHEN 'reviewed' THEN 2 ELSE 3 END,
    us.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_suggestions TO anon, authenticated;

-- ==============================
-- دالة: تحديث حالة اقتراح
-- ==============================
CREATE OR REPLACE FUNCTION admin_update_suggestion_status(
  p_admin_email text,
  p_suggestion_id uuid,
  p_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_staff WHERE email = p_admin_email AND is_active = true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  IF p_status NOT IN ('pending', 'reviewed', 'resolved') THEN
    RETURN jsonb_build_object('success', false, 'error', 'حالة غير صالحة');
  END IF;

  UPDATE user_suggestions
  SET status = p_status
  WHERE id = p_suggestion_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الاقتراح غير موجود');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION admin_update_suggestion_status TO anon, authenticated;

-- ==============================
-- دالة: إحصائيات الاقتراحات
-- ==============================
CREATE OR REPLACE FUNCTION admin_get_suggestions_stats(
  p_admin_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_staff WHERE email = p_admin_email AND is_active = true) THEN
    RETURN jsonb_build_object('error', 'غير مصرح');
  END IF;

  SELECT jsonb_build_object(
    'total', (SELECT COUNT(*) FROM user_suggestions),
    'pending', (SELECT COUNT(*) FROM user_suggestions WHERE status = 'pending'),
    'reviewed', (SELECT COUNT(*) FROM user_suggestions WHERE status = 'reviewed'),
    'resolved', (SELECT COUNT(*) FROM user_suggestions WHERE status = 'resolved'),
    'this_week', (SELECT COUNT(*) FROM user_suggestions WHERE created_at >= NOW() - INTERVAL '7 days'),
    'today', (SELECT COUNT(*) FROM user_suggestions WHERE DATE(created_at) = CURRENT_DATE)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_suggestions_stats TO anon, authenticated;

-- Enable realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_suggestions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_suggestions;
  END IF;
END $$;

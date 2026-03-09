/*
  # نظام إدارة دعم العملاء للأدمن

  ## الوصف
  وظائف وسياسات تتيح للأدمن:
  1. رؤية جميع محادثات الدعم مرتبة حسب آخر رسالة
  2. الرد على رسائل المستخدمين
  3. تتبع الرسائل غير المقروءة
  4. إحصائيات الدعم الشاملة
  5. Real-time للرسائل الجديدة

  ## الجداول المستخدمة
  - `support_messages` - جدول الرسائل الموجود (user_phone, sender: user/admin, message, image_url, is_read)
  - `platform_users` - بيانات المستخدمين

  ## الوظائف الجديدة
  - `admin_get_support_conversations` - جلب كل المحادثات مع عدد الرسائل غير المقروءة
  - `admin_get_support_messages` - جلب رسائل محادثة معينة
  - `admin_send_support_message` - إرسال رد من الأدمن
  - `admin_mark_messages_read` - تحديد الرسائل كمقروءة
  - `admin_get_support_stats` - إحصائيات الدعم
*/

-- ==============================
-- دالة: جلب جميع المحادثات للأدمن
-- ==============================
CREATE OR REPLACE FUNCTION admin_get_support_conversations(
  p_admin_email text,
  p_search text DEFAULT NULL,
  p_filter text DEFAULT 'all'
)
RETURNS TABLE (
  user_phone text,
  user_name text,
  user_type text,
  last_message text,
  last_message_at timestamptz,
  unread_count bigint,
  total_messages bigint,
  has_image boolean
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
    sm.user_phone,
    COALESCE(pu.display_name, pu.company_name, sm.user_phone) as user_name,
    COALESCE(pu.user_type, 'unknown') as user_type,
    last_msgs.message as last_message,
    last_msgs.created_at as last_message_at,
    COUNT(*) FILTER (WHERE sm.sender = 'user' AND sm.is_read = false) as unread_count,
    COUNT(*) as total_messages,
    bool_or(sm.image_url IS NOT NULL) as has_image
  FROM support_messages sm
  LEFT JOIN platform_users pu ON pu.phone = sm.user_phone
  JOIN (
    SELECT DISTINCT ON (user_phone)
      user_phone,
      message,
      created_at
    FROM support_messages
    ORDER BY user_phone, created_at DESC
  ) last_msgs ON last_msgs.user_phone = sm.user_phone
  WHERE
    (p_search IS NULL OR
     sm.user_phone ILIKE '%' || p_search || '%' OR
     COALESCE(pu.display_name, '') ILIKE '%' || p_search || '%' OR
     COALESCE(pu.company_name, '') ILIKE '%' || p_search || '%')
    AND (
      p_filter = 'all'
      OR (p_filter = 'unread' AND EXISTS (
        SELECT 1 FROM support_messages sm2
        WHERE sm2.user_phone = sm.user_phone AND sm2.sender = 'user' AND sm2.is_read = false
      ))
      OR (p_filter = 'unanswered' AND NOT EXISTS (
        SELECT 1 FROM support_messages sm3
        WHERE sm3.user_phone = sm.user_phone AND sm3.sender = 'admin'
          AND sm3.created_at > (
            SELECT MAX(created_at) FROM support_messages sm4
            WHERE sm4.user_phone = sm.user_phone AND sm4.sender = 'user'
          )
      ))
    )
  GROUP BY sm.user_phone, pu.display_name, pu.company_name, pu.user_type, last_msgs.message, last_msgs.created_at
  ORDER BY last_msgs.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_support_conversations TO anon, authenticated;

-- ==============================
-- دالة: جلب رسائل محادثة معينة
-- ==============================
CREATE OR REPLACE FUNCTION admin_get_support_messages(
  p_admin_email text,
  p_user_phone text
)
RETURNS TABLE (
  id uuid,
  user_phone text,
  sender text,
  message text,
  image_url text,
  is_read boolean,
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
    sm.id,
    sm.user_phone,
    sm.sender,
    sm.message,
    sm.image_url,
    sm.is_read,
    sm.created_at
  FROM support_messages sm
  WHERE sm.user_phone = p_user_phone
  ORDER BY sm.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_support_messages TO anon, authenticated;

-- ==============================
-- دالة: إرسال رد من الأدمن
-- ==============================
CREATE OR REPLACE FUNCTION admin_send_support_message(
  p_admin_email text,
  p_user_phone text,
  p_message text,
  p_image_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin admin_staff%ROWTYPE;
BEGIN
  SELECT * INTO v_admin FROM admin_staff WHERE email = p_admin_email AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  INSERT INTO support_messages (user_phone, sender, message, image_url, is_read)
  VALUES (p_user_phone, 'admin', p_message, p_image_url, true);

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION admin_send_support_message TO anon, authenticated;

-- ==============================
-- دالة: تحديد رسائل كمقروءة
-- ==============================
CREATE OR REPLACE FUNCTION admin_mark_messages_read(
  p_admin_email text,
  p_user_phone text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_staff WHERE email = p_admin_email AND is_active = true) THEN
    RETURN;
  END IF;

  UPDATE support_messages
  SET is_read = true
  WHERE user_phone = p_user_phone AND sender = 'user' AND is_read = false;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_mark_messages_read TO anon, authenticated;

-- ==============================
-- دالة: إحصائيات الدعم
-- ==============================
CREATE OR REPLACE FUNCTION admin_get_support_stats(
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
    'total_conversations', (SELECT COUNT(DISTINCT user_phone) FROM support_messages),
    'total_messages', (SELECT COUNT(*) FROM support_messages),
    'unread_messages', (SELECT COUNT(*) FROM support_messages WHERE sender = 'user' AND is_read = false),
    'unanswered_conversations', (
      SELECT COUNT(DISTINCT user_phone)
      FROM support_messages sm1
      WHERE sender = 'user'
        AND NOT EXISTS (
          SELECT 1 FROM support_messages sm2
          WHERE sm2.user_phone = sm1.user_phone
            AND sm2.sender = 'admin'
            AND sm2.created_at > sm1.created_at
        )
    ),
    'messages_today', (
      SELECT COUNT(*) FROM support_messages
      WHERE DATE(created_at) = CURRENT_DATE
    ),
    'messages_this_week', (
      SELECT COUNT(*) FROM support_messages
      WHERE created_at >= NOW() - INTERVAL '7 days'
    ),
    'avg_response_time_hours', (
      SELECT ROUND(
        AVG(
          EXTRACT(EPOCH FROM (admin_msgs.created_at - user_msgs.created_at)) / 3600
        )::numeric, 1
      )
      FROM support_messages user_msgs
      JOIN LATERAL (
        SELECT created_at
        FROM support_messages sm2
        WHERE sm2.user_phone = user_msgs.user_phone
          AND sm2.sender = 'admin'
          AND sm2.created_at > user_msgs.created_at
        ORDER BY created_at ASC
        LIMIT 1
      ) admin_msgs ON true
      WHERE user_msgs.sender = 'user'
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_support_stats TO anon, authenticated;

-- ==============================
-- Enable realtime for support_messages
-- ==============================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'support_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;
  END IF;
END $$;

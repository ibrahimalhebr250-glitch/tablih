/*
  # إصلاح خطأ الغموض في دالة admin_get_support_conversations

  ## المشكلة
  دالة admin_get_support_conversations تفشل بسبب column reference "user_phone" is ambiguous
  لأن متغير PL/pgSQL يتعارض مع اسم عمود الجدول داخل RETURN QUERY.

  ## الحل
  إعادة بناء الدالة بشكل صحيح مع تجنب الغموض.
*/

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
    sm.user_phone AS user_phone,
    COALESCE(pu.display_name, pu.company_name, sm.user_phone) AS user_name,
    COALESCE(pu.user_type, 'unknown') AS user_type,
    last_msgs.last_msg AS last_message,
    last_msgs.last_at AS last_message_at,
    COUNT(*) FILTER (WHERE sm.sender = 'user' AND sm.is_read = false) AS unread_count,
    COUNT(*) AS total_messages,
    bool_or(sm.image_url IS NOT NULL) AS has_image
  FROM support_messages sm
  LEFT JOIN platform_users pu ON pu.phone = sm.user_phone
  JOIN (
    SELECT DISTINCT ON (sub.user_phone)
      sub.user_phone AS sub_phone,
      sub.message AS last_msg,
      sub.created_at AS last_at
    FROM support_messages sub
    ORDER BY sub.user_phone, sub.created_at DESC
  ) last_msgs ON last_msgs.sub_phone = sm.user_phone
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
          SELECT MAX(sm4.created_at) FROM support_messages sm4
          WHERE sm4.user_phone = sm.user_phone AND sm4.sender = 'user'
        )
    ))
  )
  GROUP BY sm.user_phone, pu.display_name, pu.company_name, pu.user_type, last_msgs.last_msg, last_msgs.last_at
  ORDER BY last_msgs.last_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_support_conversations(text, text, text) TO anon, authenticated;

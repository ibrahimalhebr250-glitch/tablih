/*
  # تحسين نظام التنبيهات الذكية

  1. التحسينات
    - إضافة حقول جديدة للحالة والإجراءات
    - تحديث الدوال لاستخدام الجدول الموجود
    - إضافة دوال تنبيهات للمطابقات

  2. الأمان
    - استخدام RLS الموجود
*/

-- إضافة أعمدة جديدة إذا لم تكن موجودة
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'smart_notifications' AND column_name = 'notification_status'
  ) THEN
    ALTER TABLE smart_notifications ADD COLUMN notification_status text DEFAULT 'unread' CHECK (
      notification_status IN ('unread', 'read', 'actioned', 'dismissed')
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'smart_notifications' AND column_name = 'action_type'
  ) THEN
    ALTER TABLE smart_notifications ADD COLUMN action_type text CHECK (
      action_type IN ('view_deal', 'view_order', 'view_batch', 'confirm_deal', 'match_now')
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'smart_notifications' AND column_name = 'action_data'
  ) THEN
    ALTER TABLE smart_notifications ADD COLUMN action_data jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'smart_notifications' AND column_name = 'related_deal_id'
  ) THEN
    ALTER TABLE smart_notifications ADD COLUMN related_deal_id uuid REFERENCES deals(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'smart_notifications' AND column_name = 'read_at'
  ) THEN
    ALTER TABLE smart_notifications ADD COLUMN read_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'smart_notifications' AND column_name = 'actioned_at'
  ) THEN
    ALTER TABLE smart_notifications ADD COLUMN actioned_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'smart_notifications' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE smart_notifications ADD COLUMN expires_at timestamptz;
  END IF;
END $$;

-- ================================================================
-- دالة إنشاء تنبيه للمطابقة
-- ================================================================
CREATE OR REPLACE FUNCTION create_match_notification(
  p_user_phone text,
  p_notification_type text,
  p_title text,
  p_message text,
  p_priority text DEFAULT 'medium',
  p_order_id uuid DEFAULT NULL,
  p_batch_id uuid DEFAULT NULL,
  p_deal_id uuid DEFAULT NULL,
  p_action_type text DEFAULT NULL,
  p_action_data jsonb DEFAULT '{}'::jsonb,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  INSERT INTO smart_notifications (
    user_phone,
    notification_type,
    title,
    message,
    priority,
    related_order_id,
    related_batch_id,
    related_deal_id,
    action_type,
    action_data,
    metadata,
    expires_at,
    is_read
  ) VALUES (
    p_user_phone,
    p_notification_type,
    p_title,
    p_message,
    p_priority,
    p_order_id,
    p_batch_id,
    p_deal_id,
    p_action_type,
    p_action_data,
    p_metadata,
    now() + interval '7 days',
    false
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- ================================================================
-- دالة إرسال تنبيهات للمطابقات المحتملة
-- ================================================================
CREATE OR REPLACE FUNCTION notify_potential_matches()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_matches_info jsonb;
  v_notifications_sent int := 0;
BEGIN
  -- معالجة كل طلب معلق
  FOR v_order IN
    SELECT o.*
    FROM orders o
    WHERE o.status = 'unmatched'
      -- لم يتم إرسال تنبيه له في آخر 24 ساعة
      AND NOT EXISTS (
        SELECT 1 FROM smart_notifications sn
        WHERE sn.user_phone = o.phone
          AND sn.related_order_id = o.id
          AND sn.notification_type = 'match_opportunity'
          AND sn.created_at > now() - interval '24 hours'
      )
    ORDER BY o.created_at ASC
    LIMIT 50
  LOOP
    -- فحص المطابقات المحتملة
    v_matches_info := match_single_order(v_order.id);
    
    -- إذا وجدنا مطابقات محتملة
    IF (v_matches_info->>'matches_count')::int > 0 THEN
      PERFORM create_match_notification(
        v_order.phone,
        'match_opportunity',
        'وجدنا مخزون مطابق لطلبك!',
        format(
          'يوجد %s مورد لديهم طبليات مطابقة لطلبك (%s %s - جودة %s)',
          (v_matches_info->>'matches_count')::int,
          v_order.pallet_type,
          v_order.size,
          v_order.quality
        ),
        'high',
        v_order.id,
        NULL,
        NULL,
        'view_order',
        jsonb_build_object(
          'order_id', v_order.id,
          'matches', v_matches_info->'potential_matches'
        ),
        v_matches_info
      );
      
      v_notifications_sent := v_notifications_sent + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'notifications_sent', v_notifications_sent
  );
END;
$$;

-- ================================================================
-- تحديث دالة المطابقة لإرسال تنبيهات
-- ================================================================
CREATE OR REPLACE FUNCTION ultra_smart_match_orders_with_notifications()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_match_result jsonb;
  v_notify_result jsonb;
BEGIN
  -- تشغيل المطابقة
  v_match_result := ultra_smart_match_orders();
  
  -- إرسال تنبيهات للمطابقات المحتملة
  v_notify_result := notify_potential_matches();
  
  RETURN jsonb_build_object(
    'success', true,
    'matching', v_match_result,
    'notifications', v_notify_result
  );
END;
$$;

-- ================================================================
-- دالة جلب التنبيهات للمستخدم
-- ================================================================
CREATE OR REPLACE FUNCTION get_user_notifications(
  p_user_phone text,
  p_is_read boolean DEFAULT NULL,
  p_limit int DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notifications jsonb;
  v_unread_count int;
BEGIN
  -- عد التنبيهات غير المقروءة
  SELECT COUNT(*) INTO v_unread_count
  FROM smart_notifications
  WHERE user_phone = p_user_phone
    AND is_read = false
    AND (expires_at IS NULL OR expires_at > now());
  
  -- جلب التنبيهات
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', sn.id,
      'type', sn.notification_type,
      'priority', sn.priority,
      'title', sn.title,
      'message', sn.message,
      'is_read', sn.is_read,
      'action_type', sn.action_type,
      'action_data', sn.action_data,
      'metadata', sn.metadata,
      'created_at', sn.created_at,
      'order_id', sn.related_order_id,
      'batch_id', sn.related_batch_id,
      'deal_id', sn.related_deal_id
    ) ORDER BY sn.created_at DESC
  ), '[]'::jsonb) INTO v_notifications
  FROM smart_notifications sn
  WHERE sn.user_phone = p_user_phone
    AND (p_is_read IS NULL OR sn.is_read = p_is_read)
    AND (sn.expires_at IS NULL OR sn.expires_at > now())
  LIMIT p_limit;
  
  RETURN jsonb_build_object(
    'success', true,
    'unread_count', v_unread_count,
    'notifications', v_notifications
  );
END;
$$;

-- ================================================================
-- دالة تحديث حالة قراءة التنبيه
-- ================================================================
CREATE OR REPLACE FUNCTION mark_notification_read(
  p_notification_id uuid,
  p_user_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE smart_notifications
  SET 
    is_read = true,
    read_at = CASE WHEN read_at IS NULL THEN now() ELSE read_at END
  WHERE id = p_notification_id
    AND user_phone = p_user_phone;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

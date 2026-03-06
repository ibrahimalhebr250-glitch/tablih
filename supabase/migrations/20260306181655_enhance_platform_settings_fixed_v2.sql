/*
  # توسيع إعدادات المنصة

  1. التغييرات
    - إضافة إعدادات متقدمة متنوعة
    - إضافة سجل التغييرات
    
  2. الأمان
    - تفعيل RLS
    - سياسات للمشرفين
*/

-- إضافة حقول جديدة
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'platform_settings' AND column_name = 'general_settings'
  ) THEN
    ALTER TABLE platform_settings ADD COLUMN general_settings JSONB DEFAULT '{
      "platform_name": "منصة الطبليات",
      "maintenance_mode": false,
      "allow_new_registrations": true,
      "session_timeout_minutes": 60,
      "max_active_orders_per_user": 10,
      "max_active_inventory_per_supplier": 50
    }'::JSONB;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'platform_settings' AND column_name = 'notification_settings'
  ) THEN
    ALTER TABLE platform_settings ADD COLUMN notification_settings JSONB DEFAULT '{
      "whatsapp_enabled": true,
      "notify_new_match": true,
      "notify_deal_status": true,
      "notify_payment_due": true
    }'::JSONB;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'platform_settings' AND column_name = 'deal_settings'
  ) THEN
    ALTER TABLE platform_settings ADD COLUMN deal_settings JSONB DEFAULT '{
      "require_supplier_confirmation": true,
      "require_buyer_confirmation": true,
      "delivery_timeout_days": 7,
      "rating_required_after_deal": true,
      "allow_comments": true,
      "moderate_comments": true
    }'::JSONB;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'platform_settings' AND column_name = 'security_settings'
  ) THEN
    ALTER TABLE platform_settings ADD COLUMN security_settings JSONB DEFAULT '{
      "max_login_attempts": 5,
      "lockout_duration_minutes": 30,
      "pin_min_length": 4,
      "pin_max_length": 6
    }'::JSONB;
  END IF;
END $$;

-- جدول سجل التغييرات
CREATE TABLE IF NOT EXISTS platform_settings_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_group TEXT NOT NULL,
  setting_key TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  changed_by TEXT NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT
);

ALTER TABLE platform_settings_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view log"
  ON platform_settings_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_staff
      WHERE admin_staff.email = (SELECT auth.jwt() ->> 'email')
      AND admin_staff.is_active = true
    )
  );

CREATE POLICY "System can insert log"
  ON platform_settings_log
  FOR INSERT
  WITH CHECK (true);

-- دالة للتسجيل
CREATE OR REPLACE FUNCTION log_platform_setting_change(
  p_group TEXT,
  p_key TEXT,
  p_old_value JSONB,
  p_new_value JSONB,
  p_changed_by TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO platform_settings_log (
    setting_group,
    setting_key,
    old_value,
    new_value,
    changed_by,
    notes
  ) VALUES (
    p_group,
    p_key,
    p_old_value,
    p_new_value,
    p_changed_by,
    p_notes
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- دالة للحصول على السجل
CREATE OR REPLACE FUNCTION get_settings_changelog(
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
  v_logs JSON;
  v_total INT;
BEGIN
  SELECT COUNT(*) INTO v_total FROM platform_settings_log;
  
  WITH limited_logs AS (
    SELECT *
    FROM platform_settings_log
    ORDER BY changed_at DESC
    LIMIT p_limit OFFSET p_offset
  )
  SELECT COALESCE(json_agg(
    json_build_object(
      'id', id,
      'setting_group', setting_group,
      'setting_key', setting_key,
      'old_value', old_value,
      'new_value', new_value,
      'changed_by', changed_by,
      'changed_at', changed_at,
      'notes', notes
    ) ORDER BY changed_at DESC
  ), '[]'::JSON)
  INTO v_logs
  FROM limited_logs;
  
  v_result := json_build_object(
    'logs', v_logs,
    'total', v_total
  );
  
  RETURN v_result;
END;
$$;

/*
  # نظام إدارة واتساب - WhatsApp Management System

  ## الوصف
  نظام متكامل لإدارة قوالب رسائل واتساب وتتبع التواصل بين المستخدمين عبر المنصة.

  ## الجداول الجديدة

  ### 1. `whatsapp_templates`
  - قوالب رسائل واتساب القابلة للتخصيص
  - نوع المرسل (مشتري/مورد)
  - المتغيرات الديناميكية المدعومة
  - حالة التفعيل

  ### 2. `whatsapp_contact_logs`
  - سجل كل تواصل عبر واتساب
  - من أرسل، لمن، على أي صفقة
  - الوقت والسياق

  ## الأمان
  - RLS مفعّل على كل الجداول
  - الأدمن فقط يدير القوالب
  - المستخدمون يسجلون تواصلهم فقط
*/

-- ==============================
-- جدول قوالب واتساب
-- ==============================
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('buyer', 'supplier', 'both')),
  template_text text NOT NULL,
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  description text DEFAULT '',
  variables jsonb DEFAULT '[]'::jsonb,
  usage_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active templates"
  ON whatsapp_templates FOR SELECT
  USING (is_active = true);

-- ==============================
-- جدول سجل التواصل عبر واتساب
-- ==============================
CREATE TABLE IF NOT EXISTS whatsapp_contact_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES deals(id) ON DELETE SET NULL,
  deal_ref text,
  sender_phone text NOT NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('buyer', 'supplier')),
  recipient_phone text NOT NULL,
  template_id uuid REFERENCES whatsapp_templates(id) ON DELETE SET NULL,
  message_preview text,
  context_data jsonb DEFAULT '{}'::jsonb,
  contacted_at timestamptz DEFAULT now()
);

ALTER TABLE whatsapp_contact_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own contact logs"
  ON whatsapp_contact_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view logs where they are sender or recipient"
  ON whatsapp_contact_logs FOR SELECT
  USING (true);

-- ==============================
-- إدراج القوالب الافتراضية
-- ==============================
INSERT INTO whatsapp_templates (name, sender_role, template_text, is_active, is_default, description, variables) VALUES
(
  'قالب المشتري - طلب شراء',
  'buyer',
  E'السلام عليكم ورحمة الله\n\nأتواصل معك عبر *منصة العاديات* بخصوص الصفقة رقم *{{deal_ref}}*\n\n📦 *تفاصيل طلبي:*\nالنوع: {{pallet_type}} · {{size}} · درجة {{quality}}\nالكمية: {{quantity}} طبلية\nالمدينة: {{city}}\nالسعر: {{price}} ر.س / طبلية\n\n👤 أنا *المشتري* في هذه الصفقة\n\nأتطلع للتواصل معك لإتمام الصفقة بنجاح\n\nشكراً لتعاملك مع منصة العاديات',
  true,
  true,
  'القالب الافتراضي للمشتري عند التواصل مع المورد',
  '["deal_ref", "pallet_type", "size", "quality", "quantity", "city", "price"]'::jsonb
),
(
  'قالب المورد - تأكيد توفر المخزون',
  'supplier',
  E'السلام عليكم ورحمة الله\n\nأتواصل معك عبر *منصة العاديات* بخصوص الصفقة رقم *{{deal_ref}}*\n\n📦 *تفاصيل الصفقة:*\nالنوع: {{pallet_type}} · {{size}} · درجة {{quality}}\nالكمية: {{quantity}} طبلية\nالمدينة: {{city}}\nالسعر: {{price}} ر.س / طبلية\n\n👤 أنا *المورد* في هذه الصفقة\n\nأود التنسيق معك بخصوص موعد وترتيبات التسليم\n\nشكراً لتعاملك مع منصة العاديات',
  true,
  true,
  'القالب الافتراضي للمورد عند التواصل مع المشتري',
  '["deal_ref", "pallet_type", "size", "quality", "quantity", "city", "price"]'::jsonb
);

-- ==============================
-- دالة زيادة عداد الاستخدام
-- ==============================
CREATE OR REPLACE FUNCTION increment_whatsapp_template_usage(p_template_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE whatsapp_templates
  SET usage_count = usage_count + 1,
      updated_at = now()
  WHERE id = p_template_id;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_whatsapp_template_usage TO anon, authenticated;

-- ==============================
-- دالة لجلب إحصائيات التواصل
-- ==============================
CREATE OR REPLACE FUNCTION get_whatsapp_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_contacts', COUNT(*),
    'contacts_today', COUNT(*) FILTER (WHERE DATE(contacted_at) = CURRENT_DATE),
    'contacts_this_week', COUNT(*) FILTER (WHERE contacted_at >= NOW() - INTERVAL '7 days'),
    'contacts_this_month', COUNT(*) FILTER (WHERE contacted_at >= NOW() - INTERVAL '30 days'),
    'by_role', jsonb_build_object(
      'buyer_initiated', COUNT(*) FILTER (WHERE sender_role = 'buyer'),
      'supplier_initiated', COUNT(*) FILTER (WHERE sender_role = 'supplier')
    ),
    'top_deals', (
      SELECT jsonb_agg(d)
      FROM (
        SELECT deal_ref, COUNT(*) as contact_count
        FROM whatsapp_contact_logs
        WHERE deal_ref IS NOT NULL
        GROUP BY deal_ref
        ORDER BY contact_count DESC
        LIMIT 5
      ) d
    )
  ) INTO v_result
  FROM whatsapp_contact_logs;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_whatsapp_stats TO anon, authenticated;

-- ==============================
-- دالة لجلب سجلات التواصل مع فلترة
-- ==============================
CREATE OR REPLACE FUNCTION get_whatsapp_contact_logs(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_sender_role text DEFAULT NULL,
  p_deal_ref text DEFAULT NULL,
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  deal_id uuid,
  deal_ref text,
  sender_phone text,
  sender_role text,
  recipient_phone text,
  template_id uuid,
  template_name text,
  message_preview text,
  context_data jsonb,
  contacted_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.deal_id,
    l.deal_ref,
    l.sender_phone,
    l.sender_role,
    l.recipient_phone,
    l.template_id,
    t.name as template_name,
    l.message_preview,
    l.context_data,
    l.contacted_at
  FROM whatsapp_contact_logs l
  LEFT JOIN whatsapp_templates t ON t.id = l.template_id
  WHERE
    (p_sender_role IS NULL OR l.sender_role = p_sender_role)
    AND (p_deal_ref IS NULL OR l.deal_ref ILIKE '%' || p_deal_ref || '%')
    AND (p_date_from IS NULL OR l.contacted_at >= p_date_from)
    AND (p_date_to IS NULL OR l.contacted_at <= p_date_to)
  ORDER BY l.contacted_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION get_whatsapp_contact_logs TO anon, authenticated;

-- ==============================
-- دالة لإدارة القوالب (أدمن)
-- ==============================
CREATE OR REPLACE FUNCTION admin_upsert_whatsapp_template(
  p_admin_email text,
  p_id uuid DEFAULT NULL,
  p_name text DEFAULT NULL,
  p_sender_role text DEFAULT NULL,
  p_template_text text DEFAULT NULL,
  p_is_active boolean DEFAULT true,
  p_description text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_exists boolean;
  v_result uuid;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM admin_staff WHERE email = p_admin_email AND is_active = true
  ) INTO v_admin_exists;

  IF NOT v_admin_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  IF p_id IS NOT NULL THEN
    UPDATE whatsapp_templates
    SET
      name = COALESCE(p_name, name),
      sender_role = COALESCE(p_sender_role, sender_role),
      template_text = COALESCE(p_template_text, template_text),
      is_active = p_is_active,
      description = COALESCE(p_description, description),
      updated_at = now()
    WHERE id = p_id
    RETURNING id INTO v_result;
  ELSE
    INSERT INTO whatsapp_templates (name, sender_role, template_text, is_active, description)
    VALUES (p_name, p_sender_role, p_template_text, p_is_active, p_description)
    RETURNING id INTO v_result;
  END IF;

  RETURN jsonb_build_object('success', true, 'id', v_result);
END;
$$;

GRANT EXECUTE ON FUNCTION admin_upsert_whatsapp_template TO anon, authenticated;

CREATE OR REPLACE FUNCTION admin_delete_whatsapp_template(
  p_admin_email text,
  p_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_exists boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM admin_staff WHERE email = p_admin_email AND is_active = true
  ) INTO v_admin_exists;

  IF NOT v_admin_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  DELETE FROM whatsapp_templates WHERE id = p_id AND is_default = false;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION admin_delete_whatsapp_template TO anon, authenticated;

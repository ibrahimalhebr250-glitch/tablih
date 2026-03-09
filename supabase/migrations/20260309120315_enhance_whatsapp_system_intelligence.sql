/*
  # تعزيز نظام واتساب بالذكاء التحليلي

  ## الوصف
  ترقية شاملة لنظام إدارة واتساب بإضافة:
  1. تتبع حالة الصفقة وقت التواصل
  2. كشف التواصل المكرر (مضاد للاستغلال)
  3. دالة الصفقات الصامتة (لا تواصل)
  4. إحصائيات التوقيت والمراحل
  5. بيانات إعادة الاستهداف للمستخدمين غير النشطين
  6. أداء القوالب (معدل إتمام الصفقات)
  7. قائمة المتابعة للأدمن
*/

-- ==============================
-- إضافة أعمدة للسجل
-- ==============================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_contact_logs' AND column_name = 'deal_status_at_contact') THEN
    ALTER TABLE whatsapp_contact_logs ADD COLUMN deal_status_at_contact text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_contact_logs' AND column_name = 'is_duplicate') THEN
    ALTER TABLE whatsapp_contact_logs ADD COLUMN is_duplicate boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_contact_logs' AND column_name = 'response_received') THEN
    ALTER TABLE whatsapp_contact_logs ADD COLUMN response_received boolean DEFAULT false;
  END IF;
END $$;

-- ==============================
-- إضافة أعمدة أداء القوالب
-- ==============================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_templates' AND column_name = 'deal_completion_rate') THEN
    ALTER TABLE whatsapp_templates ADD COLUMN deal_completion_rate numeric(5,2) DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_templates' AND column_name = 'avg_deal_completion_hours') THEN
    ALTER TABLE whatsapp_templates ADD COLUMN avg_deal_completion_hours numeric(7,1) DEFAULT NULL;
  END IF;
END $$;

-- ==============================
-- إضافة عمود آخر تواصل أدمن للمستخدمين
-- ==============================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'platform_users' AND column_name = 'last_admin_contacted_at') THEN
    ALTER TABLE platform_users ADD COLUMN last_admin_contacted_at timestamptz DEFAULT NULL;
  END IF;
END $$;

-- ==============================
-- Trigger: كشف التواصل المكرر
-- ==============================
CREATE OR REPLACE FUNCTION check_whatsapp_duplicate()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM whatsapp_contact_logs
  WHERE sender_phone = NEW.sender_phone
    AND recipient_phone = NEW.recipient_phone
    AND deal_id = NEW.deal_id
    AND contacted_at >= NOW() - INTERVAL '24 hours';

  IF v_count >= 5 THEN
    NEW.is_duplicate := true;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_whatsapp_duplicate ON whatsapp_contact_logs;
CREATE TRIGGER trg_check_whatsapp_duplicate
  BEFORE INSERT ON whatsapp_contact_logs
  FOR EACH ROW
  EXECUTE FUNCTION check_whatsapp_duplicate();

-- ==============================
-- دالة: الصفقات الصامتة (بدون تواصل)
-- ==============================
CREATE OR REPLACE FUNCTION get_silent_deals(p_hours_threshold integer DEFAULT 24)
RETURNS TABLE (
  deal_id uuid,
  deal_ref text,
  status text,
  pallet_type text,
  size text,
  quality text,
  quantity integer,
  city text,
  supplier_phone text,
  buyer_phone text,
  supplier_name text,
  buyer_name text,
  hours_since_reserved numeric,
  final_price numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id as deal_id,
    d.deal_ref,
    d.status,
    d.pallet_type,
    d.size,
    d.quality,
    d.quantity,
    d.city,
    d.supplier_phone,
    d.buyer_phone,
    COALESCE(su.display_name, su.company_name, d.supplier_phone) as supplier_name,
    COALESCE(bu.display_name, bu.company_name, d.buyer_phone) as buyer_name,
    EXTRACT(EPOCH FROM (NOW() - COALESCE(d.reserved_at, d.created_at))) / 3600 as hours_since_reserved,
    COALESCE(d.supplier_price, d.final_price) as final_price
  FROM deals d
  LEFT JOIN platform_users su ON su.phone = d.supplier_phone
  LEFT JOIN platform_users bu ON bu.phone = d.buyer_phone
  WHERE d.status IN ('inventory_reserved', 'execution_in_progress', 'in_delivery')
    AND EXTRACT(EPOCH FROM (NOW() - COALESCE(d.reserved_at, d.created_at))) / 3600 >= p_hours_threshold
    AND NOT EXISTS (
      SELECT 1 FROM whatsapp_contact_logs wcl
      WHERE wcl.deal_id = d.id
        AND wcl.contacted_at >= COALESCE(d.reserved_at, d.created_at)
    )
  ORDER BY hours_since_reserved DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_silent_deals TO anon, authenticated;

-- ==============================
-- دالة: إحصائيات مُعززة
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
    'duplicate_contacts', COUNT(*) FILTER (WHERE is_duplicate = true),
    'by_role', jsonb_build_object(
      'buyer_initiated', COUNT(*) FILTER (WHERE sender_role = 'buyer'),
      'supplier_initiated', COUNT(*) FILTER (WHERE sender_role = 'supplier')
    ),
    'by_stage', (
      SELECT jsonb_object_agg(stage, cnt)
      FROM (
        SELECT COALESCE(deal_status_at_contact, 'unknown') as stage, COUNT(*) as cnt
        FROM whatsapp_contact_logs
        WHERE deal_status_at_contact IS NOT NULL
        GROUP BY deal_status_at_contact
      ) s
    ),
    'hourly_distribution', (
      SELECT jsonb_agg(jsonb_build_object('hour', h, 'count', cnt) ORDER BY h)
      FROM (
        SELECT EXTRACT(HOUR FROM contacted_at)::integer as h, COUNT(*) as cnt
        FROM whatsapp_contact_logs
        WHERE contacted_at >= NOW() - INTERVAL '30 days'
        GROUP BY h
        ORDER BY h
      ) hd
    ),
    'daily_distribution', (
      SELECT jsonb_agg(jsonb_build_object('day', d, 'count', cnt) ORDER BY d)
      FROM (
        SELECT EXTRACT(DOW FROM contacted_at)::integer as d, COUNT(*) as cnt
        FROM whatsapp_contact_logs
        WHERE contacted_at >= NOW() - INTERVAL '30 days'
        GROUP BY d
        ORDER BY d
      ) dd
    ),
    'top_deals', (
      SELECT jsonb_agg(td)
      FROM (
        SELECT deal_ref, COUNT(*) as contact_count
        FROM whatsapp_contact_logs
        WHERE deal_ref IS NOT NULL
        GROUP BY deal_ref
        ORDER BY contact_count DESC
        LIMIT 5
      ) td
    ),
    'silent_deals_count', (
      SELECT COUNT(*) FROM get_silent_deals(24)
    )
  ) INTO v_result
  FROM whatsapp_contact_logs;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_whatsapp_stats TO anon, authenticated;

-- ==============================
-- دالة: مرشحو إعادة الاستهداف
-- ==============================
CREATE OR REPLACE FUNCTION get_reengagement_candidates(
  p_inactive_days integer DEFAULT 14,
  p_city text DEFAULT NULL,
  p_user_type text DEFAULT NULL,
  p_min_deals integer DEFAULT 1,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  user_id uuid,
  phone text,
  display_name text,
  company_name text,
  user_type text,
  city text,
  total_deals bigint,
  last_deal_at timestamptz,
  last_admin_contacted_at timestamptz,
  days_inactive numeric,
  trust_rating numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pu.id as user_id,
    pu.phone,
    pu.display_name,
    pu.company_name,
    pu.user_type,
    pu.city,
    COALESCE(ds.total_deals, 0) as total_deals,
    ds.last_deal_at,
    pu.last_admin_contacted_at,
    EXTRACT(EPOCH FROM (NOW() - COALESCE(ds.last_deal_at, pu.created_at))) / 86400 as days_inactive,
    pu.trust_rating
  FROM platform_users pu
  LEFT JOIN (
    SELECT
      phone_key,
      COUNT(*) as total_deals,
      MAX(created_at) as last_deal_at
    FROM (
      SELECT supplier_phone as phone_key, created_at FROM deals WHERE status = 'completed'
      UNION ALL
      SELECT buyer_phone as phone_key, created_at FROM deals WHERE status = 'completed'
    ) all_deals
    GROUP BY phone_key
  ) ds ON ds.phone_key = pu.phone
  WHERE
    COALESCE(ds.total_deals, 0) >= p_min_deals
    AND EXTRACT(EPOCH FROM (NOW() - COALESCE(ds.last_deal_at, pu.created_at))) / 86400 >= p_inactive_days
    AND (p_city IS NULL OR pu.city = p_city)
    AND (p_user_type IS NULL OR pu.user_type = p_user_type)
    AND (
      pu.last_admin_contacted_at IS NULL
      OR pu.last_admin_contacted_at < NOW() - INTERVAL '7 days'
    )
  ORDER BY ds.last_deal_at DESC NULLS LAST
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_reengagement_candidates TO anon, authenticated;

-- ==============================
-- دالة: تحديث آخر تواصل أدمن
-- ==============================
CREATE OR REPLACE FUNCTION mark_admin_contacted_user(
  p_admin_email text,
  p_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_exists boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM admin_staff WHERE email = p_admin_email AND is_active = true)
  INTO v_admin_exists;

  IF NOT v_admin_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  UPDATE platform_users SET last_admin_contacted_at = NOW() WHERE phone = p_phone;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION mark_admin_contacted_user TO anon, authenticated;

-- ==============================
-- دالة: تحديث أداء القوالب
-- ==============================
CREATE OR REPLACE FUNCTION refresh_template_performance_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE whatsapp_templates t
  SET
    deal_completion_rate = stats.completion_rate,
    avg_deal_completion_hours = stats.avg_hours,
    updated_at = NOW()
  FROM (
    SELECT
      wcl.template_id,
      ROUND(
        100.0 * COUNT(*) FILTER (WHERE d.status = 'completed') / NULLIF(COUNT(*), 0),
        1
      ) as completion_rate,
      ROUND(
        AVG(
          EXTRACT(EPOCH FROM (d.completed_at - d.created_at)) / 3600
        ) FILTER (WHERE d.status = 'completed' AND d.completed_at IS NOT NULL),
        1
      ) as avg_hours
    FROM whatsapp_contact_logs wcl
    JOIN deals d ON d.id = wcl.deal_id
    WHERE wcl.template_id IS NOT NULL
    GROUP BY wcl.template_id
    HAVING COUNT(*) >= 3
  ) stats
  WHERE t.id = stats.template_id;
END;
$$;

GRANT EXECUTE ON FUNCTION refresh_template_performance_stats TO anon, authenticated;

-- ==============================
-- إضافة قوالب إعادة الاستهداف والمتابعة
-- ==============================
INSERT INTO whatsapp_templates (name, sender_role, template_text, is_active, is_default, description, variables)
SELECT * FROM (VALUES
  (
    'قالب المتابعة للصفقة الصامتة',
    'both',
    E'السلام عليكم ورحمة الله\n\nنتواصل معكم من *إدارة منصة العاديات* بخصوص الصفقة رقم *{{deal_ref}}*\n\n📦 تفاصيل الصفقة:\n{{pallet_type}} · {{size}} · درجة {{quality}}\nالكمية: {{quantity}} طبلية | {{city}}\n\n⏰ هذه الصفقة في انتظار التنسيق بين الطرفين\n\nنرجو التواصل مع الطرف الآخر لإتمام الصفقة في أقرب وقت\n\nشكراً لثقتكم بمنصة العاديات',
    true,
    false,
    'يُستخدم من الأدمن لمتابعة الصفقات الصامتة',
    '["deal_ref", "pallet_type", "size", "quality", "quantity", "city"]'::jsonb
  ),
  (
    'قالب إعادة الاستهداف - العودة للمنصة',
    'both',
    E'السلام عليكم ورحمة الله\n\nكيف حالك؟ افتقدناك في *منصة العاديات* 🌟\n\nلدينا حالياً طبليات متاحة تلبي احتياجاتك:\n✅ تشكيلة واسعة من أنواع وأحجام الطبليات\n✅ أسعار تنافسية وشفافة\n✅ نظام تطابق ذكي وسريع\n\nانضم إلينا مجدداً وابدأ صفقتك التالية الآن!\n\nمنصة العاديات - شريكك الموثوق في تجارة الطبليات',
    true,
    false,
    'يُستخدم من الأدمن لإعادة استهداف المستخدمين غير النشطين',
    '[]'::jsonb
  )
) AS new_templates(name, sender_role, template_text, is_active, is_default, description, variables)
WHERE NOT EXISTS (
  SELECT 1 FROM whatsapp_templates WHERE name = new_templates.name
);

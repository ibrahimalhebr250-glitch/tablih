/*
  # إنشاء نظام آلي لتحليلات الطلبات وسجل العمليات

  1. المشكلة
    - جدول order_analytics فارغ ولا يتم تحديثه تلقائياً
    - جدول order_operations_log فارغ ولا يتم تسجيل العمليات
    - الطلبات لا تظهر في تبويب التحليلات وسجل العمليات

  2. الحل
    - إنشاء دالة لتسجيل العمليات في order_operations_log
    - إنشاء triggers لتسجيل العمليات تلقائياً
    - إنشاء دالة لتحديث تحليلات الطلبات اليومية
    - إنشاء trigger لتحديث التحليلات عند إضافة/تعديل طلب

  3. التأثير
    - تسجيل جميع عمليات الطلبات تلقائياً
    - تحديث التحليلات في الوقت الفعلي
    - عرض البيانات في جميع التبويبات بشكل متزامن
*/

-- =====================================================
-- 1. دالة لتسجيل العمليات في order_operations_log
-- =====================================================

CREATE OR REPLACE FUNCTION log_order_operation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_operation_type text;
  v_old_values jsonb;
  v_new_values jsonb;
  v_buyer_name text;
BEGIN
  -- تحديد نوع العملية
  IF TG_OP = 'INSERT' THEN
    v_operation_type := CASE 
      WHEN NEW.is_draft THEN 'created'
      ELSE 'published'
    END;
    v_old_values := NULL;
    v_new_values := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    -- تحديد نوع التعديل
    IF OLD.status != NEW.status THEN
      v_operation_type := CASE NEW.status
        WHEN 'matched' THEN 'matched'
        WHEN 'cancelled' THEN 'cancelled'
        ELSE 'modified'
      END;
    ELSIF OLD.is_draft = true AND NEW.is_draft = false THEN
      v_operation_type := 'published';
    ELSE
      v_operation_type := 'modified';
    END IF;
    v_old_values := to_jsonb(OLD);
    v_new_values := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    v_operation_type := 'deleted';
    v_old_values := to_jsonb(OLD);
    v_new_values := NULL;
  END IF;

  -- الحصول على اسم المشتري
  BEGIN
    SELECT display_name INTO v_buyer_name
    FROM platform_users
    WHERE phone = COALESCE(NEW.phone, OLD.phone);
  EXCEPTION WHEN OTHERS THEN
    v_buyer_name := NULL;
  END;

  -- تسجيل العملية
  INSERT INTO order_operations_log (
    operation_type,
    order_id,
    request_id,
    buyer_phone,
    buyer_name,
    city,
    pallet_type,
    pallet_size,
    quality,
    quantity,
    performed_by,
    performed_by_type,
    performed_by_phone,
    old_values,
    new_values,
    notes,
    metadata
  ) VALUES (
    v_operation_type,
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.request_id, OLD.request_id),
    COALESCE(NEW.phone, OLD.phone),
    v_buyer_name,
    COALESCE(NEW.city, OLD.city),
    COALESCE(NEW.pallet_type, OLD.pallet_type),
    COALESCE(NEW.size, OLD.size),
    COALESCE(NEW.quality, OLD.quality),
    COALESCE(NEW.quantity, OLD.quantity),
    COALESCE(NEW.phone, OLD.phone),
    'user',
    COALESCE(NEW.phone, OLD.phone),
    v_old_values,
    v_new_values,
    NULL,
    jsonb_build_object(
      'tg_op', TG_OP,
      'timestamp', now()
    )
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- إنشاء trigger لتسجيل العمليات
DROP TRIGGER IF EXISTS trigger_log_order_operations ON orders;
CREATE TRIGGER trigger_log_order_operations
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION log_order_operation();

-- =====================================================
-- 2. دالة لتحديث تحليلات الطلبات اليومية
-- =====================================================

CREATE OR REPLACE FUNCTION update_order_analytics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_date date;
  v_total_orders int;
  v_total_quantity int;
  v_matched_orders int;
  v_unmatched_orders int;
  v_most_requested_type text;
  v_most_requested_size text;
  v_most_requested_city text;
  v_most_requested_quality text;
  v_active_buyers_count int;
  v_avg_order_quantity numeric;
  v_match_rate numeric;
BEGIN
  -- تحديد التاريخ
  v_date := CURRENT_DATE;

  -- حساب الإحصائيات اليومية
  SELECT 
    COUNT(*)::int,
    COALESCE(SUM(quantity), 0)::int,
    COUNT(*) FILTER (WHERE status = 'matched')::int,
    COUNT(*) FILTER (WHERE status = 'unmatched')::int,
    COUNT(DISTINCT phone)::int,
    COALESCE(AVG(quantity), 0)::numeric
  INTO 
    v_total_orders,
    v_total_quantity,
    v_matched_orders,
    v_unmatched_orders,
    v_active_buyers_count,
    v_avg_order_quantity
  FROM orders
  WHERE DATE(created_at) = v_date
    AND is_draft = false;

  -- حساب نسبة المطابقة
  IF v_total_orders > 0 THEN
    v_match_rate := (v_matched_orders::numeric / v_total_orders::numeric * 100);
  ELSE
    v_match_rate := 0;
  END IF;

  -- الحصول على أكثر أنواع الطبليات طلباً
  SELECT pallet_type INTO v_most_requested_type
  FROM orders
  WHERE DATE(created_at) = v_date AND is_draft = false
  GROUP BY pallet_type
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  -- الحصول على أكثر المقاسات طلباً
  SELECT size INTO v_most_requested_size
  FROM orders
  WHERE DATE(created_at) = v_date AND is_draft = false
  GROUP BY size
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  -- الحصول على أكثر المدن طلباً
  SELECT city INTO v_most_requested_city
  FROM orders
  WHERE DATE(created_at) = v_date AND is_draft = false
  GROUP BY city
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  -- الحصول على أكثر درجات الجودة طلباً
  SELECT quality INTO v_most_requested_quality
  FROM orders
  WHERE DATE(created_at) = v_date AND is_draft = false
  GROUP BY quality
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  -- تحديث أو إدراج البيانات
  INSERT INTO order_analytics (
    date,
    total_orders,
    total_quantity,
    matched_orders,
    unmatched_orders,
    most_requested_type,
    most_requested_size,
    most_requested_city,
    most_requested_quality,
    active_buyers_count,
    avg_order_quantity,
    match_rate
  ) VALUES (
    v_date,
    v_total_orders,
    v_total_quantity,
    v_matched_orders,
    v_unmatched_orders,
    v_most_requested_type,
    v_most_requested_size,
    v_most_requested_city,
    v_most_requested_quality,
    v_active_buyers_count,
    v_avg_order_quantity,
    v_match_rate
  )
  ON CONFLICT (date)
  DO UPDATE SET
    total_orders = EXCLUDED.total_orders,
    total_quantity = EXCLUDED.total_quantity,
    matched_orders = EXCLUDED.matched_orders,
    unmatched_orders = EXCLUDED.unmatched_orders,
    most_requested_type = EXCLUDED.most_requested_type,
    most_requested_size = EXCLUDED.most_requested_size,
    most_requested_city = EXCLUDED.most_requested_city,
    most_requested_quality = EXCLUDED.most_requested_quality,
    active_buyers_count = EXCLUDED.active_buyers_count,
    avg_order_quantity = EXCLUDED.avg_order_quantity,
    match_rate = EXCLUDED.match_rate;

  RETURN NEW;
END;
$$;

-- إنشاء trigger لتحديث التحليلات
DROP TRIGGER IF EXISTS trigger_update_order_analytics ON orders;
CREATE TRIGGER trigger_update_order_analytics
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  WHEN (NEW.is_draft = false)
  EXECUTE FUNCTION update_order_analytics();

-- =====================================================
-- 3. إضافة constraint لضمان تفرد التاريخ في order_analytics
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'order_analytics_date_key'
  ) THEN
    ALTER TABLE order_analytics 
    ADD CONSTRAINT order_analytics_date_key UNIQUE (date);
  END IF;
END $$;

-- =====================================================
-- 4. تحديث البيانات الموجودة
-- =====================================================

-- تسجيل عمليات للطلبات الموجودة
INSERT INTO order_operations_log (
  operation_type,
  order_id,
  request_id,
  buyer_phone,
  buyer_name,
  city,
  pallet_type,
  pallet_size,
  quality,
  quantity,
  performed_by,
  performed_by_type,
  performed_by_phone,
  old_values,
  new_values,
  notes,
  metadata,
  created_at
)
SELECT 
  CASE 
    WHEN o.is_draft THEN 'created'
    ELSE 'published'
  END,
  o.id,
  o.request_id,
  o.phone,
  COALESCE(pu.display_name, o.phone),
  o.city,
  o.pallet_type,
  o.size,
  o.quality,
  o.quantity,
  o.phone,
  'user',
  o.phone,
  NULL,
  to_jsonb(o.*),
  'تسجيل تلقائي للبيانات الموجودة',
  jsonb_build_object('auto_generated', true, 'timestamp', now()),
  o.created_at
FROM orders o
LEFT JOIN platform_users pu ON pu.phone = o.phone
WHERE NOT EXISTS (
  SELECT 1 FROM order_operations_log 
  WHERE order_id = o.id
);

-- تحديث التحليلات للطلبات الموجودة
WITH daily_stats AS (
  SELECT 
    DATE(created_at) as order_date,
    COUNT(*)::int as total_orders,
    COALESCE(SUM(quantity), 0)::int as total_quantity,
    COUNT(*) FILTER (WHERE status = 'matched')::int as matched_orders,
    COUNT(*) FILTER (WHERE status = 'unmatched')::int as unmatched_orders,
    COUNT(DISTINCT phone)::int as active_buyers_count,
    COALESCE(AVG(quantity), 0)::numeric as avg_order_quantity
  FROM orders
  WHERE is_draft = false
  GROUP BY DATE(created_at)
),
most_requested AS (
  SELECT 
    DATE(created_at) as order_date,
    (array_agg(pallet_type ORDER BY type_count DESC))[1] as most_requested_type,
    (array_agg(size ORDER BY size_count DESC))[1] as most_requested_size,
    (array_agg(city ORDER BY city_count DESC))[1] as most_requested_city,
    (array_agg(quality ORDER BY quality_count DESC))[1] as most_requested_quality
  FROM (
    SELECT 
      DATE(created_at) as created_at,
      pallet_type,
      size,
      city,
      quality,
      COUNT(*) OVER (PARTITION BY DATE(created_at), pallet_type) as type_count,
      COUNT(*) OVER (PARTITION BY DATE(created_at), size) as size_count,
      COUNT(*) OVER (PARTITION BY DATE(created_at), city) as city_count,
      COUNT(*) OVER (PARTITION BY DATE(created_at), quality) as quality_count,
      ROW_NUMBER() OVER (PARTITION BY DATE(created_at) ORDER BY created_at) as rn
    FROM orders
    WHERE is_draft = false
  ) sub
  WHERE rn = 1
  GROUP BY order_date
)
INSERT INTO order_analytics (
  date,
  total_orders,
  total_quantity,
  matched_orders,
  unmatched_orders,
  most_requested_type,
  most_requested_size,
  most_requested_city,
  most_requested_quality,
  active_buyers_count,
  avg_order_quantity,
  match_rate
)
SELECT 
  ds.order_date,
  ds.total_orders,
  ds.total_quantity,
  ds.matched_orders,
  ds.unmatched_orders,
  mr.most_requested_type,
  mr.most_requested_size,
  mr.most_requested_city,
  mr.most_requested_quality,
  ds.active_buyers_count,
  ds.avg_order_quantity,
  CASE 
    WHEN ds.total_orders > 0 THEN (ds.matched_orders::numeric / ds.total_orders::numeric * 100)
    ELSE 0
  END
FROM daily_stats ds
LEFT JOIN most_requested mr ON mr.order_date = ds.order_date
ON CONFLICT (date)
DO UPDATE SET
  total_orders = EXCLUDED.total_orders,
  total_quantity = EXCLUDED.total_quantity,
  matched_orders = EXCLUDED.matched_orders,
  unmatched_orders = EXCLUDED.unmatched_orders,
  most_requested_type = EXCLUDED.most_requested_type,
  most_requested_size = EXCLUDED.most_requested_size,
  most_requested_city = EXCLUDED.most_requested_city,
  most_requested_quality = EXCLUDED.most_requested_quality,
  active_buyers_count = EXCLUDED.active_buyers_count,
  avg_order_quantity = EXCLUDED.avg_order_quantity,
  match_rate = EXCLUDED.match_rate;
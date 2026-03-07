/*
  # إصلاح شامل لنظام المطابقة الذكية

  1. المشاكل المكتشفة
    - عدم توحيد نصوص أنواع الطبليات (خشبية vs خشب)
    - الـ Trigger يستدعي دالة خاطئة (trigger_smart_auto_match بدلاً من trigger_auto_match_on_inventory)
    - حاجة لمعالجة تنظيف النصوص قبل المقارنة
    - حاجة لدالة مطابقة يدوية للطلبات الموجودة

  2. الحلول
    - إنشاء دالة normalize_text لتوحيد النصوص
    - تحديث دالة المطابقة التلقائية لاستخدام المقارنة الذكية
    - إصلاح الـ Trigger ليستدعي الدالة الصحيحة
    - إضافة دالة manual_match_existing_orders لمعالجة الطلبات الموجودة
    - تنظيف البيانات الموجودة

  3. الأمان
    - جميع الدوال SECURITY DEFINER
    - لا تعديل على RLS
*/

-- ================================================================
-- دالة تنظيف وتوحيد النصوص
-- ================================================================
CREATE OR REPLACE FUNCTION normalize_text(p_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- إزالة المسافات الزائدة والتوحيد
  RETURN TRIM(BOTH FROM REGEXP_REPLACE(p_text, '\s+', ' ', 'g'));
END;
$$;

-- ================================================================
-- دالة محسّنة للمطابقة التلقائية مع التنظيف
-- ================================================================
CREATE OR REPLACE FUNCTION smart_auto_match_orders(p_batch_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_batch inventory_batches%ROWTYPE;
  v_order RECORD;
  v_quality_order jsonb := '{"A": 4, "B": 3, "C": 2, "Scrap": 1}'::jsonb;
  v_batch_q int;
  v_order_q int;
  v_matched_qty int;
  v_price numeric;
  v_deal_result jsonb;
  v_matches_count int := 0;
  v_normalized_batch_type text;
  v_normalized_batch_city text;
BEGIN
  -- جلب معلومات الدفعة
  SELECT * INTO v_batch
  FROM inventory_batches
  WHERE id = p_batch_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'batch_not_found');
  END IF;

  IF v_batch.available_quantity <= 0 THEN
    RETURN jsonb_build_object('success', true, 'matches', 0, 'reason', 'no_available_quantity');
  END IF;

  -- تنظيف نصوص الدفعة
  v_normalized_batch_type := normalize_text(v_batch.pallet_type);
  v_normalized_batch_city := normalize_text(v_batch.city);
  v_batch_q := COALESCE((v_quality_order->>v_batch.quality)::int, 0);

  -- البحث عن الطلبات المطابقة
  FOR v_order IN
    SELECT o.*
    FROM orders o
    WHERE o.status IN ('unmatched', 'pending')
      -- مقارنة ذكية للنوع (مع التنظيف)
      AND (
        normalize_text(o.pallet_type) = v_normalized_batch_type
        OR (
          -- دعم الاختلافات الشائعة
          (normalize_text(o.pallet_type) = 'خشبية' AND v_normalized_batch_type = 'خشب')
          OR (normalize_text(o.pallet_type) = 'خشب' AND v_normalized_batch_type = 'خشبية')
        )
      )
      -- مقارنة المقاس
      AND normalize_text(o.size) = normalize_text(v_batch.size)
      -- منع المطابقة الذاتية
      AND o.phone IS DISTINCT FROM v_batch.phone
      -- تجنب الطلبات التي لها صفقات نشطة
      AND NOT EXISTS (
        SELECT 1 FROM deals d 
        WHERE d.order_id = o.id 
          AND d.status NOT IN ('cancelled', 'failed')
      )
    ORDER BY o.created_at ASC
  LOOP
    -- التحقق من الكمية المتاحة
    IF v_batch.available_quantity <= 0 THEN
      EXIT;
    END IF;

    -- التحقق من الجودة
    v_order_q := COALESCE((v_quality_order->>v_order.quality)::int, 0);
    IF v_order.quality != v_batch.quality THEN
      IF NOT v_order.accept_close_quality OR abs(v_batch_q - v_order_q) > 1 THEN
        CONTINUE;
      END IF;
    END IF;

    -- التحقق من المدينة
    IF normalize_text(v_order.city) != v_normalized_batch_city THEN
      IF NOT v_order.accept_close_city THEN
        CONTINUE;
      END IF;
    END IF;

    -- حساب الكمية المطابقة
    IF v_order.accept_partial_delivery THEN
      v_matched_qty := LEAST(v_order.quantity, v_batch.available_quantity);
    ELSE
      IF v_batch.available_quantity < v_order.quantity THEN
        CONTINUE;
      END IF;
      v_matched_qty := v_order.quantity;
    END IF;

    IF v_matched_qty <= 0 THEN
      CONTINUE;
    END IF;

    -- حساب السعر
    v_price := calculate_dynamic_price(
      v_batch.pallet_type,
      v_batch.quality,
      v_batch.size,
      v_matched_qty
    );

    -- إنشاء الصفقة
    v_deal_result := create_deal_with_reservation(
      v_order.id,
      v_batch.id,
      v_order.phone,
      v_batch.phone,
      v_batch.pallet_type,
      v_batch.size,
      v_batch.quality,
      v_batch.city,
      v_matched_qty,
      v_price,
      v_order.request_id
    );

    IF (v_deal_result->>'success')::boolean THEN
      -- تحديث حالة الطلب
      UPDATE orders SET
        status = 'matched',
        matched_quantity = v_matched_qty,
        matched_price = v_price,
        updated_at = now()
      WHERE id = v_order.id;

      v_matches_count := v_matches_count + 1;

      -- تحديث الكمية المتاحة
      SELECT available_quantity INTO v_batch.available_quantity
      FROM inventory_batches
      WHERE id = p_batch_id;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true, 
    'matches', v_matches_count,
    'batch_id', p_batch_id
  );
END;
$$;

-- ================================================================
-- إصلاح دالة الـ Trigger
-- ================================================================
CREATE OR REPLACE FUNCTION trigger_smart_auto_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_auto_matching_enabled boolean;
BEGIN
  -- التحقق من تفعيل المطابقة التلقائية
  SELECT COALESCE((general_settings->>'auto_matching_enabled')::boolean, true)
  INTO v_auto_matching_enabled
  FROM platform_settings
  LIMIT 1;

  -- تنفيذ المطابقة إذا كانت مفعّلة
  IF COALESCE(v_auto_matching_enabled, true) 
     AND NEW.status = 'active' 
     AND COALESCE(NEW.available_quantity, 0) > 0 THEN
    v_result := smart_auto_match_orders(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- ================================================================
-- دالة لمطابقة الطلبات الموجودة يدوياً
-- ================================================================
CREATE OR REPLACE FUNCTION match_all_pending_orders()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_batch RECORD;
  v_result jsonb;
  v_total_matches int := 0;
  v_results jsonb := '[]'::jsonb;
BEGIN
  -- المرور على جميع دفعات المخزون المتاحة
  FOR v_batch IN
    SELECT id, pallet_type, size, quality, city, available_quantity
    FROM inventory_batches
    WHERE status = 'active' AND available_quantity > 0
    ORDER BY created_at DESC
  LOOP
    -- محاولة المطابقة لكل دفعة
    v_result := smart_auto_match_orders(v_batch.id);
    
    IF (v_result->>'success')::boolean THEN
      v_total_matches := v_total_matches + COALESCE((v_result->>'matches')::int, 0);
      v_results := v_results || jsonb_build_object(
        'batch_id', v_batch.id,
        'matches', v_result->>'matches'
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'total_matches', v_total_matches,
    'details', v_results
  );
END;
$$;

-- ================================================================
-- تنظيف البيانات الموجودة
-- ================================================================
-- تنظيف المسافات الزائدة في جدول inventory_batches
UPDATE inventory_batches
SET 
  pallet_type = normalize_text(pallet_type),
  size = normalize_text(size),
  city = normalize_text(city)
WHERE 
  pallet_type != normalize_text(pallet_type)
  OR size != normalize_text(size)
  OR city != normalize_text(city);

-- تنظيف المسافات الزائدة في جدول orders
UPDATE orders
SET 
  pallet_type = normalize_text(pallet_type),
  size = normalize_text(size),
  city = normalize_text(city)
WHERE 
  pallet_type != normalize_text(pallet_type)
  OR size != normalize_text(size)
  OR city != normalize_text(city);

-- ================================================================
-- تنفيذ المطابقة للطلبات الموجودة
-- ================================================================
-- هذه تُنفذ تلقائياً عند التطبيق
SELECT match_all_pending_orders();

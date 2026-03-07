/*
  # إصلاح نهائي وشامل لنظام الأسعار والعمولات - الإصدار 2

  1. المشاكل الجذرية المكتشفة
    - دالة smart_auto_match_orders تستخدم calculate_dynamic_price (أسعار وهمية)
    - يجب استخدام price_per_pallet من المخزون مباشرة
    - العمولة يجب أن تُقرأ من platform_settings
    - دالة create_deal_with_reservation تحتاج تحديث شامل
    - لا توجد إعدادات للعمولة في platform_settings

  2. الحل النهائي
    - إضافة إعداد العمولة في general_settings
    - تحديث smart_auto_match_orders لاستخدام price_per_pallet
    - تحديث create_deal_with_reservation لحساب الأسعار بشكل صحيح
    - تصحيح الصفقات الموجودة

  3. معادلة الحساب الصحيحة
    - supplier_price = inventory_batches.price_per_pallet (سعر المورد)
    - platform_fee_per_pallet = من الإعدادات (0.25 ريال)
    - platform_fee = platform_fee_per_pallet × quantity
    - buyer_price = supplier_price + platform_fee_per_pallet
    - final_price = supplier_price (للعرض)

  4. الأمان
    - جميع الدوال SECURITY DEFINER
    - لا تعديل على RLS
*/

-- ================================================================
-- إضافة إعدادات العمولة في platform_settings
-- ================================================================
UPDATE platform_settings
SET general_settings = jsonb_set(
  COALESCE(general_settings, '{}'::jsonb),
  '{commission_per_pallet}',
  '0.25'::jsonb
)
WHERE id IS NOT NULL;

-- ================================================================
-- حذف الدالة القديمة وإعادة إنشائها
-- ================================================================
DROP FUNCTION IF EXISTS create_deal_with_reservation(uuid, uuid, text, text, text, text, text, text, integer, numeric, text);

CREATE FUNCTION create_deal_with_reservation(
  p_order_id            uuid,
  p_inventory_batch_id  uuid,
  p_buyer_phone         text,
  p_supplier_phone      text,
  p_pallet_type         text,
  p_size                text,
  p_quality             text,
  p_city                text,
  p_quantity            integer,
  p_supplier_price      numeric,  -- سعر المورد الفعلي
  p_request_id          text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch     inventory_batches%ROWTYPE;
  v_deal_id   uuid;
  v_deal_ref  text;
  v_expires   timestamptz;
  v_commission_per_pallet numeric;
  v_platform_fee numeric;
  v_buyer_price numeric;
  v_final_supplier_price numeric;
BEGIN
  -- منع المطابقة الذاتية
  IF p_buyer_phone IS NOT NULL
     AND p_supplier_phone IS NOT NULL
     AND p_buyer_phone = p_supplier_phone THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'self_match: buyer and supplier are the same user'
    );
  END IF;

  -- قفل سجل المخزون
  SELECT * INTO v_batch
  FROM inventory_batches
  WHERE id = p_inventory_batch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Inventory batch not found');
  END IF;

  -- التحقق من الكمية المتاحة
  IF v_batch.available_quantity < p_quantity THEN
    RETURN jsonb_build_object(
      'success',   false,
      'error',     'Insufficient available quantity',
      'available', v_batch.available_quantity
    );
  END IF;

  -- قراءة العمولة من الإعدادات
  SELECT COALESCE(
    (general_settings->>'commission_per_pallet')::numeric,
    0.25
  ) INTO v_commission_per_pallet
  FROM platform_settings
  LIMIT 1;
  
  IF v_commission_per_pallet IS NULL THEN
    v_commission_per_pallet := 0.25;
  END IF;

  -- استخدام سعر المورد الفعلي من المخزون
  v_final_supplier_price := COALESCE(
    p_supplier_price,
    v_batch.price_per_pallet,
    v_batch.min_price,
    0
  );

  -- حساب الأسعار بشكل صحيح
  v_platform_fee := v_commission_per_pallet * p_quantity;
  v_buyer_price := v_final_supplier_price + v_commission_per_pallet;

  v_deal_ref := 'DEL-' || upper(substring(gen_random_uuid()::text, 1, 6));
  v_expires  := now() + interval '30 minutes';

  INSERT INTO deals (
    deal_ref, request_id, order_id, inventory_batch_id,
    buyer_phone, supplier_phone,
    pallet_type, size, quality, city,
    quantity, final_price, status,
    supplier_price, platform_fee_per_pallet, platform_fee, buyer_price,
    reservation_expires_at, reserved_at
  ) VALUES (
    v_deal_ref, p_request_id, p_order_id, p_inventory_batch_id,
    p_buyer_phone, p_supplier_phone,
    p_pallet_type, p_size, p_quality, p_city,
    p_quantity, v_final_supplier_price, 'matched',
    v_final_supplier_price, v_commission_per_pallet, v_platform_fee, v_buyer_price,
    v_expires, now()
  )
  RETURNING id INTO v_deal_id;

  -- نقل الكمية: متاح → محجوز
  UPDATE inventory_batches
  SET
    available_quantity = available_quantity - p_quantity,
    reserved_quantity  = reserved_quantity  + p_quantity,
    updated_at         = now()
  WHERE id = p_inventory_batch_id;

  RETURN jsonb_build_object(
    'success',  true,
    'deal_id',  v_deal_id,
    'deal_ref', v_deal_ref,
    'supplier_price', v_final_supplier_price,
    'platform_fee', v_platform_fee,
    'buyer_price', v_buyer_price
  );
END;
$$;

-- ================================================================
-- دالة محسّنة للمطابقة التلقائية مع سعر المورد الفعلي
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
  v_supplier_price numeric;
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

  -- استخدام سعر المورد الفعلي من المخزون
  v_supplier_price := COALESCE(v_batch.price_per_pallet, v_batch.min_price, 0);

  -- البحث عن الطلبات المطابقة
  FOR v_order IN
    SELECT o.*
    FROM orders o
    WHERE o.status IN ('unmatched', 'pending')
      -- مقارنة ذكية للنوع
      AND (
        normalize_text(o.pallet_type) = v_normalized_batch_type
        OR (
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

    -- إنشاء الصفقة مع سعر المورد الفعلي
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
      v_supplier_price,  -- سعر المورد الفعلي من المخزون
      v_order.request_id
    );

    IF (v_deal_result->>'success')::boolean THEN
      -- تحديث حالة الطلب
      UPDATE orders SET
        status = 'matched',
        matched_quantity = v_matched_qty,
        matched_price = v_supplier_price,
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
-- تحديث دالة match_all_pending_orders
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
    SELECT id, pallet_type, size, quality, city, available_quantity, price_per_pallet
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
-- تصحيح الصفقات الموجودة
-- ================================================================
DO $$
DECLARE
  v_deal RECORD;
  v_commission numeric;
BEGIN
  -- قراءة العمولة من الإعدادات
  SELECT COALESCE(
    (general_settings->>'commission_per_pallet')::numeric,
    0.25
  ) INTO v_commission
  FROM platform_settings
  LIMIT 1;

  -- تحديث الصفقات الموجودة
  FOR v_deal IN
    SELECT 
      d.id,
      d.quantity,
      COALESCE(ib.price_per_pallet, ib.min_price, d.final_price) as correct_supplier_price
    FROM deals d
    JOIN inventory_batches ib ON d.inventory_batch_id = ib.id
    WHERE d.supplier_price != COALESCE(ib.price_per_pallet, ib.min_price)
       OR d.platform_fee_per_pallet != v_commission
  LOOP
    UPDATE deals
    SET
      supplier_price = v_deal.correct_supplier_price,
      platform_fee_per_pallet = v_commission,
      platform_fee = v_commission * v_deal.quantity,
      buyer_price = v_deal.correct_supplier_price + v_commission,
      final_price = v_deal.correct_supplier_price,
      updated_at = now()
    WHERE id = v_deal.id;
  END LOOP;
END $$;

-- ================================================================
-- منح الصلاحيات
-- ================================================================
GRANT EXECUTE ON FUNCTION smart_auto_match_orders(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION create_deal_with_reservation(uuid, uuid, text, text, text, text, text, text, integer, numeric, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION match_all_pending_orders() TO authenticated, anon;

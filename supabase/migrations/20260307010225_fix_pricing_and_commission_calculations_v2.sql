/*
  # إصلاح حساب الأسعار والعمولات

  1. المشاكل المكتشفة
    - الوظائف تستخدم أسعار ديناميكية بدلاً من سعر المورد الفعلي (min_price)
    - العمولة مبرمجة بقيمة ثابتة 1 ريال بدلاً من القراءة من الإعدادات
    - لا يتم حساب الأسعار بشكل صحيح عند إنشاء الصفقة

  2. الإصلاحات
    - إضافة إعداد للعمولة في platform_settings (نوع jsonb)
    - تحديث وظيفة auto_match_unmatched_orders لاستخدام سعر المورد الفعلي
    - تحديث وظيفة create_deal_with_reservation لحساب الأسعار بشكل صحيح
    - تحديث وظيفة supplier_confirm_deal_v4 لقراءة العمولة من الإعدادات

  3. آلية الحساب الصحيحة
    - supplier_price = سعر المورد من المخزون (min_price)
    - platform_fee_per_pallet = العمولة من الإعدادات (0.25 ريال)
    - platform_fee = platform_fee_per_pallet * quantity
    - buyer_price = supplier_price + platform_fee_per_pallet
    - final_price = supplier_price (السعر الذي يظهر في الصفقة هو سعر المورد)
*/

-- إضافة إعداد العمولة إلى platform_settings
INSERT INTO platform_settings (group_key, setting_key, setting_value, label, description)
VALUES ('pricing', 'platform_commission_per_pallet', '0.25'::jsonb, 'عمولة المنصة للطبلية الواحدة', 'المبلغ الذي تأخذه المنصة عن كل طبلية (بالريال)')
ON CONFLICT (group_key, setting_key) 
DO UPDATE SET 
  setting_value = '0.25'::jsonb,
  label = 'عمولة المنصة للطبلية الواحدة',
  description = 'المبلغ الذي تأخذه المنصة عن كل طبلية (بالريال)',
  updated_at = now();

-- ================================================================
-- تحديث وظيفة المطابقة التلقائية لاستخدام سعر المورد الفعلي
-- ================================================================
CREATE OR REPLACE FUNCTION auto_match_unmatched_orders(p_batch_id uuid)
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
BEGIN
  SELECT * INTO v_batch
  FROM inventory_batches
  WHERE id = p_batch_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'batch_not_found');
  END IF;

  IF v_batch.available_quantity <= 0 THEN
    RETURN jsonb_build_object('success', true, 'matches', 0, 'reason', 'no_available_quantity');
  END IF;

  v_batch_q := COALESCE((v_quality_order->>v_batch.quality)::int, 0);

  FOR v_order IN
    SELECT o.*
    FROM orders o
    WHERE o.status IN ('unmatched', 'pending')
      AND o.pallet_type = v_batch.pallet_type
      AND o.size = v_batch.size
      AND o.phone IS DISTINCT FROM v_batch.phone
      AND NOT EXISTS (
        SELECT 1 FROM deals d 
        WHERE d.order_id = o.id 
          AND d.status NOT IN ('cancelled')
      )
    ORDER BY o.created_at ASC
  LOOP
    IF v_batch.available_quantity <= 0 THEN
      EXIT;
    END IF;

    v_order_q := COALESCE((v_quality_order->>v_order.quality)::int, 0);
    IF v_order.quality != v_batch.quality THEN
      IF NOT v_order.accept_close_quality OR abs(v_batch_q - v_order_q) > 1 THEN
        CONTINUE;
      END IF;
    END IF;

    IF v_order.city != v_batch.city THEN
      IF NOT v_order.accept_close_city THEN
        CONTINUE;
      END IF;
    END IF;

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

    -- استخدام سعر المورد الفعلي من المخزون (min_price)
    v_price := COALESCE(v_batch.min_price, 0);

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
      UPDATE orders SET
        status = 'matched',
        matched_quantity = v_matched_qty,
        matched_price = v_price,
        updated_at = now()
      WHERE id = v_order.id;

      v_matches_count := v_matches_count + 1;

      SELECT available_quantity INTO v_batch.available_quantity
      FROM inventory_batches
      WHERE id = p_batch_id;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'matches', v_matches_count);
END;
$$;

-- ================================================================
-- تحديث وظيفة إنشاء الصفقة لحساب العمولة بشكل صحيح
-- ================================================================
CREATE OR REPLACE FUNCTION create_deal_with_reservation(
  p_order_id            uuid,
  p_inventory_batch_id  uuid,
  p_buyer_phone         text,
  p_supplier_phone      text,
  p_pallet_type         text,
  p_size                text,
  p_quality             text,
  p_city                text,
  p_quantity            integer,
  p_final_price         numeric,
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
  v_supplier_price numeric;
  v_platform_fee numeric;
  v_buyer_price numeric;
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
  SELECT (setting_value::text)::numeric INTO v_commission_per_pallet
  FROM platform_settings
  WHERE group_key = 'pricing' AND setting_key = 'platform_commission_per_pallet';
  
  IF v_commission_per_pallet IS NULL THEN
    v_commission_per_pallet := 0.25; -- القيمة الافتراضية
  END IF;

  -- حساب الأسعار
  v_supplier_price := p_final_price; -- السعر من المورد
  v_platform_fee := v_commission_per_pallet * p_quantity;
  v_buyer_price := v_supplier_price + v_commission_per_pallet;

  v_deal_ref := 'DEL-' || upper(substring(gen_random_uuid()::text, 1, 6));
  v_expires  := now() + interval '30 minutes';

  INSERT INTO deals (
    deal_ref, request_id, order_id, inventory_batch_id,
    buyer_phone, supplier_phone,
    pallet_type, size, quality, city,
    quantity, final_price, status,
    supplier_price, platform_fee_per_pallet, platform_fee, buyer_price,
    reservation_expires_at
  ) VALUES (
    v_deal_ref, p_request_id, p_order_id, p_inventory_batch_id,
    p_buyer_phone, p_supplier_phone,
    p_pallet_type, p_size, p_quality, p_city,
    p_quantity, v_supplier_price, 'matched',
    v_supplier_price, v_commission_per_pallet, v_platform_fee, v_buyer_price,
    v_expires
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
    'deal_ref', v_deal_ref
  );
END;
$$;

-- ================================================================
-- تحديث وظيفة تأكيد المورد لقراءة العمولة من الإعدادات
-- ================================================================
CREATE OR REPLACE FUNCTION supplier_confirm_deal_v4(
  p_deal_id uuid,
  p_supplier_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deal deals%ROWTYPE;
  v_commission_per_pallet numeric;
BEGIN
  SELECT * INTO v_deal FROM deals WHERE id = p_deal_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الصفقة غير موجودة');
  END IF;

  IF v_deal.supplier_phone != p_supplier_phone THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح لك بتأكيد هذه الصفقة');
  END IF;

  IF v_deal.status != 'matched' THEN
    RETURN jsonb_build_object('success', false, 'error', 'لا يمكن تأكيد صفقة بحالة: ' || v_deal.status);
  END IF;

  -- قراءة العمولة من الإعدادات
  SELECT (setting_value::text)::numeric INTO v_commission_per_pallet
  FROM platform_settings
  WHERE group_key = 'pricing' AND setting_key = 'platform_commission_per_pallet';
  
  IF v_commission_per_pallet IS NULL THEN
    v_commission_per_pallet := 0.25;
  END IF;

  -- إذا كانت الأسعار غير محسوبة، احسبها الآن
  IF v_deal.supplier_price IS NULL OR v_deal.platform_fee IS NULL THEN
    UPDATE deals SET
      status = 'awaiting_buyer',
      supplier_confirmed_at = now(),
      supplier_price = v_deal.final_price,
      platform_fee_per_pallet = v_commission_per_pallet,
      platform_fee = v_deal.quantity * v_commission_per_pallet,
      buyer_price = v_deal.final_price + v_commission_per_pallet,
      updated_at = now()
    WHERE id = p_deal_id;
  ELSE
    UPDATE deals SET
      status = 'awaiting_buyer',
      supplier_confirmed_at = now(),
      updated_at = now()
    WHERE id = p_deal_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION auto_match_unmatched_orders(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION create_deal_with_reservation(uuid, uuid, text, text, text, text, text, text, integer, numeric, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION supplier_confirm_deal_v4(uuid, text) TO authenticated, anon;
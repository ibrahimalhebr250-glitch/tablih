/*
  # تحديث منطق المطابقة لتشمل حالة الطبلية

  1. التغييرات
    - تحديث دالة ultra_smart_match_order لمطابقة حالة الطبلية
    - تحديث دالة manual_match_existing_orders لتشمل pallet_condition

  2. المنطق
    - يجب أن تتطابق حالة الطبلية (new, used, repairable)
    - إذا كان الطلب يطلب "new"، لن يتطابق مع "used" أو "repairable"
    - إذا كان الطلب يطلب "used"، سيتطابق مع "used" فقط

  3. الأمان
    - SECURITY DEFINER
*/

-- ================================================================
-- تحديث دالة ultra_smart_match_order
-- ================================================================
CREATE OR REPLACE FUNCTION ultra_smart_match_order(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_batch RECORD;
  v_result jsonb;
  v_deal_id uuid;
  v_deal_ref text;
  v_matched boolean := false;
  v_commission_per_pallet numeric;
  v_platform_fee numeric;
  v_buyer_price numeric;
BEGIN
  -- جلب معلومات الطلب
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;
  
  -- التحقق من حالة الطلب
  IF v_order.status NOT IN ('unmatched', 'partially_matched') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order is not eligible for matching');
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
  
  -- البحث عن مخزون مطابق
  SELECT * INTO v_batch
  FROM inventory_batches
  WHERE phone != v_order.phone
    AND pallet_type = v_order.pallet_type
    AND size = v_order.size
    AND quality = v_order.quality
    AND city = v_order.city
    AND pallet_condition = COALESCE(v_order.pallet_condition, 'new')
    AND available_quantity > 0
    AND status = 'active'
    AND approval_status = 'approved'
    AND NOT hide_from_matching
  ORDER BY 
    CASE WHEN price_per_pallet IS NOT NULL THEN 0 ELSE 1 END,
    price_per_pallet ASC NULLS LAST,
    created_at ASC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'matched', false,
      'message', 'No matching inventory found'
    );
  END IF;
  
  -- حساب الأسعار
  v_platform_fee := v_commission_per_pallet * v_order.quantity;
  v_buyer_price := COALESCE(v_batch.price_per_pallet, v_batch.min_price, 0) + v_commission_per_pallet;
  
  v_deal_ref := 'DEL-' || upper(substring(gen_random_uuid()::text, 1, 6));
  
  -- إنشاء الصفقة
  INSERT INTO deals (
    deal_ref, request_id, order_id, inventory_batch_id,
    buyer_phone, supplier_phone,
    pallet_type, size, quality, city,
    quantity, final_price, status,
    supplier_price, platform_fee_per_pallet, platform_fee, buyer_price,
    reservation_expires_at, reserved_at
  ) VALUES (
    v_deal_ref, v_order.request_id, p_order_id, v_batch.id,
    v_order.phone, v_batch.phone,
    v_order.pallet_type, v_order.size, v_order.quality, v_order.city,
    LEAST(v_order.quantity, v_batch.available_quantity),
    COALESCE(v_batch.price_per_pallet, v_batch.min_price, 0),
    'matched',
    COALESCE(v_batch.price_per_pallet, v_batch.min_price, 0),
    v_commission_per_pallet,
    v_platform_fee,
    v_buyer_price,
    now() + interval '30 minutes',
    now()
  )
  RETURNING id INTO v_deal_id;
  
  -- تحديث المخزون
  UPDATE inventory_batches
  SET
    available_quantity = available_quantity - LEAST(v_order.quantity, v_batch.available_quantity),
    reserved_quantity = reserved_quantity + LEAST(v_order.quantity, v_batch.available_quantity),
    updated_at = now()
  WHERE id = v_batch.id;
  
  -- حساب الكمية المطابقة الإجمالية
  DECLARE
    v_total_matched_qty int;
    v_new_status text;
  BEGIN
    SELECT COALESCE(SUM(d.quantity), 0) INTO v_total_matched_qty
    FROM deals d
    WHERE d.order_id = p_order_id
      AND d.status NOT IN ('cancelled', 'failed');
    
    IF v_total_matched_qty >= v_order.quantity THEN
      v_new_status := 'matched';
    ELSE
      v_new_status := 'partially_matched';
    END IF;
    
    UPDATE orders
    SET 
      status = v_new_status,
      matched_quantity = v_total_matched_qty,
      updated_at = now()
    WHERE id = p_order_id;
  END;
  
  RETURN jsonb_build_object(
    'success', true,
    'matched', true,
    'deal_id', v_deal_id,
    'deal_ref', v_deal_ref,
    'quantity', LEAST(v_order.quantity, v_batch.available_quantity),
    'supplier_phone', v_batch.phone
  );
END;
$$;

-- ================================================================
-- تحديث دالة manual_match_existing_orders
-- ================================================================
CREATE OR REPLACE FUNCTION manual_match_existing_orders()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_batch RECORD;
  v_matched_count int := 0;
  v_total_orders int := 0;
  v_result jsonb;
BEGIN
  FOR v_order IN
    SELECT *
    FROM orders
    WHERE status IN ('unmatched', 'partially_matched')
    ORDER BY created_at ASC
  LOOP
    v_total_orders := v_total_orders + 1;
    
    SELECT * INTO v_batch
    FROM inventory_batches
    WHERE phone != v_order.phone
      AND pallet_type = v_order.pallet_type
      AND size = v_order.size
      AND quality = v_order.quality
      AND city = v_order.city
      AND pallet_condition = COALESCE(v_order.pallet_condition, 'new')
      AND available_quantity > 0
      AND status = 'active'
      AND approval_status = 'approved'
      AND NOT hide_from_matching
    ORDER BY 
      CASE WHEN price_per_pallet IS NOT NULL THEN 0 ELSE 1 END,
      price_per_pallet ASC NULLS LAST,
      created_at ASC
    LIMIT 1;
    
    IF FOUND THEN
      v_result := ultra_smart_match_order(v_order.id);
      
      IF (v_result->>'matched')::boolean THEN
        v_matched_count := v_matched_count + 1;
      END IF;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'total_orders', v_total_orders,
    'matched_count', v_matched_count
  );
END;
$$;

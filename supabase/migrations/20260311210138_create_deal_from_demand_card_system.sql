/*
  # نظام الصفقات من بطاقات الطلب (مسار بطاقات الطلب)

  ## الهدف
  يتيح هذا النظام للمورد إنشاء صفقة مباشرة من بطاقة طلب المشتري في السوق.
  يعمل بعكس مسار بطاقات العرض:
  - المورد يرى بطاقة طلب المشتري ويقدم عرض توريد
  - تُنشأ الصفقة بحالة pending_buyer (بانتظار موافقة المشتري)
  - المشتري يقبل أو يرفض العرض
  - عند القبول تنتقل إلى in_delivery للتفاوض عبر واتساب
  - المورد يؤكد أو يفشل التسليم

  ## الدوال الجديدة
  1. `create_deal_from_demand_card` - المورد ينشئ صفقة من بطاقة طلب → pending_buyer
  2. `buyer_accept_demand_deal` - المشتري يقبل عرض المورد → in_delivery
  3. `buyer_reject_demand_deal` - المشتري يرفض عرض المورد → cancelled
  4. `supplier_confirm_delivery_demand_card` - المورد يؤكد التسليم → completed + خصم مخزون + نقل للمشتري
  5. `supplier_fail_delivery_demand_card` - المورد يفشل التسليم → cancelled

  ## ملاحظات
  - يحفظ source = 'demand_card' للتمييز
  - يدعم الكميات الجزئية (المورد يعرض أقل من الكمية الكاملة)
  - يجب أن يكون للمورد مخزون من نفس نوع الطبلية
  - حالة pending_buyer جديدة يجب معالجتها في RLS
*/

-- =====================================================
-- 1. دالة إنشاء الصفقة من بطاقة الطلب
--    المورد يقدم عرض توريد لطلب المشتري
-- =====================================================
CREATE OR REPLACE FUNCTION create_deal_from_demand_card(
  p_supplier_phone      TEXT,
  p_order_id            UUID,
  p_inventory_batch_id  UUID,
  p_quantity            INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order           orders%ROWTYPE;
  v_batch           inventory_batches%ROWTYPE;
  v_deal_id         UUID;
  v_deal_ref        TEXT;
  v_platform_fee_pp NUMERIC;
  v_platform_fee    NUMERIC;
  v_settings        platform_settings%ROWTYPE;
  v_existing_deal   UUID;
BEGIN
  -- جلب بيانات الطلب
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id
    AND publish_to_market = TRUE
    AND status NOT IN ('fulfilled', 'cancelled');

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الطلب غير متاح');
  END IF;

  -- التحقق أن المورد ليس هو المشتري
  IF v_order.phone = p_supplier_phone THEN
    RETURN jsonb_build_object('success', false, 'error', 'لا يمكنك تقديم عرض لطلبك الخاص');
  END IF;

  -- التحقق من الكمية
  IF p_quantity < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'الكمية يجب أن تكون 1 على الأقل');
  END IF;

  -- جلب دفعة المخزون للمورد
  SELECT * INTO v_batch
  FROM inventory_batches
  WHERE id = p_inventory_batch_id
    AND phone = p_supplier_phone
    AND quantity_available >= p_quantity;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الكمية في مخزونك غير كافية');
  END IF;

  -- التحقق من عدم وجود صفقة نشطة مسبقاً من نفس المورد لنفس الطلب
  SELECT id INTO v_existing_deal
  FROM deals
  WHERE supplier_phone = p_supplier_phone
    AND order_id = p_order_id
    AND source = 'demand_card'
    AND status NOT IN ('cancelled')
  LIMIT 1;

  IF v_existing_deal IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'لديك عرض نشط بالفعل لهذا الطلب', 'existing_deal_id', v_existing_deal);
  END IF;

  -- جلب إعدادات المنصة
  SELECT * INTO v_settings FROM platform_settings LIMIT 1;
  v_platform_fee_pp := COALESCE(v_settings.platform_fee_per_pallet, 0.25);
  v_platform_fee := v_platform_fee_pp * p_quantity;

  -- توليد مرجع الصفقة
  v_deal_ref := 'DC-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || SUBSTRING(gen_random_uuid()::TEXT, 1, 6);

  -- إنشاء الصفقة بحالة pending_buyer
  INSERT INTO deals (
    deal_ref,
    order_id,
    inventory_batch_id,
    buyer_phone,
    supplier_phone,
    pallet_type,
    size,
    quality,
    city,
    quantity,
    final_price,
    platform_fee,
    platform_fee_per_pallet,
    status,
    source,
    created_at,
    updated_at
  ) VALUES (
    v_deal_ref,
    p_order_id,
    p_inventory_batch_id,
    v_order.phone,
    p_supplier_phone,
    v_batch.pallet_type,
    v_batch.size,
    v_batch.quality,
    v_batch.city,
    p_quantity,
    COALESCE(v_batch.price_per_pallet, 0) * p_quantity,
    v_platform_fee,
    v_platform_fee_pp,
    'pending_buyer',
    'demand_card',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_deal_id;

  RETURN jsonb_build_object(
    'success', true,
    'deal_id', v_deal_id,
    'deal_ref', v_deal_ref
  );
END;
$$;

-- =====================================================
-- 2. المشتري يقبل عرض المورد
-- =====================================================
CREATE OR REPLACE FUNCTION buyer_accept_demand_deal(
  p_deal_id     UUID,
  p_buyer_phone TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deal deals%ROWTYPE;
BEGIN
  SELECT * INTO v_deal
  FROM deals
  WHERE id = p_deal_id
    AND buyer_phone = p_buyer_phone
    AND status = 'pending_buyer'
    AND source = 'demand_card';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الصفقة غير موجودة أو تم معالجتها');
  END IF;

  UPDATE deals
  SET
    status = 'in_delivery',
    buyer_confirmed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_deal_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- =====================================================
-- 3. المشتري يرفض عرض المورد
-- =====================================================
CREATE OR REPLACE FUNCTION buyer_reject_demand_deal(
  p_deal_id     UUID,
  p_buyer_phone TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deal deals%ROWTYPE;
BEGIN
  SELECT * INTO v_deal
  FROM deals
  WHERE id = p_deal_id
    AND buyer_phone = p_buyer_phone
    AND status = 'pending_buyer'
    AND source = 'demand_card';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الصفقة غير موجودة');
  END IF;

  UPDATE deals
  SET
    status = 'cancelled',
    cancelled_at = NOW(),
    cancel_reason = 'رفض المشتري',
    updated_at = NOW()
  WHERE id = p_deal_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- =====================================================
-- 4. المورد يؤكد التسليم من بطاقة الطلب
--    يخصم الكمية من مخزون المورد وينقلها للمشتري
-- =====================================================
CREATE OR REPLACE FUNCTION supplier_confirm_delivery_demand_card(
  p_deal_id        UUID,
  p_supplier_phone TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deal              deals%ROWTYPE;
  v_batch             inventory_batches%ROWTYPE;
  v_platform_fee_pp   NUMERIC;
  v_platform_fee      NUMERIC;
  v_settings          platform_settings%ROWTYPE;
  v_buyer_batch_id    UUID;
BEGIN
  SELECT * INTO v_deal
  FROM deals
  WHERE id = p_deal_id
    AND supplier_phone = p_supplier_phone
    AND status = 'in_delivery'
    AND source = 'demand_card';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الصفقة غير موجودة أو الحالة غير صحيحة');
  END IF;

  -- خصم الكمية من مخزون المورد
  IF v_deal.inventory_batch_id IS NOT NULL THEN
    SELECT * INTO v_batch
    FROM inventory_batches
    WHERE id = v_deal.inventory_batch_id;

    IF FOUND THEN
      IF v_batch.quantity_available < v_deal.quantity THEN
        RETURN jsonb_build_object('success', false, 'error', 'الكمية في المخزون غير كافية');
      END IF;

      UPDATE inventory_batches
      SET
        quantity_available = GREATEST(0, quantity_available - v_deal.quantity),
        updated_at = NOW()
      WHERE id = v_deal.inventory_batch_id;
    END IF;
  END IF;

  -- نقل الكمية إلى مخزون المشتري السحابي
  SELECT id INTO v_buyer_batch_id
  FROM inventory_batches
  WHERE phone = v_deal.buyer_phone
    AND pallet_type = v_deal.pallet_type
    AND size = v_deal.size
    AND quality = v_deal.quality
    AND city = v_deal.city
    AND source = 'buyer_cloud'
  LIMIT 1;

  IF v_buyer_batch_id IS NULL THEN
    INSERT INTO inventory_batches (
      phone,
      pallet_type,
      size,
      quality,
      city,
      quantity_available,
      source,
      publish_to_market,
      status,
      created_at,
      updated_at
    ) VALUES (
      v_deal.buyer_phone,
      v_deal.pallet_type,
      v_deal.size,
      v_deal.quality,
      v_deal.city,
      v_deal.quantity,
      'buyer_cloud',
      FALSE,
      'available',
      NOW(),
      NOW()
    );
  ELSE
    UPDATE inventory_batches
    SET
      quantity_available = quantity_available + v_deal.quantity,
      updated_at = NOW()
    WHERE id = v_buyer_batch_id;
  END IF;

  -- جلب إعدادات العمولة
  SELECT * INTO v_settings FROM platform_settings LIMIT 1;
  v_platform_fee_pp := COALESCE(v_settings.platform_fee_per_pallet, 0.25);
  v_platform_fee := v_platform_fee_pp * v_deal.quantity;

  -- تسجيل العمولة المعلقة على المورد
  INSERT INTO commission_settlements (
    deal_id,
    supplier_phone,
    amount,
    status,
    created_at,
    updated_at
  ) VALUES (
    p_deal_id,
    p_supplier_phone,
    v_platform_fee,
    'pending',
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING;

  -- إتمام الصفقة
  UPDATE deals
  SET
    status = 'completed',
    completed_at = NOW(),
    platform_fee = v_platform_fee,
    platform_fee_per_pallet = v_platform_fee_pp,
    updated_at = NOW()
  WHERE id = p_deal_id;

  RETURN jsonb_build_object(
    'success', true,
    'quantity_transferred', v_deal.quantity,
    'commission', v_platform_fee
  );
END;
$$;

-- =====================================================
-- 5. المورد يفشل التسليم من بطاقة الطلب
-- =====================================================
CREATE OR REPLACE FUNCTION supplier_fail_delivery_demand_card(
  p_deal_id        UUID,
  p_supplier_phone TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deal deals%ROWTYPE;
BEGIN
  SELECT * INTO v_deal
  FROM deals
  WHERE id = p_deal_id
    AND supplier_phone = p_supplier_phone
    AND status = 'in_delivery'
    AND source = 'demand_card';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الصفقة غير موجودة أو الحالة غير صحيحة');
  END IF;

  UPDATE deals
  SET
    status = 'cancelled',
    cancelled_at = NOW(),
    delivery_failed_at = NOW(),
    cancel_reason = 'فشل التسليم',
    updated_at = NOW()
  WHERE id = p_deal_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- صلاحيات التنفيذ
GRANT EXECUTE ON FUNCTION create_deal_from_demand_card(TEXT, UUID, UUID, INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION buyer_accept_demand_deal(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION buyer_reject_demand_deal(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION supplier_confirm_delivery_demand_card(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION supplier_fail_delivery_demand_card(UUID, TEXT) TO anon, authenticated;

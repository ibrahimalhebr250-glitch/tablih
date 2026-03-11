/*
  # دالة إنشاء صفقة مباشرة من بطاقة عرض المورد

  ## الهدف
  يتيح هذا النظام للمشتري إنشاء صفقة مباشرة من بطاقة عرض المورد في السوق
  بدون الحاجة إلى طلب التفاوض، حيث تُنشأ الصفقة فوراً بحالة pending_supplier
  بانتظار موافقة المورد.

  ## الدوال الجديدة
  1. `create_deal_from_supply_card` - ينشئ صفقة مباشرة بحالة pending_supplier
  2. `supplier_accept_deal_with_pledge` - يقبل المورد الصفقة ويتعهد بالعمولة → حالة negotiation
  3. `supplier_confirm_delivery_from_card` - يؤكد المورد التسليم → completed + خصم مخزون + نقل للمشتري

  ## ملاحظات
  - يدعم الطلبات الجزئية (أقل من الكمية الكاملة)
  - يحفظ source = 'supply_card' للتمييز عن باقي الصفقات
  - عند القبول تصبح الحالة negotiation لبدء التفاوض عبر واتساب
  - عند التسليم يتم خصم الكمية من مخزون المورد ونقلها للمشتري
*/

-- =====================================================
-- 1. دالة إنشاء الصفقة من بطاقة العرض
-- =====================================================
CREATE OR REPLACE FUNCTION create_deal_from_supply_card(
  p_buyer_phone       TEXT,
  p_inventory_batch_id UUID,
  p_quantity          INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch             inventory_batches%ROWTYPE;
  v_deal_id           UUID;
  v_deal_ref          TEXT;
  v_platform_fee_pp   NUMERIC;
  v_platform_fee      NUMERIC;
  v_settings          platform_settings%ROWTYPE;
BEGIN
  -- جلب دفعة المخزون
  SELECT * INTO v_batch
  FROM inventory_batches
  WHERE id = p_inventory_batch_id
    AND publish_to_market = TRUE
    AND quantity_available >= p_quantity;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'العرض غير متاح أو الكمية غير كافية');
  END IF;

  -- التحقق أن المشتري ليس هو المورد
  IF v_batch.phone = p_buyer_phone THEN
    RETURN jsonb_build_object('success', false, 'error', 'لا يمكنك شراء عرضك الخاص');
  END IF;

  -- التحقق من الكمية
  IF p_quantity < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'الكمية يجب أن تكون 1 على الأقل');
  END IF;

  -- جلب إعدادات المنصة
  SELECT * INTO v_settings FROM platform_settings LIMIT 1;
  v_platform_fee_pp := COALESCE(v_settings.platform_fee_per_pallet, 0.25);
  v_platform_fee := v_platform_fee_pp * p_quantity;

  -- توليد مرجع الصفقة
  v_deal_ref := 'SC-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || SUBSTRING(gen_random_uuid()::TEXT, 1, 6);

  -- إنشاء الصفقة بحالة pending_supplier
  INSERT INTO deals (
    deal_ref,
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
    p_inventory_batch_id,
    p_buyer_phone,
    v_batch.phone,
    v_batch.pallet_type,
    v_batch.size,
    v_batch.quality,
    v_batch.city,
    p_quantity,
    COALESCE(v_batch.price_per_pallet, 0) * p_quantity,
    v_platform_fee,
    v_platform_fee_pp,
    'pending_supplier',
    'supply_card',
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
-- 2. دالة قبول المورد للصفقة مع التعهد بالعمولة
-- =====================================================
CREATE OR REPLACE FUNCTION supplier_accept_deal_with_pledge(
  p_deal_id       UUID,
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
    AND status = 'pending_supplier';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الصفقة غير موجودة أو تم معالجتها');
  END IF;

  -- تحديث حالة الصفقة إلى negotiation (جاري التفاوض)
  UPDATE deals
  SET
    status = 'in_delivery',
    supplier_confirmed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_deal_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- =====================================================
-- 3. دالة رفض المورد للصفقة
-- =====================================================
CREATE OR REPLACE FUNCTION supplier_reject_deal_from_card(
  p_deal_id       UUID,
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
    AND status = 'pending_supplier';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الصفقة غير موجودة');
  END IF;

  UPDATE deals
  SET
    status = 'cancelled',
    cancelled_at = NOW(),
    cancel_reason = 'رفض المورد',
    updated_at = NOW()
  WHERE id = p_deal_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- =====================================================
-- 4. دالة تأكيد التسليم من بطاقة العرض
--    تخصم الكمية من مخزون المورد وتنقلها للمشتري
-- =====================================================
CREATE OR REPLACE FUNCTION supplier_confirm_delivery_supply_card(
  p_deal_id       UUID,
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
    AND status = 'in_delivery';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الصفقة غير موجودة أو الحالة غير صحيحة');
  END IF;

  -- جلب دفعة المخزون
  IF v_deal.inventory_batch_id IS NOT NULL THEN
    SELECT * INTO v_batch
    FROM inventory_batches
    WHERE id = v_deal.inventory_batch_id;

    IF FOUND THEN
      -- خصم الكمية من مخزون المورد
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

  -- نقل الكمية إلى المشتري (مخزن المشتري السحابي)
  -- البحث عن دفعة موجودة للمشتري بنفس المواصفات
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
    -- إنشاء دفعة جديدة للمشتري
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
    -- إضافة الكمية للدفعة الموجودة
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

  -- تسجيل العمولة على المورد كعمولة معلقة
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
-- 5. دالة فشل التسليم من بطاقة العرض
-- =====================================================
CREATE OR REPLACE FUNCTION supplier_fail_delivery_supply_card(
  p_deal_id       UUID,
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
    AND status = 'in_delivery';

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
GRANT EXECUTE ON FUNCTION create_deal_from_supply_card(TEXT, UUID, INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION supplier_accept_deal_with_pledge(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION supplier_reject_deal_from_card(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION supplier_confirm_delivery_supply_card(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION supplier_fail_delivery_supply_card(UUID, TEXT) TO anon, authenticated;

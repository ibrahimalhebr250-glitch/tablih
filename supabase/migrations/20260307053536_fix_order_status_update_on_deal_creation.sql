/*
  # إصلاح تحديث حالة الطلب عند إنشاء الصفقة

  1. المشكلة
    - عند إنشاء صفقة، حالة الطلب تبقى "unmatched"
    - يجب تحديث حالة الطلب إلى "matched" أو "partially_matched"
    - يجب تحديث matched_quantity

  2. الحل
    - إضافة trigger على جدول deals
    - عند إنشاء صفقة جديدة، يحدث الطلب تلقائياً
    - إضافة دالة لتحديث حالة الطلب بناءً على الكميات

  3. الأمان
    - SECURITY DEFINER
*/

-- ================================================================
-- دالة تحديث حالة الطلب
-- ================================================================
CREATE OR REPLACE FUNCTION update_order_status_on_deal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_total_matched_qty int;
  v_new_status text;
BEGIN
  -- فقط عند إنشاء أو تحديث صفقة نشطة
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.status NOT IN ('cancelled', 'failed') THEN
    
    -- جلب معلومات الطلب
    SELECT * INTO v_order
    FROM orders
    WHERE id = NEW.order_id;
    
    IF NOT FOUND THEN
      RETURN NEW;
    END IF;
    
    -- حساب إجمالي الكمية المطابقة من جميع الصفقات النشطة
    SELECT COALESCE(SUM(d.quantity), 0) INTO v_total_matched_qty
    FROM deals d
    WHERE d.order_id = NEW.order_id
      AND d.status NOT IN ('cancelled', 'failed');
    
    -- تحديد الحالة الجديدة
    IF v_total_matched_qty = 0 THEN
      v_new_status := 'unmatched';
    ELSIF v_total_matched_qty >= v_order.quantity THEN
      v_new_status := 'matched';
    ELSE
      v_new_status := 'partially_matched';
    END IF;
    
    -- تحديث الطلب
    UPDATE orders
    SET 
      status = v_new_status,
      matched_quantity = v_total_matched_qty,
      updated_at = now()
    WHERE id = NEW.order_id;
    
  -- عند إلغاء أو فشل صفقة
  ELSIF TG_OP = 'UPDATE' AND OLD.status NOT IN ('cancelled', 'failed') AND NEW.status IN ('cancelled', 'failed') THEN
    
    -- إعادة حساب الكمية المطابقة
    SELECT COALESCE(SUM(d.quantity), 0) INTO v_total_matched_qty
    FROM deals d
    WHERE d.order_id = NEW.order_id
      AND d.status NOT IN ('cancelled', 'failed');
    
    -- جلب معلومات الطلب
    SELECT * INTO v_order
    FROM orders
    WHERE id = NEW.order_id;
    
    -- تحديد الحالة الجديدة
    IF v_total_matched_qty = 0 THEN
      v_new_status := 'unmatched';
    ELSIF v_total_matched_qty >= v_order.quantity THEN
      v_new_status := 'matched';
    ELSE
      v_new_status := 'partially_matched';
    END IF;
    
    -- تحديث الطلب
    UPDATE orders
    SET 
      status = v_new_status,
      matched_quantity = v_total_matched_qty,
      updated_at = now()
    WHERE id = NEW.order_id;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- إزالة الـ trigger القديم إذا كان موجوداً
DROP TRIGGER IF EXISTS trigger_update_order_status_on_deal ON deals;

-- إنشاء trigger جديد
CREATE TRIGGER trigger_update_order_status_on_deal
  AFTER INSERT OR UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION update_order_status_on_deal();

-- ================================================================
-- تحديث دالة create_deal_with_reservation لتحديث الطلب مباشرة
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
  p_supplier_price      numeric,
  p_request_id          text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch     inventory_batches%ROWTYPE;
  v_order     orders%ROWTYPE;
  v_deal_id   uuid;
  v_deal_ref  text;
  v_expires   timestamptz;
  v_commission_per_pallet numeric;
  v_platform_fee numeric;
  v_buyer_price numeric;
  v_final_supplier_price numeric;
  v_total_matched_qty int;
  v_new_order_status text;
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

  -- قفل سجل الطلب
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

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

  -- استخدام سعر المورد الفعلي
  v_final_supplier_price := COALESCE(
    p_supplier_price,
    v_batch.price_per_pallet,
    v_batch.min_price,
    0
  );

  -- حساب الأسعار
  v_platform_fee := v_commission_per_pallet * p_quantity;
  v_buyer_price := v_final_supplier_price + v_commission_per_pallet;

  v_deal_ref := 'DEL-' || upper(substring(gen_random_uuid()::text, 1, 6));
  v_expires  := now() + interval '30 minutes';

  -- إنشاء الصفقة
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

  -- تحديث المخزون: متاح → محجوز
  UPDATE inventory_batches
  SET
    available_quantity = available_quantity - p_quantity,
    reserved_quantity  = reserved_quantity  + p_quantity,
    updated_at         = now()
  WHERE id = p_inventory_batch_id;

  -- حساب الكمية المطابقة الإجمالية للطلب
  SELECT COALESCE(SUM(d.quantity), 0) INTO v_total_matched_qty
  FROM deals d
  WHERE d.order_id = p_order_id
    AND d.status NOT IN ('cancelled', 'failed');

  -- تحديد حالة الطلب
  IF v_total_matched_qty >= v_order.quantity THEN
    v_new_order_status := 'matched';
  ELSE
    v_new_order_status := 'partially_matched';
  END IF;

  -- تحديث الطلب
  UPDATE orders
  SET 
    status = v_new_order_status,
    matched_quantity = v_total_matched_qty,
    updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success',  true,
    'deal_id',  v_deal_id,
    'deal_ref', v_deal_ref,
    'supplier_price', v_final_supplier_price,
    'platform_fee', v_platform_fee,
    'buyer_price', v_buyer_price,
    'order_status', v_new_order_status
  );
END;
$$;

-- ================================================================
-- إصلاح الطلبات الموجودة
-- ================================================================
DO $$
DECLARE
  v_order RECORD;
  v_total_matched_qty int;
  v_new_status text;
BEGIN
  -- معالجة جميع الطلبات التي لها صفقات نشطة
  FOR v_order IN
    SELECT DISTINCT o.id, o.quantity
    FROM orders o
    INNER JOIN deals d ON d.order_id = o.id
    WHERE d.status NOT IN ('cancelled', 'failed')
      AND o.status = 'unmatched'
  LOOP
    -- حساب الكمية المطابقة
    SELECT COALESCE(SUM(d.quantity), 0) INTO v_total_matched_qty
    FROM deals d
    WHERE d.order_id = v_order.id
      AND d.status NOT IN ('cancelled', 'failed');
    
    -- تحديد الحالة
    IF v_total_matched_qty >= v_order.quantity THEN
      v_new_status := 'matched';
    ELSE
      v_new_status := 'partially_matched';
    END IF;
    
    -- تحديث الطلب
    UPDATE orders
    SET 
      status = v_new_status,
      matched_quantity = v_total_matched_qty,
      updated_at = now()
    WHERE id = v_order.id;
  END LOOP;
END $$;

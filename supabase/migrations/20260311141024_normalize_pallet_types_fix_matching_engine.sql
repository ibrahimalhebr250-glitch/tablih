/*
  # Normalize pallet_type values and fix inventory matching

  ## Problem
  inventory_batches stores Arabic pallet types (old system): 'بلاستيك', 'خشب ', 'عالمي / متعدد'
  orders stores English codes (new system): 'plastic', 'wood', 'hdpe'
  Strict equality in get_supplier_matching_inventory fails -> "لا يوجد مخزون"

  ## Fix
  1. Normalize all pallet_type values in both tables to English codes
  2. Create normalize_pallet_type() helper for safe comparison
  3. Rebuild get_supplier_matching_inventory with normalized comparison
  4. Rebuild create_supplier_offer_for_demand with normalized pallet validation
*/

-- Step 1: Normalization helper
CREATE OR REPLACE FUNCTION normalize_pallet_type(p_type text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE trim(lower(p_type))
    WHEN 'plastic'          THEN 'plastic'
    WHEN 'بلاستيك'          THEN 'plastic'
    WHEN 'بلاستيكية'        THEN 'plastic'
    WHEN 'plastic_120x100'  THEN 'plastic'
    WHEN 'plastic_100x120'  THEN 'plastic'
    WHEN 'wood'             THEN 'wood'
    WHEN 'خشب'              THEN 'wood'
    WHEN 'خشب '             THEN 'wood'
    WHEN 'wood_120x100'     THEN 'wood'
    WHEN 'wood_110x110'     THEN 'wood'
    WHEN 'hdpe'             THEN 'hdpe'
    WHEN 'عالمي / متعدد'    THEN 'hdpe'
    WHEN 'hdpe_120x100'     THEN 'hdpe'
    WHEN 'metal'            THEN 'metal'
    WHEN 'معدن'             THEN 'metal'
    WHEN 'metal_120x100'    THEN 'metal'
    ELSE trim(p_type)
  END;
$$;

-- Step 2: Normalize inventory_batches
UPDATE inventory_batches SET pallet_type = 'plastic'
WHERE trim(pallet_type) IN ('بلاستيك','بلاستيكية','plastic_120x100','plastic_100x120');

UPDATE inventory_batches SET pallet_type = 'wood'
WHERE trim(pallet_type) IN ('خشب','خشب ','wood_120x100','wood_110x110');

UPDATE inventory_batches SET pallet_type = 'hdpe'
WHERE trim(pallet_type) IN ('عالمي / متعدد','hdpe_120x100');

UPDATE inventory_batches SET pallet_type = 'metal'
WHERE trim(pallet_type) IN ('معدن','metal_120x100');

-- Step 3: Normalize orders
UPDATE orders SET pallet_type = 'plastic'
WHERE trim(pallet_type) IN ('بلاستيك','بلاستيكية','plastic_120x100','plastic_100x120');

UPDATE orders SET pallet_type = 'wood'
WHERE trim(pallet_type) IN ('خشب','خشب ','wood_120x100','wood_110x110');

UPDATE orders SET pallet_type = 'hdpe'
WHERE trim(pallet_type) IN ('عالمي / متعدد','hdpe_120x100');

UPDATE orders SET pallet_type = 'metal'
WHERE trim(pallet_type) IN ('معدن','metal_120x100');

-- Step 4: Rebuild get_supplier_matching_inventory with normalized comparison
CREATE OR REPLACE FUNCTION get_supplier_matching_inventory(
  p_supplier_phone text,
  p_order_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_batches jsonb;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الطلب غير موجود', 'batches', '[]'::jsonb);
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id',                ib.id,
      'batch_id',          ib.batch_id,
      'pallet_type',       ib.pallet_type,
      'size',              ib.size,
      'quality',           ib.quality,
      'pallet_condition',  ib.pallet_condition,
      'city',              ib.city,
      'available_quantity',ib.available_quantity,
      'price_per_pallet',  ib.price_per_pallet,
      'description',       ib.description,
      'created_at',        ib.created_at
    ) ORDER BY
      CASE
        WHEN ib.quality = v_order.quality AND ib.city = v_order.city THEN 1
        WHEN ib.quality = v_order.quality THEN 2
        WHEN ib.city    = v_order.city    THEN 3
        ELSE 4
      END,
      ib.available_quantity DESC
  ), '[]'::jsonb)
  INTO v_batches
  FROM inventory_batches ib
  WHERE ib.phone = p_supplier_phone
    AND ib.status = 'active'
    AND ib.available_quantity > 0
    AND ib.is_frozen = false
    AND ib.hide_from_matching = false
    AND normalize_pallet_type(ib.pallet_type) = normalize_pallet_type(v_order.pallet_type);

  RETURN jsonb_build_object(
    'success',           true,
    'batches',           v_batches,
    'order_pallet_type', v_order.pallet_type,
    'order_quality',     v_order.quality,
    'order_city',        v_order.city,
    'order_quantity',    v_order.quantity
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_supplier_matching_inventory(text, uuid) TO anon, authenticated;

-- Step 5: Drop and rebuild create_supplier_offer_for_demand with normalized pallet check
DROP FUNCTION IF EXISTS create_supplier_offer_for_demand(text, uuid, integer, numeric, text, uuid);

CREATE OR REPLACE FUNCTION create_supplier_offer_for_demand(
  p_supplier_phone     text,
  p_order_id           uuid,
  p_quantity           integer,
  p_price_per_pallet   numeric,
  p_supplier_message   text DEFAULT NULL,
  p_inventory_batch_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order  orders%ROWTYPE;
  v_batch  inventory_batches%ROWTYPE;
  v_offer_id uuid;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الطلب غير موجود');
  END IF;

  IF v_order.phone = p_supplier_phone THEN
    RETURN jsonb_build_object('success', false, 'error', 'لا يمكنك تقديم عرض على طلبك الخاص');
  END IF;

  IF p_inventory_batch_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'يجب تحديد دفعة من مخزونك السحابي لتقديم العرض. سجّل مخزونك أولاً.');
  END IF;

  SELECT * INTO v_batch FROM inventory_batches WHERE id = p_inventory_batch_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'دفعة المخزون غير موجودة');
  END IF;

  IF v_batch.phone <> p_supplier_phone THEN
    RETURN jsonb_build_object('success', false, 'error', 'هذا المخزون لا يعود لك');
  END IF;

  IF v_batch.status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'هذا المخزون غير نشط حالياً');
  END IF;

  -- Normalized pallet type check
  IF normalize_pallet_type(v_batch.pallet_type) <> normalize_pallet_type(v_order.pallet_type) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'نوع الطبلية في مخزونك (' || v_batch.pallet_type || ') لا يتطابق مع نوع الطلب (' || v_order.pallet_type || ')'
    );
  END IF;

  IF v_batch.available_quantity < p_quantity THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'الكمية المتوفرة في هذه الدفعة (' || v_batch.available_quantity || ') أقل من الكمية المعروضة (' || p_quantity || ')'
    );
  END IF;

  -- Cancel existing pending offer from same supplier on same order
  UPDATE supplier_demand_offers
  SET status = 'cancelled', updated_at = now()
  WHERE order_id = p_order_id
    AND supplier_phone = p_supplier_phone
    AND status = 'pending';

  -- Reserve quantity
  UPDATE inventory_batches
  SET available_quantity = available_quantity - p_quantity,
      quantity_available = quantity_available - p_quantity,
      reserved_quantity  = reserved_quantity  + p_quantity,
      updated_at         = now()
  WHERE id = p_inventory_batch_id;

  -- Insert offer
  INSERT INTO supplier_demand_offers (
    order_id, supplier_phone, inventory_batch_id,
    quantity, price_per_pallet, supplier_message, status
  ) VALUES (
    p_order_id, p_supplier_phone, p_inventory_batch_id,
    p_quantity, p_price_per_pallet, p_supplier_message, 'pending'
  ) RETURNING id INTO v_offer_id;

  -- Best-effort notification to buyer
  BEGIN
    INSERT INTO smart_notifications (user_phone, type, title, message, data)
    VALUES (
      v_order.phone, 'new_offer', 'عرض جديد على طلبك',
      'قدّم مورد عرضاً على طلبيتك. راجع العروض للموافقة.',
      jsonb_build_object('offer_id', v_offer_id, 'order_id', p_order_id)
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object('success', true, 'offer_id', v_offer_id);
END;
$$;

GRANT EXECUTE ON FUNCTION create_supplier_offer_for_demand(text, uuid, integer, numeric, text, uuid) TO anon, authenticated;

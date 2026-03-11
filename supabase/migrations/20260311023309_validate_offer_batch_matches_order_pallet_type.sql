/*
  # Validate Offer Batch Matches Order Pallet Type

  1. Updated Function: `create_supplier_offer_for_demand`
    - Added server-side validation: the inventory batch pallet_type MUST match the order's pallet_type
    - Prevents any bypass from the frontend

  2. Important Notes
    - This is a security/integrity check at the database level
    - Even if someone manipulates the frontend, the backend will reject mismatched types
*/

CREATE OR REPLACE FUNCTION create_supplier_offer_for_demand(
  p_supplier_phone text,
  p_order_id uuid,
  p_quantity integer,
  p_price_per_pallet numeric DEFAULT 0,
  p_supplier_message text DEFAULT NULL,
  p_inventory_batch_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_offer_id uuid;
  v_batch inventory_batches%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الطلب غير موجود');
  END IF;

  IF v_order.phone = p_supplier_phone THEN
    RETURN jsonb_build_object('success', false, 'error', 'لا يمكنك تقديم عرض على طلبك الخاص');
  END IF;

  IF v_order.status NOT IN ('pending', 'unmatched', 'partially_matched') THEN
    RETURN jsonb_build_object('success', false, 'error', 'هذا الطلب غير متاح حالياً');
  END IF;

  IF EXISTS (
    SELECT 1 FROM supplier_demand_offers
    WHERE order_id = p_order_id
    AND supplier_phone = p_supplier_phone
    AND status NOT IN ('rejected','cancelled')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'لديك عرض قيد الانتظار على هذا الطلب');
  END IF;

  IF p_inventory_batch_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'يجب تحديد دفعة من مخزونك السحابي لتقديم العرض. سجّل مخزونك أولاً.');
  END IF;

  SELECT * INTO v_batch
  FROM inventory_batches
  WHERE id = p_inventory_batch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'دفعة المخزون غير موجودة');
  END IF;

  IF v_batch.phone <> p_supplier_phone THEN
    RETURN jsonb_build_object('success', false, 'error', 'هذا المخزون لا يعود لك');
  END IF;

  IF v_batch.status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'هذا المخزون غير نشط حالياً');
  END IF;

  IF v_batch.pallet_type <> v_order.pallet_type THEN
    RETURN jsonb_build_object('success', false, 'error', 'نوع الطبلية في مخزونك (' || v_batch.pallet_type || ') لا يتطابق مع نوع الطلب (' || v_order.pallet_type || ')');
  END IF;

  IF v_batch.available_quantity < p_quantity THEN
    RETURN jsonb_build_object('success', false, 'error', 'الكمية المتوفرة في هذه الدفعة (' || v_batch.available_quantity || ') أقل من الكمية المعروضة (' || p_quantity || ')');
  END IF;

  UPDATE inventory_batches
  SET available_quantity = available_quantity - p_quantity,
      quantity_available = quantity_available - p_quantity,
      reserved_quantity = reserved_quantity + p_quantity,
      updated_at = now()
  WHERE id = p_inventory_batch_id;

  INSERT INTO supplier_demand_offers (
    order_id, supplier_phone, buyer_phone,
    quantity, price_per_pallet, supplier_message,
    inventory_batch_id
  ) VALUES (
    p_order_id, p_supplier_phone, v_order.phone,
    p_quantity, p_price_per_pallet, p_supplier_message,
    p_inventory_batch_id
  )
  RETURNING id INTO v_offer_id;

  RETURN jsonb_build_object('success', true, 'offer_id', v_offer_id);
END;
$$;

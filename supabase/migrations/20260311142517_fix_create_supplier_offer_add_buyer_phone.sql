/*
  # Fix create_supplier_offer_for_demand - Add buyer_phone to INSERT

  The function was missing buyer_phone in the INSERT statement
  which caused a NOT NULL constraint violation.
*/

CREATE OR REPLACE FUNCTION public.create_supplier_offer_for_demand(
  p_supplier_phone text,
  p_order_id uuid,
  p_quantity integer,
  p_price_per_pallet numeric,
  p_supplier_message text DEFAULT NULL::text,
  p_inventory_batch_id uuid DEFAULT NULL::uuid
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

  UPDATE supplier_demand_offers
  SET status = 'cancelled', updated_at = now()
  WHERE order_id = p_order_id
    AND supplier_phone = p_supplier_phone
    AND status = 'pending';

  UPDATE inventory_batches
  SET available_quantity = available_quantity - p_quantity,
      quantity_available = quantity_available - p_quantity,
      reserved_quantity  = reserved_quantity  + p_quantity,
      updated_at         = now()
  WHERE id = p_inventory_batch_id;

  INSERT INTO supplier_demand_offers (
    order_id, supplier_phone, buyer_phone, inventory_batch_id,
    quantity, price_per_pallet, supplier_message, status
  ) VALUES (
    p_order_id, p_supplier_phone, v_order.phone, p_inventory_batch_id,
    p_quantity, p_price_per_pallet, p_supplier_message, 'pending'
  ) RETURNING id INTO v_offer_id;

  BEGIN
    INSERT INTO smart_notifications (user_phone, notification_type, title, message, metadata)
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

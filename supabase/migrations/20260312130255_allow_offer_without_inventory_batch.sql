
/*
  # Allow supplier offer without inventory batch

  ## Change
  - Remove the hard requirement for p_inventory_batch_id in create_supplier_offer_for_demand
  - If no inventory batch is provided, the offer is created as a "direct contact" offer
  - Inventory reservation only happens when a batch is explicitly selected
  - This enables suppliers to respond to demand cards even without registered inventory
*/

CREATE OR REPLACE FUNCTION create_supplier_offer_for_demand(
  p_supplier_phone     text,
  p_order_id           uuid,
  p_quantity           integer,
  p_price_per_pallet   numeric,
  p_supplier_message   text    DEFAULT NULL,
  p_inventory_batch_id uuid    DEFAULT NULL
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

  -- If inventory batch provided, validate it
  IF p_inventory_batch_id IS NOT NULL THEN
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

    IF v_batch.available_quantity < p_quantity THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'الكمية المتوفرة في هذه الدفعة (' || v_batch.available_quantity || ') أقل من الكمية المعروضة (' || p_quantity || ')'
      );
    END IF;

    IF NOT COALESCE(v_order.accept_partial_delivery, false) AND p_quantity < v_order.quantity THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'المشتري لا يقبل التوريد الجزئي. يجب أن تعرض ' || v_order.quantity || ' طبلية على الأقل.'
      );
    END IF;

    -- Reserve inventory
    UPDATE inventory_batches
    SET available_quantity = available_quantity - p_quantity,
        quantity_available = quantity_available - p_quantity,
        reserved_quantity  = reserved_quantity  + p_quantity,
        updated_at         = now()
    WHERE id = p_inventory_batch_id;
  END IF;

  -- Cancel any previous pending offers from same supplier for same order
  UPDATE supplier_demand_offers
  SET status = 'cancelled', updated_at = now()
  WHERE order_id = p_order_id
    AND supplier_phone = p_supplier_phone
    AND status = 'pending';

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
      v_order.phone, 'new_offer',
      CASE WHEN p_inventory_batch_id IS NULL THEN 'عرض توريد مباشر على طلبك'
           WHEN p_quantity < v_order.quantity THEN 'عرض توريد جزئي على طلبك'
           ELSE 'عرض جديد على طلبك' END,
      CASE
        WHEN p_inventory_batch_id IS NULL
          THEN 'قدّم مورد عرضاً مباشراً (' || p_quantity || ' طبلية). راجع العروض للموافقة.'
        WHEN p_quantity < v_order.quantity
          THEN 'قدّم مورد عرضاً جزئياً (' || p_quantity || ' من ' || v_order.quantity || ' طبلية). راجع العروض للموافقة.'
        ELSE 'قدّم مورد عرضاً على طلبيتك. راجع العروض للموافقة.'
      END,
      jsonb_build_object(
        'offer_id', v_offer_id,
        'order_id', p_order_id,
        'is_partial', p_quantity < v_order.quantity,
        'is_direct', p_inventory_batch_id IS NULL
      )
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'offer_id', v_offer_id,
    'is_partial', p_quantity < v_order.quantity,
    'is_direct', p_inventory_batch_id IS NULL
  );
END;
$$;

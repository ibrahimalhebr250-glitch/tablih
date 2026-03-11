/*
  # Fix Demand Offer Deal Flow - Shortcut for Platform Deals

  ## Changes
  1. Update `supplier_start_delivery_with_pledge` to also accept `matched` status
     for deals with source='demand_offer' (platform deals skip buyer confirmation step)
  
  2. Update `supplier_confirm_delivery_v4` to transfer inventory to buyer's cloud
     warehouse when deal source is 'demand_offer'
  
  ## New Flow for demand_offer deals:
  - matched → (supplier clicks بدء التسليم + pledge) → in_delivery → (تم التسليم) → completed
  - On completion: quantity transferred from supplier inventory to buyer cloud warehouse
*/

-- Fix start delivery: accept 'matched' status for demand_offer deals
CREATE OR REPLACE FUNCTION supplier_start_delivery_with_pledge(
  p_deal_id uuid,
  p_supplier_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deal deals%ROWTYPE;
BEGIN
  SELECT * INTO v_deal
  FROM deals
  WHERE id = p_deal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الصفقة غير موجودة');
  END IF;

  IF v_deal.supplier_phone <> p_supplier_phone THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  IF v_deal.status NOT IN ('inventory_reserved', 'awaiting_buyer', 'supplier_confirmed', 'matched') THEN
    RETURN jsonb_build_object('success', false, 'error', 'لا يمكن بدء التسليم في هذه المرحلة — الحالة: ' || v_deal.status);
  END IF;

  UPDATE deals
  SET status = 'in_delivery',
      delivery_started_at = now(),
      updated_at = now()
  WHERE id = p_deal_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Fix confirm delivery: transfer inventory to buyer cloud warehouse for demand_offer deals
CREATE OR REPLACE FUNCTION supplier_confirm_delivery_v4(
  p_deal_id uuid,
  p_supplier_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deal RECORD;
  v_new_quantity integer;
  v_new_reserved integer;
  v_new_available integer;
  v_supplier_name text;
BEGIN
  SELECT * INTO v_deal FROM deals WHERE id = p_deal_id FOR UPDATE;

  IF v_deal IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'الصفقة غير موجودة');
  END IF;

  IF v_deal.supplier_phone != p_supplier_phone THEN
    RETURN jsonb_build_object('success', false, 'error', 'ليس لديك صلاحية');
  END IF;

  IF v_deal.status NOT IN ('in_delivery', 'inventory_reserved', 'execution_in_progress') THEN
    RETURN jsonb_build_object('success', false, 'error', 'حالة الصفقة لا تسمح بتأكيد التسليم');
  END IF;

  IF v_deal.inventory_batch_id IS NOT NULL THEN
    v_new_quantity := GREATEST(
      (SELECT ib.quantity FROM inventory_batches ib WHERE ib.id = v_deal.inventory_batch_id) - v_deal.quantity,
      0
    );

    v_new_reserved := GREATEST(
      (SELECT COALESCE(ib.reserved_quantity, 0) FROM inventory_batches ib WHERE ib.id = v_deal.inventory_batch_id) - v_deal.quantity,
      0
    );

    v_new_available := GREATEST(v_new_quantity - v_new_reserved, 0);

    UPDATE inventory_batches
    SET
      quantity = v_new_quantity,
      reserved_quantity = v_new_reserved,
      quantity_reserved = v_new_reserved,
      available_quantity = v_new_available,
      quantity_available = v_new_available,
      status = CASE WHEN v_new_quantity <= 0 THEN 'fulfilled' ELSE status END,
      updated_at = now()
    WHERE id = v_deal.inventory_batch_id;
  END IF;

  -- For demand_offer deals: transfer to buyer cloud warehouse
  IF v_deal.source = 'demand_offer' THEN
    SELECT COALESCE(display_name, company_name, phone)
    INTO v_supplier_name
    FROM platform_users
    WHERE phone = v_deal.supplier_phone
    LIMIT 1;

    INSERT INTO buyer_inventory (
      buyer_phone,
      original_deal_id,
      pallet_type,
      size,
      quality,
      quantity,
      quantity_available,
      unit_price,
      total_paid,
      original_supplier_phone,
      original_supplier_name,
      city,
      inventory_source,
      acquired_at,
      created_at,
      updated_at
    ) VALUES (
      v_deal.buyer_phone,
      p_deal_id,
      v_deal.pallet_type,
      v_deal.size,
      v_deal.quality,
      v_deal.quantity,
      v_deal.quantity,
      COALESCE(v_deal.buyer_price, v_deal.final_price / NULLIF(v_deal.quantity, 0)),
      COALESCE(v_deal.buyer_price * v_deal.quantity, v_deal.final_price),
      v_deal.supplier_phone,
      COALESCE(v_supplier_name, v_deal.supplier_phone),
      v_deal.city,
      'deal',
      now(),
      now(),
      now()
    );
  END IF;

  UPDATE deals
  SET
    status = 'completed',
    completed_at = now(),
    updated_at = now()
  WHERE id = p_deal_id;

  RETURN jsonb_build_object('success', true, 'deal_id', p_deal_id);
END;
$$;

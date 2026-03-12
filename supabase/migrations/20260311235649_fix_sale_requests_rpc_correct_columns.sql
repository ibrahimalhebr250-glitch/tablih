/*
  # Fix Sale Requests RPC Functions - Correct Column Names

  Updates supplier_complete_sale_request to use the actual column names:
  - buyer_inventory: uses original_deal_id, quantity_available, unit_price,
    total_paid, original_supplier_phone, acquired_at, inventory_source
  - commission_settlements: uses pallet_count, commission_amount (no buyer_phone, deal_id, etc.)

  Also adds a sale_request_id to commission_settlements via notes field.
*/

CREATE OR REPLACE FUNCTION supplier_complete_sale_request(
  p_session_token text,
  p_request_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text;
  v_req record;
  v_batch record;
BEGIN
  v_phone := resolve_session_phone(p_session_token);
  IF v_phone IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'جلسة غير صالحة');
  END IF;

  SELECT * INTO v_req FROM sale_requests WHERE id = p_request_id AND supplier_phone = v_phone;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الطلب غير موجود');
  END IF;

  IF v_req.status <> 'in_contact' THEN
    RETURN jsonb_build_object('success', false, 'error', 'يجب بدء التواصل أولاً');
  END IF;

  SELECT * INTO v_batch FROM inventory_batches WHERE id = v_req.inventory_batch_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'المخزون غير موجود');
  END IF;

  IF (v_batch.quantity_available IS NULL OR v_batch.quantity_available < v_req.requested_quantity) THEN
    RETURN jsonb_build_object('success', false, 'error', 'الكمية المتاحة في المخزون غير كافية');
  END IF;

  -- 1. Deduct from inventory_batches
  UPDATE inventory_batches
  SET quantity_available = quantity_available - v_req.requested_quantity,
      updated_at = now()
  WHERE id = v_req.inventory_batch_id;

  -- 2. Add to buyer_inventory
  INSERT INTO buyer_inventory (
    buyer_phone,
    pallet_type,
    size,
    quality,
    city,
    quantity,
    quantity_available,
    unit_price,
    total_paid,
    original_supplier_phone,
    inventory_source,
    acquired_at
  ) VALUES (
    v_req.buyer_phone,
    v_req.pallet_type,
    v_req.size,
    v_req.quality,
    v_req.city,
    v_req.requested_quantity,
    v_req.requested_quantity,
    v_req.price_per_pallet,
    v_req.price_per_pallet * v_req.requested_quantity,
    v_req.supplier_phone,
    'sale_request',
    now()
  );

  -- 3. Record commission
  IF v_req.commission_per_pallet > 0 THEN
    INSERT INTO commission_settlements (
      supplier_phone,
      pallet_count,
      commission_amount,
      status,
      notes
    ) VALUES (
      v_req.supplier_phone,
      v_req.requested_quantity,
      v_req.commission_per_pallet * v_req.requested_quantity,
      'pending',
      'sale_request:' || p_request_id::text
    );
  END IF;

  -- 4. Mark request completed
  UPDATE sale_requests
  SET status = 'completed',
      updated_at = now()
  WHERE id = p_request_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION supplier_complete_sale_request(text, uuid) TO anon, authenticated;

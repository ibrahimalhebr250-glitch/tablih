/*
  # Fix Quantity Available Column Usage
  
  1. Problem
    - There are two columns: `quantity_available` and `available_quantity`
    - Functions use `quantity_available` but inserts set `available_quantity`
    - This causes "الكمية المتاحة غير كافية" errors
  
  2. Solution
    - Update `create_deal_from_market_negotiation` to use `available_quantity`
    - This ensures consistency with how inventory is created
*/

CREATE OR REPLACE FUNCTION create_deal_from_market_negotiation(
  p_batch_id uuid,
  p_buyer_phone text,
  p_quantity integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_batch inventory_batches%ROWTYPE;
  v_deal_id uuid;
  v_deal_ref text;
  v_request_id text;
  v_expires timestamptz;
  v_final_price numeric;
BEGIN
  -- Lock and fetch the inventory batch
  SELECT * INTO v_batch
  FROM inventory_batches
  WHERE id = p_batch_id
  FOR UPDATE;

  -- Validate batch exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'العرض غير موجود');
  END IF;

  -- Validate batch is active
  IF v_batch.status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'العرض غير نشط');
  END IF;

  -- Validate quantity availability (use available_quantity instead of quantity_available)
  IF v_batch.available_quantity < p_quantity THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'الكمية المتاحة غير كافية. المتاح: ' || v_batch.available_quantity
    );
  END IF;

  -- Validate buyer is not the supplier
  IF v_batch.phone = p_buyer_phone THEN
    RETURN jsonb_build_object('success', false, 'error', 'لا يمكنك شراء مخزونك الخاص');
  END IF;

  -- Calculate final price (minimum 1 SAR if price is 0 or NULL)
  v_final_price := GREATEST(COALESCE(v_batch.price_per_pallet, 1), 1);

  -- Generate references
  v_deal_ref := 'DEL-' || upper(substring(gen_random_uuid()::text, 1, 8));
  v_request_id := 'MKT-' || upper(substring(gen_random_uuid()::text, 1, 6));
  v_expires := now() + interval '48 hours';

  -- Create the deal
  INSERT INTO deals (
    request_id,
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
    platform_fee_per_pallet,
    status,
    reservation_expires_at,
    created_at,
    updated_at
  ) VALUES (
    v_request_id,
    v_deal_ref,
    p_batch_id,
    p_buyer_phone,
    v_batch.phone,
    v_batch.pallet_type,
    v_batch.size,
    v_batch.quality,
    v_batch.city,
    p_quantity,
    v_final_price,
    1,
    'pending_supplier',
    v_expires,
    now(),
    now()
  ) RETURNING id INTO v_deal_id;

  -- Reserve the quantity from inventory (use available_quantity)
  UPDATE inventory_batches
  SET available_quantity = available_quantity - p_quantity,
      updated_at = now()
  WHERE id = p_batch_id;

  -- Return success with deal details
  RETURN jsonb_build_object(
    'success', true,
    'deal_id', v_deal_id,
    'deal_ref', v_deal_ref,
    'expires_at', v_expires
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'حدث خطأ: ' || SQLERRM);
END;
$$;

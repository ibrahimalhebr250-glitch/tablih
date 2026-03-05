/*
  # Fix Market Deal Function - Simplified
  
  1. Changes
    - Removed platform_settings dependency
    - Use fixed platform fee of 1 SAR per pallet
    - Simplified error handling
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

  -- Validate quantity availability
  IF v_batch.quantity_available < p_quantity THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'الكمية المتاحة غير كافية. المتاح: ' || v_batch.quantity_available
    );
  END IF;

  -- Validate buyer is not the supplier
  IF v_batch.phone = p_buyer_phone THEN
    RETURN jsonb_build_object('success', false, 'error', 'لا يمكنك شراء مخزونك الخاص');
  END IF;

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
    COALESCE(v_batch.price_per_pallet, 0),
    1,
    'pending_supplier',
    v_expires,
    now(),
    now()
  ) RETURNING id INTO v_deal_id;

  -- Reserve the quantity from inventory
  UPDATE inventory_batches
  SET quantity_available = quantity_available - p_quantity,
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

/*
  # Fix create_deal_from_market_negotiation - add request_id

  1. Changes
    - Updated `create_deal_from_market_negotiation` function to generate a `request_id` value
    - The `request_id` column has a NOT NULL constraint, so market-originated deals now
      generate a reference in the format 'TBL-XXXXXX' matching existing convention

  2. Important Notes
    - No schema changes, only function update
    - Existing data is unaffected
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
  SELECT * INTO v_batch
  FROM inventory_batches
  WHERE id = p_batch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'العرض غير موجود');
  END IF;

  IF v_batch.status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'العرض غير نشط');
  END IF;

  IF v_batch.quantity_available < p_quantity THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'الكمية المتاحة غير كافية. المتاح: ' || v_batch.quantity_available
    );
  END IF;

  v_deal_ref := 'DEL-' || upper(substring(gen_random_uuid()::text, 1, 8));
  v_request_id := 'TBL-' || upper(substring(gen_random_uuid()::text, 1, 6));
  v_expires := now() + interval '15 minutes';

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
    COALESCE(v_batch.price_per_pallet, 0) * p_quantity,
    'pending_supplier',
    v_expires,
    now(),
    now()
  ) RETURNING id INTO v_deal_id;

  UPDATE inventory_batches
  SET quantity_available = quantity_available - p_quantity,
      updated_at = now()
  WHERE id = p_batch_id;

  RETURN jsonb_build_object(
    'success', true,
    'deal_id', v_deal_id,
    'deal_ref', v_deal_ref,
    'expires_at', v_expires
  );
END;
$$;

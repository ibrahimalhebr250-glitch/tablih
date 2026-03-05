/*
  # Create Deal from Market Negotiation

  Function to create a deal when a buyer initiates negotiation from market supply listing.

  1. New Function
    - `create_deal_from_market_negotiation` - creates deal directly from batch
    - Reserves inventory quantity
    - Sets status to `pending_supplier` (waiting for supplier confirmation)
    - Sets 15-minute expiry timer
    
  2. Logic
    - Validates batch availability
    - Reserves quantity from inventory
    - Creates deal record
    - Returns deal_id for WhatsApp negotiation
*/

CREATE OR REPLACE FUNCTION create_deal_from_market_negotiation(
  p_batch_id uuid,
  p_buyer_phone text,
  p_quantity integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch inventory_batches%ROWTYPE;
  v_deal_id uuid;
  v_deal_ref text;
  v_expires timestamptz;
BEGIN
  -- Get and lock the batch
  SELECT * INTO v_batch
  FROM inventory_batches
  WHERE id = p_batch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'العرض غير موجود');
  END IF;

  -- Check if batch is active
  IF v_batch.status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'العرض غير نشط');
  END IF;

  -- Check quantity availability
  IF v_batch.quantity_available < p_quantity THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'الكمية المتاحة غير كافية. المتاح: ' || v_batch.quantity_available
    );
  END IF;

  -- Generate deal reference
  v_deal_ref := 'DEL-' || upper(substring(gen_random_uuid()::text, 1, 8));
  v_expires := now() + interval '15 minutes';

  -- Create deal
  INSERT INTO deals (
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
    v_deal_ref,
    p_batch_id,
    p_buyer_phone,
    v_batch.supplier_phone,
    v_batch.pallet_type,
    v_batch.size,
    v_batch.quality,
    v_batch.city,
    p_quantity,
    v_batch.price_per_pallet * p_quantity,
    'pending_supplier',
    v_expires,
    now(),
    now()
  ) RETURNING id INTO v_deal_id;

  -- Reserve quantity from inventory
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_deal_from_market_negotiation TO anon, authenticated;

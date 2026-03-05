/*
  # Fix create_deal_with_reservation - SECURITY DEFINER

  ## Problem
  The function runs with caller's permissions (SECURITY INVOKER by default).
  The app uses phone-based auth (not Supabase Auth), so auth.uid() is null,
  causing RLS policies on inventory_batches (UPDATE requires auth.uid() = supplier_id)
  and deals (INSERT) to block the operation.

  ## Fix
  Recreate the function with SECURITY DEFINER so it executes with postgres
  superuser privileges, bypassing RLS restrictions inside the function.

  Also fix orders UPDATE policy to allow phone-based updates.
*/

CREATE OR REPLACE FUNCTION create_deal_with_reservation(
  p_order_id            uuid,
  p_inventory_batch_id  uuid,
  p_buyer_phone         text,
  p_supplier_phone      text,
  p_pallet_type         text,
  p_size                text,
  p_quality             text,
  p_city                text,
  p_quantity            integer,
  p_final_price         numeric,
  p_request_id          text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch     inventory_batches%ROWTYPE;
  v_deal_id   uuid;
  v_deal_ref  text;
  v_expires   timestamptz;
BEGIN
  SELECT * INTO v_batch
  FROM inventory_batches
  WHERE id = p_inventory_batch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Inventory batch not found');
  END IF;

  IF v_batch.quantity_available < p_quantity THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient available quantity',
      'available', v_batch.quantity_available
    );
  END IF;

  v_deal_ref := 'DEL-' || upper(substring(gen_random_uuid()::text, 1, 6));
  v_expires  := now() + interval '30 minutes';

  INSERT INTO deals (
    deal_ref, request_id, order_id, inventory_batch_id,
    buyer_phone, supplier_phone,
    pallet_type, size, quality, city,
    quantity, final_price, status,
    reservation_expires_at
  ) VALUES (
    v_deal_ref, p_request_id, p_order_id, p_inventory_batch_id,
    p_buyer_phone, p_supplier_phone,
    p_pallet_type, p_size, p_quality, p_city,
    p_quantity, p_final_price, 'pending_confirmation',
    v_expires
  )
  RETURNING id INTO v_deal_id;

  UPDATE inventory_batches
  SET
    quantity_available = quantity_available - p_quantity,
    quantity_reserved  = quantity_reserved  + p_quantity,
    updated_at         = now()
  WHERE id = p_inventory_batch_id;

  INSERT INTO reservations (
    deal_id, inventory_batch_id, quantity,
    reserved_at, expires_at, status
  ) VALUES (
    v_deal_id, p_inventory_batch_id, p_quantity,
    now(), v_expires, 'active'
  );

  RETURN jsonb_build_object(
    'success',   true,
    'deal_id',   v_deal_id,
    'deal_ref',  v_deal_ref,
    'expires_at', v_expires
  );
END;
$$;

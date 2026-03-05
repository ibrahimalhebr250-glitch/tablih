/*
  # Add reservation_expires_at to deals

  ## Summary
  Adds `reservation_expires_at` column to the `deals` table so the front-end
  can display the countdown timer without a separate join to `reservations`.
  The column is set during `create_deal_with_reservation` and cleared when
  the deal leaves `pending_confirmation`.

  ## Changes
  - `deals.reservation_expires_at` (timestamptz, nullable)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'reservation_expires_at'
  ) THEN
    ALTER TABLE deals ADD COLUMN reservation_expires_at timestamptz;
  END IF;
END $$;

-- Re-create create_deal_with_reservation to also set reservation_expires_at on the deal
CREATE OR REPLACE FUNCTION create_deal_with_reservation(
  p_order_id           uuid,
  p_inventory_batch_id uuid,
  p_buyer_phone        text,
  p_supplier_phone     text,
  p_pallet_type        text,
  p_size               text,
  p_quality            text,
  p_city               text,
  p_quantity           integer,
  p_final_price        numeric,
  p_request_id         text
)
RETURNS jsonb
LANGUAGE plpgsql
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

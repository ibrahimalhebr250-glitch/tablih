/*
  # Update Order System: Remove Pricing, Add Sources, Add Market Publishing Flag

  1. Changes to `orders` table
    - Add `order_source` column (text, default 'manual_order')
    - Tracks origin of orders for analytics

  2. Changes to `inventory_batches` table
    - Add `publish_to_market` column (boolean, default true)
    - Determines if inventory is visible in market and available for matching

  3. Update `create_deal_with_reservation` function
    - Remove dependency on p_final_price parameter (set to 0)
    - Price will be negotiated within the deal later

  4. Important Notes
    - Existing inventory batches default to published (true)
    - Order source helps track manual vs automated orders
    - Price is no longer calculated automatically by the system
*/

-- 1. Add order_source to orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'order_source'
  ) THEN
    ALTER TABLE orders ADD COLUMN order_source text DEFAULT 'manual_order';
  END IF;
END $$;

-- 2. Add publish_to_market to inventory_batches
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_batches' AND column_name = 'publish_to_market'
  ) THEN
    ALTER TABLE inventory_batches ADD COLUMN publish_to_market boolean DEFAULT true;
  END IF;
END $$;

-- 3. Drop and recreate create_deal_with_reservation
DROP FUNCTION IF EXISTS create_deal_with_reservation(uuid, uuid, text, text, text, text, text, text, integer, numeric, text);

CREATE OR REPLACE FUNCTION create_deal_with_reservation(
  p_order_id uuid,
  p_inventory_batch_id uuid,
  p_buyer_phone text,
  p_supplier_phone text,
  p_pallet_type text,
  p_size text,
  p_quality text,
  p_city text,
  p_quantity integer,
  p_final_price numeric DEFAULT 0,
  p_request_id text DEFAULT ''
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_batch     inventory_batches%ROWTYPE;
  v_deal_id   uuid;
  v_deal_ref  text;
  v_expires   timestamptz;
BEGIN
  IF p_buyer_phone IS NOT NULL
     AND p_supplier_phone IS NOT NULL
     AND p_buyer_phone = p_supplier_phone THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'self_match: buyer and supplier are the same user'
    );
  END IF;

  SELECT * INTO v_batch
  FROM inventory_batches
  WHERE id = p_inventory_batch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Inventory batch not found');
  END IF;

  IF v_batch.quantity_available < p_quantity THEN
    RETURN jsonb_build_object(
      'success',   false,
      'error',     'Insufficient available quantity',
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
    p_quantity, p_final_price, 'matched',
    v_expires
  )
  RETURNING id INTO v_deal_id;

  UPDATE inventory_batches
  SET quantity_available = quantity_available - p_quantity,
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
    'success',    true,
    'deal_id',    v_deal_id,
    'deal_ref',   v_deal_ref,
    'expires_at', v_expires
  );
END;
$$;

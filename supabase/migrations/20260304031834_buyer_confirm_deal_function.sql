/*
  # Buyer Confirm Deal Function

  Adds the `buyer_confirm_deal(p_deal_id, p_buyer_phone)` RPC function.

  ## What it does
  When the buyer clicks "Confirm Purchase" on a `supplier_confirmed` deal:

  1. Validates the deal exists and belongs to this buyer
  2. Validates the deal is in `supplier_confirmed` state
  3. Advances deal status to `buyer_confirmed`
  4. Reserves inventory: available_quantity -= quantity, reserved_quantity += quantity
     (uses quantity_available and reserved_quantity columns as the canonical columns)
  5. Records buyer_confirmed_at timestamp

  ## Security
  - Verifies caller is the deal's buyer_phone
  - Uses FOR UPDATE row lock to prevent race conditions
  - SECURITY DEFINER to allow inventory updates across RLS boundary
*/

CREATE OR REPLACE FUNCTION buyer_confirm_deal(
  p_deal_id    uuid,
  p_buyer_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deal deals%ROWTYPE;
BEGIN
  SELECT * INTO v_deal FROM deals WHERE id = p_deal_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deal not found');
  END IF;

  IF v_deal.buyer_phone IS DISTINCT FROM p_buyer_phone THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  IF v_deal.status != 'supplier_confirmed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deal is not in supplier_confirmed state: ' || v_deal.status);
  END IF;

  -- Reserve inventory
  IF v_deal.inventory_batch_id IS NOT NULL THEN
    UPDATE inventory_batches
    SET
      quantity_available = GREATEST(0, quantity_available - v_deal.quantity),
      reserved_quantity  = reserved_quantity + v_deal.quantity,
      quantity_reserved  = quantity_reserved + v_deal.quantity,
      updated_at         = now()
    WHERE id = v_deal.inventory_batch_id;
  END IF;

  -- Advance deal status
  UPDATE deals
  SET
    status             = 'buyer_confirmed',
    buyer_confirmed_at = now(),
    updated_at         = now()
  WHERE id = p_deal_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

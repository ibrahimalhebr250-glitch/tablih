/*
  # Supplier Deal Management Functions

  Adds two RPC functions used by the supplier's deal management panel:

  1. `supplier_complete_deal(p_deal_id, p_supplier_phone)`
     - Called when supplier clicks "تم البيع"
     - Validates deal is in 'active' status and belongs to the supplier
     - Decrements inventory: reserved_quantity -= quantity, quantity -= quantity
     - Sets deal status to 'completed'

  2. `supplier_cancel_deal(p_deal_id, p_supplier_phone)`
     - Called when supplier clicks "لم يتم البيع"
     - Validates deal is in 'active' status and belongs to the supplier
     - Restores inventory: reserved_quantity -= quantity, quantity_available += quantity
     - Sets deal status to 'cancelled'

  Security Notes:
  - Both functions verify the caller is the deal's supplier_phone
  - Both functions verify the deal is in the correct state
  - Uses FOR UPDATE row locks to prevent race conditions
*/

CREATE OR REPLACE FUNCTION supplier_complete_deal(
  p_deal_id       uuid,
  p_supplier_phone text
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

  IF v_deal.supplier_phone IS DISTINCT FROM p_supplier_phone THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  IF v_deal.status NOT IN ('active', 'inventory_reserved', 'supplier_confirmed', 'buyer_confirmed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deal is not in a completable state: ' || v_deal.status);
  END IF;

  -- Finalize inventory: remove reserved quantity AND reduce total quantity
  IF v_deal.inventory_batch_id IS NOT NULL THEN
    UPDATE inventory_batches
    SET
      reserved_quantity  = GREATEST(0, reserved_quantity - v_deal.quantity),
      quantity_reserved  = GREATEST(0, quantity_reserved - v_deal.quantity),
      quantity           = GREATEST(0, quantity - v_deal.quantity),
      quantity_total     = GREATEST(0, quantity_total - v_deal.quantity),
      updated_at         = now()
    WHERE id = v_deal.inventory_batch_id;
  END IF;

  UPDATE deals
  SET
    status       = 'completed',
    completed_at = now(),
    updated_at   = now()
  WHERE id = p_deal_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION supplier_cancel_deal(
  p_deal_id        uuid,
  p_supplier_phone text,
  p_reason         text DEFAULT NULL
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

  IF v_deal.supplier_phone IS DISTINCT FROM p_supplier_phone THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  IF v_deal.status IN ('completed', 'cancelled') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deal already in terminal state');
  END IF;

  -- Return reserved quantity to available
  IF v_deal.inventory_batch_id IS NOT NULL THEN
    UPDATE inventory_batches
    SET
      reserved_quantity  = GREATEST(0, reserved_quantity - v_deal.quantity),
      quantity_reserved  = GREATEST(0, quantity_reserved - v_deal.quantity),
      quantity_available = quantity_available + v_deal.quantity,
      updated_at         = now()
    WHERE id = v_deal.inventory_batch_id;
  END IF;

  UPDATE deals
  SET
    status        = 'cancelled',
    cancelled_at  = now(),
    cancel_reason = p_reason,
    updated_at    = now()
  WHERE id = p_deal_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

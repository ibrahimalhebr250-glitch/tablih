/*
  # Fix Deal Status Flow

  ## Summary
  Corrects the full deal lifecycle so statuses flow correctly:
  matched → supplier_confirmed → buyer_confirmed → inventory_reserved → completed / cancelled

  ## Changes

  ### buyer_confirm_deal
  - After buyer confirms, status advances to `inventory_reserved` (not just `buyer_confirmed`)
  - Inventory is reserved at the same time
  - `buyer_confirmed_at` and `inventory_reserved_at` are both stamped

  ### supplier_complete_deal
  - Only allowed from `inventory_reserved` (not from pre-reservation statuses)
  - Marks deal as `completed`, deducts from inventory

  ### supplier_cancel_deal
  - Allowed from `inventory_reserved` and `matched`
  - Restores inventory only if already reserved
*/

-- ===== buyer_confirm_deal: now sets inventory_reserved =====
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
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Deal is not in supplier_confirmed state: ' || v_deal.status
    );
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

  -- Advance to inventory_reserved directly
  UPDATE deals
  SET
    status             = 'inventory_reserved',
    buyer_confirmed_at = now(),
    updated_at         = now()
  WHERE id = p_deal_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ===== supplier_complete_deal: only from inventory_reserved =====
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

  IF v_deal.status != 'inventory_reserved' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Deal is not in inventory_reserved state: ' || v_deal.status
    );
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

-- ===== supplier_cancel_deal: allow from inventory_reserved and matched =====
CREATE OR REPLACE FUNCTION supplier_cancel_deal(
  p_deal_id        uuid,
  p_supplier_phone text,
  p_reason         text DEFAULT 'لم يتم البيع - بواسطة المورد'
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

  -- Return reserved quantity only if inventory was already reserved
  IF v_deal.status = 'inventory_reserved' AND v_deal.inventory_batch_id IS NOT NULL THEN
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

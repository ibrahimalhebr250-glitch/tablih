/*
  # Add in_delivery Status and Delivery Flow Functions

  ## Summary
  Adds a new deal status `in_delivery` that sits between `inventory_reserved` and `completed`.

  ## New Status Flow
  matched → awaiting_buyer → inventory_reserved → in_delivery → completed
                                                              ↘ cancelled (failed delivery, inventory restored)

  ## New Columns
  - `delivery_started_at` (timestamptz) — when supplier starts delivery
  - `delivery_failed_at` (timestamptz) — when delivery fails

  ## New Functions
  1. `supplier_start_delivery_v4(p_deal_id, p_supplier_phone)` — moves inventory_reserved → in_delivery
  2. `supplier_confirm_delivery_v4(p_deal_id, p_supplier_phone)` — moves in_delivery → completed, decrements reserved inventory
  3. `supplier_fail_delivery_v4(p_deal_id, p_supplier_phone)` — moves in_delivery → cancelled, fully restores inventory

  ## Security
  - All functions are SECURITY DEFINER
  - Ownership verified before each action
*/

-- Extend status constraint to include in_delivery
DO $$
BEGIN
  ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_status_check;
  ALTER TABLE deals ADD CONSTRAINT deals_status_check
    CHECK (status = ANY(ARRAY[
      'matched', 'supplier_confirmed', 'awaiting_buyer',
      'inventory_reserved', 'in_delivery', 'completed', 'cancelled',
      'pending_confirmation', 'buyer_confirmed', 'awaiting_payment',
      'paid', 'supplier_notified', 'preparing', 'delivered',
      'settlement_pending', 'supplier_settled', 'active', 'pending_receipt'
    ]));
END $$;

-- Add new timestamp columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'delivery_started_at'
  ) THEN
    ALTER TABLE deals ADD COLUMN delivery_started_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'delivery_failed_at'
  ) THEN
    ALTER TABLE deals ADD COLUMN delivery_failed_at timestamptz;
  END IF;
END $$;

-- ================================================================
-- SUPPLIER START DELIVERY v4
-- inventory_reserved → in_delivery
-- ================================================================
CREATE OR REPLACE FUNCTION supplier_start_delivery_v4(
  p_deal_id uuid,
  p_supplier_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deal deals%ROWTYPE;
BEGIN
  SELECT * INTO v_deal FROM deals WHERE id = p_deal_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الصفقة غير موجودة');
  END IF;

  IF v_deal.supplier_phone != p_supplier_phone THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح لك بتنفيذ هذا الإجراء');
  END IF;

  IF v_deal.status != 'inventory_reserved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'يجب أن تكون الصفقة محجوزة لبدء التسليم');
  END IF;

  UPDATE deals
  SET
    status = 'in_delivery',
    delivery_started_at = now(),
    updated_at = now()
  WHERE id = p_deal_id;

  RETURN jsonb_build_object('success', true, 'status', 'in_delivery');
END;
$$;

-- ================================================================
-- SUPPLIER CONFIRM DELIVERY v4
-- in_delivery → completed (decrements reserved_quantity on batch)
-- ================================================================
CREATE OR REPLACE FUNCTION supplier_confirm_delivery_v4(
  p_deal_id uuid,
  p_supplier_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deal deals%ROWTYPE;
BEGIN
  SELECT * INTO v_deal FROM deals WHERE id = p_deal_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الصفقة غير موجودة');
  END IF;

  IF v_deal.supplier_phone != p_supplier_phone THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح لك بتنفيذ هذا الإجراء');
  END IF;

  IF v_deal.status != 'in_delivery' THEN
    RETURN jsonb_build_object('success', false, 'error', 'يجب أن تكون الصفقة في حالة جاري التسليم');
  END IF;

  -- Mark deal completed
  UPDATE deals
  SET
    status = 'completed',
    completed_at = now(),
    updated_at = now()
  WHERE id = p_deal_id;

  -- Decrement both quantity and reserved_quantity on the batch
  -- (permanently consume the inventory)
  IF v_deal.inventory_batch_id IS NOT NULL THEN
    UPDATE inventory_batches
    SET
      quantity = GREATEST(0, quantity - v_deal.quantity),
      reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - v_deal.quantity),
      updated_at = now()
    WHERE id = v_deal.inventory_batch_id;

    -- If batch quantity reaches 0, mark it as inactive
    UPDATE inventory_batches
    SET status = 'inactive', updated_at = now()
    WHERE id = v_deal.inventory_batch_id AND quantity <= 0;
  END IF;

  RETURN jsonb_build_object('success', true, 'status', 'completed');
END;
$$;

-- ================================================================
-- SUPPLIER FAIL DELIVERY v4
-- in_delivery → cancelled (fully restores inventory)
-- ================================================================
CREATE OR REPLACE FUNCTION supplier_fail_delivery_v4(
  p_deal_id uuid,
  p_supplier_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deal deals%ROWTYPE;
BEGIN
  SELECT * INTO v_deal FROM deals WHERE id = p_deal_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الصفقة غير موجودة');
  END IF;

  IF v_deal.supplier_phone != p_supplier_phone THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح لك بتنفيذ هذا الإجراء');
  END IF;

  IF v_deal.status != 'in_delivery' THEN
    RETURN jsonb_build_object('success', false, 'error', 'يجب أن تكون الصفقة في حالة جاري التسليم');
  END IF;

  -- Mark deal cancelled
  UPDATE deals
  SET
    status = 'cancelled',
    delivery_failed_at = now(),
    cancelled_at = now(),
    cancel_reason = 'فشل التسليم',
    updated_at = now()
  WHERE id = p_deal_id;

  -- Fully restore reserved_quantity on the batch (the pallets are back available)
  IF v_deal.inventory_batch_id IS NOT NULL THEN
    UPDATE inventory_batches
    SET
      reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - v_deal.quantity),
      updated_at = now()
    WHERE id = v_deal.inventory_batch_id;

    -- Reactivate batch if it was inactive/paused
    UPDATE inventory_batches
    SET status = 'active', updated_at = now()
    WHERE id = v_deal.inventory_batch_id
      AND status IN ('inactive', 'paused');
  END IF;

  RETURN jsonb_build_object('success', true, 'status', 'cancelled');
END;
$$;

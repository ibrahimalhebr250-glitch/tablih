/*
  # Fix Supplier Delivery Inventory Deduction Policy
  
  ## Summary
  Fixes the inventory deduction logic when supplier confirms delivery.
  
  ## Problem
  Currently when supplier confirms delivery (moves to completed):
  - Deducts from both `quantity` AND `reserved_quantity`
  - This is wrong because `quantity` already includes reserved items
  
  ## Correct Logic
  When deal is reserved:
  - `reserved_quantity` += deal_quantity (locks the items)
  - `quantity` stays the same (total inventory)
  
  When delivery is confirmed:
  - `quantity` -= deal_quantity (permanently removes from inventory)
  - `reserved_quantity` -= deal_quantity (unlocks the reservation)
  - Available = quantity - reserved_quantity
  
  ## Example
  Supplier has 3000 pallets total:
  - Initial: quantity=3000, reserved=0, available=3000
  - After reservation of 1000: quantity=3000, reserved=1000, available=2000
  - After delivery: quantity=2000, reserved=0, available=2000
  
  ## Changes
  Updates `supplier_confirm_delivery_v4` to:
  1. Deduct from `quantity` (total inventory decreases)
  2. Deduct from `reserved_quantity` (unlock the reservation)
  3. This correctly shows 2000 available after delivery
  
  ## Security
  - Function remains SECURITY DEFINER
  - All validation checks preserved
*/

-- Fix supplier_confirm_delivery_v4 to correctly handle inventory deduction
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

  -- Correctly deduct inventory:
  -- 1. Reduce total quantity (permanent removal)
  -- 2. Reduce reserved_quantity (unlock the reservation)
  -- Result: available quantity = quantity - reserved_quantity decreases correctly
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

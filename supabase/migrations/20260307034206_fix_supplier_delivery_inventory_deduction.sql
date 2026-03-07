/*
  # Fix Supplier Delivery Inventory Deduction - Complete Fix
  
  ## Summary
  Fixes inventory deduction when supplier confirms delivery to properly update all quantity columns.
  
  ## Problem
  inventory_batches table has multiple quantity columns:
  - `quantity`: Total inventory (used in old system)
  - `reserved_quantity`: Reserved items (used in old system)
  - `available_quantity`: Available items (used in UI)
  - `quantity_available`: Available items (legacy, synced with available_quantity)
  
  The current supplier_confirm_delivery_v4 function only updates `quantity` and `reserved_quantity`,
  but the UI displays `available_quantity`, so changes don't appear to users.
  
  ## Solution
  Update supplier_confirm_delivery_v4 to correctly modify all columns:
  1. Reduce `quantity` (total inventory decreases)
  2. Reduce `reserved_quantity` (unlock reservation)
  3. Keep `available_quantity` in sync
  4. Keep `quantity_available` in sync (for backward compatibility)
  
  ## Example Flow
  Supplier has 3000 pallets, buyer reserves 1000:
  
  **Before reservation:**
  - quantity = 3000
  - reserved_quantity = 0
  - available_quantity = 3000
  
  **After reservation (inventory_reserved):**
  - quantity = 3000
  - reserved_quantity = 1000
  - available_quantity = 3000 (UI shows 3000)
  
  **After delivery (completed):**
  - quantity = 2000 (reduced by 1000)
  - reserved_quantity = 0 (unlocked)
  - available_quantity = 2000 (UI shows 2000)
  
  ## Security
  - Function remains SECURITY DEFINER
  - All validation checks preserved
*/

-- Drop and recreate the function with proper column updates
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

  -- Update ALL quantity columns correctly:
  -- 1. Reduce total quantity (permanent removal from inventory)
  -- 2. Reduce reserved_quantity (unlock the reservation)
  -- 3. Update available_quantity (what UI displays)
  -- 4. Update quantity_available (legacy support)
  IF v_deal.inventory_batch_id IS NOT NULL THEN
    UPDATE inventory_batches
    SET
      quantity = GREATEST(0, quantity - v_deal.quantity),
      reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - v_deal.quantity),
      available_quantity = GREATEST(0, available_quantity - v_deal.quantity),
      quantity_available = GREATEST(0, COALESCE(quantity_available, available_quantity) - v_deal.quantity),
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

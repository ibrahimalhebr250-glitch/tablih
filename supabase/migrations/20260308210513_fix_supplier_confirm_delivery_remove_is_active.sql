/*
  # Fix supplier_confirm_delivery_v4 - remove is_active reference

  1. Problem
    - The function references column `is_active` on `inventory_batches` which does not exist
    - The table uses `status` (text) instead of `is_active` (boolean)
    - Also fixes redundant `quantity_available` assignment alongside `available_quantity`

  2. Changes
    - Replace `is_active = CASE ...` with `status = CASE WHEN ... THEN 'depleted' ELSE status END`
    - Clean up available_quantity and quantity_available to stay in sync
    - Keep all other logic unchanged
*/

CREATE OR REPLACE FUNCTION supplier_confirm_delivery_v4(
  p_deal_id uuid,
  p_supplier_phone text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_deal RECORD;
BEGIN
  SELECT * INTO v_deal FROM deals WHERE id = p_deal_id FOR UPDATE;

  IF v_deal IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'الصفقة غير موجودة');
  END IF;

  IF v_deal.supplier_phone != p_supplier_phone THEN
    RETURN jsonb_build_object('success', false, 'error', 'ليس لديك صلاحية');
  END IF;

  IF v_deal.status NOT IN ('in_delivery', 'inventory_reserved', 'execution_in_progress') THEN
    RETURN jsonb_build_object('success', false, 'error', 'حالة الصفقة لا تسمح بتأكيد التسليم');
  END IF;

  IF v_deal.inventory_batch_id IS NOT NULL THEN
    UPDATE inventory_batches
    SET
      quantity = GREATEST(quantity - v_deal.quantity, 0),
      reserved_quantity = GREATEST(COALESCE(reserved_quantity, 0) - v_deal.quantity, 0),
      available_quantity = GREATEST(available_quantity - v_deal.quantity, 0),
      quantity_available = GREATEST(COALESCE(quantity_available, 0) - v_deal.quantity, 0),
      status = CASE WHEN (quantity - v_deal.quantity) <= 0 THEN 'depleted' ELSE status END
    WHERE id = v_deal.inventory_batch_id;
  END IF;

  UPDATE deals
  SET
    status = 'completed',
    completed_at = now(),
    updated_at = now()
  WHERE id = p_deal_id;

  RETURN jsonb_build_object('success', true, 'deal_id', p_deal_id);
END;
$$;

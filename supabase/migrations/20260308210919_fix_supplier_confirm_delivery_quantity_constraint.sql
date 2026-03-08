/*
  # Fix supplier_confirm_delivery_v4 - quantity check constraint violation

  1. Problem
    - `inventory_batches_quantity_check` requires `quantity > 0`, but the function 
      sets quantity to 0 when fully consumed via GREATEST(quantity - deal.quantity, 0)
    - `inventory_batches_status_check` only allows: draft, active, partial, fulfilled, paused
      but previous fix tried to set 'depleted' which is not in the allowed list

  2. Changes
    - Set quantity to GREATEST(..., 1) to satisfy the constraint (minimum 1)
    - Use 'fulfilled' instead of 'depleted' for the status when inventory is fully consumed
    - Set available_quantity and quantity_available to 0 when fully consumed
*/

CREATE OR REPLACE FUNCTION supplier_confirm_delivery_v4(
  p_deal_id uuid,
  p_supplier_phone text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_deal RECORD;
  v_new_quantity integer;
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
    SELECT GREATEST(ib.quantity - v_deal.quantity, 1)
    INTO v_new_quantity
    FROM inventory_batches ib
    WHERE ib.id = v_deal.inventory_batch_id;

    UPDATE inventory_batches
    SET
      quantity = v_new_quantity,
      reserved_quantity = GREATEST(COALESCE(reserved_quantity, 0) - v_deal.quantity, 0),
      available_quantity = GREATEST(v_new_quantity - GREATEST(COALESCE(reserved_quantity, 0) - v_deal.quantity, 0), 0),
      quantity_available = GREATEST(v_new_quantity - GREATEST(COALESCE(reserved_quantity, 0) - v_deal.quantity, 0), 0),
      status = CASE WHEN v_new_quantity <= 1 AND (quantity - v_deal.quantity) <= 0 THEN 'fulfilled' ELSE status END
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

/*
  # Fix supplier_fail_delivery_v4: properly restore available_quantity on delivery failure

  ## Problem
  When the buyer confirmed a deal, `available_quantity` was decreased and
  `reserved_quantity` was increased. But when delivery failed, the function
  only decreased `reserved_quantity` without restoring `available_quantity`,
  causing inventory to silently disappear.

  ## Fix
  - Decrease `reserved_quantity` AND increase `available_quantity` by the deal quantity
  - Restore the currently stuck batch (DEL-F26FF7) that lost 2000 units
*/

CREATE OR REPLACE FUNCTION public.supplier_fail_delivery_v4(p_deal_id uuid, p_supplier_phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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

  UPDATE deals
  SET
    status             = 'cancelled',
    delivery_failed_at = now(),
    cancelled_at       = now(),
    cancel_reason      = 'فشل التسليم',
    updated_at         = now()
  WHERE id = p_deal_id;

  IF v_deal.inventory_batch_id IS NOT NULL THEN
    UPDATE inventory_batches
    SET
      reserved_quantity  = GREATEST(0, COALESCE(reserved_quantity, 0)  - v_deal.quantity),
      available_quantity = COALESCE(available_quantity, 0) + v_deal.quantity,
      updated_at         = now()
    WHERE id = v_deal.inventory_batch_id;

    UPDATE inventory_batches
    SET status = 'active', updated_at = now()
    WHERE id = v_deal.inventory_batch_id
    AND status IN ('inactive', 'paused');
  END IF;

  RETURN jsonb_build_object('success', true, 'status', 'cancelled');
END;
$function$;

-- Restore the 2000 units lost from the DEL-F26FF7 deal that was already cancelled
UPDATE inventory_batches
SET
  available_quantity = available_quantity + 2000,
  updated_at         = now()
WHERE id = '86210822-738d-460b-b3f7-6c5c543b6bc2';

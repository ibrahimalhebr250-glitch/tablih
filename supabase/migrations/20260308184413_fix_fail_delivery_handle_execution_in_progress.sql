/*
  # Fix supplier_fail_delivery_v4: handle execution_in_progress status

  ## Changes
  - `supplier_fail_delivery_v4` now accepts both `in_delivery` and `execution_in_progress` statuses
  - On failure: inventory reservation is released (available_quantity restored, reserved_quantity decremented)
  - Deal status set to `cancelled` with cancel_reason = 'فشل التنفيذ'
  - The order linked to this deal will also be reset to `unmatched` so it can be re-matched
*/

CREATE OR REPLACE FUNCTION public.supplier_fail_delivery_v4(
  p_deal_id uuid,
  p_supplier_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deal deals%ROWTYPE;
BEGIN
  SELECT * INTO v_deal FROM deals WHERE id = p_deal_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الصفقة غير موجودة');
  END IF;

  IF v_deal.supplier_phone != p_supplier_phone THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح لك بتنفيذ هذا الإجراء');
  END IF;

  IF v_deal.status NOT IN ('in_delivery', 'execution_in_progress', 'inventory_reserved') THEN
    RETURN jsonb_build_object('success', false, 'error', 'حالة الصفقة لا تسمح بتسجيل الفشل');
  END IF;

  UPDATE deals
  SET
    status             = 'cancelled',
    delivery_failed_at = now(),
    cancelled_at       = now(),
    cancel_reason      = 'فشل التنفيذ',
    updated_at         = now()
  WHERE id = p_deal_id;

  IF v_deal.inventory_batch_id IS NOT NULL THEN
    UPDATE inventory_batches
    SET
      reserved_quantity  = GREATEST(0, COALESCE(reserved_quantity, 0) - v_deal.quantity),
      available_quantity = COALESCE(available_quantity, 0) + v_deal.quantity,
      quantity_available = COALESCE(available_quantity, 0) + v_deal.quantity,
      is_active          = true,
      updated_at         = now()
    WHERE id = v_deal.inventory_batch_id;
  END IF;

  IF v_deal.order_id IS NOT NULL THEN
    UPDATE orders
    SET
      status     = 'unmatched',
      updated_at = now()
    WHERE id = v_deal.order_id
    AND status IN ('matched', 'partially_matched');
  END IF;

  RETURN jsonb_build_object('success', true, 'status', 'cancelled');
END;
$$;

GRANT EXECUTE ON FUNCTION public.supplier_fail_delivery_v4(uuid, text) TO anon, authenticated;

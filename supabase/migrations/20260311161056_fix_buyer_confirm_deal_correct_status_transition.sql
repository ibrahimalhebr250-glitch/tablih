/*
  # Fix buyer_confirm_deal_v4 Status Transition

  ## Problem
  The current buyer_confirm_deal_v4 function transitions the deal directly to
  `in_delivery` when the buyer confirms, completely skipping the `inventory_reserved`
  stage. This means:
    - The supplier NEVER sees the deal in the "تأكيد المشتري" (Buyer Confirmed) tab
    - The deal jumps straight to "جاري التسليم" without the supplier initiating delivery
    - The supplier loses the ability to start delivery on their own terms

  ## Correct Flow
  awaiting_buyer → inventory_reserved → (supplier starts delivery) → in_delivery

  ## Fix
  Rewrite buyer_confirm_deal_v4 to:
    1. Only accept deals in 'awaiting_buyer' status
    2. Transition to 'inventory_reserved' (NOT in_delivery)
    3. Reserve inventory correctly
    4. Let supplier_start_delivery_with_pledge handle the → in_delivery transition
*/

CREATE OR REPLACE FUNCTION buyer_confirm_deal_v4(
  p_deal_id     uuid,
  p_buyer_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deal      deals%ROWTYPE;
  v_available integer;
BEGIN
  SELECT * INTO v_deal FROM deals WHERE id = p_deal_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الصفقة غير موجودة');
  END IF;

  IF v_deal.buyer_phone != p_buyer_phone THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح لك بتأكيد هذه الصفقة');
  END IF;

  IF v_deal.status != 'awaiting_buyer' THEN
    RETURN jsonb_build_object('success', false, 'error', 'لا يمكن تأكيد صفقة بحالة: ' || v_deal.status);
  END IF;

  IF v_deal.inventory_batch_id IS NOT NULL THEN
    SELECT available_quantity INTO v_available
    FROM inventory_batches
    WHERE id = v_deal.inventory_batch_id;

    IF v_available IS NULL OR v_available < v_deal.quantity THEN
      RETURN jsonb_build_object('success', false, 'error', 'الكمية المتاحة غير كافية');
    END IF;

    UPDATE inventory_batches SET
      available_quantity = available_quantity - v_deal.quantity,
      reserved_quantity  = reserved_quantity  + v_deal.quantity,
      updated_at         = now()
    WHERE id = v_deal.inventory_batch_id;
  END IF;

  UPDATE deals SET
    status             = 'inventory_reserved',
    buyer_confirmed_at = now(),
    reserved_at        = now(),
    updated_at         = now()
  WHERE id = p_deal_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

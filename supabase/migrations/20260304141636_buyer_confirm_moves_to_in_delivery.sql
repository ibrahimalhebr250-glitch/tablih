/*
  # Fix buyer_confirm_deal_v4: set status to in_delivery on buyer confirmation

  When the buyer confirms the deal, the status should move directly to `in_delivery`
  so the supplier sees it under "جاري التسليم" immediately without needing to press
  "بدء التسليم" separately.

  Also fix the existing stuck deal DEL-F26FF7 that has buyer_confirmed_at set
  but is still in inventory_reserved status.
*/

CREATE OR REPLACE FUNCTION public.buyer_confirm_deal_v4(p_deal_id uuid, p_buyer_phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_deal deals%ROWTYPE;
  v_available integer;
BEGIN
  SELECT * INTO v_deal FROM deals WHERE id = p_deal_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الصفقة غير موجودة');
  END IF;

  IF v_deal.buyer_phone != p_buyer_phone THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح لك بتأكيد هذه الصفقة');
  END IF;

  IF v_deal.status NOT IN ('awaiting_buyer', 'inventory_reserved') THEN
    RETURN jsonb_build_object('success', false, 'error', 'لا يمكن تأكيد صفقة بحالة: ' || v_deal.status);
  END IF;

  IF v_deal.inventory_batch_id IS NOT NULL AND v_deal.status = 'awaiting_buyer' THEN
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
    status                = 'in_delivery',
    buyer_confirmed_at    = COALESCE(buyer_confirmed_at, now()),
    reserved_at           = COALESCE(reserved_at, now()),
    delivery_started_at   = now(),
    updated_at            = now()
  WHERE id = p_deal_id;

  RETURN jsonb_build_object('success', true);
END;
$function$;

-- Fix the currently stuck deal that has buyer_confirmed_at set but still in inventory_reserved
UPDATE deals
SET
  status              = 'in_delivery',
  delivery_started_at = buyer_confirmed_at,
  updated_at          = now()
WHERE
  status = 'inventory_reserved'
  AND buyer_confirmed_at IS NOT NULL;

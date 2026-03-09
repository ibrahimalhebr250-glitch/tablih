
/*
  # Fix supplier_confirm_deal_v4 to accept pending_confirmation status

  ## Problem
  Deals created by the new matching engine have status 'pending_confirmation'
  but supplier_confirm_deal_v4 only accepts 'matched' and 'pending_supplier',
  causing the supplier to be unable to confirm the deal.

  ## Fix
  Add 'pending_confirmation' to the allowed statuses in the confirmation function.
*/

CREATE OR REPLACE FUNCTION public.supplier_confirm_deal_v4(p_deal_id uuid, p_supplier_phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_deal deals%ROWTYPE;
  v_commission_per_pallet numeric;
BEGIN
  SELECT * INTO v_deal FROM deals WHERE id = p_deal_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الصفقة غير موجودة');
  END IF;

  IF v_deal.supplier_phone != p_supplier_phone THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح لك بتأكيد هذه الصفقة');
  END IF;

  IF v_deal.status NOT IN ('pending_confirmation', 'matched', 'pending_supplier') THEN
    RETURN jsonb_build_object('success', false, 'error', 'لا يمكن تأكيد صفقة بحالة: ' || v_deal.status);
  END IF;

  SELECT (setting_value::text)::numeric INTO v_commission_per_pallet
  FROM platform_settings
  WHERE group_key = 'pricing' AND setting_key = 'platform_commission_per_pallet';

  IF v_commission_per_pallet IS NULL THEN
    v_commission_per_pallet := 0.25;
  END IF;

  IF v_deal.supplier_price IS NULL OR v_deal.platform_fee IS NULL THEN
    UPDATE deals SET
      status = 'awaiting_buyer',
      supplier_confirmed_at = now(),
      supplier_price = v_deal.final_price,
      platform_fee_per_pallet = v_commission_per_pallet,
      platform_fee = v_deal.quantity * v_commission_per_pallet,
      buyer_price = v_deal.final_price + v_commission_per_pallet,
      updated_at = now()
    WHERE id = p_deal_id;
  ELSE
    UPDATE deals SET
      status = 'awaiting_buyer',
      supplier_confirmed_at = now(),
      updated_at = now()
    WHERE id = p_deal_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

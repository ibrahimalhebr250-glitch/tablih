/*
  # Fix supplier_confirm_deal_v4 to accept pending_supplier status

  1. Problem
    - When a deal is created from a market offer/negotiation, it gets status 'pending_supplier'
    - The supplier_confirm_deal_v4 function only accepted 'matched' status
    - This caused confirmation to fail with error: "لا يمكن تأكيد صفقة بحالة: pending_supplier"

  2. Fix
    - Updated status check to accept both 'matched' AND 'pending_supplier' statuses
    - Both statuses represent new deals awaiting supplier confirmation
    - No other logic changes needed

  3. Security
    - Function remains SECURITY DEFINER with phone-based auth
    - Same permission checks preserved (supplier phone match)
*/

CREATE OR REPLACE FUNCTION supplier_confirm_deal_v4(
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
  v_commission_per_pallet numeric;
BEGIN
  SELECT * INTO v_deal FROM deals WHERE id = p_deal_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الصفقة غير موجودة');
  END IF;

  IF v_deal.supplier_phone != p_supplier_phone THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح لك بتأكيد هذه الصفقة');
  END IF;

  IF v_deal.status NOT IN ('matched', 'pending_supplier') THEN
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

GRANT EXECUTE ON FUNCTION supplier_confirm_deal_v4(uuid, text) TO authenticated, anon;

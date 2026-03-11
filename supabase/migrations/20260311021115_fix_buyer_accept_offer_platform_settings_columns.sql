/*
  # Fix buyer_accept_supplier_offer platform_settings column references

  1. Bug Fix
    - Function referenced `value` column which doesn't exist in platform_settings
    - Correct column names are `setting_key` and `setting_value`
    - This caused a 400 error when buyer tried to accept a supplier offer
*/

CREATE OR REPLACE FUNCTION buyer_accept_supplier_offer(p_buyer_phone text, p_offer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offer  supplier_demand_offers%ROWTYPE;
  v_order  orders%ROWTYPE;
  v_deal_id uuid;
  v_deal_ref text;
  v_platform_fee_per_pallet numeric;
  v_supplier_price numeric;
  v_buyer_price    numeric;
BEGIN
  SELECT * INTO v_offer
  FROM supplier_demand_offers
  WHERE id = p_offer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'العرض غير موجود');
  END IF;

  IF v_offer.buyer_phone <> p_buyer_phone THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  IF v_offer.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'هذا العرض لم يعد متاحاً');
  END IF;

  SELECT * INTO v_order FROM orders WHERE id = v_offer.order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الطلب غير موجود');
  END IF;

  SELECT COALESCE((setting_value::numeric), 1.00)
  INTO v_platform_fee_per_pallet
  FROM platform_settings
  WHERE setting_key = 'platform_fee_per_pallet'
  LIMIT 1;

  IF v_platform_fee_per_pallet IS NULL THEN
    v_platform_fee_per_pallet := 1.00;
  END IF;

  v_supplier_price := v_offer.price_per_pallet;
  v_buyer_price    := v_offer.price_per_pallet + v_platform_fee_per_pallet;

  v_deal_ref := 'DO-' || upper(substring(gen_random_uuid()::text, 1, 6));

  INSERT INTO deals (
    deal_ref, request_id, order_id,
    buyer_phone, supplier_phone,
    pallet_type, size, quality, city,
    quantity, final_price,
    supplier_price, buyer_price,
    platform_fee_per_pallet, platform_fee,
    source, status
  ) VALUES (
    v_deal_ref, v_deal_ref, v_offer.order_id,
    v_offer.buyer_phone, v_offer.supplier_phone,
    v_order.pallet_type, COALESCE(v_order.size, ''), COALESCE(v_order.quality, ''), COALESCE(v_order.city, ''),
    v_offer.quantity, v_buyer_price * v_offer.quantity,
    v_supplier_price, v_buyer_price,
    v_platform_fee_per_pallet, v_platform_fee_per_pallet * v_offer.quantity,
    'demand_offer', 'pending_confirmation'
  )
  RETURNING id INTO v_deal_id;

  UPDATE supplier_demand_offers
  SET status = 'deal_created',
      deal_id = v_deal_id,
      updated_at = now()
  WHERE id = p_offer_id;

  UPDATE supplier_demand_offers
  SET status = 'rejected',
      updated_at = now()
  WHERE order_id = v_offer.order_id
    AND id <> p_offer_id
    AND status = 'pending';

  UPDATE orders
  SET status = 'matched',
      updated_at = now()
  WHERE id = v_offer.order_id
    AND status IN ('pending', 'unmatched', 'partially_matched');

  RETURN jsonb_build_object(
    'success', true,
    'deal_id', v_deal_id,
    'deal_ref', v_deal_ref
  );
END;
$$;

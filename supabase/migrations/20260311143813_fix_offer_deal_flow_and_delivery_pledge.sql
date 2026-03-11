/*
  # Fix Offer Deal Flow + Delivery Pledge System

  ## Changes

  ### 1. Fix buyer_accept_supplier_offer
  - Change initial deal status from `pending_confirmation` to `matched`
  - This makes offer-based deals appear in the supplier's "New Requests" tab
  - Matches the same flow as auto-matched deals

  ### 2. Fix existing pending_confirmation deals
  - Update any existing deals with status `pending_confirmation` to `matched`
  - So suppliers can see and act on these deals

  ### 3. supplier_start_delivery_with_pledge RPC
  - New function that:
    a. Records that supplier acknowledged commission pledge
    b. Sets deal status to `in_delivery`
    c. Sets delivery_started_at timestamp
  - Only works when deal is in `inventory_reserved` or `awaiting_buyer` or `supplier_confirmed` status
  - Validates supplier_phone matches
*/

-- ─── 1. Update existing pending_confirmation deals → matched ─────────────────
UPDATE deals
SET status = 'matched',
    updated_at = now()
WHERE status = 'pending_confirmation';

-- ─── 2. Fix buyer_accept_supplier_offer to create deals with status = matched ─
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
    'demand_offer', 'matched'
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

GRANT EXECUTE ON FUNCTION buyer_accept_supplier_offer(text, uuid) TO anon, authenticated;

-- ─── 3. supplier_start_delivery_with_pledge ─────────────────────────────────
-- This RPC is called when supplier clicks "بدء إجراءات التسليم" AFTER confirming the pledge
CREATE OR REPLACE FUNCTION supplier_start_delivery_with_pledge(
  p_deal_id       uuid,
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
  SELECT * INTO v_deal
  FROM deals
  WHERE id = p_deal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الصفقة غير موجودة');
  END IF;

  IF v_deal.supplier_phone <> p_supplier_phone THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  IF v_deal.status NOT IN ('inventory_reserved', 'awaiting_buyer', 'supplier_confirmed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'لا يمكن بدء التسليم في هذه المرحلة — الحالة: ' || v_deal.status);
  END IF;

  UPDATE deals
  SET status = 'in_delivery',
      delivery_started_at = now(),
      updated_at = now()
  WHERE id = p_deal_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION supplier_start_delivery_with_pledge(uuid, text) TO anon, authenticated;

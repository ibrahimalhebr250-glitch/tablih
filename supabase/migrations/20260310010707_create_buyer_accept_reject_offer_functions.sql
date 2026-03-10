/*
  # Buyer Accept / Reject Supplier Demand Offer

  ## Purpose
  Completes the negotiation flow: buyer can view incoming offers on their demands
  and accept (creates a deal) or reject each offer.

  ## New Functions
  1. `get_buyer_incoming_offers(p_buyer_phone)` — returns all offers sent to this buyer
     with order details (pallet_type, city, quality, size) and supplier profile
  2. `buyer_accept_supplier_offer(p_buyer_phone, p_offer_id)` — buyer accepts an offer:
     - Validates offer belongs to buyer
     - Creates a deal with status `pending_confirmation`
     - Sets offer status → `deal_created`
     - Rejects all other pending offers on same order
     - Updates order status → `matched`
  3. `buyer_reject_supplier_offer(p_buyer_phone, p_offer_id)` — buyer rejects an offer:
     - Sets offer status → `rejected`

  ## Security
  All functions are SECURITY DEFINER and validate p_buyer_phone against the offer's buyer_phone.
*/

-- ─── 1. get_buyer_incoming_offers ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_buyer_incoming_offers(p_buyer_phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id',               sdo.id,
      'order_id',         sdo.order_id,
      'supplier_phone',   sdo.supplier_phone,
      'quantity',         sdo.quantity,
      'price_per_pallet', sdo.price_per_pallet,
      'supplier_message', sdo.supplier_message,
      'status',           sdo.status,
      'deal_id',          sdo.deal_id,
      'created_at',       sdo.created_at,
      'pallet_type',      o.pallet_type,
      'size',             o.size,
      'quality',          o.quality,
      'city',             o.city,
      'order_quantity',   o.quantity,
      'supplier_name',    COALESCE(up.company_name, up.display_name, sdo.supplier_phone)
    )
    ORDER BY sdo.created_at DESC
  ) INTO v_result
  FROM supplier_demand_offers sdo
  JOIN orders o ON o.id = sdo.order_id
  LEFT JOIN user_profiles up ON up.phone = sdo.supplier_phone
  WHERE sdo.buyer_phone = p_buyer_phone
    AND sdo.status NOT IN ('cancelled');

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION get_buyer_incoming_offers(text) TO anon, authenticated;

-- ─── 2. buyer_accept_supplier_offer ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION buyer_accept_supplier_offer(
  p_buyer_phone text,
  p_offer_id    uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  -- Fetch and lock the offer
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

  -- Fetch order details
  SELECT * INTO v_order FROM orders WHERE id = v_offer.order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الطلب غير موجود');
  END IF;

  -- Read platform fee from settings (fallback 1.00)
  SELECT COALESCE((value::numeric), 1.00)
  INTO v_platform_fee_per_pallet
  FROM platform_settings
  WHERE key = 'platform_fee_per_pallet'
  LIMIT 1;

  IF v_platform_fee_per_pallet IS NULL THEN
    v_platform_fee_per_pallet := 1.00;
  END IF;

  -- Prices
  v_supplier_price := v_offer.price_per_pallet;
  v_buyer_price    := v_offer.price_per_pallet + v_platform_fee_per_pallet;

  -- Generate deal ref
  v_deal_ref := 'DO-' || upper(substring(gen_random_uuid()::text, 1, 6));

  -- Create the deal
  INSERT INTO deals (
    deal_ref,
    request_id,
    order_id,
    buyer_phone,
    supplier_phone,
    pallet_type,
    size,
    quality,
    city,
    quantity,
    final_price,
    supplier_price,
    buyer_price,
    platform_fee_per_pallet,
    platform_fee,
    source,
    status
  ) VALUES (
    v_deal_ref,
    v_deal_ref,
    v_offer.order_id,
    v_offer.buyer_phone,
    v_offer.supplier_phone,
    v_order.pallet_type,
    COALESCE(v_order.size, ''),
    COALESCE(v_order.quality, ''),
    COALESCE(v_order.city, ''),
    v_offer.quantity,
    v_buyer_price * v_offer.quantity,
    v_supplier_price,
    v_buyer_price,
    v_platform_fee_per_pallet,
    v_platform_fee_per_pallet * v_offer.quantity,
    'demand_offer',
    'pending_confirmation'
  )
  RETURNING id INTO v_deal_id;

  -- Mark this offer as deal_created
  UPDATE supplier_demand_offers
  SET status = 'deal_created',
      deal_id = v_deal_id,
      updated_at = now()
  WHERE id = p_offer_id;

  -- Reject all other pending offers on same order
  UPDATE supplier_demand_offers
  SET status = 'rejected',
      updated_at = now()
  WHERE order_id = v_offer.order_id
    AND id <> p_offer_id
    AND status = 'pending';

  -- Update order status to matched
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

-- ─── 3. buyer_reject_supplier_offer ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION buyer_reject_supplier_offer(
  p_buyer_phone text,
  p_offer_id    uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer supplier_demand_offers%ROWTYPE;
BEGIN
  SELECT * INTO v_offer
  FROM supplier_demand_offers
  WHERE id = p_offer_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'العرض غير موجود');
  END IF;

  IF v_offer.buyer_phone <> p_buyer_phone THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  IF v_offer.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'لا يمكن رفض هذا العرض');
  END IF;

  UPDATE supplier_demand_offers
  SET status = 'rejected',
      updated_at = now()
  WHERE id = p_offer_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION buyer_reject_supplier_offer(text, uuid) TO anon, authenticated;

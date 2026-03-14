/*
  # Update create_negotiation_request to Accept Phone Directly

  1. Changes
    - Drop old function that required session token
    - Create new version that accepts supplier phone directly
    - Still validates order exists and is active
    - Still prevents self-negotiation
    - Still prevents duplicate pending requests

  2. Flow
    - Supplier enters phone manually in NegotiationOfferSheet
    - No login/session required to submit an offer
    - Validates supplier phone is registered
*/

DO $$
BEGIN
  DROP FUNCTION IF EXISTS create_negotiation_request(text, uuid, integer, text, numeric);
END $$;

CREATE OR REPLACE FUNCTION create_negotiation_request(
  p_supplier_phone text,
  p_order_id uuid,
  p_requested_quantity integer,
  p_city text DEFAULT NULL,
  p_offer_price_per_pallet numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order          record;
  v_existing_count integer;
  v_request_id     uuid;
  v_formatted_phone text;
BEGIN
  v_formatted_phone := p_supplier_phone;
  IF NOT v_formatted_phone LIKE '0%' THEN
    v_formatted_phone := '0' || v_formatted_phone;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM platform_users WHERE phone = v_formatted_phone
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'رقم الجوال غير مسجل في المنصة');
  END IF;

  SELECT o.*
  INTO v_order
  FROM orders o
  WHERE o.id = p_order_id
  AND o.status IN ('pending', 'unmatched', 'partially_matched')
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الطلب غير موجود أو غير نشط');
  END IF;

  IF v_order.phone = v_formatted_phone THEN
    RETURN jsonb_build_object('success', false, 'error', 'لا يمكنك تقديم عرض على طلبك الخاص');
  END IF;

  SELECT COUNT(*)
  INTO v_existing_count
  FROM negotiation_requests nr
  WHERE nr.supplier_phone = v_formatted_phone
  AND nr.buyer_phone    = v_order.phone
  AND nr.status         = 'pending'
  AND nr.buyer_message  LIKE 'order_id:' || p_order_id::text || '%';

  IF v_existing_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'لديك طلب تفاوض معلق على هذا الطلب بالفعل');
  END IF;

  INSERT INTO negotiation_requests (
    inventory_batch_id,
    buyer_phone,
    supplier_phone,
    requested_quantity,
    offer_price_per_pallet,
    pallet_type,
    size,
    quality,
    city,
    available_quantity,
    price_per_pallet,
    buyer_message,
    status
  )
  SELECT
    gen_random_uuid(),
    v_order.phone,
    v_formatted_phone,
    p_requested_quantity,
    p_offer_price_per_pallet,
    v_order.pallet_type,
    v_order.size,
    v_order.quality,
    COALESCE(p_city, v_order.city),
    p_requested_quantity,
    COALESCE(p_offer_price_per_pallet, 0),
    'order_id:' || p_order_id::text,
    'pending'
  RETURNING id INTO v_request_id;

  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_request_id
  );
END;
$$;

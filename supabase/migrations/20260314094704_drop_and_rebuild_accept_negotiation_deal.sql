/*
  # Drop and Rebuild Accept Negotiation Deal Function

  1. Changes
    - Drop old function with supplier-centric signature
    - Rebuild as buyer-centric: the BUYER (order owner) accepts supplier offers
    - Creates deal without requiring inventory batch (demand-card flow)
    - Updates order status on acceptance

  2. Flow
    - Supplier submits offer on demand order
    - Buyer sees offers in account and accepts
    - Deal created with source='negotiation', status='pending_supplier'
    - Order gets updated to 'matched'
*/

DO $$
BEGIN
  DROP FUNCTION IF EXISTS accept_negotiation_and_create_deal(uuid, text, text, integer);
END $$;

CREATE OR REPLACE FUNCTION accept_negotiation_and_create_deal(
  p_request_id uuid,
  p_buyer_phone text,
  p_buyer_response text DEFAULT NULL,
  p_quantity integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_request    negotiation_requests%ROWTYPE;
  v_deal_id    uuid;
  v_deal_ref   text;
  v_request_id_text text;
  v_expires    timestamptz;
  v_qty        integer;
  v_platform_fee numeric;
  v_order_id   uuid;
BEGIN
  SELECT * INTO v_request
  FROM negotiation_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'طلب التفاوض غير موجود');
  END IF;

  IF v_request.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'طلب التفاوض ليس في حالة انتظار');
  END IF;

  IF v_request.buyer_phone != p_buyer_phone THEN
    RETURN jsonb_build_object('success', false, 'error', 'ليس لديك صلاحية على هذا الطلب');
  END IF;

  v_qty := COALESCE(p_quantity, v_request.requested_quantity);
  v_deal_ref := 'NEG-' || upper(substring(gen_random_uuid()::text, 1, 8));
  v_request_id_text := 'NR-' || upper(substring(p_request_id::text, 1, 6));
  v_expires := now() + interval '48 hours';

  SELECT COALESCE(
    (SELECT (value::numeric) FROM platform_settings WHERE key = 'platform_fee_per_pallet' LIMIT 1),
    1
  ) INTO v_platform_fee;

  IF v_request.buyer_message LIKE 'order_id:%' THEN
    BEGIN
      v_order_id := substring(v_request.buyer_message FROM 'order_id:(.+)')::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_order_id := NULL;
    END;
  END IF;

  INSERT INTO deals (
    request_id,
    deal_ref,
    order_id,
    inventory_batch_id,
    buyer_phone,
    supplier_phone,
    pallet_type,
    size,
    quality,
    city,
    quantity,
    final_price,
    platform_fee_per_pallet,
    status,
    source,
    reservation_expires_at,
    created_at,
    updated_at
  ) VALUES (
    v_request_id_text,
    v_deal_ref,
    v_order_id,
    NULL,
    v_request.buyer_phone,
    v_request.supplier_phone,
    v_request.pallet_type,
    v_request.size,
    v_request.quality,
    COALESCE(v_request.city, ''),
    v_qty,
    COALESCE(v_request.price_per_pallet, 0),
    v_platform_fee,
    'pending_supplier',
    'negotiation',
    v_expires,
    now(),
    now()
  ) RETURNING id INTO v_deal_id;

  UPDATE negotiation_requests
  SET status = 'deal_created',
      supplier_response = COALESCE(p_buyer_response, supplier_response),
      deal_id = v_deal_id,
      updated_at = now()
  WHERE id = p_request_id;

  IF v_order_id IS NOT NULL THEN
    UPDATE orders
    SET status = 'matched',
        matched_quantity = COALESCE(matched_quantity, 0) + v_qty,
        updated_at = now()
    WHERE id = v_order_id
    AND status IN ('pending', 'unmatched', 'partially_matched');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'deal_id', v_deal_id,
    'deal_ref', v_deal_ref,
    'quantity', v_qty,
    'expires_at', v_expires
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'حدث خطأ: ' || SQLERRM);
END;
$$;

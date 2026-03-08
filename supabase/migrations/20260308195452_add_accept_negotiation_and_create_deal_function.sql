/*
  # Accept Negotiation Request and Create Deal

  ## Overview
  Creates a server-side function that atomically:
  1. Updates the negotiation request status to 'accepted'
  2. Creates a deal using the existing deal creation logic
  3. Links the deal back to the negotiation request
  4. Reserves inventory from the batch

  ## New Functions
  - `accept_negotiation_and_create_deal(p_request_id, p_supplier_phone, p_supplier_response, p_quantity)`
    - Validates the request exists and is pending
    - Validates the supplier owns the request
    - Creates a deal via the existing pattern
    - Updates negotiation_requests with deal_id and status 'deal_created'
    - Returns deal details

  ## Important Notes
  - This function does NOT modify any existing deal or matching logic
  - It only adds a new entry point for deal creation from the market negotiation flow
  - Uses SECURITY DEFINER to ensure atomic inventory reservation
*/

CREATE OR REPLACE FUNCTION accept_negotiation_and_create_deal(
  p_request_id uuid,
  p_supplier_phone text,
  p_supplier_response text DEFAULT NULL,
  p_quantity integer DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request negotiation_requests%ROWTYPE;
  v_batch inventory_batches%ROWTYPE;
  v_deal_id uuid;
  v_deal_ref text;
  v_request_id_text text;
  v_expires timestamptz;
  v_qty integer;
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

  IF v_request.supplier_phone != p_supplier_phone THEN
    RETURN jsonb_build_object('success', false, 'error', 'ليس لديك صلاحية على هذا الطلب');
  END IF;

  SELECT * INTO v_batch
  FROM inventory_batches
  WHERE id = v_request.inventory_batch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'المخزون غير موجود');
  END IF;

  IF v_batch.status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'المخزون غير نشط');
  END IF;

  v_qty := COALESCE(p_quantity, v_request.available_quantity);

  IF v_batch.available_quantity < v_qty THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'الكمية المتاحة غير كافية. المتاح: ' || v_batch.available_quantity
    );
  END IF;

  v_deal_ref := 'DEL-' || upper(substring(gen_random_uuid()::text, 1, 8));
  v_request_id_text := 'NEG-' || upper(substring(p_request_id::text, 1, 6));
  v_expires := now() + interval '48 hours';

  INSERT INTO deals (
    request_id,
    deal_ref,
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
    reservation_expires_at,
    created_at,
    updated_at
  ) VALUES (
    v_request_id_text,
    v_deal_ref,
    v_request.inventory_batch_id,
    v_request.buyer_phone,
    v_request.supplier_phone,
    v_request.pallet_type,
    v_request.size,
    v_request.quality,
    v_request.city,
    v_qty,
    COALESCE(v_request.price_per_pallet, 0),
    1,
    'pending_supplier',
    v_expires,
    now(),
    now()
  ) RETURNING id INTO v_deal_id;

  UPDATE inventory_batches
  SET available_quantity = available_quantity - v_qty,
      updated_at = now()
  WHERE id = v_request.inventory_batch_id;

  UPDATE negotiation_requests
  SET status = 'deal_created',
      supplier_response = COALESCE(p_supplier_response, supplier_response),
      deal_id = v_deal_id,
      updated_at = now()
  WHERE id = p_request_id;

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

GRANT EXECUTE ON FUNCTION accept_negotiation_and_create_deal TO anon;
GRANT EXECUTE ON FUNCTION accept_negotiation_and_create_deal TO authenticated;

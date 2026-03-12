/*
  # Sale Requests RPC Functions

  ## Functions Created

  1. create_sale_request(p_session_token, p_inventory_batch_id, p_requested_quantity)
     - Validates session, checks stock, creates the request

  2. get_buyer_sale_requests(p_session_token)
     - Returns all sale requests for a buyer with full details

  3. get_supplier_sale_requests(p_session_token)
     - Returns all incoming sale requests for a supplier

  4. supplier_accept_sale_request(p_session_token, p_request_id, p_commission_per_pallet)
     - Accepts the request, marks commission agreement, status → accepted

  5. supplier_start_contact(p_session_token, p_request_id)
     - Moves status from accepted → in_contact, returns buyer phone

  6. supplier_reject_sale_request(p_session_token, p_request_id)
     - Rejects request, status → rejected

  7. supplier_complete_sale_request(p_session_token, p_request_id)
     - Completes delivery: deducts from inventory_batches, adds to buyer_inventory,
       records commission in commission_settlements, status → completed

  8. supplier_fail_sale_request(p_session_token, p_request_id)
     - Marks as failed, status → failed

  All functions use SECURITY DEFINER so they bypass RLS safely.
*/

-- Helper: resolve session token to phone
CREATE OR REPLACE FUNCTION resolve_session_phone(p_token text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text;
BEGIN
  SELECT phone INTO v_phone
  FROM user_sessions
  WHERE session_token = p_token
    AND expires_at > now()
    AND is_active = true
  LIMIT 1;
  RETURN v_phone;
END;
$$;

-- 1. Create sale request (buyer action)
CREATE OR REPLACE FUNCTION create_sale_request(
  p_session_token text,
  p_inventory_batch_id uuid,
  p_requested_quantity integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer_phone text;
  v_batch record;
  v_existing_count integer;
  v_new_id uuid;
  v_commission numeric;
BEGIN
  v_buyer_phone := resolve_session_phone(p_session_token);
  IF v_buyer_phone IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'جلسة غير صالحة');
  END IF;

  SELECT * INTO v_batch FROM inventory_batches WHERE id = p_inventory_batch_id AND publish_to_market = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'العرض غير موجود أو غير منشور');
  END IF;

  IF v_batch.phone = v_buyer_phone THEN
    RETURN jsonb_build_object('success', false, 'error', 'لا يمكنك طلب شراء مخزونك الخاص');
  END IF;

  IF (v_batch.quantity_available IS NULL OR v_batch.quantity_available < p_requested_quantity) THEN
    RETURN jsonb_build_object('success', false, 'error', 'الكمية المطلوبة تتجاوز المتاح');
  END IF;

  -- Check for existing pending/accepted request from same buyer
  SELECT COUNT(*) INTO v_existing_count
  FROM sale_requests
  WHERE inventory_batch_id = p_inventory_batch_id
    AND buyer_phone = v_buyer_phone
    AND status IN ('pending_supplier', 'accepted', 'in_contact');

  IF v_existing_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'لديك طلب نشط بالفعل على هذا العرض');
  END IF;

  -- Get platform commission
  SELECT COALESCE(
    (SELECT (value::numeric) FROM platform_settings WHERE key = 'commission_per_pallet' LIMIT 1),
    5
  ) INTO v_commission;

  INSERT INTO sale_requests (
    inventory_batch_id,
    supplier_phone,
    buyer_phone,
    requested_quantity,
    city,
    pallet_type,
    size,
    quality,
    price_per_pallet,
    status,
    commission_per_pallet
  ) VALUES (
    p_inventory_batch_id,
    v_batch.phone,
    v_buyer_phone,
    p_requested_quantity,
    COALESCE(v_batch.city, ''),
    COALESCE(v_batch.pallet_type, ''),
    COALESCE(v_batch.size, ''),
    COALESCE(v_batch.quality, ''),
    COALESCE(v_batch.price_per_pallet, 0),
    'pending_supplier',
    v_commission
  ) RETURNING id INTO v_new_id;

  RETURN jsonb_build_object('success', true, 'request_id', v_new_id);
END;
$$;

-- 2. Get buyer's sale requests
CREATE OR REPLACE FUNCTION get_buyer_sale_requests(p_session_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text;
  v_rows jsonb;
BEGIN
  v_phone := resolve_session_phone(p_session_token);
  IF v_phone IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'جلسة غير صالحة');
  END IF;

  SELECT jsonb_agg(row_to_json(r)) INTO v_rows
  FROM (
    SELECT sr.*, ib.image_urls
    FROM sale_requests sr
    LEFT JOIN inventory_batches ib ON ib.id = sr.inventory_batch_id
    WHERE sr.buyer_phone = v_phone
    ORDER BY sr.created_at DESC
  ) r;

  RETURN jsonb_build_object('success', true, 'data', COALESCE(v_rows, '[]'::jsonb));
END;
$$;

-- 3. Get supplier's incoming sale requests
CREATE OR REPLACE FUNCTION get_supplier_sale_requests(p_session_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text;
  v_rows jsonb;
BEGIN
  v_phone := resolve_session_phone(p_session_token);
  IF v_phone IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'جلسة غير صالحة');
  END IF;

  SELECT jsonb_agg(row_to_json(r)) INTO v_rows
  FROM (
    SELECT sr.*,
           pu.display_name AS buyer_display_name,
           pu.company_name AS buyer_company_name
    FROM sale_requests sr
    LEFT JOIN platform_users pu ON pu.phone = sr.buyer_phone
    WHERE sr.supplier_phone = v_phone
    ORDER BY sr.created_at DESC
  ) r;

  RETURN jsonb_build_object('success', true, 'data', COALESCE(v_rows, '[]'::jsonb));
END;
$$;

-- 4. Supplier accept request
CREATE OR REPLACE FUNCTION supplier_accept_sale_request(
  p_session_token text,
  p_request_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text;
  v_req record;
BEGIN
  v_phone := resolve_session_phone(p_session_token);
  IF v_phone IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'جلسة غير صالحة');
  END IF;

  SELECT * INTO v_req FROM sale_requests WHERE id = p_request_id AND supplier_phone = v_phone;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الطلب غير موجود');
  END IF;

  IF v_req.status <> 'pending_supplier' THEN
    RETURN jsonb_build_object('success', false, 'error', 'لا يمكن قبول هذا الطلب في حالته الحالية');
  END IF;

  UPDATE sale_requests
  SET status = 'accepted',
      supplier_agreed_commission = true,
      updated_at = now()
  WHERE id = p_request_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 5. Supplier start contact (opens WhatsApp)
CREATE OR REPLACE FUNCTION supplier_start_contact(
  p_session_token text,
  p_request_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text;
  v_req record;
BEGIN
  v_phone := resolve_session_phone(p_session_token);
  IF v_phone IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'جلسة غير صالحة');
  END IF;

  SELECT * INTO v_req FROM sale_requests WHERE id = p_request_id AND supplier_phone = v_phone;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الطلب غير موجود');
  END IF;

  IF v_req.status <> 'accepted' THEN
    RETURN jsonb_build_object('success', false, 'error', 'يجب قبول الطلب أولاً');
  END IF;

  UPDATE sale_requests
  SET status = 'in_contact',
      updated_at = now()
  WHERE id = p_request_id;

  RETURN jsonb_build_object('success', true, 'buyer_phone', v_req.buyer_phone);
END;
$$;

-- 6. Supplier reject request
CREATE OR REPLACE FUNCTION supplier_reject_sale_request(
  p_session_token text,
  p_request_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text;
  v_req record;
BEGIN
  v_phone := resolve_session_phone(p_session_token);
  IF v_phone IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'جلسة غير صالحة');
  END IF;

  SELECT * INTO v_req FROM sale_requests WHERE id = p_request_id AND supplier_phone = v_phone;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الطلب غير موجود');
  END IF;

  IF v_req.status NOT IN ('pending_supplier', 'accepted') THEN
    RETURN jsonb_build_object('success', false, 'error', 'لا يمكن رفض هذا الطلب في حالته الحالية');
  END IF;

  UPDATE sale_requests
  SET status = 'rejected',
      updated_at = now()
  WHERE id = p_request_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 7. Supplier complete delivery
CREATE OR REPLACE FUNCTION supplier_complete_sale_request(
  p_session_token text,
  p_request_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text;
  v_req record;
  v_batch record;
BEGIN
  v_phone := resolve_session_phone(p_session_token);
  IF v_phone IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'جلسة غير صالحة');
  END IF;

  SELECT * INTO v_req FROM sale_requests WHERE id = p_request_id AND supplier_phone = v_phone;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الطلب غير موجود');
  END IF;

  IF v_req.status <> 'in_contact' THEN
    RETURN jsonb_build_object('success', false, 'error', 'يجب بدء التواصل أولاً');
  END IF;

  SELECT * INTO v_batch FROM inventory_batches WHERE id = v_req.inventory_batch_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'المخزون غير موجود');
  END IF;

  IF (v_batch.quantity_available IS NULL OR v_batch.quantity_available < v_req.requested_quantity) THEN
    RETURN jsonb_build_object('success', false, 'error', 'الكمية المتاحة في المخزون غير كافية');
  END IF;

  -- 1. Deduct from inventory_batches
  UPDATE inventory_batches
  SET quantity_available = quantity_available - v_req.requested_quantity,
      updated_at = now()
  WHERE id = v_req.inventory_batch_id;

  -- 2. Add to buyer_inventory
  INSERT INTO buyer_inventory (
    buyer_phone,
    pallet_type,
    size,
    quality,
    city,
    quantity,
    source
  ) VALUES (
    v_req.buyer_phone,
    v_req.pallet_type,
    v_req.size,
    v_req.quality,
    v_req.city,
    v_req.requested_quantity,
    'sale_request'
  );

  -- 3. Record commission in commission_settlements
  IF v_req.commission_per_pallet > 0 THEN
    INSERT INTO commission_settlements (
      supplier_phone,
      buyer_phone,
      quantity,
      commission_per_unit,
      total_commission,
      status
    ) VALUES (
      v_req.supplier_phone,
      v_req.buyer_phone,
      v_req.requested_quantity,
      v_req.commission_per_pallet,
      v_req.commission_per_pallet * v_req.requested_quantity,
      'pending'
    );
  END IF;

  -- 4. Mark request completed
  UPDATE sale_requests
  SET status = 'completed',
      updated_at = now()
  WHERE id = p_request_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 8. Supplier fail delivery
CREATE OR REPLACE FUNCTION supplier_fail_sale_request(
  p_session_token text,
  p_request_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text;
  v_req record;
BEGIN
  v_phone := resolve_session_phone(p_session_token);
  IF v_phone IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'جلسة غير صالحة');
  END IF;

  SELECT * INTO v_req FROM sale_requests WHERE id = p_request_id AND supplier_phone = v_phone;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الطلب غير موجود');
  END IF;

  IF v_req.status <> 'in_contact' THEN
    RETURN jsonb_build_object('success', false, 'error', 'لا يمكن إلغاء هذا الطلب في حالته الحالية');
  END IF;

  UPDATE sale_requests
  SET status = 'failed',
      updated_at = now()
  WHERE id = p_request_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION resolve_session_phone(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_sale_request(text, uuid, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_buyer_sale_requests(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_supplier_sale_requests(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION supplier_accept_sale_request(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION supplier_start_contact(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION supplier_reject_sale_request(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION supplier_complete_sale_request(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION supplier_fail_sale_request(text, uuid) TO anon, authenticated;

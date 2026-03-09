
/*
  # Fix Order Insertion via RPC Function

  ## Problem
  Direct INSERT into orders table from the frontend fails with RLS error (code 42501)
  even though an "Anyone can insert orders" policy with WITH CHECK (true) exists.
  This happens because the anon role's RLS check fails in some edge cases.

  ## Solution
  Create a SECURITY DEFINER RPC function that handles order creation safely,
  bypassing RLS while still validating session token and phone ownership.

  ## New Function
  - `create_order_for_session`: Accepts order details + session token, validates
    the session, and inserts the order. Returns the new order id and request_id.
*/

CREATE OR REPLACE FUNCTION public.create_order_for_session(
  p_session_token text,
  p_pallet_type   text,
  p_size          text,
  p_quality       text,
  p_quantity      integer,
  p_city          text,
  p_pallet_condition text DEFAULT 'new',
  p_accept_close_quality boolean DEFAULT false,
  p_accept_close_city    boolean DEFAULT false,
  p_accept_partial_delivery boolean DEFAULT false,
  p_order_source  text DEFAULT 'manual_order'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone          text;
  v_order_id       uuid;
  v_request_id     text;
BEGIN
  -- Resolve phone from active session token
  SELECT phone INTO v_phone
  FROM session_tokens
  WHERE access_token = p_session_token
    AND expires_at > now()
  LIMIT 1;

  IF v_phone IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'session_invalid');
  END IF;

  -- Insert the order
  INSERT INTO orders (
    phone,
    pallet_type,
    size,
    quality,
    quantity,
    city,
    pallet_condition,
    accept_close_quality,
    accept_close_city,
    accept_partial_delivery,
    status,
    order_source
  )
  VALUES (
    v_phone,
    p_pallet_type,
    p_size,
    p_quality,
    p_quantity,
    p_city,
    p_pallet_condition,
    p_accept_close_quality,
    p_accept_close_city,
    p_accept_partial_delivery,
    'unmatched',
    p_order_source
  )
  RETURNING id, request_id INTO v_order_id, v_request_id;

  RETURN jsonb_build_object(
    'success',     true,
    'id',          v_order_id,
    'request_id',  v_request_id,
    'phone',       v_phone
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_order_for_session TO anon, authenticated;

/*
  # Fix get_buyer_sale_requests - wrong column name
  
  The function was referencing ib.image_urls but the column is ib.image_url (singular).
  This caused the buyer to see no requests at all (function threw an error).
  
  Also fixes get_supplier_sale_requests to include image_url from inventory_batches.
*/

CREATE OR REPLACE FUNCTION get_buyer_sale_requests(p_session_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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
    SELECT sr.*, ib.image_url
    FROM sale_requests sr
    LEFT JOIN inventory_batches ib ON ib.id = sr.inventory_batch_id
    WHERE sr.buyer_phone = v_phone
    ORDER BY sr.created_at DESC
  ) r;

  RETURN jsonb_build_object('success', true, 'data', COALESCE(v_rows, '[]'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION get_supplier_sale_requests(p_session_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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
      pu.company_name AS buyer_company_name,
      ib.image_url
    FROM sale_requests sr
    LEFT JOIN platform_users pu ON pu.phone = sr.buyer_phone
    LEFT JOIN inventory_batches ib ON ib.id = sr.inventory_batch_id
    WHERE sr.supplier_phone = v_phone
    ORDER BY sr.created_at DESC
  ) r;

  RETURN jsonb_build_object('success', true, 'data', COALESCE(v_rows, '[]'::jsonb));
END;
$$;

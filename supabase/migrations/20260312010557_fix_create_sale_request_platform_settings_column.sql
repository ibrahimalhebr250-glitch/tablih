/*
  # Fix create_sale_request function - platform_settings column names

  The function was referencing `key` and `value` columns in platform_settings,
  but the actual column names are `setting_key` and `setting_value` (jsonb).
  This migration rebuilds the function with the correct column references.
*/

CREATE OR REPLACE FUNCTION public.create_sale_request(
  p_session_token text,
  p_inventory_batch_id uuid,
  p_requested_quantity integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  SELECT COUNT(*) INTO v_existing_count
  FROM sale_requests
  WHERE inventory_batch_id = p_inventory_batch_id
    AND buyer_phone = v_buyer_phone
    AND status IN ('pending_supplier', 'accepted', 'in_contact');

  IF v_existing_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'لديك طلب نشط بالفعل على هذا العرض');
  END IF;

  SELECT COALESCE(
    (SELECT (setting_value::text)::numeric
     FROM platform_settings
     WHERE setting_key = 'commission_per_pallet'
     LIMIT 1),
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
$function$;

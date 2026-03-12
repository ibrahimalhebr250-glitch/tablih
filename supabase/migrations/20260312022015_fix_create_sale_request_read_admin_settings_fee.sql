/*
  # Fix create_sale_request to Read Commission from admin_settings

  ## Problem
  The create_sale_request function was reading commission_per_pallet from
  platform_settings WHERE setting_key = 'commission_per_pallet', but this
  key does not exist. The actual commission value is stored in
  admin_settings.platform_fee_per_unit (same source as get_platform_fee).

  ## Fix
  Update create_sale_request to read from admin_settings.platform_fee_per_unit,
  consistent with how deals and all other commission logic works.
  Default remains 1.0 if not set.
*/

CREATE OR REPLACE FUNCTION create_sale_request(
  p_session_token text,
  p_inventory_batch_id uuid,
  p_requested_quantity integer,
  p_buyer_phone text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_buyer_phone text;
  v_session RECORD;
  v_batch RECORD;
  v_commission numeric;
  v_existing RECORD;
BEGIN
  -- Resolve buyer phone from session token or parameter
  IF p_buyer_phone IS NOT NULL THEN
    v_buyer_phone := p_buyer_phone;
  ELSE
    SELECT phone INTO v_buyer_phone
    FROM user_sessions
    WHERE session_token = p_session_token
      AND expires_at > now()
      AND is_active = true
    LIMIT 1;

    IF v_buyer_phone IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'جلسة غير صالحة');
    END IF;
  END IF;

  -- Get inventory batch details
  SELECT * INTO v_batch
  FROM inventory_batches
  WHERE id = p_inventory_batch_id
    AND publish_to_market = true
    AND status NOT IN ('sold_out', 'cancelled');

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'المخزون غير متاح');
  END IF;

  -- Prevent self-purchase
  IF v_batch.phone = v_buyer_phone THEN
    RETURN jsonb_build_object('success', false, 'error', 'لا يمكنك شراء من مخزونك الخاص');
  END IF;

  -- Check quantity
  IF p_requested_quantity > COALESCE(v_batch.quantity_available, v_batch.quantity) THEN
    RETURN jsonb_build_object('success', false, 'error', 'الكمية المطلوبة تتجاوز المتاح');
  END IF;

  -- Prevent duplicate active requests
  SELECT id INTO v_existing
  FROM sale_requests
  WHERE inventory_batch_id = p_inventory_batch_id
    AND buyer_phone = v_buyer_phone
    AND status NOT IN ('rejected', 'completed', 'failed')
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'لديك طلب شراء نشط بالفعل لهذا المخزون');
  END IF;

  -- Read commission from admin_settings (same source as get_platform_fee / deals)
  SELECT COALESCE(platform_fee_per_unit, 1.0)
  INTO v_commission
  FROM admin_settings
  LIMIT 1;

  IF v_commission IS NULL THEN
    v_commission := 1.0;
  END IF;

  -- Insert sale request
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
    commission_per_pallet,
    status
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
    v_commission,
    'pending_supplier'
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم إرسال طلب الشراء بنجاح',
    'commission_per_pallet', v_commission
  );
END;
$$;

GRANT EXECUTE ON FUNCTION create_sale_request(text, uuid, integer, text) TO authenticated, anon;

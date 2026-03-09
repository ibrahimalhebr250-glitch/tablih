/*
  # Update om_auto_create_deal to set source column

  ## Changes
  - Updated `om_auto_create_deal` to include `source = 'auto_match'` when creating deals
  - Updated `om_admin_create_deal_from_candidate` to include `source = 'admin_match'`
  - This prevents the v4_trg_log_deal trigger from failing
*/

CREATE OR REPLACE FUNCTION om_auto_create_deal(
  p_order_id uuid,
  p_batch_id uuid,
  p_score numeric
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  o record;
  b record;
  match_qty integer;
  new_deal_id uuid;
  new_deal_ref text;
  commission numeric := 0.25;
BEGIN
  SELECT id, phone, pallet_type, size, quality, city, quantity, status, request_id
  INTO o
  FROM orders
  WHERE id = p_order_id;

  IF o IS NULL OR o.status NOT IN ('pending', 'unmatched') THEN
    RETURN;
  END IF;

  SELECT id, phone, pallet_type, size, quality, city, available_quantity, price_per_pallet, status
  INTO b
  FROM inventory_batches
  WHERE id = p_batch_id;

  IF b IS NULL OR b.status != 'active' OR b.available_quantity <= 0 THEN
    RETURN;
  END IF;

  IF o.phone = b.phone THEN
    RETURN;
  END IF;

  match_qty := LEAST(o.quantity, b.available_quantity);
  IF match_qty <= 0 THEN
    RETURN;
  END IF;

  SELECT COALESCE((setting_value #>> '{}')::numeric, 0.25)
  INTO commission
  FROM platform_settings
  WHERE setting_key = 'platform_commission_per_pallet'
  LIMIT 1;

  new_deal_ref := 'DEL-' || LPAD(FLOOR(random() * 999999)::text, 6, '0');

  INSERT INTO deals (
    deal_ref, request_id, order_id, inventory_batch_id,
    buyer_phone, supplier_phone,
    pallet_type, size, quality, city, quantity,
    final_price, supplier_price, platform_fee_per_pallet, platform_fee, buyer_price,
    status, reserved_at, reservation_expires_at, source
  ) VALUES (
    new_deal_ref, COALESCE(o.request_id, ''), p_order_id, p_batch_id,
    o.phone, b.phone,
    b.pallet_type, b.size, b.quality, b.city, match_qty,
    COALESCE(b.price_per_pallet, 0),
    COALESCE(b.price_per_pallet, 0),
    commission,
    commission * match_qty,
    COALESCE(b.price_per_pallet, 0) + commission,
    'pending_confirmation',
    now(),
    now() + interval '30 minutes',
    'auto_match'
  )
  RETURNING id INTO new_deal_id;

  UPDATE inventory_batches
  SET available_quantity = GREATEST(available_quantity - match_qty, 0),
      reserved_quantity = COALESCE(reserved_quantity, 0) + match_qty,
      updated_at = now()
  WHERE id = p_batch_id;

  UPDATE matching_candidates
  SET auto_matched = true,
      deal_id = new_deal_id,
      status = 'dealt'
  WHERE order_id = p_order_id AND batch_id = p_batch_id;

END;
$$;

CREATE OR REPLACE FUNCTION om_admin_create_deal_from_candidate(p_candidate_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  c record;
  o record;
  b record;
  match_qty integer;
  new_deal_id uuid;
  new_deal_ref text;
  commission numeric := 0.25;
BEGIN
  SELECT * INTO c FROM matching_candidates WHERE id = p_candidate_id;
  IF c IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Candidate not found');
  END IF;
  IF c.status = 'dealt' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already has a deal');
  END IF;

  SELECT * INTO o FROM orders WHERE id = c.order_id;
  IF o IS NULL OR o.status NOT IN ('pending', 'unmatched', 'partially_matched') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not available');
  END IF;

  SELECT * INTO b FROM inventory_batches WHERE id = c.batch_id;
  IF b IS NULL OR b.available_quantity <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Inventory not available');
  END IF;

  match_qty := LEAST(o.quantity - COALESCE(o.matched_quantity, 0), b.available_quantity);
  IF match_qty <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No quantity to match');
  END IF;

  SELECT COALESCE((setting_value #>> '{}')::numeric, 0.25)
  INTO commission
  FROM platform_settings
  WHERE setting_key = 'platform_commission_per_pallet'
  LIMIT 1;

  new_deal_ref := 'DEL-' || LPAD(FLOOR(random() * 999999)::text, 6, '0');

  INSERT INTO deals (
    deal_ref, request_id, order_id, inventory_batch_id,
    buyer_phone, supplier_phone,
    pallet_type, size, quality, city, quantity,
    final_price, supplier_price, platform_fee_per_pallet, platform_fee, buyer_price,
    status, reserved_at, reservation_expires_at, source
  ) VALUES (
    new_deal_ref, COALESCE(o.request_id, ''), c.order_id, c.batch_id,
    o.phone, b.phone,
    b.pallet_type, b.size, b.quality, b.city, match_qty,
    COALESCE(b.price_per_pallet, 0),
    COALESCE(b.price_per_pallet, 0),
    commission,
    commission * match_qty,
    COALESCE(b.price_per_pallet, 0) + commission,
    'pending_confirmation',
    now(),
    now() + interval '30 minutes',
    'admin_match'
  )
  RETURNING id INTO new_deal_id;

  UPDATE inventory_batches
  SET available_quantity = GREATEST(available_quantity - match_qty, 0),
      reserved_quantity = COALESCE(reserved_quantity, 0) + match_qty,
      updated_at = now()
  WHERE id = c.batch_id;

  UPDATE matching_candidates
  SET auto_matched = false,
      deal_id = new_deal_id,
      status = 'dealt'
  WHERE id = p_candidate_id;

  RETURN jsonb_build_object(
    'success', true,
    'deal_id', new_deal_id,
    'deal_ref', new_deal_ref,
    'quantity', match_qty
  );
END;
$$;

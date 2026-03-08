/*
  # Add publish_to_market filter to all server-side matching functions

  1. Changes
    - `ultra_smart_match_order`: Add `AND publish_to_market = true` filter
    - `multi_batch_matching`: Add `AND ib.publish_to_market = true` filter
    - `smart_auto_match_orders`: No inventory query (it receives batch directly), but add check at start

  2. Reason
    - Matching must only use inventory that is published to the market
    - Unpublished inventory (e.g., stored in cloud warehouse) should not be matched

  3. Important Notes
    - All three functions are called by triggers on inventory_batches insert
    - The filter ensures consistency between frontend and backend matching
*/

-- 1. Fix ultra_smart_match_order
CREATE OR REPLACE FUNCTION ultra_smart_match_order(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_batch RECORD;
  v_result jsonb;
  v_deal_id uuid;
  v_deal_ref text;
  v_matched boolean := false;
  v_commission_per_pallet numeric;
  v_platform_fee numeric;
  v_buyer_price numeric;
BEGIN
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF v_order.status NOT IN ('unmatched', 'partially_matched') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order is not eligible for matching');
  END IF;

  SELECT COALESCE(
    (general_settings->>'commission_per_pallet')::numeric,
    0.25
  ) INTO v_commission_per_pallet
  FROM platform_settings
  LIMIT 1;

  IF v_commission_per_pallet IS NULL THEN
    v_commission_per_pallet := 0.25;
  END IF;

  SELECT * INTO v_batch
  FROM inventory_batches
  WHERE phone != v_order.phone
    AND pallet_type = v_order.pallet_type
    AND size = v_order.size
    AND quality = v_order.quality
    AND city = v_order.city
    AND pallet_condition = COALESCE(v_order.pallet_condition, 'new')
    AND available_quantity > 0
    AND status = 'active'
    AND approval_status = 'approved'
    AND NOT hide_from_matching
    AND publish_to_market = true
  ORDER BY
    CASE WHEN price_per_pallet IS NOT NULL THEN 0 ELSE 1 END,
    price_per_pallet ASC NULLS LAST,
    created_at ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'matched', false,
      'message', 'No matching inventory found'
    );
  END IF;

  v_platform_fee := v_commission_per_pallet * v_order.quantity;
  v_buyer_price := COALESCE(v_batch.price_per_pallet, v_batch.min_price, 0) + v_commission_per_pallet;

  v_deal_ref := 'DEL-' || upper(substring(gen_random_uuid()::text, 1, 6));

  INSERT INTO deals (
    deal_ref, request_id, order_id, inventory_batch_id,
    buyer_phone, supplier_phone,
    pallet_type, size, quality, city,
    quantity, final_price, status,
    supplier_price, platform_fee_per_pallet, platform_fee, buyer_price,
    reservation_expires_at, reserved_at
  ) VALUES (
    v_deal_ref, v_order.request_id, p_order_id, v_batch.id,
    v_order.phone, v_batch.phone,
    v_order.pallet_type, v_order.size, v_order.quality, v_order.city,
    LEAST(v_order.quantity, v_batch.available_quantity),
    COALESCE(v_batch.price_per_pallet, v_batch.min_price, 0),
    'matched',
    COALESCE(v_batch.price_per_pallet, v_batch.min_price, 0),
    v_commission_per_pallet,
    v_platform_fee,
    v_buyer_price,
    now() + interval '30 minutes',
    now()
  )
  RETURNING id INTO v_deal_id;

  UPDATE inventory_batches
  SET
    available_quantity = available_quantity - LEAST(v_order.quantity, v_batch.available_quantity),
    reserved_quantity = reserved_quantity + LEAST(v_order.quantity, v_batch.available_quantity),
    updated_at = now()
  WHERE id = v_batch.id;

  DECLARE
    v_total_matched_qty int;
    v_new_status text;
  BEGIN
    SELECT COALESCE(SUM(d.quantity), 0) INTO v_total_matched_qty
    FROM deals d
    WHERE d.order_id = p_order_id
      AND d.status NOT IN ('cancelled', 'failed');

    IF v_total_matched_qty >= v_order.quantity THEN
      v_new_status := 'matched';
    ELSE
      v_new_status := 'partially_matched';
    END IF;

    UPDATE orders
    SET
      status = v_new_status,
      matched_quantity = v_total_matched_qty,
      updated_at = now()
    WHERE id = p_order_id;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'matched', true,
    'deal_id', v_deal_id,
    'deal_ref', v_deal_ref,
    'quantity', LEAST(v_order.quantity, v_batch.available_quantity),
    'supplier_phone', v_batch.phone
  );
END;
$$;

-- 2. Fix multi_batch_matching
CREATE OR REPLACE FUNCTION multi_batch_matching(p_order_id uuid, p_max_batches int DEFAULT 10)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_batch RECORD;
  v_batch_full RECORD;
  v_batches_selected jsonb := '[]'::jsonb;
  v_total_available int := 0;
  v_remaining_qty int;
  v_matched_qty int;
  v_deal_result jsonb;
  v_deals_created jsonb := '[]'::jsonb;
  v_matches_count int := 0;
  v_errors jsonb := '[]'::jsonb;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;

  IF NOT FOUND OR v_order.status NOT IN ('unmatched', 'partially_matched') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'order_not_found_or_fully_matched'
    );
  END IF;

  v_remaining_qty := v_order.quantity - COALESCE(v_order.matched_quantity, 0);

  FOR v_batch IN
    SELECT
      ib.*,
      calculate_match_score(v_order.id, ib.id) as match_score
    FROM inventory_batches ib
    WHERE ib.status = 'active'
      AND ib.available_quantity > 0
      AND ib.publish_to_market = true
      AND normalize_pallet_type(ib.pallet_type) = normalize_pallet_type(v_order.pallet_type)
      AND TRIM(ib.size) = TRIM(v_order.size)
      AND ib.phone IS DISTINCT FROM v_order.phone
      AND calculate_match_score(v_order.id, ib.id) >= 70
    ORDER BY
      calculate_match_score(v_order.id, ib.id) DESC,
      CASE WHEN TRIM(ib.city) = TRIM(v_order.city) THEN 1 ELSE 2 END,
      ib.price_per_pallet ASC,
      ib.created_at ASC
    LIMIT p_max_batches
  LOOP
    v_total_available := v_total_available + v_batch.available_quantity;

    v_batches_selected := v_batches_selected || jsonb_build_object(
      'batch_id', v_batch.id,
      'available_quantity', v_batch.available_quantity,
      'price_per_pallet', v_batch.price_per_pallet,
      'city', v_batch.city,
      'match_score', v_batch.match_score,
      'phone', v_batch.phone,
      'pallet_type', v_batch.pallet_type,
      'size', v_batch.size,
      'quality', v_batch.quality
    );

    IF v_total_available >= v_remaining_qty THEN
      EXIT;
    END IF;
  END LOOP;

  IF v_total_available < v_remaining_qty THEN
    INSERT INTO matching_attempts_log (
      order_id, matched, match_score, reason, metadata
    ) VALUES (
      v_order.id, false, 0,
      'insufficient_total_quantity',
      jsonb_build_object(
        'required', v_remaining_qty,
        'total_available', v_total_available,
        'batches_found', jsonb_array_length(v_batches_selected),
        'batches', v_batches_selected
      )
    );

    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient_total_quantity',
      'required', v_remaining_qty,
      'available', v_total_available,
      'batches_found', jsonb_array_length(v_batches_selected),
      'batches', v_batches_selected
    );
  END IF;

  FOR v_batch IN
    SELECT
      (batch->>'batch_id')::uuid as id,
      (batch->>'available_quantity')::int as available_quantity,
      (batch->>'price_per_pallet')::numeric as price_per_pallet,
      (batch->>'city')::text as city,
      (batch->>'match_score')::int as match_score,
      (batch->>'phone')::text as phone,
      (batch->>'pallet_type')::text as pallet_type,
      (batch->>'size')::text as size,
      (batch->>'quality')::text as quality
    FROM jsonb_array_elements(v_batches_selected) as batch
  LOOP
    v_matched_qty := LEAST(v_remaining_qty, v_batch.available_quantity);

    IF v_matched_qty > 0 THEN
      BEGIN
        v_deal_result := create_deal_with_reservation(
          v_order.id,
          v_batch.id,
          v_order.phone,
          v_batch.phone,
          v_batch.pallet_type,
          v_batch.size,
          v_batch.quality,
          v_batch.city,
          v_matched_qty,
          v_batch.price_per_pallet,
          v_order.request_id
        );

        IF (v_deal_result->>'success')::boolean THEN
          v_matches_count := v_matches_count + 1;
          v_remaining_qty := v_remaining_qty - v_matched_qty;
          v_deals_created := v_deals_created || v_deal_result->'deal_id';

          INSERT INTO matching_attempts_log (
            order_id, batch_id, matched, match_score, reason, deal_id, metadata
          ) VALUES (
            v_order.id, v_batch.id, true, v_batch.match_score,
            'multi_batch_match_success',
            (v_deal_result->>'deal_id')::uuid,
            jsonb_build_object(
              'matched_quantity', v_matched_qty,
              'price_per_pallet', v_batch.price_per_pallet,
              'remaining_after', v_remaining_qty
            )
          );

          IF v_remaining_qty <= 0 THEN
            EXIT;
          END IF;
        ELSE
          v_errors := v_errors || v_deal_result;

          INSERT INTO matching_attempts_log (
            order_id, batch_id, matched, match_score, reason, metadata
          ) VALUES (
            v_order.id, v_batch.id, false, v_batch.match_score,
            'deal_creation_failed',
            jsonb_build_object('error', v_deal_result->>'error')
          );
        END IF;

      EXCEPTION WHEN OTHERS THEN
        v_errors := v_errors || jsonb_build_object(
          'order_id', v_order.id,
          'batch_id', v_batch.id,
          'error', SQLERRM
        );
      END;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order.id,
    'required_quantity', v_order.quantity - COALESCE(v_order.matched_quantity, 0),
    'total_available', v_total_available,
    'batches_used', v_matches_count,
    'deals_created', v_deals_created,
    'remaining_unmatched', v_remaining_qty,
    'fully_matched', (v_remaining_qty <= 0),
    'errors', v_errors
  );
END;
$$;

-- 3. Fix smart_auto_match_orders - add publish_to_market check at start
CREATE OR REPLACE FUNCTION smart_auto_match_orders(p_batch_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_batch inventory_batches%ROWTYPE;
  v_order RECORD;
  v_quality_order jsonb := '{"A": 4, "B": 3, "C": 2, "Scrap": 1}'::jsonb;
  v_batch_q int;
  v_order_q int;
  v_matched_qty int;
  v_supplier_price numeric;
  v_deal_result jsonb;
  v_matches_count int := 0;
  v_normalized_batch_type text;
  v_normalized_batch_city text;
BEGIN
  SELECT * INTO v_batch
  FROM inventory_batches
  WHERE id = p_batch_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'batch_not_found');
  END IF;

  IF v_batch.available_quantity <= 0 THEN
    RETURN jsonb_build_object('success', true, 'matches', 0, 'reason', 'no_available_quantity');
  END IF;

  IF NOT COALESCE(v_batch.publish_to_market, true) THEN
    RETURN jsonb_build_object('success', true, 'matches', 0, 'reason', 'not_published_to_market');
  END IF;

  v_normalized_batch_type := normalize_text(v_batch.pallet_type);
  v_normalized_batch_city := normalize_text(v_batch.city);
  v_batch_q := COALESCE((v_quality_order->>v_batch.quality)::int, 0);

  v_supplier_price := COALESCE(v_batch.price_per_pallet, v_batch.min_price, 0);

  FOR v_order IN
    SELECT o.*
    FROM orders o
    WHERE o.status IN ('unmatched', 'pending')
      AND (
        normalize_text(o.pallet_type) = v_normalized_batch_type
        OR (
          (normalize_text(o.pallet_type) = 'خشبية' AND v_normalized_batch_type = 'خشب')
          OR (normalize_text(o.pallet_type) = 'خشب' AND v_normalized_batch_type = 'خشبية')
        )
      )
      AND normalize_text(o.size) = normalize_text(v_batch.size)
      AND o.phone IS DISTINCT FROM v_batch.phone
      AND NOT EXISTS (
        SELECT 1 FROM deals d
        WHERE d.order_id = o.id
          AND d.status NOT IN ('cancelled', 'failed')
      )
    ORDER BY o.created_at ASC
  LOOP
    IF v_batch.available_quantity <= 0 THEN
      EXIT;
    END IF;

    v_order_q := COALESCE((v_quality_order->>v_order.quality)::int, 0);
    IF v_order.quality != v_batch.quality THEN
      IF NOT v_order.accept_close_quality OR abs(v_batch_q - v_order_q) > 1 THEN
        CONTINUE;
      END IF;
    END IF;

    IF normalize_text(v_order.city) != v_normalized_batch_city THEN
      IF NOT v_order.accept_close_city THEN
        CONTINUE;
      END IF;
    END IF;

    IF v_order.accept_partial_delivery THEN
      v_matched_qty := LEAST(v_order.quantity, v_batch.available_quantity);
    ELSE
      IF v_batch.available_quantity < v_order.quantity THEN
        CONTINUE;
      END IF;
      v_matched_qty := v_order.quantity;
    END IF;

    IF v_matched_qty <= 0 THEN
      CONTINUE;
    END IF;

    v_deal_result := create_deal_with_reservation(
      v_order.id,
      v_batch.id,
      v_order.phone,
      v_batch.phone,
      v_batch.pallet_type,
      v_batch.size,
      v_batch.quality,
      v_batch.city,
      v_matched_qty,
      v_supplier_price,
      v_order.request_id
    );

    IF (v_deal_result->>'success')::boolean THEN
      UPDATE orders SET
        status = 'matched',
        matched_quantity = v_matched_qty,
        matched_price = v_supplier_price,
        updated_at = now()
      WHERE id = v_order.id;

      v_matches_count := v_matches_count + 1;

      SELECT available_quantity INTO v_batch.available_quantity
      FROM inventory_batches
      WHERE id = p_batch_id;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'matches', v_matches_count,
    'batch_id', p_batch_id
  );
END;
$$;

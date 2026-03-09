/*
  # Fix om_get_candidates_board and om_get_market_opportunities

  ## Problem
  Both functions reference `ib.batch_ref` which does not exist on inventory_batches.
  The correct column is `ib.batch_id` (text, e.g. "INV-XXXXXX").
  This caused every call from the frontend to fail silently, showing 0 results.

  ## Fix
  Replace `ib.batch_ref` with `ib.batch_id` in both functions.
*/

-- ============================================================
-- FIX: om_get_candidates_board
-- ============================================================
CREATE OR REPLACE FUNCTION om_get_candidates_board(
  p_status text DEFAULT 'active',
  p_min_score numeric DEFAULT 0,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  order_id uuid,
  batch_id uuid,
  match_score numeric,
  score_type numeric,
  score_size numeric,
  score_quality numeric,
  score_city numeric,
  score_quantity numeric,
  auto_matched boolean,
  deal_id uuid,
  status text,
  order_request_id text,
  order_phone text,
  order_pallet_type text,
  order_size text,
  order_quality text,
  order_city text,
  order_quantity integer,
  batch_ref text,
  batch_phone text,
  batch_pallet_type text,
  batch_size text,
  batch_quality text,
  batch_city text,
  batch_available integer,
  created_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mc.id,
    mc.order_id,
    mc.batch_id,
    mc.match_score,
    mc.score_type,
    mc.score_size,
    mc.score_quality,
    mc.score_city,
    mc.score_quantity,
    mc.auto_matched,
    mc.deal_id,
    mc.status,
    o.request_id as order_request_id,
    mc.order_phone,
    mc.order_pallet_type,
    mc.order_size,
    mc.order_quality,
    mc.order_city,
    mc.order_quantity,
    ib.batch_id as batch_ref,
    mc.batch_phone,
    mc.batch_pallet_type,
    mc.batch_size,
    mc.batch_quality,
    mc.batch_city,
    mc.batch_available,
    mc.created_at
  FROM matching_candidates mc
  JOIN orders o ON o.id = mc.order_id
  JOIN inventory_batches ib ON ib.id = mc.batch_id
  WHERE mc.status = p_status
    AND mc.match_score >= p_min_score
  ORDER BY mc.match_score DESC
  LIMIT p_limit;
END;
$$;

-- ============================================================
-- FIX: om_get_market_opportunities
-- ============================================================
CREATE OR REPLACE FUNCTION om_get_market_opportunities()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  v_unmatched_orders jsonb;
  v_unmatched_inventory jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.created_at DESC), '[]'::jsonb)
  INTO v_unmatched_orders
  FROM (
    SELECT o.id, o.request_id, o.pallet_type, o.size, o.quality, o.city,
           o.quantity, o.phone, o.status, o.created_at,
           (SELECT COUNT(*) FROM matching_candidates mc WHERE mc.order_id = o.id AND mc.status = 'active') as candidate_count
    FROM orders o
    WHERE o.status IN ('pending', 'unmatched')
    ORDER BY o.created_at DESC
    LIMIT 50
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.created_at DESC), '[]'::jsonb)
  INTO v_unmatched_inventory
  FROM (
    SELECT ib.id, ib.batch_id as batch_ref, ib.pallet_type, ib.size, ib.quality, ib.city,
           ib.available_quantity, ib.phone, ib.status, ib.created_at,
           (SELECT COUNT(*) FROM matching_candidates mc WHERE mc.batch_id = ib.id AND mc.status = 'active') as candidate_count
    FROM inventory_batches ib
    WHERE ib.status = 'active'
      AND ib.available_quantity > 0
      AND ib.publish_to_market = true
    ORDER BY ib.created_at DESC
    LIMIT 50
  ) t;

  RETURN jsonb_build_object(
    'unmatched_orders', v_unmatched_orders,
    'unmatched_inventory', v_unmatched_inventory
  );
END;
$$;

GRANT EXECUTE ON FUNCTION om_get_candidates_board TO authenticated, anon;
GRANT EXECUTE ON FUNCTION om_get_market_opportunities TO authenticated, anon;

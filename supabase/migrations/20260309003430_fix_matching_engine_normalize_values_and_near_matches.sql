/*
  # Fix Matching Engine - Value Normalization & Near Matches Diagnostics

  ## Problem
  Orders use `code` values from master tables (e.g., 'plastic', 'plastic_120x100')
  while inventory_batches use Arabic `name` values (e.g., 'بلاستيكية', '120×100').
  The matching engine compared these literally, so no matches were ever found.

  ## Solution
  1. New helper function `om_normalize_pallet_type` - Resolves code/name to a canonical key
  2. New helper function `om_normalize_size` - Resolves code/label to a canonical key
  3. Updated `om_compute_match_score` - Uses normalization before comparing
  4. Updated `om_scan_candidates_for_order` and `om_scan_candidates_for_batch`
  5. New function `om_get_near_matches` - Shows blocked/partial matches with reasons
  6. New function `om_rescan_all_active` - Re-scans all existing data

  ## Security
  - All functions use SECURITY DEFINER where needed
  - Grants maintained for authenticated and anon roles
*/

-- ============================================================
-- FUNCTION: om_normalize_pallet_type
-- Resolves pallet_type value to a canonical key using master tables
-- Checks: pallet_types_master.code, pallet_types_master.name_ar,
--          pallet_types.name, pallet_types.name_en
-- ============================================================
CREATE OR REPLACE FUNCTION om_normalize_pallet_type(p_value text)
RETURNS text
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_trimmed text;
  v_result text;
BEGIN
  v_trimmed := lower(trim(COALESCE(p_value, '')));
  IF v_trimmed = '' THEN RETURN ''; END IF;

  SELECT lower(trim(code)) INTO v_result
  FROM pallet_types_master
  WHERE lower(trim(code)) = v_trimmed
     OR lower(trim(name_ar)) = v_trimmed
     OR lower(trim(name_en)) = v_trimmed
  LIMIT 1;

  IF v_result IS NOT NULL THEN RETURN v_result; END IF;

  SELECT lower(trim(COALESCE(ptm.code, pt.name))) INTO v_result
  FROM pallet_types pt
  LEFT JOIN pallet_types_master ptm ON lower(trim(ptm.name_ar)) = lower(trim(pt.name))
                                    OR lower(trim(ptm.name_en)) = lower(trim(pt.name))
  WHERE lower(trim(pt.name)) = v_trimmed
     OR lower(trim(pt.name_en)) = v_trimmed
  LIMIT 1;

  IF v_result IS NOT NULL THEN RETURN v_result; END IF;

  RETURN v_trimmed;
END;
$$;

-- ============================================================
-- FUNCTION: om_normalize_size
-- Resolves size value to a canonical label using master tables
-- Both 'plastic_120x100' and '120×100' should resolve to '120x100'
-- ============================================================
CREATE OR REPLACE FUNCTION om_normalize_size(p_value text)
RETURNS text
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_trimmed text;
  v_result text;
  v_cleaned text;
BEGIN
  v_trimmed := lower(trim(COALESCE(p_value, '')));
  IF v_trimmed = '' THEN RETURN ''; END IF;

  SELECT lower(trim(code)) INTO v_result
  FROM pallet_sizes_master
  WHERE lower(trim(code)) = v_trimmed
     OR lower(trim(name_ar)) = v_trimmed
     OR lower(trim(name_en)) = v_trimmed
  LIMIT 1;

  IF v_result IS NOT NULL THEN RETURN v_result; END IF;

  v_cleaned := regexp_replace(v_trimmed, '[^0-9]', 'x', 'g');
  v_cleaned := regexp_replace(v_cleaned, 'x+', 'x', 'g');
  v_cleaned := trim(both 'x' from v_cleaned);

  SELECT lower(trim(code)) INTO v_result
  FROM pallet_sizes_master
  WHERE regexp_replace(lower(trim(code)), '[^0-9]', 'x', 'g') = v_cleaned
     OR regexp_replace(lower(trim(name_ar)), '[^0-9]', 'x', 'g') = v_cleaned
  LIMIT 1;

  IF v_result IS NOT NULL THEN RETURN v_result; END IF;

  SELECT lower(trim(label)) INTO v_result
  FROM pallet_sizes
  WHERE regexp_replace(lower(trim(label)), '[^0-9]', 'x', 'g') = v_cleaned
  LIMIT 1;

  IF v_result IS NOT NULL THEN RETURN v_result; END IF;

  RETURN v_trimmed;
END;
$$;

-- ============================================================
-- FUNCTION: om_normalize_quality
-- Quality codes are the same in both systems (A, B, C, Scrap)
-- but just in case, normalize via master table
-- ============================================================
CREATE OR REPLACE FUNCTION om_normalize_quality(p_value text)
RETURNS text
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_trimmed text;
  v_result text;
BEGIN
  v_trimmed := trim(COALESCE(p_value, ''));
  IF v_trimmed = '' THEN RETURN ''; END IF;

  SELECT code INTO v_result
  FROM quality_grades_master
  WHERE lower(trim(code)) = lower(v_trimmed)
     OR lower(trim(name_ar)) = lower(v_trimmed)
     OR lower(trim(name_en)) = lower(v_trimmed)
  LIMIT 1;

  IF v_result IS NOT NULL THEN RETURN v_result; END IF;

  SELECT name INTO v_result
  FROM quality_grades
  WHERE lower(trim(name)) = lower(v_trimmed)
     OR lower(trim(description)) = lower(v_trimmed)
  LIMIT 1;

  IF v_result IS NOT NULL THEN RETURN v_result; END IF;

  RETURN v_trimmed;
END;
$$;

-- ============================================================
-- REPLACE: om_compute_match_score
-- Now uses normalization functions before comparing
-- ============================================================
CREATE OR REPLACE FUNCTION om_compute_match_score(
  p_order_type text,
  p_order_size text,
  p_order_quality text,
  p_order_city text,
  p_order_qty integer,
  p_batch_type text,
  p_batch_size text,
  p_batch_quality text,
  p_batch_city text,
  p_batch_available integer
)
RETURNS jsonb
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  w_type numeric := 30;
  w_size numeric := 25;
  w_quality numeric := 20;
  w_city numeric := 15;
  w_quantity numeric := 10;
  s_type numeric := 0;
  s_size numeric := 0;
  s_quality numeric := 0;
  s_city numeric := 0;
  s_quantity numeric := 0;
  total numeric := 0;
  quality_order jsonb := '{"A":4,"B":3,"C":2,"Scrap":1}'::jsonb;
  oq integer;
  bq integer;
  norm_o_type text;
  norm_b_type text;
  norm_o_size text;
  norm_b_size text;
  norm_o_quality text;
  norm_b_quality text;
BEGIN
  norm_o_type := om_normalize_pallet_type(p_order_type);
  norm_b_type := om_normalize_pallet_type(p_batch_type);
  norm_o_size := om_normalize_size(p_order_size);
  norm_b_size := om_normalize_size(p_batch_size);
  norm_o_quality := om_normalize_quality(p_order_quality);
  norm_b_quality := om_normalize_quality(p_batch_quality);

  IF norm_o_type = norm_b_type THEN
    s_type := 100;
  ELSE
    s_type := 0;
  END IF;

  IF norm_o_size = norm_b_size THEN
    s_size := 100;
  ELSE
    s_size := 0;
  END IF;

  oq := COALESCE((quality_order ->> norm_o_quality)::integer, 0);
  bq := COALESCE((quality_order ->> norm_b_quality)::integer, 0);
  IF oq = bq THEN
    s_quality := 100;
  ELSIF abs(oq - bq) = 1 THEN
    s_quality := 75;
  ELSIF abs(oq - bq) = 2 THEN
    s_quality := 40;
  ELSE
    s_quality := 0;
  END IF;

  IF lower(trim(p_order_city)) = lower(trim(p_batch_city)) THEN
    s_city := 100;
  ELSE
    s_city := 30;
  END IF;

  IF p_batch_available >= p_order_qty THEN
    s_quantity := 100;
  ELSIF p_batch_available > 0 AND p_order_qty > 0 THEN
    s_quantity := ROUND((p_batch_available::numeric / p_order_qty::numeric) * 100);
  ELSE
    s_quantity := 0;
  END IF;

  total := ROUND(
    (s_type * w_type + s_size * w_size + s_quality * w_quality + s_city * w_city + s_quantity * w_quantity)
    / (w_type + w_size + w_quality + w_city + w_quantity)
  );

  RETURN jsonb_build_object(
    'total', total,
    'type', s_type,
    'size', s_size,
    'quality', s_quality,
    'city', s_city,
    'quantity', s_quantity,
    'norm_order_type', norm_o_type,
    'norm_batch_type', norm_b_type,
    'norm_order_size', norm_o_size,
    'norm_batch_size', norm_b_size,
    'norm_order_quality', norm_o_quality,
    'norm_batch_quality', norm_b_quality
  );
END;
$$;

-- ============================================================
-- REPLACE: om_scan_candidates_for_order (uses updated score fn)
-- ============================================================
CREATE OR REPLACE FUNCTION om_scan_candidates_for_order(p_order_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  o record;
  b record;
  score_result jsonb;
  total_score numeric;
  inserted_count integer := 0;
  auto_threshold numeric := 90;
BEGIN
  SELECT id, phone, pallet_type, size, quality, city, quantity, status
  INTO o
  FROM orders
  WHERE id = p_order_id;

  IF o IS NULL OR o.status NOT IN ('pending', 'unmatched') THEN
    RETURN 0;
  END IF;

  DELETE FROM matching_candidates
  WHERE order_id = p_order_id AND status = 'active' AND auto_matched = false;

  FOR b IN
    SELECT id, phone, pallet_type, size, quality, city, available_quantity
    FROM inventory_batches
    WHERE status = 'active'
      AND publish_to_market = true
      AND COALESCE(hide_from_matching, false) = false
      AND available_quantity > 0
      AND phone IS DISTINCT FROM o.phone
  LOOP
    score_result := om_compute_match_score(
      o.pallet_type, o.size, o.quality, o.city, o.quantity,
      b.pallet_type, b.size, b.quality, b.city, b.available_quantity
    );
    total_score := (score_result ->> 'total')::numeric;

    IF total_score >= 30 THEN
      INSERT INTO matching_candidates (
        order_id, batch_id, match_score,
        score_type, score_size, score_quality, score_city, score_quantity,
        order_phone, batch_phone,
        order_pallet_type, order_size, order_quality, order_city, order_quantity,
        batch_pallet_type, batch_size, batch_quality, batch_city, batch_available,
        status
      ) VALUES (
        o.id, b.id, total_score,
        (score_result ->> 'type')::numeric,
        (score_result ->> 'size')::numeric,
        (score_result ->> 'quality')::numeric,
        (score_result ->> 'city')::numeric,
        (score_result ->> 'quantity')::numeric,
        o.phone, b.phone,
        o.pallet_type, o.size, o.quality, o.city, o.quantity,
        b.pallet_type, b.size, b.quality, b.city, b.available_quantity,
        'active'
      )
      ON CONFLICT (order_id, batch_id) DO UPDATE SET
        match_score = EXCLUDED.match_score,
        score_type = EXCLUDED.score_type,
        score_size = EXCLUDED.score_size,
        score_quality = EXCLUDED.score_quality,
        score_city = EXCLUDED.score_city,
        score_quantity = EXCLUDED.score_quantity,
        batch_available = EXCLUDED.batch_available,
        order_quantity = EXCLUDED.order_quantity,
        status = 'active',
        created_at = now();

      inserted_count := inserted_count + 1;

      IF total_score >= auto_threshold THEN
        BEGIN
          PERFORM om_auto_create_deal(o.id, b.id, total_score);
        EXCEPTION WHEN OTHERS THEN
          NULL;
        END;
      END IF;
    END IF;
  END LOOP;

  RETURN inserted_count;
END;
$$;

-- ============================================================
-- REPLACE: om_scan_candidates_for_batch (uses updated score fn)
-- ============================================================
CREATE OR REPLACE FUNCTION om_scan_candidates_for_batch(p_batch_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  b record;
  o record;
  score_result jsonb;
  total_score numeric;
  inserted_count integer := 0;
  auto_threshold numeric := 90;
BEGIN
  SELECT id, phone, pallet_type, size, quality, city, available_quantity, status, publish_to_market, hide_from_matching
  INTO b
  FROM inventory_batches
  WHERE id = p_batch_id;

  IF b IS NULL OR b.status != 'active' OR b.publish_to_market = false OR COALESCE(b.hide_from_matching, false) = true OR b.available_quantity <= 0 THEN
    RETURN 0;
  END IF;

  FOR o IN
    SELECT id, phone, pallet_type, size, quality, city, quantity, status
    FROM orders
    WHERE status IN ('pending', 'unmatched')
      AND phone IS DISTINCT FROM b.phone
  LOOP
    score_result := om_compute_match_score(
      o.pallet_type, o.size, o.quality, o.city, o.quantity,
      b.pallet_type, b.size, b.quality, b.city, b.available_quantity
    );
    total_score := (score_result ->> 'total')::numeric;

    IF total_score >= 30 THEN
      INSERT INTO matching_candidates (
        order_id, batch_id, match_score,
        score_type, score_size, score_quality, score_city, score_quantity,
        order_phone, batch_phone,
        order_pallet_type, order_size, order_quality, order_city, order_quantity,
        batch_pallet_type, batch_size, batch_quality, batch_city, batch_available,
        status
      ) VALUES (
        o.id, b.id, total_score,
        (score_result ->> 'type')::numeric,
        (score_result ->> 'size')::numeric,
        (score_result ->> 'quality')::numeric,
        (score_result ->> 'city')::numeric,
        (score_result ->> 'quantity')::numeric,
        o.phone, b.phone,
        o.pallet_type, o.size, o.quality, o.city, o.quantity,
        b.pallet_type, b.size, b.quality, b.city, b.available_quantity,
        'active'
      )
      ON CONFLICT (order_id, batch_id) DO UPDATE SET
        match_score = EXCLUDED.match_score,
        score_type = EXCLUDED.score_type,
        score_size = EXCLUDED.score_size,
        score_quality = EXCLUDED.score_quality,
        score_city = EXCLUDED.score_city,
        score_quantity = EXCLUDED.score_quantity,
        batch_available = EXCLUDED.batch_available,
        order_quantity = EXCLUDED.order_quantity,
        status = 'active',
        created_at = now();

      inserted_count := inserted_count + 1;

      IF total_score >= auto_threshold THEN
        BEGIN
          PERFORM om_auto_create_deal(o.id, b.id, total_score);
        EXCEPTION WHEN OTHERS THEN
          NULL;
        END;
      END IF;
    END IF;
  END LOOP;

  RETURN inserted_count;
END;
$$;

-- ============================================================
-- FUNCTION: om_get_near_matches
-- Returns all order/inventory pairs with diagnostic reasons
-- for why they didn't fully match (or why score is low)
-- ============================================================
CREATE OR REPLACE FUNCTION om_get_near_matches(p_limit integer DEFAULT 50)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  v_results jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.match_score DESC), '[]'::jsonb)
  INTO v_results
  FROM (
    SELECT
      o.id as order_id,
      o.request_id,
      o.phone as order_phone,
      o.pallet_type as order_pallet_type,
      o.size as order_size,
      o.quality as order_quality,
      o.city as order_city,
      o.quantity as order_quantity,
      ib.id as batch_id,
      ib.batch_id as batch_ref,
      ib.phone as batch_phone,
      ib.pallet_type as batch_pallet_type,
      ib.size as batch_size,
      ib.quality as batch_quality,
      ib.city as batch_city,
      ib.available_quantity as batch_available,
      (sr ->> 'total')::numeric as match_score,
      (sr ->> 'type')::numeric as score_type,
      (sr ->> 'size')::numeric as score_size,
      (sr ->> 'quality')::numeric as score_quality,
      (sr ->> 'city')::numeric as score_city,
      (sr ->> 'quantity')::numeric as score_quantity,
      sr ->> 'norm_order_type' as norm_order_type,
      sr ->> 'norm_batch_type' as norm_batch_type,
      sr ->> 'norm_order_size' as norm_order_size,
      sr ->> 'norm_batch_size' as norm_batch_size,
      sr ->> 'norm_order_quality' as norm_order_quality,
      sr ->> 'norm_batch_quality' as norm_batch_quality,
      CASE WHEN o.phone = ib.phone THEN true ELSE false END as same_owner,
      CASE
        WHEN (sr ->> 'type')::numeric = 0 THEN 'نوع الطبلية مختلف'
        WHEN (sr ->> 'size')::numeric = 0 THEN 'المقاس مختلف'
        WHEN (sr ->> 'quality')::numeric < 50 THEN 'فرق كبير في الجودة'
        WHEN (sr ->> 'quantity')::numeric < 50 THEN 'الكمية المتاحة غير كافية'
        WHEN (sr ->> 'city')::numeric < 100 THEN 'المدينة مختلفة'
        WHEN o.phone = ib.phone THEN 'نفس المالك'
        ELSE 'لا يوجد سبب محدد'
      END as primary_blocker,
      jsonb_build_array(
        CASE WHEN (sr ->> 'type')::numeric = 0 THEN
          jsonb_build_object('factor', 'نوع الطبلية', 'order_val', o.pallet_type, 'batch_val', ib.pallet_type, 'norm_order', sr ->> 'norm_order_type', 'norm_batch', sr ->> 'norm_batch_type', 'score', 0)
        ELSE NULL END,
        CASE WHEN (sr ->> 'size')::numeric = 0 THEN
          jsonb_build_object('factor', 'المقاس', 'order_val', o.size, 'batch_val', ib.size, 'norm_order', sr ->> 'norm_order_size', 'norm_batch', sr ->> 'norm_batch_size', 'score', 0)
        ELSE NULL END,
        CASE WHEN (sr ->> 'quality')::numeric < 100 THEN
          jsonb_build_object('factor', 'الجودة', 'order_val', o.quality, 'batch_val', ib.quality, 'norm_order', sr ->> 'norm_order_quality', 'norm_batch', sr ->> 'norm_batch_quality', 'score', (sr ->> 'quality')::numeric)
        ELSE NULL END,
        CASE WHEN (sr ->> 'city')::numeric < 100 THEN
          jsonb_build_object('factor', 'المدينة', 'order_val', o.city, 'batch_val', ib.city, 'score', (sr ->> 'city')::numeric)
        ELSE NULL END,
        CASE WHEN (sr ->> 'quantity')::numeric < 100 THEN
          jsonb_build_object('factor', 'الكمية', 'order_val', o.quantity, 'batch_val', ib.available_quantity, 'score', (sr ->> 'quantity')::numeric)
        ELSE NULL END
      ) - 'null'::jsonb as blockers
    FROM orders o
    CROSS JOIN inventory_batches ib
    CROSS JOIN LATERAL om_compute_match_score(
      o.pallet_type, o.size, o.quality, o.city, o.quantity,
      ib.pallet_type, ib.size, ib.quality, ib.city, ib.available_quantity
    ) sr
    WHERE o.status IN ('pending', 'unmatched')
      AND ib.status = 'active'
      AND ib.available_quantity > 0
      AND ib.publish_to_market = true
      AND (sr ->> 'total')::numeric < 90
      AND (sr ->> 'total')::numeric >= 1
      AND o.phone IS DISTINCT FROM ib.phone
    ORDER BY (sr ->> 'total')::numeric DESC
    LIMIT p_limit
  ) t;

  RETURN v_results;
END;
$$;

-- ============================================================
-- FUNCTION: om_rescan_all_active
-- Re-scans all active orders against all active inventory
-- ============================================================
CREATE OR REPLACE FUNCTION om_rescan_all_active()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  o record;
  total_scanned integer := 0;
  total_candidates integer := 0;
  cnt integer;
BEGIN
  FOR o IN
    SELECT id FROM orders WHERE status IN ('pending', 'unmatched')
  LOOP
    cnt := om_scan_candidates_for_order(o.id);
    total_scanned := total_scanned + 1;
    total_candidates := total_candidates + cnt;
  END LOOP;

  RETURN jsonb_build_object(
    'orders_scanned', total_scanned,
    'candidates_found', total_candidates
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION om_normalize_pallet_type TO authenticated, anon;
GRANT EXECUTE ON FUNCTION om_normalize_size TO authenticated, anon;
GRANT EXECUTE ON FUNCTION om_normalize_quality TO authenticated, anon;
GRANT EXECUTE ON FUNCTION om_get_near_matches TO authenticated, anon;
GRANT EXECUTE ON FUNCTION om_rescan_all_active TO authenticated, anon;

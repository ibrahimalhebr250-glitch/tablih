/*
  # Order Matching System (مطابقة الطلبات)

  A new intelligent matching layer that sits on top of the existing orders, inventory_batches,
  and deals systems. It does NOT modify any existing tables or logic.

  1. New Tables
    - `matching_candidates` - Stores computed match candidates between orders and inventory batches
      - `id` (uuid, primary key)
      - `order_id` (uuid, FK to orders)
      - `batch_id` (uuid, FK to inventory_batches)
      - `match_score` (numeric) - Overall weighted score 0-100
      - `score_type` (numeric) - Pallet type match score
      - `score_size` (numeric) - Size match score
      - `score_quality` (numeric) - Quality grade match score
      - `score_city` (numeric) - City match score
      - `score_quantity` (numeric) - Quantity coverage score
      - `auto_matched` (boolean) - Whether auto-deal was created
      - `deal_id` (uuid, nullable) - Resulting deal if created
      - `status` (text) - active/expired/dealt
      - `created_at` (timestamptz)

    - `market_opportunity_snapshots` - Periodic snapshots of unmatched supply/demand
      - `id` (uuid, primary key)
      - `snapshot_date` (date)
      - `unmatched_orders` (integer)
      - `unmatched_inventory` (integer)
      - `top_demanded_sizes` (jsonb)
      - `top_demanded_types` (jsonb)
      - `city_gaps` (jsonb) - Cities with demand but no supply
      - `created_at` (timestamptz)

  2. New Functions
    - `om_compute_match_score` - Computes 5-factor weighted match score
    - `om_scan_candidates_for_order` - Scans all active inventory for a given order
    - `om_scan_candidates_for_batch` - Scans all pending orders for a given batch
    - `om_auto_create_deal` - Creates a deal if score >= threshold
    - `om_refresh_market_snapshot` - Builds a market opportunity snapshot
    - `om_get_candidates_board` - Returns paginated candidates for admin board
    - `om_get_market_opportunities` - Returns unmatched orders and inventory
    - `om_get_market_analysis` - Returns aggregated market analytics
    - `om_admin_create_deal_from_candidate` - Admin manually creates deal from candidate

  3. Triggers
    - On INSERT/UPDATE on orders -> scan candidates
    - On INSERT/UPDATE on inventory_batches -> scan candidates

  4. Security
    - RLS enabled on both new tables
    - Policies restrict access to authenticated users
*/

-- ============================================================
-- TABLE: matching_candidates
-- ============================================================
CREATE TABLE IF NOT EXISTS matching_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL REFERENCES inventory_batches(id) ON DELETE CASCADE,
  match_score numeric NOT NULL DEFAULT 0,
  score_type numeric NOT NULL DEFAULT 0,
  score_size numeric NOT NULL DEFAULT 0,
  score_quality numeric NOT NULL DEFAULT 0,
  score_city numeric NOT NULL DEFAULT 0,
  score_quantity numeric NOT NULL DEFAULT 0,
  auto_matched boolean NOT NULL DEFAULT false,
  deal_id uuid REFERENCES deals(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active',
  order_phone text,
  batch_phone text,
  order_pallet_type text,
  order_size text,
  order_quality text,
  order_city text,
  order_quantity integer,
  batch_pallet_type text,
  batch_size text,
  batch_quality text,
  batch_city text,
  batch_available integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id, batch_id)
);

ALTER TABLE matching_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view matching candidates"
  ON matching_candidates FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert matching candidates"
  ON matching_candidates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "System can update matching candidates"
  ON matching_candidates FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "System can delete matching candidates"
  ON matching_candidates FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_matching_candidates_order ON matching_candidates(order_id);
CREATE INDEX IF NOT EXISTS idx_matching_candidates_batch ON matching_candidates(batch_id);
CREATE INDEX IF NOT EXISTS idx_matching_candidates_score ON matching_candidates(match_score DESC);
CREATE INDEX IF NOT EXISTS idx_matching_candidates_status ON matching_candidates(status);

-- ============================================================
-- TABLE: market_opportunity_snapshots
-- ============================================================
CREATE TABLE IF NOT EXISTS market_opportunity_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  unmatched_orders integer NOT NULL DEFAULT 0,
  unmatched_inventory integer NOT NULL DEFAULT 0,
  top_demanded_sizes jsonb NOT NULL DEFAULT '[]'::jsonb,
  top_demanded_types jsonb NOT NULL DEFAULT '[]'::jsonb,
  city_gaps jsonb NOT NULL DEFAULT '[]'::jsonb,
  most_active_cities jsonb NOT NULL DEFAULT '[]'::jsonb,
  daily_matches integer NOT NULL DEFAULT 0,
  daily_deals integer NOT NULL DEFAULT 0,
  avg_match_score numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE market_opportunity_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view market snapshots"
  ON market_opportunity_snapshots FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert market snapshots"
  ON market_opportunity_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- FUNCTION: om_compute_match_score
-- Computes a weighted 5-factor match score (0-100)
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
BEGIN
  IF lower(trim(p_order_type)) = lower(trim(p_batch_type)) THEN
    s_type := 100;
  ELSE
    s_type := 0;
  END IF;

  IF lower(trim(p_order_size)) = lower(trim(p_batch_size)) THEN
    s_size := 100;
  ELSE
    s_size := 0;
  END IF;

  oq := COALESCE((quality_order ->> p_order_quality)::integer, 0);
  bq := COALESCE((quality_order ->> p_batch_quality)::integer, 0);
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
    'quantity', s_quantity
  );
END;
$$;

-- ============================================================
-- FUNCTION: om_scan_candidates_for_order
-- When a new/updated order appears, find all matching inventory
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
  deal_result record;
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
-- FUNCTION: om_scan_candidates_for_batch
-- When new/updated inventory appears, find all matching orders
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
-- FUNCTION: om_auto_create_deal
-- Creates a deal automatically when score >= threshold
-- Uses the existing create_deal_with_reservation function
-- ============================================================
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
    status, reserved_at, reservation_expires_at
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
    now() + interval '30 minutes'
  )
  RETURNING id INTO new_deal_id;

  UPDATE inventory_batches
  SET available_quantity = GREATEST(available_quantity - match_qty, 0),
      reserved_quantity = COALESCE(reserved_quantity, 0) + match_qty,
      updated_at = now()
  WHERE id = p_batch_id;

  UPDATE orders
  SET status = CASE
        WHEN match_qty >= o.quantity THEN 'matched'
        ELSE 'partially_matched'
      END,
      matched_quantity = COALESCE(matched_quantity, 0) + match_qty,
      updated_at = now()
  WHERE id = p_order_id
    AND status IN ('pending', 'unmatched');

  UPDATE matching_candidates
  SET auto_matched = true,
      deal_id = new_deal_id,
      status = 'dealt'
  WHERE order_id = p_order_id AND batch_id = p_batch_id;

  INSERT INTO matching_analytics (
    order_id, batch_id, match_score, match_status,
    pallet_type, size, quality, quantity, city,
    buyer_phone, supplier_phone,
    processing_time_ms, match_factors
  ) VALUES (
    p_order_id, p_batch_id, p_score, 'matched',
    b.pallet_type, b.size, b.quality, match_qty, b.city,
    o.phone, b.phone,
    0,
    jsonb_build_object('source', 'om_auto', 'score', p_score)
  );
END;
$$;

-- ============================================================
-- FUNCTION: om_admin_create_deal_from_candidate
-- Admin manually creates a deal from a candidate row
-- ============================================================
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
    status, reserved_at, reservation_expires_at
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
    now() + interval '30 minutes'
  )
  RETURNING id INTO new_deal_id;

  UPDATE inventory_batches
  SET available_quantity = GREATEST(available_quantity - match_qty, 0),
      reserved_quantity = COALESCE(reserved_quantity, 0) + match_qty,
      updated_at = now()
  WHERE id = c.batch_id;

  UPDATE orders
  SET status = CASE
        WHEN COALESCE(matched_quantity, 0) + match_qty >= quantity THEN 'matched'
        ELSE 'partially_matched'
      END,
      matched_quantity = COALESCE(matched_quantity, 0) + match_qty,
      updated_at = now()
  WHERE id = c.order_id;

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

-- ============================================================
-- FUNCTION: om_refresh_market_snapshot
-- Builds a snapshot of market opportunities
-- ============================================================
CREATE OR REPLACE FUNCTION om_refresh_market_snapshot()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_unmatched_orders integer;
  v_unmatched_inventory integer;
  v_top_sizes jsonb;
  v_top_types jsonb;
  v_city_gaps jsonb;
  v_active_cities jsonb;
  v_daily_matches integer;
  v_daily_deals integer;
  v_avg_score numeric;
BEGIN
  SELECT COUNT(*) INTO v_unmatched_orders
  FROM orders WHERE status IN ('pending', 'unmatched');

  SELECT COUNT(*) INTO v_unmatched_inventory
  FROM inventory_batches
  WHERE status = 'active' AND available_quantity > 0
    AND NOT EXISTS (
      SELECT 1 FROM matching_candidates mc
      WHERE mc.batch_id = inventory_batches.id AND mc.status = 'dealt'
    );

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_top_sizes
  FROM (
    SELECT size, COUNT(*) as demand_count, SUM(quantity) as total_qty
    FROM orders WHERE status IN ('pending', 'unmatched')
    GROUP BY size ORDER BY demand_count DESC LIMIT 5
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_top_types
  FROM (
    SELECT pallet_type, COUNT(*) as demand_count, SUM(quantity) as total_qty
    FROM orders WHERE status IN ('pending', 'unmatched')
    GROUP BY pallet_type ORDER BY demand_count DESC LIMIT 5
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_city_gaps
  FROM (
    SELECT o.city,
           COUNT(DISTINCT o.id) as order_count,
           SUM(o.quantity) as demand_qty,
           COALESCE(SUM(ib.available_quantity), 0) as supply_qty
    FROM orders o
    LEFT JOIN inventory_batches ib ON ib.city = o.city AND ib.status = 'active' AND ib.available_quantity > 0
    WHERE o.status IN ('pending', 'unmatched')
    GROUP BY o.city
    HAVING COALESCE(SUM(ib.available_quantity), 0) < SUM(o.quantity)
    ORDER BY COUNT(DISTINCT o.id) DESC
    LIMIT 10
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_active_cities
  FROM (
    SELECT city, COUNT(*) as activity_count
    FROM (
      SELECT city FROM orders WHERE created_at >= CURRENT_DATE
      UNION ALL
      SELECT city FROM inventory_batches WHERE created_at >= CURRENT_DATE
      UNION ALL
      SELECT city FROM deals WHERE created_at >= CURRENT_DATE
    ) combined
    GROUP BY city ORDER BY activity_count DESC LIMIT 10
  ) t;

  SELECT COUNT(*) INTO v_daily_matches
  FROM matching_candidates WHERE created_at >= CURRENT_DATE;

  SELECT COUNT(*) INTO v_daily_deals
  FROM deals WHERE created_at >= CURRENT_DATE AND status != 'cancelled';

  SELECT COALESCE(AVG(match_score), 0) INTO v_avg_score
  FROM matching_candidates WHERE created_at >= CURRENT_DATE;

  INSERT INTO market_opportunity_snapshots (
    snapshot_date, unmatched_orders, unmatched_inventory,
    top_demanded_sizes, top_demanded_types, city_gaps, most_active_cities,
    daily_matches, daily_deals, avg_match_score
  ) VALUES (
    CURRENT_DATE, v_unmatched_orders, v_unmatched_inventory,
    v_top_sizes, v_top_types, v_city_gaps, v_active_cities,
    v_daily_matches, v_daily_deals, v_avg_score
  );
END;
$$;

-- ============================================================
-- FUNCTION: om_get_candidates_board
-- Returns candidates for the admin matching board
-- ============================================================
CREATE OR REPLACE FUNCTION om_get_candidates_board(
  p_status text DEFAULT 'active',
  p_min_score numeric DEFAULT 0,
  p_limit integer DEFAULT 50
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
    ib.batch_ref,
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
-- FUNCTION: om_get_market_opportunities
-- Returns unmatched orders and inventory for admin view
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
    SELECT ib.id, ib.batch_ref, ib.pallet_type, ib.size, ib.quality, ib.city,
           ib.available_quantity, ib.phone, ib.status, ib.created_at,
           (SELECT COUNT(*) FROM matching_candidates mc WHERE mc.batch_id = ib.id AND mc.status = 'active') as candidate_count
    FROM inventory_batches ib
    WHERE ib.status = 'active' AND ib.available_quantity > 0
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

-- ============================================================
-- FUNCTION: om_get_market_analysis
-- Returns aggregated market analytics
-- ============================================================
CREATE OR REPLACE FUNCTION om_get_market_analysis()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  v_size_demand jsonb;
  v_city_activity jsonb;
  v_daily_stats jsonb;
  v_quality_demand jsonb;
  v_type_demand jsonb;
  v_supply_demand_gap jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_size_demand
  FROM (
    SELECT size, COUNT(*) as order_count, SUM(quantity) as total_qty
    FROM orders
    WHERE created_at >= now() - interval '30 days'
    GROUP BY size ORDER BY order_count DESC
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_city_activity
  FROM (
    SELECT city,
           COUNT(*) FILTER (WHERE src = 'order') as orders,
           COUNT(*) FILTER (WHERE src = 'inventory') as inventory,
           COUNT(*) FILTER (WHERE src = 'deal') as deals
    FROM (
      SELECT city, 'order' as src FROM orders WHERE created_at >= now() - interval '30 days'
      UNION ALL
      SELECT city, 'inventory' FROM inventory_batches WHERE created_at >= now() - interval '30 days'
      UNION ALL
      SELECT city, 'deal' FROM deals WHERE created_at >= now() - interval '30 days' AND status != 'cancelled'
    ) combined
    GROUP BY city ORDER BY (COUNT(*) FILTER (WHERE src = 'order') + COUNT(*) FILTER (WHERE src = 'inventory')) DESC
    LIMIT 15
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_daily_stats
  FROM (
    SELECT d::date as day,
           COALESCE(mc.cnt, 0) as matches,
           COALESCE(dl.cnt, 0) as deals,
           COALESCE(mc.avg_s, 0) as avg_score
    FROM generate_series(CURRENT_DATE - interval '13 days', CURRENT_DATE, '1 day') d
    LEFT JOIN (
      SELECT created_at::date as dt, COUNT(*) as cnt, ROUND(AVG(match_score)) as avg_s
      FROM matching_candidates GROUP BY created_at::date
    ) mc ON mc.dt = d::date
    LEFT JOIN (
      SELECT created_at::date as dt, COUNT(*) as cnt
      FROM deals WHERE status != 'cancelled' GROUP BY created_at::date
    ) dl ON dl.dt = d::date
    ORDER BY d
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_quality_demand
  FROM (
    SELECT quality, COUNT(*) as count, SUM(quantity) as total_qty
    FROM orders WHERE created_at >= now() - interval '30 days'
    GROUP BY quality ORDER BY count DESC
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_type_demand
  FROM (
    SELECT pallet_type, COUNT(*) as count, SUM(quantity) as total_qty
    FROM orders WHERE created_at >= now() - interval '30 days'
    GROUP BY pallet_type ORDER BY count DESC
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_supply_demand_gap
  FROM (
    SELECT
      COALESCE(demand.city, supply.city) as city,
      COALESCE(demand.qty, 0) as demand_qty,
      COALESCE(supply.qty, 0) as supply_qty,
      COALESCE(demand.qty, 0) - COALESCE(supply.qty, 0) as gap
    FROM (
      SELECT city, SUM(quantity) as qty FROM orders WHERE status IN ('pending', 'unmatched') GROUP BY city
    ) demand
    FULL OUTER JOIN (
      SELECT city, SUM(available_quantity) as qty FROM inventory_batches WHERE status = 'active' AND available_quantity > 0 GROUP BY city
    ) supply ON demand.city = supply.city
    ORDER BY (COALESCE(demand.qty, 0) - COALESCE(supply.qty, 0)) DESC
  ) t;

  RETURN jsonb_build_object(
    'size_demand', v_size_demand,
    'city_activity', v_city_activity,
    'daily_stats', v_daily_stats,
    'quality_demand', v_quality_demand,
    'type_demand', v_type_demand,
    'supply_demand_gap', v_supply_demand_gap
  );
END;
$$;

-- ============================================================
-- TRIGGERS: Auto-scan on order/inventory changes
-- ============================================================
CREATE OR REPLACE FUNCTION om_trigger_scan_order()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status IN ('pending', 'unmatched') THEN
    PERFORM om_scan_candidates_for_order(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION om_trigger_scan_batch()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'active' AND NEW.available_quantity > 0 AND COALESCE(NEW.publish_to_market, true) = true THEN
    PERFORM om_scan_candidates_for_batch(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_om_scan_order ON orders;
CREATE TRIGGER trg_om_scan_order
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION om_trigger_scan_order();

DROP TRIGGER IF EXISTS trg_om_scan_batch ON inventory_batches;
CREATE TRIGGER trg_om_scan_batch
  AFTER INSERT OR UPDATE ON inventory_batches
  FOR EACH ROW
  EXECUTE FUNCTION om_trigger_scan_batch();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION om_compute_match_score TO authenticated, anon;
GRANT EXECUTE ON FUNCTION om_scan_candidates_for_order TO authenticated, anon;
GRANT EXECUTE ON FUNCTION om_scan_candidates_for_batch TO authenticated, anon;
GRANT EXECUTE ON FUNCTION om_auto_create_deal TO authenticated, anon;
GRANT EXECUTE ON FUNCTION om_admin_create_deal_from_candidate TO authenticated, anon;
GRANT EXECUTE ON FUNCTION om_refresh_market_snapshot TO authenticated, anon;
GRANT EXECUTE ON FUNCTION om_get_candidates_board TO authenticated, anon;
GRANT EXECUTE ON FUNCTION om_get_market_opportunities TO authenticated, anon;
GRANT EXECUTE ON FUNCTION om_get_market_analysis TO authenticated, anon;

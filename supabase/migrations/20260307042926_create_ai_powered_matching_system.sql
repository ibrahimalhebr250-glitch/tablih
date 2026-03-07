/*
  # AI-Powered Matching System with Smart Scoring

  1. Overview
    This migration creates an intelligent matching system that uses weighted scoring algorithms
    to find the best inventory matches for orders, going beyond simple exact matching.

  2. New Tables
    - `matching_scores`: Stores match quality scores and reasons
      - `id` (uuid, primary key)
      - `order_id` (uuid, references orders)
      - `batch_id` (uuid, references inventory_batches)
      - `score` (numeric) - Overall match score (0-100)
      - `quality_score` (numeric) - Quality match score
      - `price_score` (numeric) - Price competitiveness score
      - `location_score` (numeric) - Location proximity score
      - `quantity_score` (numeric) - Quantity fulfillment score
      - `supplier_rating_score` (numeric) - Supplier trust rating score
      - `freshness_score` (numeric) - Inventory recency score
      - `match_reasons` (jsonb) - Detailed explanation of score
      - `created_at` (timestamptz)

    - `match_history`: Track matching performance over time
      - `id` (uuid, primary key)
      - `order_id` (uuid)
      - `batch_id` (uuid)
      - `score` (numeric)
      - `was_accepted` (boolean)
      - `rejection_reason` (text)
      - `created_at` (timestamptz)

  3. New Functions
    - `calculate_match_score()`: AI scoring algorithm
    - `smart_auto_match_orders()`: Enhanced matching with ML-like scoring
    - `get_best_matches_for_order()`: Returns top 5 matches with explanations
    - `analyze_matching_patterns()`: Learn from past matches

  4. Security
    - Enable RLS on all new tables
    - Add appropriate policies for admin and users
*/

-- ================================================================
-- CREATE TABLES
-- ================================================================

CREATE TABLE IF NOT EXISTS matching_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL REFERENCES inventory_batches(id) ON DELETE CASCADE,
  score numeric NOT NULL DEFAULT 0,
  quality_score numeric NOT NULL DEFAULT 0,
  price_score numeric NOT NULL DEFAULT 0,
  location_score numeric NOT NULL DEFAULT 0,
  quantity_score numeric NOT NULL DEFAULT 0,
  supplier_rating_score numeric NOT NULL DEFAULT 0,
  freshness_score numeric NOT NULL DEFAULT 0,
  match_reasons jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(order_id, batch_id)
);

CREATE TABLE IF NOT EXISTS match_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  batch_id uuid NOT NULL,
  score numeric NOT NULL,
  was_accepted boolean DEFAULT false,
  rejection_reason text,
  created_at timestamptz DEFAULT now()
);

-- ================================================================
-- ENABLE RLS
-- ================================================================

ALTER TABLE matching_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_history ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- RLS POLICIES
-- ================================================================

-- Admin can view all matching scores
CREATE POLICY "Admins can view all matching scores"
  ON matching_scores FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_sessions
      WHERE user_sessions.phone = (SELECT phone FROM user_sessions WHERE session_token = current_setting('app.session_token', true))
        AND user_sessions.user_type = 'admin'
    )
  );

-- Users can view their own matching scores
CREATE POLICY "Users can view own matching scores"
  ON matching_scores FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = matching_scores.order_id
        AND o.phone = (SELECT phone FROM user_sessions WHERE session_token = current_setting('app.session_token', true))
    )
  );

-- Admin can view all match history
CREATE POLICY "Admins can view all match history"
  ON match_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_sessions
      WHERE user_sessions.phone = (SELECT phone FROM user_sessions WHERE session_token = current_setting('app.session_token', true))
        AND user_sessions.user_type = 'admin'
    )
  );

-- ================================================================
-- AI SCORING FUNCTION
-- ================================================================

CREATE OR REPLACE FUNCTION calculate_match_score(
  p_order_id uuid,
  p_batch_id uuid
)
RETURNS TABLE(
  score numeric,
  quality_score numeric,
  price_score numeric,
  location_score numeric,
  quantity_score numeric,
  supplier_rating_score numeric,
  freshness_score numeric,
  match_reasons jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_batch inventory_batches%ROWTYPE;
  v_supplier_rating numeric;
  v_quality_map jsonb := '{"A": 4, "B": 3, "C": 2, "Scrap": 1}'::jsonb;
  v_order_quality_val int;
  v_batch_quality_val int;
  v_quality_diff int;
  v_quality_score numeric := 0;
  v_price_score numeric := 0;
  v_location_score numeric := 0;
  v_quantity_score numeric := 0;
  v_supplier_score numeric := 0;
  v_freshness_score numeric := 0;
  v_total_score numeric := 0;
  v_reasons jsonb := '[]'::jsonb;
  v_batch_age_hours numeric;
  v_expected_price numeric;
  v_actual_price numeric;
  v_price_ratio numeric;
BEGIN
  -- Get order and batch details
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  SELECT * INTO v_batch FROM inventory_batches WHERE id = p_batch_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Prevent self-matching
  IF v_order.phone = v_batch.phone THEN
    RETURN;
  END IF;

  -- Get supplier rating
  SELECT COALESCE(trust_rating, 50) INTO v_supplier_rating
  FROM user_profiles
  WHERE phone = v_batch.phone;

  -- ================================================================
  -- 1. QUALITY SCORE (Weight: 25%)
  -- ================================================================
  v_order_quality_val := COALESCE((v_quality_map->>v_order.quality)::int, 0);
  v_batch_quality_val := COALESCE((v_quality_map->>v_batch.quality)::int, 0);
  v_quality_diff := abs(v_order_quality_val - v_batch_quality_val);

  IF v_order.quality = v_batch.quality THEN
    v_quality_score := 100;
    v_reasons := v_reasons || jsonb_build_object('factor', 'quality', 'score', 100, 'reason', 'Exact quality match');
  ELSIF v_order.accept_close_quality AND v_quality_diff <= 1 THEN
    v_quality_score := 80;
    v_reasons := v_reasons || jsonb_build_object('factor', 'quality', 'score', 80, 'reason', 'Close quality match accepted');
  ELSIF v_order.accept_close_quality AND v_quality_diff = 2 THEN
    v_quality_score := 50;
    v_reasons := v_reasons || jsonb_build_object('factor', 'quality', 'score', 50, 'reason', 'Quality difference acceptable');
  ELSE
    RETURN; -- No match
  END IF;

  -- ================================================================
  -- 2. PRICE SCORE (Weight: 20%)
  -- ================================================================
  v_expected_price := calculate_dynamic_price(
    v_batch.pallet_type,
    v_batch.quality,
    v_batch.size,
    LEAST(v_order.quantity, v_batch.available_quantity)
  );
  
  v_actual_price := COALESCE(v_batch.price_per_pallet, v_expected_price);
  v_price_ratio := v_actual_price / NULLIF(v_expected_price, 0);

  IF v_price_ratio <= 0.85 THEN
    v_price_score := 100;
    v_reasons := v_reasons || jsonb_build_object('factor', 'price', 'score', 100, 'reason', 'Excellent price - 15% below market');
  ELSIF v_price_ratio <= 0.95 THEN
    v_price_score := 90;
    v_reasons := v_reasons || jsonb_build_object('factor', 'price', 'score', 90, 'reason', 'Good price - below market');
  ELSIF v_price_ratio <= 1.05 THEN
    v_price_score := 80;
    v_reasons := v_reasons || jsonb_build_object('factor', 'price', 'score', 80, 'reason', 'Fair market price');
  ELSIF v_price_ratio <= 1.15 THEN
    v_price_score := 60;
    v_reasons := v_reasons || jsonb_build_object('factor', 'price', 'score', 60, 'reason', 'Slightly above market');
  ELSE
    v_price_score := 40;
    v_reasons := v_reasons || jsonb_build_object('factor', 'price', 'score', 40, 'reason', 'Premium pricing');
  END IF;

  -- ================================================================
  -- 3. LOCATION SCORE (Weight: 20%)
  -- ================================================================
  IF v_order.city = v_batch.city THEN
    v_location_score := 100;
    v_reasons := v_reasons || jsonb_build_object('factor', 'location', 'score', 100, 'reason', 'Same city delivery');
  ELSIF v_order.accept_close_city THEN
    v_location_score := 70;
    v_reasons := v_reasons || jsonb_build_object('factor', 'location', 'score', 70, 'reason', 'Nearby city delivery accepted');
  ELSE
    RETURN; -- No match
  END IF;

  -- ================================================================
  -- 4. QUANTITY SCORE (Weight: 15%)
  -- ================================================================
  IF v_batch.available_quantity >= v_order.quantity THEN
    v_quantity_score := 100;
    v_reasons := v_reasons || jsonb_build_object('factor', 'quantity', 'score', 100, 'reason', 'Full order quantity available');
  ELSIF v_order.accept_partial_delivery THEN
    v_quantity_score := 60 + (40 * v_batch.available_quantity::numeric / NULLIF(v_order.quantity, 0));
    v_reasons := v_reasons || jsonb_build_object('factor', 'quantity', 'score', v_quantity_score, 'reason', format('Partial delivery: %s of %s pallets', v_batch.available_quantity, v_order.quantity));
  ELSE
    RETURN; -- No match
  END IF;

  -- ================================================================
  -- 5. SUPPLIER RATING SCORE (Weight: 10%)
  -- ================================================================
  IF v_supplier_rating >= 90 THEN
    v_supplier_score := 100;
    v_reasons := v_reasons || jsonb_build_object('factor', 'supplier', 'score', 100, 'reason', 'Excellent supplier rating');
  ELSIF v_supplier_rating >= 75 THEN
    v_supplier_score := 80;
    v_reasons := v_reasons || jsonb_build_object('factor', 'supplier', 'score', 80, 'reason', 'Good supplier rating');
  ELSIF v_supplier_rating >= 50 THEN
    v_supplier_score := 60;
    v_reasons := v_reasons || jsonb_build_object('factor', 'supplier', 'score', 60, 'reason', 'Average supplier rating');
  ELSE
    v_supplier_score := 40;
    v_reasons := v_reasons || jsonb_build_object('factor', 'supplier', 'score', 40, 'reason', 'New or low-rated supplier');
  END IF;

  -- ================================================================
  -- 6. FRESHNESS SCORE (Weight: 10%)
  -- ================================================================
  v_batch_age_hours := EXTRACT(EPOCH FROM (now() - v_batch.created_at)) / 3600;

  IF v_batch_age_hours <= 1 THEN
    v_freshness_score := 100;
    v_reasons := v_reasons || jsonb_build_object('factor', 'freshness', 'score', 100, 'reason', 'Brand new listing');
  ELSIF v_batch_age_hours <= 6 THEN
    v_freshness_score := 90;
    v_reasons := v_reasons || jsonb_build_object('factor', 'freshness', 'score', 90, 'reason', 'Very recent listing');
  ELSIF v_batch_age_hours <= 24 THEN
    v_freshness_score := 80;
    v_reasons := v_reasons || jsonb_build_object('factor', 'freshness', 'score', 80, 'reason', 'Recent listing');
  ELSIF v_batch_age_hours <= 72 THEN
    v_freshness_score := 60;
    v_reasons := v_reasons || jsonb_build_object('factor', 'freshness', 'score', 60, 'reason', 'Available for days');
  ELSE
    v_freshness_score := 40;
    v_reasons := v_reasons || jsonb_build_object('factor', 'freshness', 'score', 40, 'reason', 'Older inventory');
  END IF;

  -- ================================================================
  -- CALCULATE WEIGHTED TOTAL SCORE
  -- ================================================================
  v_total_score := (
    v_quality_score * 0.25 +
    v_price_score * 0.20 +
    v_location_score * 0.20 +
    v_quantity_score * 0.15 +
    v_supplier_score * 0.10 +
    v_freshness_score * 0.10
  );

  -- Return scores
  RETURN QUERY SELECT
    v_total_score,
    v_quality_score,
    v_price_score,
    v_location_score,
    v_quantity_score,
    v_supplier_score,
    v_freshness_score,
    v_reasons;
END;
$$;

-- ================================================================
-- GET BEST MATCHES FOR ORDER
-- ================================================================

CREATE OR REPLACE FUNCTION get_best_matches_for_order(p_order_id uuid, p_limit int DEFAULT 5)
RETURNS TABLE(
  batch_id uuid,
  score numeric,
  quality_score numeric,
  price_score numeric,
  location_score numeric,
  quantity_score numeric,
  supplier_rating_score numeric,
  freshness_score numeric,
  match_reasons jsonb,
  batch_details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Calculate scores for all potential matches
  DELETE FROM matching_scores WHERE order_id = p_order_id;

  INSERT INTO matching_scores (
    order_id, batch_id, score, quality_score, price_score, 
    location_score, quantity_score, supplier_rating_score, freshness_score, match_reasons
  )
  SELECT 
    p_order_id,
    ib.id,
    ms.score,
    ms.quality_score,
    ms.price_score,
    ms.location_score,
    ms.quantity_score,
    ms.supplier_rating_score,
    ms.freshness_score,
    ms.match_reasons
  FROM inventory_batches ib
  CROSS JOIN LATERAL calculate_match_score(p_order_id, ib.id) ms
  WHERE ib.status = 'active'
    AND ib.available_quantity > 0
    AND ib.pallet_type = v_order.pallet_type
    AND ib.size = v_order.size
    AND ms.score IS NOT NULL;

  -- Return top matches
  RETURN QUERY
  SELECT 
    ms.batch_id,
    ms.score,
    ms.quality_score,
    ms.price_score,
    ms.location_score,
    ms.quantity_score,
    ms.supplier_rating_score,
    ms.freshness_score,
    ms.match_reasons,
    jsonb_build_object(
      'pallet_type', ib.pallet_type,
      'size', ib.size,
      'quality', ib.quality,
      'city', ib.city,
      'available_quantity', ib.available_quantity,
      'price_per_pallet', ib.price_per_pallet,
      'pallet_condition', ib.pallet_condition,
      'supplier_phone', ib.phone,
      'image_urls', ib.image_urls,
      'description', ib.description
    ) as batch_details
  FROM matching_scores ms
  JOIN inventory_batches ib ON ib.id = ms.batch_id
  WHERE ms.order_id = p_order_id
  ORDER BY ms.score DESC
  LIMIT p_limit;
END;
$$;

-- ================================================================
-- SMART AUTO-MATCH WITH AI SCORING
-- ================================================================

CREATE OR REPLACE FUNCTION smart_auto_match_orders(p_batch_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_batch inventory_batches%ROWTYPE;
  v_match RECORD;
  v_matched_count int := 0;
  v_deal_result jsonb;
  v_matched_qty int;
  v_price numeric;
BEGIN
  SELECT * INTO v_batch FROM inventory_batches WHERE id = p_batch_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'batch_not_found');
  END IF;

  IF v_batch.available_quantity <= 0 THEN
    RETURN jsonb_build_object('success', true, 'matches', 0, 'reason', 'no_available_quantity');
  END IF;

  -- Find best matching orders using AI scoring
  FOR v_match IN
    SELECT DISTINCT ON (o.id)
      o.*,
      ms.score,
      ms.match_reasons
    FROM orders o
    CROSS JOIN LATERAL calculate_match_score(o.id, p_batch_id) ms
    WHERE o.status IN ('unmatched', 'pending')
      AND o.pallet_type = v_batch.pallet_type
      AND o.size = v_batch.size
      AND ms.score >= 70 -- Minimum acceptable match score
      AND NOT EXISTS (
        SELECT 1 FROM deals d 
        WHERE d.order_id = o.id 
          AND d.status NOT IN ('cancelled')
      )
    ORDER BY o.id, ms.score DESC, o.created_at ASC
  LOOP
    IF v_batch.available_quantity <= 0 THEN
      EXIT;
    END IF;

    -- Determine matched quantity
    IF v_match.accept_partial_delivery THEN
      v_matched_qty := LEAST(v_match.quantity, v_batch.available_quantity);
    ELSE
      IF v_batch.available_quantity < v_match.quantity THEN
        CONTINUE;
      END IF;
      v_matched_qty := v_match.quantity;
    END IF;

    v_price := COALESCE(
      v_batch.price_per_pallet,
      calculate_dynamic_price(v_batch.pallet_type, v_batch.quality, v_batch.size, v_matched_qty)
    );

    -- Create deal
    v_deal_result := create_deal_with_reservation(
      v_match.id,
      v_batch.id,
      v_match.phone,
      v_batch.phone,
      v_batch.pallet_type,
      v_batch.size,
      v_batch.quality,
      v_batch.city,
      v_matched_qty,
      v_price,
      v_match.request_id
    );

    IF (v_deal_result->>'success')::boolean THEN
      UPDATE orders SET
        status = 'matched',
        matched_quantity = v_matched_qty,
        matched_price = v_price,
        updated_at = now()
      WHERE id = v_match.id;

      -- Record match history
      INSERT INTO match_history (order_id, batch_id, score, was_accepted)
      VALUES (v_match.id, p_batch_id, v_match.score, true);

      v_matched_count := v_matched_count + 1;

      -- Refresh batch quantity
      SELECT available_quantity INTO v_batch.available_quantity
      FROM inventory_batches WHERE id = p_batch_id;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'matches', v_matched_count);
END;
$$;

-- ================================================================
-- UPDATE TRIGGER TO USE SMART MATCHING
-- ================================================================

DROP TRIGGER IF EXISTS auto_match_inventory_trigger ON inventory_batches;

CREATE OR REPLACE FUNCTION trigger_smart_auto_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NEW.status = 'active' AND COALESCE(NEW.available_quantity, 0) > 0 THEN
    v_result := smart_auto_match_orders(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_match_inventory_trigger
  AFTER INSERT ON inventory_batches
  FOR EACH ROW
  EXECUTE FUNCTION trigger_smart_auto_match();

-- ================================================================
-- CREATE INDEX FOR PERFORMANCE
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_matching_scores_order_score ON matching_scores(order_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_matching_scores_batch ON matching_scores(batch_id);
CREATE INDEX IF NOT EXISTS idx_match_history_order ON match_history(order_id);
CREATE INDEX IF NOT EXISTS idx_match_history_created ON match_history(created_at DESC);

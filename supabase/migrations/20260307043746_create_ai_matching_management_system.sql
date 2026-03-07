/*
  # AI Matching Management System

  1. Overview
    Complete management system for AI-powered matching with:
    - Custom matching rules
    - Manual override capabilities
    - Performance monitoring
    - Pattern analysis
    - Quality control tools

  2. New Tables
    - `matching_rules`: Custom rules for AI matching
    - `matching_overrides`: Manual intervention records
    - `matching_performance`: Real-time performance metrics
    - `matching_patterns`: Learned patterns from history
    - `matching_blacklist`: Prevent specific matches
    - `matching_preferences`: User-specific preferences

  3. New Functions
    - Admin matching control functions
    - Rule evaluation engine
    - Pattern recognition
    - Performance analytics

  4. Security
    - Admin-only access to management features
    - Audit trail for all changes
*/

-- ================================================================
-- MATCHING RULES TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS matching_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL,
  rule_type text NOT NULL, -- 'weight_adjustment', 'score_threshold', 'priority', 'exclusion'
  conditions jsonb NOT NULL, -- Rule conditions
  actions jsonb NOT NULL, -- Actions to take
  priority int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ================================================================
-- MATCHING OVERRIDES TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS matching_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  batch_id uuid REFERENCES inventory_batches(id) ON DELETE SET NULL,
  override_type text NOT NULL, -- 'force_match', 'block_match', 'adjust_score', 'change_priority'
  original_score numeric,
  adjusted_score numeric,
  reason text NOT NULL,
  admin_phone text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ================================================================
-- MATCHING PERFORMANCE TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS matching_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date date NOT NULL DEFAULT CURRENT_DATE,
  total_matches_attempted int DEFAULT 0,
  successful_matches int DEFAULT 0,
  failed_matches int DEFAULT 0,
  avg_match_score numeric DEFAULT 0,
  avg_time_to_match interval,
  matches_by_quality jsonb DEFAULT '{}',
  matches_by_city jsonb DEFAULT '{}',
  matches_by_score_range jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(metric_date)
);

-- ================================================================
-- MATCHING PATTERNS TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS matching_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_type text NOT NULL, -- 'successful', 'failed', 'high_score', 'low_score'
  pattern_data jsonb NOT NULL,
  occurrences int DEFAULT 1,
  confidence_score numeric DEFAULT 0,
  last_seen timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- ================================================================
-- MATCHING BLACKLIST TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS matching_blacklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_phone text,
  supplier_phone text,
  reason text NOT NULL,
  blacklist_type text NOT NULL, -- 'buyer_supplier', 'quality_grade', 'city_pair'
  conditions jsonb,
  is_active boolean DEFAULT true,
  created_by text NOT NULL,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ================================================================
-- MATCHING PREFERENCES TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS matching_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_phone text NOT NULL,
  preference_type text NOT NULL, -- 'weight_adjustment', 'auto_accept', 'notification_threshold'
  preferences jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_phone, preference_type)
);

-- ================================================================
-- ENABLE RLS
-- ================================================================

ALTER TABLE matching_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE matching_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE matching_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE matching_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE matching_blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE matching_preferences ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- RLS POLICIES - Admin Only Management
-- ================================================================

CREATE POLICY "Admin can manage matching rules"
  ON matching_rules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_sessions
      WHERE user_sessions.phone = (SELECT phone FROM user_sessions WHERE session_token = current_setting('app.session_token', true))
        AND user_sessions.user_type = 'admin'
    )
  );

CREATE POLICY "Admin can manage overrides"
  ON matching_overrides FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_sessions
      WHERE user_sessions.phone = (SELECT phone FROM user_sessions WHERE session_token = current_setting('app.session_token', true))
        AND user_sessions.user_type = 'admin'
    )
  );

CREATE POLICY "Admin can view performance"
  ON matching_performance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_sessions
      WHERE user_sessions.phone = (SELECT phone FROM user_sessions WHERE session_token = current_setting('app.session_token', true))
        AND user_sessions.user_type = 'admin'
    )
  );

CREATE POLICY "Admin can manage patterns"
  ON matching_patterns FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_sessions
      WHERE user_sessions.phone = (SELECT phone FROM user_sessions WHERE session_token = current_setting('app.session_token', true))
        AND user_sessions.user_type = 'admin'
    )
  );

CREATE POLICY "Admin can manage blacklist"
  ON matching_blacklist FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_sessions
      WHERE user_sessions.phone = (SELECT phone FROM user_sessions WHERE session_token = current_setting('app.session_token', true))
        AND user_sessions.user_type = 'admin'
    )
  );

CREATE POLICY "Users can view own preferences"
  ON matching_preferences FOR SELECT
  TO authenticated
  USING (
    user_phone = (SELECT phone FROM user_sessions WHERE session_token = current_setting('app.session_token', true))
  );

CREATE POLICY "Admin can manage all preferences"
  ON matching_preferences FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_sessions
      WHERE user_sessions.phone = (SELECT phone FROM user_sessions WHERE session_token = current_setting('app.session_token', true))
        AND user_sessions.user_type = 'admin'
    )
  );

-- ================================================================
-- FUNCTION: Check Blacklist
-- ================================================================

CREATE OR REPLACE FUNCTION check_matching_blacklist(
  p_buyer_phone text,
  p_supplier_phone text,
  p_order_quality text,
  p_batch_quality text,
  p_order_city text,
  p_batch_city text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_blocked boolean := false;
BEGIN
  -- Check buyer-supplier blacklist
  SELECT EXISTS(
    SELECT 1 FROM matching_blacklist
    WHERE is_active = true
      AND blacklist_type = 'buyer_supplier'
      AND (expires_at IS NULL OR expires_at > now())
      AND buyer_phone = p_buyer_phone
      AND supplier_phone = p_supplier_phone
  ) INTO v_blocked;

  IF v_blocked THEN
    RETURN true;
  END IF;

  -- Check quality grade blacklist
  SELECT EXISTS(
    SELECT 1 FROM matching_blacklist
    WHERE is_active = true
      AND blacklist_type = 'quality_grade'
      AND (expires_at IS NULL OR expires_at > now())
      AND conditions->>'order_quality' = p_order_quality
      AND conditions->>'batch_quality' = p_batch_quality
  ) INTO v_blocked;

  IF v_blocked THEN
    RETURN true;
  END IF;

  -- Check city pair blacklist
  SELECT EXISTS(
    SELECT 1 FROM matching_blacklist
    WHERE is_active = true
      AND blacklist_type = 'city_pair'
      AND (expires_at IS NULL OR expires_at > now())
      AND conditions->>'order_city' = p_order_city
      AND conditions->>'batch_city' = p_batch_city
  ) INTO v_blocked;

  RETURN v_blocked;
END;
$$;

-- ================================================================
-- FUNCTION: Apply Matching Rules
-- ================================================================

CREATE OR REPLACE FUNCTION apply_matching_rules(
  p_order_id uuid,
  p_batch_id uuid,
  p_base_score numeric
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rule RECORD;
  v_adjusted_score numeric := p_base_score;
  v_order orders%ROWTYPE;
  v_batch inventory_batches%ROWTYPE;
  v_condition_met boolean;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  SELECT * INTO v_batch FROM inventory_batches WHERE id = p_batch_id;

  FOR v_rule IN
    SELECT * FROM matching_rules
    WHERE is_active = true
    ORDER BY priority DESC
  LOOP
    v_condition_met := false;

    -- Evaluate rule conditions
    CASE v_rule.rule_type
      WHEN 'weight_adjustment' THEN
        -- Check if conditions match
        IF (v_rule.conditions->>'pallet_type' IS NULL OR v_rule.conditions->>'pallet_type' = v_order.pallet_type)
          AND (v_rule.conditions->>'quality' IS NULL OR v_rule.conditions->>'quality' = v_order.quality)
          AND (v_rule.conditions->>'city' IS NULL OR v_rule.conditions->>'city' = v_order.city)
        THEN
          v_condition_met := true;
        END IF;

      WHEN 'score_threshold' THEN
        IF v_adjusted_score >= COALESCE((v_rule.conditions->>'min_score')::numeric, 0)
          AND v_adjusted_score <= COALESCE((v_rule.conditions->>'max_score')::numeric, 100)
        THEN
          v_condition_met := true;
        END IF;
    END CASE;

    -- Apply rule action if condition met
    IF v_condition_met THEN
      CASE v_rule.rule_type
        WHEN 'weight_adjustment' THEN
          v_adjusted_score := v_adjusted_score * COALESCE((v_rule.actions->>'multiplier')::numeric, 1.0);
        WHEN 'score_threshold' THEN
          v_adjusted_score := LEAST(v_adjusted_score, COALESCE((v_rule.actions->>'max_score')::numeric, 100));
          v_adjusted_score := GREATEST(v_adjusted_score, COALESCE((v_rule.actions->>'min_score')::numeric, 0));
      END CASE;
    END IF;
  END LOOP;

  RETURN LEAST(100, GREATEST(0, v_adjusted_score));
END;
$$;

-- ================================================================
-- FUNCTION: Force Match (Manual Override)
-- ================================================================

CREATE OR REPLACE FUNCTION admin_force_match(
  p_order_id uuid,
  p_batch_id uuid,
  p_admin_phone text,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_batch inventory_batches%ROWTYPE;
  v_price numeric;
  v_matched_qty int;
  v_deal_result jsonb;
BEGIN
  -- Verify admin
  IF NOT EXISTS (
    SELECT 1 FROM user_sessions
    WHERE phone = p_admin_phone AND user_type = 'admin'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  SELECT * INTO v_batch FROM inventory_batches WHERE id = p_batch_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'order_or_batch_not_found');
  END IF;

  -- Determine quantity
  v_matched_qty := LEAST(v_order.quantity, v_batch.available_quantity);

  IF v_matched_qty <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_quantity_available');
  END IF;

  v_price := COALESCE(
    v_batch.price_per_pallet,
    calculate_dynamic_price(v_batch.pallet_type, v_batch.quality, v_batch.size, v_matched_qty)
  );

  -- Create deal
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
    v_price,
    v_order.request_id
  );

  IF (v_deal_result->>'success')::boolean THEN
    -- Update order
    UPDATE orders SET
      status = 'matched',
      matched_quantity = v_matched_qty,
      matched_price = v_price,
      updated_at = now()
    WHERE id = v_order.id;

    -- Record override
    INSERT INTO matching_overrides (
      order_id,
      batch_id,
      override_type,
      reason,
      admin_phone
    ) VALUES (
      p_order_id,
      p_batch_id,
      'force_match',
      p_reason,
      p_admin_phone
    );

    RETURN jsonb_build_object(
      'success', true,
      'deal_id', v_deal_result->>'deal_id',
      'matched_quantity', v_matched_qty
    );
  ELSE
    RETURN v_deal_result;
  END IF;
END;
$$;

-- ================================================================
-- FUNCTION: Block Match
-- ================================================================

CREATE OR REPLACE FUNCTION admin_block_match(
  p_order_id uuid,
  p_batch_id uuid,
  p_admin_phone text,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify admin
  IF NOT EXISTS (
    SELECT 1 FROM user_sessions
    WHERE phone = p_admin_phone AND user_type = 'admin'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  -- Record override
  INSERT INTO matching_overrides (
    order_id,
    batch_id,
    override_type,
    reason,
    admin_phone
  ) VALUES (
    p_order_id,
    p_batch_id,
    'block_match',
    p_reason,
    p_admin_phone
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ================================================================
-- FUNCTION: Get Matching Performance Metrics
-- ================================================================

CREATE OR REPLACE FUNCTION get_matching_performance_metrics(
  p_days int DEFAULT 7
)
RETURNS TABLE(
  metric_date date,
  total_matches_attempted int,
  successful_matches int,
  failed_matches int,
  success_rate numeric,
  avg_match_score numeric,
  matches_by_quality jsonb,
  matches_by_city jsonb,
  matches_by_score_range jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mp.metric_date,
    mp.total_matches_attempted,
    mp.successful_matches,
    mp.failed_matches,
    CASE WHEN mp.total_matches_attempted > 0
      THEN (mp.successful_matches::numeric / mp.total_matches_attempted * 100)
      ELSE 0
    END as success_rate,
    mp.avg_match_score,
    mp.matches_by_quality,
    mp.matches_by_city,
    mp.matches_by_score_range
  FROM matching_performance mp
  WHERE mp.metric_date >= CURRENT_DATE - p_days
  ORDER BY mp.metric_date DESC;
END;
$$;

-- ================================================================
-- FUNCTION: Update Performance Metrics
-- ================================================================

CREATE OR REPLACE FUNCTION update_matching_performance()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today date := CURRENT_DATE;
  v_total int;
  v_successful int;
  v_failed int;
  v_avg_score numeric;
BEGIN
  -- Count matches for today
  SELECT COUNT(*) INTO v_total
  FROM match_history
  WHERE created_at::date = v_today;

  SELECT COUNT(*) INTO v_successful
  FROM match_history
  WHERE created_at::date = v_today AND was_accepted = true;

  v_failed := v_total - v_successful;

  SELECT AVG(score) INTO v_avg_score
  FROM match_history
  WHERE created_at::date = v_today;

  -- Upsert metrics
  INSERT INTO matching_performance (
    metric_date,
    total_matches_attempted,
    successful_matches,
    failed_matches,
    avg_match_score,
    updated_at
  ) VALUES (
    v_today,
    v_total,
    v_successful,
    v_failed,
    COALESCE(v_avg_score, 0),
    now()
  )
  ON CONFLICT (metric_date)
  DO UPDATE SET
    total_matches_attempted = EXCLUDED.total_matches_attempted,
    successful_matches = EXCLUDED.successful_matches,
    failed_matches = EXCLUDED.failed_matches,
    avg_match_score = EXCLUDED.avg_match_score,
    updated_at = now();
END;
$$;

-- ================================================================
-- FUNCTION: Analyze Matching Patterns
-- ================================================================

CREATE OR REPLACE FUNCTION analyze_matching_patterns()
RETURNS TABLE(
  pattern_type text,
  pattern_description text,
  occurrences int,
  confidence_score numeric,
  recommendation text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  -- High success patterns
  SELECT
    'high_success'::text,
    format('Quality %s to %s matches have %s%% success rate',
      o.quality, ib.quality,
      ROUND(COUNT(*) FILTER (WHERE mh.was_accepted) * 100.0 / COUNT(*))
    ),
    COUNT(*)::int,
    ROUND(COUNT(*) FILTER (WHERE mh.was_accepted) * 100.0 / COUNT(*), 2),
    'Prioritize these quality combinations'::text
  FROM match_history mh
  JOIN orders o ON mh.order_id = o.id
  JOIN inventory_batches ib ON mh.batch_id = ib.id
  WHERE mh.created_at >= CURRENT_DATE - 30
  GROUP BY o.quality, ib.quality
  HAVING COUNT(*) >= 5 AND COUNT(*) FILTER (WHERE mh.was_accepted) * 100.0 / COUNT(*) >= 70
  ORDER BY COUNT(*) DESC
  LIMIT 5;
END;
$$;

-- ================================================================
-- CREATE INDEXES
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_matching_rules_active ON matching_rules(is_active, priority DESC);
CREATE INDEX IF NOT EXISTS idx_matching_overrides_order ON matching_overrides(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matching_performance_date ON matching_performance(metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_matching_patterns_type ON matching_patterns(pattern_type, confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_matching_blacklist_active ON matching_blacklist(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_matching_preferences_user ON matching_preferences(user_phone, preference_type);

-- ================================================================
-- ENABLE REALTIME
-- ================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE matching_rules;
ALTER PUBLICATION supabase_realtime ADD TABLE matching_overrides;
ALTER PUBLICATION supabase_realtime ADD TABLE matching_performance;

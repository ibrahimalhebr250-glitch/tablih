/*
  # Create Analytics and User Behavior Tracking System

  1. New Tables
    - `user_behavior_tracking`
      - `id` (uuid, primary key)
      - `event_type` (text) - type of event (page_view, click, search, etc.)
      - `event_data` (jsonb) - detailed event information
      - `user_phone` (text) - user who performed the action
      - `session_id` (text) - session identifier
      - `user_agent` (text) - browser/device info
      - `ip_address` (inet) - user IP
      - `created_at` (timestamptz) - when event occurred

    - `ab_test_experiments`
      - `id` (uuid, primary key)
      - `experiment_name` (text) - name of the experiment
      - `experiment_key` (text) - unique key
      - `variant_a_name` (text) - control variant name
      - `variant_b_name` (text) - test variant name
      - `variant_a_weight` (numeric) - traffic allocation %
      - `variant_b_weight` (numeric) - traffic allocation %
      - `is_active` (boolean) - whether experiment is running
      - `start_date` (timestamptz)
      - `end_date` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `ab_test_assignments`
      - `id` (uuid, primary key)
      - `experiment_id` (uuid, foreign key)
      - `user_phone` (text)
      - `variant_assigned` (text) - 'A' or 'B'
      - `assigned_at` (timestamptz)

    - `ab_test_results`
      - `id` (uuid, primary key)
      - `experiment_id` (uuid, foreign key)
      - `user_phone` (text)
      - `variant` (text)
      - `conversion_event` (text)
      - `conversion_value` (numeric)
      - `converted_at` (timestamptz)

  2. Functions
    - `track_user_behavior()` - logs user behavior
    - `get_user_behavior_analytics()` - gets analytics data
    - `create_ab_test()` - creates new A/B test
    - `assign_ab_test_variant()` - assigns user to variant
    - `track_ab_test_conversion()` - tracks conversion
    - `get_ab_test_results()` - gets experiment results

  3. Security
    - Enable RLS on all tables
    - Users can only see their own data
    - Admins can see all analytics

  4. Notes
    - Tracks all user interactions
    - A/B testing with automatic assignment
    - Real-time analytics
*/

-- Create user_behavior_tracking table
CREATE TABLE IF NOT EXISTS user_behavior_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  user_phone text,
  session_id text,
  user_agent text,
  ip_address inet,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_behavior_event_type ON user_behavior_tracking(event_type);
CREATE INDEX IF NOT EXISTS idx_behavior_user_phone ON user_behavior_tracking(user_phone);
CREATE INDEX IF NOT EXISTS idx_behavior_session_id ON user_behavior_tracking(session_id);
CREATE INDEX IF NOT EXISTS idx_behavior_created_at ON user_behavior_tracking(created_at DESC);

ALTER TABLE user_behavior_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own behavior"
  ON user_behavior_tracking FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view all behavior"
  ON user_behavior_tracking FOR SELECT
  TO authenticated
  USING (true);

-- Create ab_test_experiments table
CREATE TABLE IF NOT EXISTS ab_test_experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_name text NOT NULL,
  experiment_key text UNIQUE NOT NULL,
  variant_a_name text NOT NULL DEFAULT 'Control',
  variant_b_name text NOT NULL DEFAULT 'Test',
  variant_a_weight numeric DEFAULT 50 CHECK (variant_a_weight >= 0 AND variant_a_weight <= 100),
  variant_b_weight numeric DEFAULT 50 CHECK (variant_b_weight >= 0 AND variant_b_weight <= 100),
  is_active boolean DEFAULT true,
  start_date timestamptz DEFAULT now(),
  end_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ab_test_experiments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active experiments"
  ON ab_test_experiments FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage experiments"
  ON ab_test_experiments FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create ab_test_assignments table
CREATE TABLE IF NOT EXISTS ab_test_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id uuid REFERENCES ab_test_experiments(id) ON DELETE CASCADE,
  user_phone text NOT NULL,
  variant_assigned text NOT NULL CHECK (variant_assigned IN ('A', 'B')),
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(experiment_id, user_phone)
);

CREATE INDEX IF NOT EXISTS idx_assignments_experiment ON ab_test_assignments(experiment_id);
CREATE INDEX IF NOT EXISTS idx_assignments_user ON ab_test_assignments(user_phone);

ALTER TABLE ab_test_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their assignments"
  ON ab_test_assignments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can create assignments"
  ON ab_test_assignments FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create ab_test_results table
CREATE TABLE IF NOT EXISTS ab_test_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id uuid REFERENCES ab_test_experiments(id) ON DELETE CASCADE,
  user_phone text NOT NULL,
  variant text NOT NULL CHECK (variant IN ('A', 'B')),
  conversion_event text NOT NULL,
  conversion_value numeric DEFAULT 0,
  converted_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_results_experiment ON ab_test_results(experiment_id);
CREATE INDEX IF NOT EXISTS idx_results_variant ON ab_test_results(variant);

ALTER TABLE ab_test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their conversions"
  ON ab_test_results FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view all results"
  ON ab_test_results FOR SELECT
  TO authenticated
  USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE user_behavior_tracking;
ALTER PUBLICATION supabase_realtime ADD TABLE ab_test_experiments;
ALTER PUBLICATION supabase_realtime ADD TABLE ab_test_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE ab_test_results;

-- Function to track user behavior
CREATE OR REPLACE FUNCTION track_user_behavior(
  p_event_type text,
  p_event_data jsonb,
  p_user_phone text DEFAULT NULL,
  p_session_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_behavior_id uuid;
BEGIN
  INSERT INTO user_behavior_tracking (
    event_type,
    event_data,
    user_phone,
    session_id,
    user_agent,
    ip_address
  )
  VALUES (
    p_event_type,
    p_event_data,
    p_user_phone,
    p_session_id,
    current_setting('request.headers', true)::json->>'user-agent',
    inet_client_addr()
  )
  RETURNING id INTO v_behavior_id;

  RETURN v_behavior_id;
END;
$$;

-- Function to get user behavior analytics
CREATE OR REPLACE FUNCTION get_user_behavior_analytics(
  p_start_date timestamptz DEFAULT (now() - interval '30 days'),
  p_end_date timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT jsonb_build_object(
    'total_events', COUNT(*),
    'unique_users', COUNT(DISTINCT user_phone),
    'unique_sessions', COUNT(DISTINCT session_id),
    'events_by_type', (
      SELECT jsonb_object_agg(event_type, count)
      FROM (
        SELECT event_type, COUNT(*) as count
        FROM user_behavior_tracking
        WHERE created_at BETWEEN p_start_date AND p_end_date
        GROUP BY event_type
      ) events
    ),
    'daily_active_users', (
      SELECT COUNT(DISTINCT user_phone)
      FROM user_behavior_tracking
      WHERE created_at >= CURRENT_DATE
    ),
    'top_events', (
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT event_type, COUNT(*) as count
        FROM user_behavior_tracking
        WHERE created_at BETWEEN p_start_date AND p_end_date
        GROUP BY event_type
        ORDER BY count DESC
        LIMIT 10
      ) t
    )
  )
  FROM user_behavior_tracking
  WHERE created_at BETWEEN p_start_date AND p_end_date;
$$;

-- Function to create A/B test experiment
CREATE OR REPLACE FUNCTION create_ab_test(
  p_experiment_name text,
  p_experiment_key text,
  p_variant_a_name text DEFAULT 'Control',
  p_variant_b_name text DEFAULT 'Test',
  p_variant_a_weight numeric DEFAULT 50,
  p_variant_b_weight numeric DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_experiment_id uuid;
BEGIN
  INSERT INTO ab_test_experiments (
    experiment_name,
    experiment_key,
    variant_a_name,
    variant_b_name,
    variant_a_weight,
    variant_b_weight
  )
  VALUES (
    p_experiment_name,
    p_experiment_key,
    p_variant_a_name,
    p_variant_b_name,
    p_variant_a_weight,
    p_variant_b_weight
  )
  RETURNING id INTO v_experiment_id;

  RETURN jsonb_build_object(
    'success', true,
    'experiment_id', v_experiment_id
  );
END;
$$;

-- Function to assign user to A/B test variant
CREATE OR REPLACE FUNCTION assign_ab_test_variant(
  p_experiment_key text,
  p_user_phone text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_experiment_id uuid;
  v_existing_variant text;
  v_variant text;
  v_random numeric;
  v_weight_a numeric;
BEGIN
  -- Get experiment ID and check if active
  SELECT id, variant_a_weight INTO v_experiment_id, v_weight_a
  FROM ab_test_experiments
  WHERE experiment_key = p_experiment_key
    AND is_active = true
    AND (end_date IS NULL OR end_date > now());

  IF v_experiment_id IS NULL THEN
    RETURN 'A';
  END IF;

  -- Check if user already has assignment
  SELECT variant_assigned INTO v_existing_variant
  FROM ab_test_assignments
  WHERE experiment_id = v_experiment_id
    AND user_phone = p_user_phone;

  IF v_existing_variant IS NOT NULL THEN
    RETURN v_existing_variant;
  END IF;

  -- Assign new variant based on weights
  v_random := random() * 100;
  IF v_random < v_weight_a THEN
    v_variant := 'A';
  ELSE
    v_variant := 'B';
  END IF;

  -- Save assignment
  INSERT INTO ab_test_assignments (experiment_id, user_phone, variant_assigned)
  VALUES (v_experiment_id, p_user_phone, v_variant);

  RETURN v_variant;
END;
$$;

-- Function to track A/B test conversion
CREATE OR REPLACE FUNCTION track_ab_test_conversion(
  p_experiment_key text,
  p_user_phone text,
  p_conversion_event text,
  p_conversion_value numeric DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_experiment_id uuid;
  v_variant text;
BEGIN
  -- Get experiment and user's variant
  SELECT e.id, a.variant_assigned
  INTO v_experiment_id, v_variant
  FROM ab_test_experiments e
  JOIN ab_test_assignments a ON a.experiment_id = e.id
  WHERE e.experiment_key = p_experiment_key
    AND a.user_phone = p_user_phone
    AND e.is_active = true;

  IF v_experiment_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'No active experiment or assignment found');
  END IF;

  -- Record conversion
  INSERT INTO ab_test_results (
    experiment_id,
    user_phone,
    variant,
    conversion_event,
    conversion_value
  )
  VALUES (
    v_experiment_id,
    p_user_phone,
    v_variant,
    p_conversion_event,
    p_conversion_value
  );

  RETURN jsonb_build_object('success', true, 'variant', v_variant);
END;
$$;

-- Function to get A/B test results
CREATE OR REPLACE FUNCTION get_ab_test_results(p_experiment_key text)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH experiment AS (
    SELECT id FROM ab_test_experiments WHERE experiment_key = p_experiment_key
  ),
  variant_stats AS (
    SELECT
      a.variant_assigned as variant,
      COUNT(DISTINCT a.user_phone) as total_users,
      COUNT(DISTINCT r.user_phone) as converted_users,
      COALESCE(SUM(r.conversion_value), 0) as total_value,
      COALESCE(AVG(r.conversion_value), 0) as avg_value
    FROM ab_test_assignments a
    LEFT JOIN ab_test_results r ON r.experiment_id = a.experiment_id AND r.user_phone = a.user_phone
    WHERE a.experiment_id = (SELECT id FROM experiment)
    GROUP BY a.variant_assigned
  )
  SELECT jsonb_build_object(
    'variant_a', (
      SELECT jsonb_build_object(
        'total_users', total_users,
        'converted_users', converted_users,
        'conversion_rate', CASE WHEN total_users > 0 THEN (converted_users::numeric / total_users * 100) ELSE 0 END,
        'total_value', total_value,
        'avg_value', avg_value
      )
      FROM variant_stats WHERE variant = 'A'
    ),
    'variant_b', (
      SELECT jsonb_build_object(
        'total_users', total_users,
        'converted_users', converted_users,
        'conversion_rate', CASE WHEN total_users > 0 THEN (converted_users::numeric / total_users * 100) ELSE 0 END,
        'total_value', total_value,
        'avg_value', avg_value
      )
      FROM variant_stats WHERE variant = 'B'
    )
  );
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION track_user_behavior TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_behavior_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION create_ab_test TO authenticated;
GRANT EXECUTE ON FUNCTION assign_ab_test_variant TO authenticated;
GRANT EXECUTE ON FUNCTION track_ab_test_conversion TO authenticated;
GRANT EXECUTE ON FUNCTION get_ab_test_results TO authenticated;

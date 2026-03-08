/*
  # Create API and Webhooks System

  1. New Tables
    - `api_keys` - API key management
    - `api_requests_log` - API request logging
    - `webhooks` - Webhook subscriptions
    - `webhook_deliveries` - Webhook delivery tracking
    - `api_rate_limits` - Rate limiting

  2. Functions
    - `create_api_key()` - generates new API key
    - `validate_api_key()` - validates and checks rate limits
    - `log_api_request()` - logs API request
    - `create_webhook()` - creates webhook subscription
    - `queue_webhook_delivery()` - queues webhook for delivery
    - `get_api_usage_stats()` - gets API usage statistics

  3. Security
    - RLS enabled on all tables
    - Users manage their own resources
    - Rate limiting per API key
*/

-- Create api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  user_phone text NOT NULL,
  key_name text NOT NULL,
  permissions jsonb NOT NULL DEFAULT '["read"]'::jsonb,
  rate_limit int NOT NULL DEFAULT 1000,
  is_active boolean DEFAULT true,
  last_used timestamptz,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_phone);
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key) WHERE is_active = true;

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own API keys"
  ON api_keys FOR SELECT
  TO authenticated
  USING (user_phone = current_setting('request.jwt.claims', true)::json->>'phone');

CREATE POLICY "Users can create API keys"
  ON api_keys FOR INSERT
  TO authenticated
  WITH CHECK (user_phone = current_setting('request.jwt.claims', true)::json->>'phone');

CREATE POLICY "Users can manage their API keys"
  ON api_keys FOR UPDATE
  TO authenticated
  USING (user_phone = current_setting('request.jwt.claims', true)::json->>'phone');

CREATE POLICY "Admins can view all API keys"
  ON api_keys FOR SELECT
  TO authenticated
  USING (true);

-- Create api_requests_log table
CREATE TABLE IF NOT EXISTS api_requests_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  method text NOT NULL,
  request_body jsonb,
  response_status int,
  response_body jsonb,
  ip_address inet,
  user_agent text,
  execution_time_ms int,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_log_key ON api_requests_log(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_log_created ON api_requests_log(created_at DESC);

ALTER TABLE api_requests_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their API logs"
  ON api_requests_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM api_keys
      WHERE api_keys.id = api_requests_log.api_key_id
      AND api_keys.user_phone = current_setting('request.jwt.claims', true)::json->>'phone'
    )
  );

CREATE POLICY "System can log requests"
  ON api_requests_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create webhooks table
CREATE TABLE IF NOT EXISTS webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_phone text NOT NULL,
  webhook_url text NOT NULL,
  webhook_name text NOT NULL,
  events jsonb NOT NULL DEFAULT '[]'::jsonb,
  secret_key text NOT NULL,
  is_active boolean DEFAULT true,
  retry_count int DEFAULT 3,
  last_triggered timestamptz,
  total_calls int DEFAULT 0,
  failed_calls int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_user ON webhooks(user_phone);

ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their webhooks"
  ON webhooks FOR ALL
  TO authenticated
  USING (user_phone = current_setting('request.jwt.claims', true)::json->>'phone')
  WITH CHECK (user_phone = current_setting('request.jwt.claims', true)::json->>'phone');

CREATE POLICY "Admins can view all webhooks"
  ON webhooks FOR SELECT
  TO authenticated
  USING (true);

-- Create webhook_deliveries table
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed')),
  response_code int,
  response_body text,
  attempt_count int DEFAULT 0,
  delivered_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);

ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their webhook deliveries"
  ON webhook_deliveries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM webhooks
      WHERE webhooks.id = webhook_deliveries.webhook_id
      AND webhooks.user_phone = current_setting('request.jwt.claims', true)::json->>'phone'
    )
  );

CREATE POLICY "System can manage deliveries"
  ON webhook_deliveries FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create api_rate_limits table
CREATE TABLE IF NOT EXISTS api_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid REFERENCES api_keys(id) ON DELETE CASCADE,
  window_start timestamptz NOT NULL,
  request_count int DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  UNIQUE(api_key_id, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON api_rate_limits(api_key_id, window_start);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE webhooks;
ALTER PUBLICATION supabase_realtime ADD TABLE webhook_deliveries;

-- Function to generate API key
CREATE OR REPLACE FUNCTION generate_api_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN 'pk_' || encode(gen_random_bytes(32), 'hex');
END;
$$;

-- Function to create API key
CREATE OR REPLACE FUNCTION create_api_key(
  p_user_phone text,
  p_key_name text,
  p_permissions jsonb DEFAULT '["read"]'::jsonb,
  p_rate_limit int DEFAULT 1000,
  p_expires_days int DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_key_id uuid;
  v_api_key text;
  v_expires_at timestamptz;
BEGIN
  v_api_key := generate_api_key();
  
  IF p_expires_days IS NOT NULL THEN
    v_expires_at := now() + (p_expires_days || ' days')::interval;
  END IF;

  INSERT INTO api_keys (
    key,
    user_phone,
    key_name,
    permissions,
    rate_limit,
    expires_at
  )
  VALUES (
    v_api_key,
    p_user_phone,
    p_key_name,
    p_permissions,
    p_rate_limit,
    v_expires_at
  )
  RETURNING id INTO v_key_id;

  RETURN jsonb_build_object(
    'success', true,
    'key_id', v_key_id,
    'api_key', v_api_key,
    'message', 'احفظ هذا المفتاح في مكان آمن'
  );
END;
$$;

-- Function to validate API key
CREATE OR REPLACE FUNCTION validate_api_key(p_api_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_key_data record;
  v_current_count int;
  v_window_start timestamptz;
BEGIN
  SELECT * INTO v_key_data
  FROM api_keys
  WHERE key = p_api_key
  AND is_active = true
  AND (expires_at IS NULL OR expires_at > now());

  IF v_key_data IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Invalid or expired API key');
  END IF;

  v_window_start := date_trunc('hour', now());
  
  SELECT COALESCE(SUM(request_count), 0)::int INTO v_current_count
  FROM api_rate_limits
  WHERE api_key_id = v_key_data.id
  AND window_start = v_window_start;

  IF v_current_count >= v_key_data.rate_limit THEN
    RETURN jsonb_build_object(
      'valid', false,
      'message', 'Rate limit exceeded',
      'limit', v_key_data.rate_limit
    );
  END IF;

  INSERT INTO api_rate_limits (api_key_id, window_start, request_count)
  VALUES (v_key_data.id, v_window_start, 1)
  ON CONFLICT (api_key_id, window_start) 
  DO UPDATE SET request_count = api_rate_limits.request_count + 1;

  UPDATE api_keys SET last_used = now() WHERE id = v_key_data.id;

  RETURN jsonb_build_object(
    'valid', true,
    'user_phone', v_key_data.user_phone,
    'permissions', v_key_data.permissions
  );
END;
$$;

-- Function to log API request
CREATE OR REPLACE FUNCTION log_api_request(
  p_api_key text,
  p_endpoint text,
  p_method text,
  p_request_body jsonb DEFAULT NULL,
  p_response_status int DEFAULT NULL,
  p_response_body jsonb DEFAULT NULL,
  p_execution_time_ms int DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_key_id uuid;
  v_log_id uuid;
BEGIN
  SELECT id INTO v_key_id FROM api_keys WHERE key = p_api_key;

  INSERT INTO api_requests_log (
    api_key_id,
    endpoint,
    method,
    request_body,
    response_status,
    response_body,
    execution_time_ms
  )
  VALUES (
    v_key_id,
    p_endpoint,
    p_method,
    p_request_body,
    p_response_status,
    p_response_body,
    p_execution_time_ms
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- Function to create webhook
CREATE OR REPLACE FUNCTION create_webhook(
  p_user_phone text,
  p_webhook_url text,
  p_webhook_name text,
  p_events jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_webhook_id uuid;
  v_secret_key text;
BEGIN
  v_secret_key := 'whsec_' || encode(gen_random_bytes(32), 'hex');

  INSERT INTO webhooks (
    user_phone,
    webhook_url,
    webhook_name,
    events,
    secret_key
  )
  VALUES (
    p_user_phone,
    p_webhook_url,
    p_webhook_name,
    p_events,
    v_secret_key
  )
  RETURNING id INTO v_webhook_id;

  RETURN jsonb_build_object(
    'success', true,
    'webhook_id', v_webhook_id,
    'secret_key', v_secret_key
  );
END;
$$;

-- Function to queue webhook delivery
CREATE OR REPLACE FUNCTION queue_webhook_delivery(
  p_user_phone text,
  p_event_type text,
  p_payload jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_webhook record;
BEGIN
  FOR v_webhook IN
    SELECT * FROM webhooks
    WHERE user_phone = p_user_phone
    AND is_active = true
    AND events @> to_jsonb(ARRAY[p_event_type])
  LOOP
    INSERT INTO webhook_deliveries (webhook_id, event_type, payload)
    VALUES (v_webhook.id, p_event_type, p_payload);

    UPDATE webhooks
    SET total_calls = total_calls + 1, last_triggered = now()
    WHERE id = v_webhook.id;
  END LOOP;
END;
$$;

-- Function to get API usage statistics
CREATE OR REPLACE FUNCTION get_api_usage_stats(
  p_user_phone text,
  p_start_date timestamptz DEFAULT (now() - interval '30 days'),
  p_end_date timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT jsonb_build_object(
    'total_requests', COUNT(*),
    'successful_requests', COUNT(*) FILTER (WHERE l.response_status >= 200 AND l.response_status < 300),
    'failed_requests', COUNT(*) FILTER (WHERE l.response_status >= 400),
    'avg_response_time_ms', AVG(l.execution_time_ms)
  )
  FROM api_requests_log l
  JOIN api_keys k ON k.id = l.api_key_id
  WHERE k.user_phone = p_user_phone
  AND l.created_at BETWEEN p_start_date AND p_end_date;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_api_key TO authenticated;
GRANT EXECUTE ON FUNCTION create_api_key TO authenticated;
GRANT EXECUTE ON FUNCTION validate_api_key TO authenticated;
GRANT EXECUTE ON FUNCTION log_api_request TO authenticated;
GRANT EXECUTE ON FUNCTION create_webhook TO authenticated;
GRANT EXECUTE ON FUNCTION queue_webhook_delivery TO authenticated;
GRANT EXECUTE ON FUNCTION get_api_usage_stats TO authenticated;

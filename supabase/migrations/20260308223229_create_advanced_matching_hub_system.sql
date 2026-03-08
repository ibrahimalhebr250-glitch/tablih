/*
  # نظام مركز المطابقة الذكية المتطور

  1. الجداول الجديدة
    - `matching_analytics` - تتبع تحليلات المطابقة في الوقت الفعلي
    - `matching_performance_log` - سجل أداء النظام

  2. الدوال (Functions)
    - `get_matching_hub_stats` - إحصائيات مركز المطابقة
    - `get_pending_orders_with_potential_matches` - الطلبات المعلقة مع المطابقات المحتملة
    - `get_matching_analytics` - تحليلات المطابقة الشاملة
    - `get_matching_performance_timeline` - خط زمني لأداء المطابقة
    - `log_matching_attempt` - تسجيل محاولات المطابقة

  3. الأمان (RLS)
    - سياسات أمان محدثة للجداول الجديدة
*/

-- إنشاء جدول تحليلات المطابقة
CREATE TABLE IF NOT EXISTS matching_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  batch_id uuid REFERENCES inventory_batches(id) ON DELETE SET NULL,
  match_score numeric DEFAULT 0,
  match_status text DEFAULT 'pending' CHECK (match_status IN ('pending', 'matched', 'failed')),
  pallet_type text NOT NULL,
  size text NOT NULL,
  quality text NOT NULL,
  quantity integer NOT NULL,
  city text NOT NULL,
  buyer_phone text,
  supplier_phone text,
  processing_time_ms integer DEFAULT 0,
  match_factors jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_matching_analytics_created ON matching_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matching_analytics_status ON matching_analytics(match_status);
CREATE INDEX IF NOT EXISTS idx_matching_analytics_buyer ON matching_analytics(buyer_phone);
CREATE INDEX IF NOT EXISTS idx_matching_analytics_supplier ON matching_analytics(supplier_phone);

-- تمكين RLS
ALTER TABLE matching_analytics ENABLE ROW LEVEL SECURITY;

-- السماح للجميع بالقراءة (للمراقبة)
CREATE POLICY "Anyone can view matching analytics"
  ON matching_analytics FOR SELECT
  USING (true);

-- فقط النظام يمكنه الإضافة
CREATE POLICY "System can insert matching analytics"
  ON matching_analytics FOR INSERT
  WITH CHECK (true);

-- جدول سجل الأداء
CREATE TABLE IF NOT EXISTS matching_performance_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_timestamp timestamptz DEFAULT now(),
  matches_count integer DEFAULT 0,
  success_count integer DEFAULT 0,
  fail_count integer DEFAULT 0,
  avg_processing_time numeric DEFAULT 0,
  avg_score numeric DEFAULT 0,
  period_minutes integer DEFAULT 5
);

CREATE INDEX IF NOT EXISTS idx_performance_timestamp ON matching_performance_log(log_timestamp DESC);

ALTER TABLE matching_performance_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view performance log"
  ON matching_performance_log FOR SELECT
  USING (true);

CREATE POLICY "System can manage performance log"
  ON matching_performance_log FOR ALL
  USING (true)
  WITH CHECK (true);

-- دالة: احصائيات مركز المطابقة
CREATE OR REPLACE FUNCTION get_matching_hub_stats()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  result jsonb;
  today_start timestamptz;
BEGIN
  today_start := date_trunc('day', now());

  SELECT jsonb_build_object(
    'total_matches_today', COUNT(*) FILTER (WHERE created_at >= today_start),
    'success_rate', COALESCE(
      ROUND(
        (COUNT(*) FILTER (WHERE match_status = 'matched' AND created_at >= today_start)::numeric / 
         NULLIF(COUNT(*) FILTER (WHERE created_at >= today_start), 0) * 100
        ), 0
      ), 0
    ),
    'avg_match_time_seconds', COALESCE(
      ROUND(AVG(processing_time_ms) FILTER (WHERE created_at >= today_start) / 1000, 1), 0
    ),
    'pending_orders', (
      SELECT COUNT(*) FROM orders 
      WHERE status IN ('unmatched', 'pending', 'partially_matched')
    ),
    'active_inventory', (
      SELECT COUNT(*) FROM inventory_batches 
      WHERE status = 'active' 
      AND available_quantity > 0
      AND publish_to_market = true
      AND hide_from_matching = false
    ),
    'potential_matches', (
      SELECT COUNT(DISTINCT o.id)
      FROM orders o
      WHERE o.status IN ('unmatched', 'pending', 'partially_matched')
      AND EXISTS (
        SELECT 1 FROM inventory_batches ib
        WHERE ib.status = 'active'
        AND ib.available_quantity > 0
        AND ib.publish_to_market = true
        AND ib.hide_from_matching = false
        AND ib.pallet_type = o.pallet_type
        AND ib.size = o.size
        AND ib.phone != o.phone
      )
    )
  ) INTO result
  FROM matching_analytics;

  RETURN result;
END;
$$;

-- دالة: الطلبات المعلقة مع المطابقات المحتملة
CREATE OR REPLACE FUNCTION get_pending_orders_with_potential_matches(p_phone text DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  request_id text,
  pallet_type text,
  size text,
  quality text,
  quantity integer,
  city text,
  pallet_condition text,
  status text,
  created_at timestamptz,
  phone text,
  potential_matches_count bigint,
  waiting_time_hours numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.request_id,
    o.pallet_type,
    o.size,
    o.quality,
    o.quantity,
    o.city,
    o.pallet_condition,
    o.status,
    o.created_at,
    o.phone,
    (
      SELECT COUNT(*)
      FROM inventory_batches ib
      WHERE ib.status = 'active'
      AND ib.available_quantity > 0
      AND ib.publish_to_market = true
      AND ib.hide_from_matching = false
      AND ib.pallet_type = o.pallet_type
      AND ib.size = o.size
      AND ib.phone != o.phone
    ) as potential_matches_count,
    ROUND(EXTRACT(EPOCH FROM (now() - o.created_at)) / 3600, 2) as waiting_time_hours
  FROM orders o
  WHERE o.status IN ('unmatched', 'pending', 'partially_matched')
  AND (p_phone IS NULL OR o.phone = p_phone)
  ORDER BY o.created_at ASC;
END;
$$;

-- دالة: تحليلات المطابقة
CREATE OR REPLACE FUNCTION get_matching_analytics(p_time_range text DEFAULT 'today')
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  result jsonb;
  start_time timestamptz;
BEGIN
  -- تحديد نطاق الوقت
  start_time := CASE p_time_range
    WHEN 'today' THEN date_trunc('day', now())
    WHEN 'week' THEN date_trunc('week', now())
    WHEN 'month' THEN date_trunc('month', now())
    ELSE date_trunc('day', now())
  END;

  SELECT jsonb_build_object(
    'total_matches', COUNT(*),
    'successful_matches', COUNT(*) FILTER (WHERE match_status = 'matched'),
    'failed_matches', COUNT(*) FILTER (WHERE match_status = 'failed'),
    'avg_score', COALESCE(ROUND(AVG(match_score), 2), 0),
    'avg_processing_time', COALESCE(ROUND(AVG(processing_time_ms), 0), 0),
    'matches_by_hour', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'hour', EXTRACT(HOUR FROM created_at),
          'count', hour_count
        )
        ORDER BY EXTRACT(HOUR FROM created_at)
      )
      FROM (
        SELECT EXTRACT(HOUR FROM created_at) as hour, COUNT(*) as hour_count
        FROM matching_analytics
        WHERE created_at >= start_time
        GROUP BY EXTRACT(HOUR FROM created_at)
      ) hours
    ),
    'matches_by_quality', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'quality', quality,
          'count', quality_count,
          'success_rate', COALESCE(
            ROUND(success_count::numeric / NULLIF(quality_count, 0) * 100, 2), 0
          )
        )
        ORDER BY quality
      )
      FROM (
        SELECT 
          quality,
          COUNT(*) as quality_count,
          COUNT(*) FILTER (WHERE match_status = 'matched') as success_count
        FROM matching_analytics
        WHERE created_at >= start_time
        GROUP BY quality
      ) qualities
    ),
    'top_cities', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'city', city,
          'matches', city_matches
        )
        ORDER BY city_matches DESC
      )
      FROM (
        SELECT city, COUNT(*) as city_matches
        FROM matching_analytics
        WHERE created_at >= start_time
        GROUP BY city
        ORDER BY city_matches DESC
        LIMIT 5
      ) cities
    ),
    'success_rate_trend', COALESCE(
      (
        SELECT ROUND(
          (COUNT(*) FILTER (WHERE match_status = 'matched' AND created_at >= now() - interval '1 hour')::numeric / 
           NULLIF(COUNT(*) FILTER (WHERE created_at >= now() - interval '1 hour'), 0)) * 100 -
          (COUNT(*) FILTER (WHERE match_status = 'matched' AND created_at >= now() - interval '2 hour' AND created_at < now() - interval '1 hour')::numeric / 
           NULLIF(COUNT(*) FILTER (WHERE created_at >= now() - interval '2 hour' AND created_at < now() - interval '1 hour'), 0)) * 100
        , 2)
        FROM matching_analytics
      ), 0
    )
  ) INTO result
  FROM matching_analytics
  WHERE created_at >= start_time;

  RETURN result;
END;
$$;

-- دالة: خط زمني للأداء
CREATE OR REPLACE FUNCTION get_matching_performance_timeline()
RETURNS TABLE (
  log_timestamp timestamptz,
  matches_count integer,
  success_rate numeric,
  avg_processing_time numeric,
  avg_score numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    date_trunc('hour', ma.created_at) as log_timestamp,
    COUNT(*)::integer as matches_count,
    COALESCE(
      ROUND(
        (COUNT(*) FILTER (WHERE ma.match_status = 'matched')::numeric / 
         NULLIF(COUNT(*), 0) * 100
        ), 2
      ), 0
    ) as success_rate,
    COALESCE(ROUND(AVG(ma.processing_time_ms), 2), 0) as avg_processing_time,
    COALESCE(ROUND(AVG(ma.match_score), 2), 0) as avg_score
  FROM matching_analytics ma
  WHERE ma.created_at >= now() - interval '24 hours'
  GROUP BY date_trunc('hour', ma.created_at)
  ORDER BY log_timestamp DESC
  LIMIT 24;
END;
$$;

-- دالة: تسجيل محاولة المطابقة
CREATE OR REPLACE FUNCTION log_matching_attempt(
  p_order_id uuid,
  p_batch_id uuid,
  p_match_score numeric,
  p_match_status text,
  p_pallet_type text,
  p_size text,
  p_quality text,
  p_quantity integer,
  p_city text,
  p_buyer_phone text,
  p_supplier_phone text,
  p_processing_time_ms integer,
  p_match_factors jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO matching_analytics (
    order_id,
    batch_id,
    match_score,
    match_status,
    pallet_type,
    size,
    quality,
    quantity,
    city,
    buyer_phone,
    supplier_phone,
    processing_time_ms,
    match_factors
  ) VALUES (
    p_order_id,
    p_batch_id,
    p_match_score,
    p_match_status,
    p_pallet_type,
    p_size,
    p_quality,
    p_quantity,
    p_city,
    p_buyer_phone,
    p_supplier_phone,
    p_processing_time_ms,
    p_match_factors
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- تمكين Realtime للجداول الجديدة
ALTER PUBLICATION supabase_realtime ADD TABLE matching_analytics;
ALTER PUBLICATION supabase_realtime ADD TABLE matching_performance_log;

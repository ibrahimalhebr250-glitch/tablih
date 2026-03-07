/*
  # نظام المطابقة الفورية المتطور والمبتكر

  1. الأهداف
    - مطابقة فورية 100% عند إنشاء أي طلب أو مخزون
    - معالجة ذكية لجميع الحالات (مرونة المدينة، الجودة، التوصيل الجزئي)
    - نظام تسجيل شامل لتتبع المطابقات
    - معالجة الطلبات المعلقة بشكل دوري وتلقائي
    - دعم حالة الطبلية (Pallet Condition)
    - أداء عالي وسرعة استجابة فورية

  2. المميزات
    - توحيد متقدم للمصطلحات (عربي/إنجليزي)
    - ترتيب ذكي للأولويات (مدينة، سعر، جودة، وقت)
    - معالجة التوصيل الجزئي بذكاء
    - منع التكرار والمطابقة الذاتية
    - نظام تسجيل مفصل
    - إشعارات ذكية

  3. الأمان
    - SECURITY DEFINER للدوال الحساسة
    - RLS محكم على الجداول
    - التحقق من الصلاحيات
*/

-- ================================================================
-- 1. جدول سجل المطابقات (Matching Log)
-- ================================================================
CREATE TABLE IF NOT EXISTS matching_attempts_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  batch_id uuid REFERENCES inventory_batches(id) ON DELETE CASCADE,
  attempt_time timestamptz DEFAULT now(),
  matched boolean DEFAULT false,
  match_score int DEFAULT 0,
  reason text,
  deal_id uuid REFERENCES deals(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE matching_attempts_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view matching log"
  ON matching_attempts_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM session_tokens st
      JOIN platform_users pu ON pu.phone = st.phone
      WHERE st.expires_at > now()
        AND pu.user_type = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_matching_log_order ON matching_attempts_log(order_id, attempt_time DESC);
CREATE INDEX IF NOT EXISTS idx_matching_log_batch ON matching_attempts_log(batch_id, attempt_time DESC);
CREATE INDEX IF NOT EXISTS idx_matching_log_matched ON matching_attempts_log(matched, attempt_time DESC);

-- ================================================================
-- 2. جدول حالة الطبلية (Pallet Condition Mappings)
-- ================================================================
CREATE TABLE IF NOT EXISTS pallet_condition_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  input_value text NOT NULL UNIQUE,
  normalized_value text NOT NULL,
  display_name_ar text NOT NULL,
  display_name_en text NOT NULL,
  score int DEFAULT 50,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pallet_condition_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read condition mappings"
  ON pallet_condition_mappings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage condition mappings"
  ON pallet_condition_mappings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM session_tokens st
      JOIN platform_users pu ON pu.phone = st.phone
      WHERE st.expires_at > now()
        AND pu.user_type = 'admin'
    )
  );

-- إضافة حالات الطبلية الشائعة
INSERT INTO pallet_condition_mappings (input_value, normalized_value, display_name_ar, display_name_en, score) VALUES
  ('new', 'new', 'جديدة', 'New', 100),
  ('جديدة', 'new', 'جديدة', 'New', 100),
  ('جديد', 'new', 'جديدة', 'New', 100),
  ('used_good', 'used_good', 'مستعملة - حالة جيدة', 'Used - Good', 80),
  ('مستعملة جيدة', 'used_good', 'مستعملة - حالة جيدة', 'Used - Good', 80),
  ('used_fair', 'used_fair', 'مستعملة - حالة متوسطة', 'Used - Fair', 60),
  ('مستعملة متوسطة', 'used_fair', 'مستعملة - حالة متوسطة', 'Used - Fair', 60),
  ('used_poor', 'used_poor', 'مستعملة - حالة سيئة', 'Used - Poor', 40),
  ('مستعملة سيئة', 'used_poor', 'مستعملة - حالة سيئة', 'Used - Poor', 40),
  ('refurbished', 'refurbished', 'مجددة', 'Refurbished', 90),
  ('مجددة', 'refurbished', 'مجددة', 'Refurbished', 90)
ON CONFLICT (input_value) DO UPDATE
  SET normalized_value = EXCLUDED.normalized_value,
      display_name_ar = EXCLUDED.display_name_ar,
      display_name_en = EXCLUDED.display_name_en,
      score = EXCLUDED.score;

-- ================================================================
-- 3. دالة توحيد حالة الطبلية
-- ================================================================
CREATE OR REPLACE FUNCTION normalize_pallet_condition(p_condition text)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_normalized text;
  v_cleaned text;
BEGIN
  IF p_condition IS NULL THEN
    RETURN 'used_good';
  END IF;

  v_cleaned := LOWER(TRIM(REGEXP_REPLACE(p_condition, '\s+', ' ', 'g')));

  SELECT normalized_value INTO v_normalized
  FROM pallet_condition_mappings
  WHERE LOWER(TRIM(input_value)) = v_cleaned
  LIMIT 1;

  IF v_normalized IS NOT NULL THEN
    RETURN v_normalized;
  END IF;

  RETURN 'used_good';
END;
$$;

-- ================================================================
-- 4. دالة حساب درجة المطابقة (Match Score) - حذف ثم إعادة إنشاء
-- ================================================================
DROP FUNCTION IF EXISTS calculate_match_score(uuid, uuid);

CREATE FUNCTION calculate_match_score(
  p_order_id uuid,
  p_batch_id uuid
)
RETURNS int
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_order RECORD;
  v_batch RECORD;
  v_score int := 0;
  v_quality_order jsonb := '{"A": 4, "B": 3, "C": 2, "Scrap": 1}'::jsonb;
  v_order_q int;
  v_batch_q int;
  v_order_condition_score int;
  v_batch_condition_score int;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  SELECT * INTO v_batch FROM inventory_batches WHERE id = p_batch_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  -- 1. مطابقة النوع (40 نقطة)
  IF normalize_pallet_type(v_batch.pallet_type) = normalize_pallet_type(v_order.pallet_type) THEN
    v_score := v_score + 40;
  END IF;

  -- 2. مطابقة المقاس (30 نقطة)
  IF TRIM(v_batch.size) = TRIM(v_order.size) THEN
    v_score := v_score + 30;
  END IF;

  -- 3. مطابقة المدينة (15 نقطة)
  IF TRIM(v_batch.city) = TRIM(v_order.city) THEN
    v_score := v_score + 15;
  ELSIF v_order.accept_close_city THEN
    v_score := v_score + 5;
  END IF;

  -- 4. مطابقة الجودة (10 نقاط)
  v_order_q := COALESCE((v_quality_order->>v_order.quality)::int, 0);
  v_batch_q := COALESCE((v_quality_order->>v_batch.quality)::int, 0);

  IF v_batch.quality = v_order.quality THEN
    v_score := v_score + 10;
  ELSIF v_order.accept_close_quality AND v_batch_q >= v_order_q THEN
    v_score := v_score + 5;
  ELSIF NOT v_order.accept_close_quality AND v_batch_q < v_order_q THEN
    RETURN 0;
  END IF;

  -- 5. مطابقة حالة الطبلية (5 نقاط)
  SELECT score INTO v_order_condition_score
  FROM pallet_condition_mappings
  WHERE normalized_value = normalize_pallet_condition(v_order.pallet_condition)
  LIMIT 1;

  SELECT score INTO v_batch_condition_score
  FROM pallet_condition_mappings
  WHERE normalized_value = normalize_pallet_condition(v_batch.pallet_condition)
  LIMIT 1;

  IF v_batch_condition_score >= COALESCE(v_order_condition_score, 50) THEN
    v_score := v_score + 5;
  END IF;

  RETURN v_score;
END;
$$;

-- ================================================================
-- 5. محرك المطابقة الفورية المتطور
-- ================================================================
CREATE OR REPLACE FUNCTION instant_match_engine(
  p_trigger_type text,
  p_trigger_id uuid,
  p_max_matches int DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_batch RECORD;
  v_matched_qty int;
  v_deal_result jsonb;
  v_matches_count int := 0;
  v_total_checked int := 0;
  v_errors jsonb := '[]'::jsonb;
  v_match_score int;
  v_remaining_qty int;
  v_deals_created jsonb := '[]'::jsonb;
BEGIN
  IF p_trigger_type = 'order' THEN
    SELECT * INTO v_order FROM orders WHERE id = p_trigger_id;

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
        AND normalize_pallet_type(ib.pallet_type) = normalize_pallet_type(v_order.pallet_type)
        AND TRIM(ib.size) = TRIM(v_order.size)
        AND ib.phone IS DISTINCT FROM v_order.phone
        AND calculate_match_score(v_order.id, ib.id) >= 70
      ORDER BY
        calculate_match_score(v_order.id, ib.id) DESC,
        CASE WHEN TRIM(ib.city) = TRIM(v_order.city) THEN 1 ELSE 2 END,
        ib.price_per_pallet ASC,
        ib.created_at ASC
      LIMIT p_max_matches
    LOOP
      v_total_checked := v_total_checked + 1;

      IF v_order.accept_partial_delivery THEN
        v_matched_qty := LEAST(v_remaining_qty, v_batch.available_quantity);
      ELSE
        IF v_batch.available_quantity >= v_remaining_qty THEN
          v_matched_qty := v_remaining_qty;
        ELSE
          INSERT INTO matching_attempts_log (
            order_id, batch_id, matched, match_score, reason, metadata
          ) VALUES (
            v_order.id, v_batch.id, false, v_batch.match_score,
            'insufficient_quantity',
            jsonb_build_object(
              'required', v_remaining_qty,
              'available', v_batch.available_quantity,
              'partial_allowed', v_order.accept_partial_delivery
            )
          );
          CONTINUE;
        END IF;
      END IF;

      IF v_matched_qty > 0 THEN
        BEGIN
          v_deal_result := create_deal_with_reservation_v6(
            v_order.id,
            v_batch.id,
            v_order.phone,
            v_batch.phone,
            v_matched_qty
          );

          IF (v_deal_result->>'success')::boolean THEN
            v_matches_count := v_matches_count + 1;
            v_remaining_qty := v_remaining_qty - v_matched_qty;
            v_deals_created := v_deals_created || v_deal_result->'deal_id';

            INSERT INTO matching_attempts_log (
              order_id, batch_id, matched, match_score, reason, deal_id, metadata
            ) VALUES (
              v_order.id, v_batch.id, true, v_batch.match_score,
              'matched_successfully',
              (v_deal_result->>'deal_id')::uuid,
              jsonb_build_object(
                'matched_quantity', v_matched_qty,
                'price_per_pallet', v_batch.price_per_pallet
              )
            );

            IF v_remaining_qty <= 0 THEN
              EXIT;
            END IF;
          ELSE
            INSERT INTO matching_attempts_log (
              order_id, batch_id, matched, match_score, reason, metadata
            ) VALUES (
              v_order.id, v_batch.id, false, v_batch.match_score,
              'deal_creation_failed',
              jsonb_build_object('error', v_deal_result->>'error')
            );

            v_errors := v_errors || v_deal_result;
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

  ELSIF p_trigger_type = 'inventory' THEN
    SELECT * INTO v_batch FROM inventory_batches WHERE id = p_trigger_id;

    IF NOT FOUND OR v_batch.status != 'active' OR v_batch.available_quantity <= 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'batch_not_found_or_unavailable'
      );
    END IF;

    v_remaining_qty := v_batch.available_quantity;

    FOR v_order IN
      SELECT
        o.*,
        calculate_match_score(o.id, v_batch.id) as match_score,
        (o.quantity - COALESCE(o.matched_quantity, 0)) as remaining_qty
      FROM orders o
      WHERE o.status IN ('unmatched', 'partially_matched')
        AND normalize_pallet_type(o.pallet_type) = normalize_pallet_type(v_batch.pallet_type)
        AND TRIM(o.size) = TRIM(v_batch.size)
        AND o.phone IS DISTINCT FROM v_batch.phone
        AND (o.quantity - COALESCE(o.matched_quantity, 0)) > 0
        AND calculate_match_score(o.id, v_batch.id) >= 70
      ORDER BY
        calculate_match_score(o.id, v_batch.id) DESC,
        CASE WHEN TRIM(o.city) = TRIM(v_batch.city) THEN 1 ELSE 2 END,
        o.created_at ASC
      LIMIT p_max_matches
    LOOP
      v_total_checked := v_total_checked + 1;

      IF v_order.accept_partial_delivery THEN
        v_matched_qty := LEAST(v_order.remaining_qty, v_remaining_qty);
      ELSE
        IF v_remaining_qty >= v_order.remaining_qty THEN
          v_matched_qty := v_order.remaining_qty;
        ELSE
          INSERT INTO matching_attempts_log (
            order_id, batch_id, matched, match_score, reason, metadata
          ) VALUES (
            v_order.id, v_batch.id, false, v_order.match_score,
            'insufficient_quantity',
            jsonb_build_object(
              'required', v_order.remaining_qty,
              'available', v_remaining_qty,
              'partial_allowed', v_order.accept_partial_delivery
            )
          );
          CONTINUE;
        END IF;
      END IF;

      IF v_matched_qty > 0 THEN
        BEGIN
          v_deal_result := create_deal_with_reservation_v6(
            v_order.id,
            v_batch.id,
            v_order.phone,
            v_batch.phone,
            v_matched_qty
          );

          IF (v_deal_result->>'success')::boolean THEN
            v_matches_count := v_matches_count + 1;
            v_remaining_qty := v_remaining_qty - v_matched_qty;
            v_deals_created := v_deals_created || v_deal_result->'deal_id';

            INSERT INTO matching_attempts_log (
              order_id, batch_id, matched, match_score, reason, deal_id, metadata
            ) VALUES (
              v_order.id, v_batch.id, true, v_order.match_score,
              'matched_successfully',
              (v_deal_result->>'deal_id')::uuid,
              jsonb_build_object(
                'matched_quantity', v_matched_qty,
                'price_per_pallet', v_batch.price_per_pallet
              )
            );

            IF v_remaining_qty <= 0 THEN
              EXIT;
            END IF;
          ELSE
            INSERT INTO matching_attempts_log (
              order_id, batch_id, matched, match_score, reason, metadata
            ) VALUES (
              v_order.id, v_batch.id, false, v_order.match_score,
              'deal_creation_failed',
              jsonb_build_object('error', v_deal_result->>'error')
            );

            v_errors := v_errors || v_deal_result;
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
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'trigger_type', p_trigger_type,
    'trigger_id', p_trigger_id,
    'total_checked', v_total_checked,
    'matches_created', v_matches_count,
    'deals_created', v_deals_created,
    'errors', v_errors
  );
END;
$$;

-- ================================================================
-- 6. Triggers للمطابقة الفورية
-- ================================================================

DROP TRIGGER IF EXISTS on_order_insert_instant_match ON orders;
DROP TRIGGER IF EXISTS on_batch_insert_instant_match ON inventory_batches;
DROP TRIGGER IF EXISTS on_inventory_insert_match_orders ON inventory_batches;

CREATE OR REPLACE FUNCTION trigger_instant_match_on_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'unmatched' THEN
    PERFORM instant_match_engine('order', NEW.id, 20);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_order_insert_instant_match
  AFTER INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.status = 'unmatched')
  EXECUTE FUNCTION trigger_instant_match_on_new_order();

CREATE OR REPLACE FUNCTION trigger_instant_match_on_new_batch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'active' AND NEW.available_quantity > 0 THEN
    PERFORM instant_match_engine('inventory', NEW.id, 20);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_batch_insert_instant_match
  AFTER INSERT ON inventory_batches
  FOR EACH ROW
  WHEN (NEW.status = 'active' AND NEW.available_quantity > 0)
  EXECUTE FUNCTION trigger_instant_match_on_new_batch();

-- ================================================================
-- 7. دالة معالجة دورية للطلبات المعلقة
-- ================================================================
CREATE OR REPLACE FUNCTION process_pending_orders_batch()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_result jsonb;
  v_total_processed int := 0;
  v_total_matched int := 0;
  v_results jsonb := '[]'::jsonb;
BEGIN
  FOR v_order IN
    SELECT id
    FROM orders
    WHERE status IN ('unmatched', 'partially_matched')
      AND (quantity - COALESCE(matched_quantity, 0)) > 0
    ORDER BY created_at ASC
    LIMIT 50
  LOOP
    v_result := instant_match_engine('order', v_order.id, 10);
    v_total_processed := v_total_processed + 1;

    IF (v_result->>'matches_created')::int > 0 THEN
      v_total_matched := v_total_matched + 1;
    END IF;

    v_results := v_results || jsonb_build_object(
      'order_id', v_order.id,
      'matches', v_result->>'matches_created'
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'total_processed', v_total_processed,
    'total_matched', v_total_matched,
    'results', v_results,
    'timestamp', now()
  );
END;
$$;

-- ================================================================
-- 8. دالة للإدارة: تشغيل المطابقة الشاملة
-- ================================================================
CREATE OR REPLACE FUNCTION admin_run_comprehensive_matching()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM session_tokens st
    JOIN platform_users pu ON pu.phone = st.phone
    WHERE st.expires_at > now()
      AND pu.user_type = 'admin'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  v_result := process_pending_orders_batch();

  RETURN v_result;
END;
$$;

-- ================================================================
-- 9. دالة عرض إحصائيات المطابقة
-- ================================================================
CREATE OR REPLACE FUNCTION get_matching_statistics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'pending_orders', (
      SELECT COUNT(*)
      FROM orders
      WHERE status IN ('unmatched', 'partially_matched')
    ),
    'available_inventory', (
      SELECT COUNT(*)
      FROM inventory_batches
      WHERE status = 'active' AND available_quantity > 0
    ),
    'total_matches_today', (
      SELECT COUNT(*)
      FROM matching_attempts_log
      WHERE matched = true AND attempt_time >= CURRENT_DATE
    ),
    'failed_attempts_today', (
      SELECT COUNT(*)
      FROM matching_attempts_log
      WHERE matched = false AND attempt_time >= CURRENT_DATE
    ),
    'success_rate_today', (
      SELECT CASE
        WHEN COUNT(*) = 0 THEN 0
        ELSE ROUND((COUNT(*) FILTER (WHERE matched = true) * 100.0) / COUNT(*), 2)
      END
      FROM matching_attempts_log
      WHERE attempt_time >= CURRENT_DATE
    ),
    'avg_match_score', (
      SELECT ROUND(AVG(match_score), 2)
      FROM matching_attempts_log
      WHERE matched = true AND attempt_time >= CURRENT_DATE
    )
  ) INTO v_stats;

  RETURN v_stats;
END;
$$;

-- ================================================================
-- 10. فهارس للأداء العالي
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_orders_matching_status
  ON orders(status, created_at)
  WHERE status IN ('unmatched', 'partially_matched');

CREATE INDEX IF NOT EXISTS idx_inventory_active_available
  ON inventory_batches(status, available_quantity, created_at)
  WHERE status = 'active' AND available_quantity > 0;

CREATE INDEX IF NOT EXISTS idx_orders_type_size
  ON orders(pallet_type, size, status);

CREATE INDEX IF NOT EXISTS idx_inventory_type_size
  ON inventory_batches(pallet_type, size, status, available_quantity);

CREATE INDEX IF NOT EXISTS idx_orders_city_status
  ON orders(city, status)
  WHERE status IN ('unmatched', 'partially_matched');

CREATE INDEX IF NOT EXISTS idx_inventory_city_status
  ON inventory_batches(city, status, available_quantity);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE matching_attempts_log;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;
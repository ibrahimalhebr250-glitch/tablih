/*
  # إعادة بناء محرك المطابقة الذكي - الجيل الثالث

  ## المشاكل في النظام القديم
  1. Triggers متعددة متضاربة تعمل في وقت واحد (3 triggers تتنافس)
  2. نظام نقاط بسيط (exact match فقط)
  3. لا يتعلم من التاريخ
  4. لا يدعم المرونة الحقيقية
  5. لا يوجد ترتيب أولويات ذكي

  ## الحل الجديد - محرك واحد متكامل
  1. إزالة جميع Triggers القديمة المتضاربة
  2. محرك تقييم متعدد العوامل (8 عوامل) مع أوزان مدروسة
  3. نظام أولويات ذكي (عمر الطلب + حجم + تاريخ المشتري)
  4. مطابقة جزئية حقيقية من عدة موردين (Multi-Batch)
  5. تسجيل شامل لكل خطوة
  6. قفل ذري يمنع التضارب (advisory locks)

  ## الجداول المعدلة
  - matching_analytics: أعمدة جديدة (engine_version, trigger_source, candidates_evaluated, deal_id, score_breakdown)

  ## الدوال الجديدة
  - ai_score_match(): حساب النقاط متعدد العوامل (8 عوامل مرجحة)
  - ai_order_priority(): ترتيب أولويات الطلبات
  - ai_match_engine(): المحرك الرئيسي الموحد (اتجاهين)
  - ai_preview_matches(): معاينة المرشحين بدون إنشاء صفقات
  - ai_bulk_match_all_pending(): مطابقة جماعية
  - manual_match_existing_orders(): مطابقة يدوية محسنة
  - get_matching_hub_stats(): إحصائيات محدثة
  - get_pending_orders_with_potential_matches(): طلبات معلقة مع تفاصيل
  - get_matching_analytics(): تحليلات متقدمة

  ## الأمان
  - advisory locks لمنع التضارب بين العمليات المتزامنة
  - SECURITY DEFINER على الدوال الحساسة
  - تسجيل كامل للأخطاء والنجاحات
*/

-- ==================================================================
-- الخطوة 1: إزالة جميع Triggers القديمة المتضاربة
-- ==================================================================

DROP TRIGGER IF EXISTS auto_match_inventory_trigger ON inventory_batches;
DROP TRIGGER IF EXISTS on_inventory_insert_match_orders ON inventory_batches;
DROP TRIGGER IF EXISTS on_batch_insert_instant_match ON inventory_batches;
DROP TRIGGER IF EXISTS trigger_auto_match_on_inventory ON inventory_batches;
DROP TRIGGER IF EXISTS trigger_match_on_new_inventory ON inventory_batches;
DROP TRIGGER IF EXISTS trigger_log_deal_creation ON deals;

DROP TRIGGER IF EXISTS on_order_insert_instant_match ON orders;
DROP TRIGGER IF EXISTS trigger_instant_match_on_new_order ON orders;

-- ==================================================================
-- الخطوة 2: إضافة أعمدة تحليل متقدمة
-- ==================================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matching_analytics' AND column_name = 'engine_version'
  ) THEN
    ALTER TABLE matching_analytics ADD COLUMN engine_version text DEFAULT 'v3';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matching_analytics' AND column_name = 'trigger_source'
  ) THEN
    ALTER TABLE matching_analytics ADD COLUMN trigger_source text DEFAULT 'unknown';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matching_analytics' AND column_name = 'candidates_evaluated'
  ) THEN
    ALTER TABLE matching_analytics ADD COLUMN candidates_evaluated integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matching_analytics' AND column_name = 'deal_id'
  ) THEN
    ALTER TABLE matching_analytics ADD COLUMN deal_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matching_analytics' AND column_name = 'score_breakdown'
  ) THEN
    ALTER TABLE matching_analytics ADD COLUMN score_breakdown jsonb DEFAULT '{}';
  END IF;
END $$;

-- ==================================================================
-- الخطوة 3: دالة حساب النقاط الذكية متعددة العوامل
-- ==================================================================

CREATE OR REPLACE FUNCTION ai_score_match(
  p_order RECORD,
  p_batch RECORD
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  type_score numeric := 0;
  size_score numeric := 0;
  quality_score numeric := 0;
  city_score numeric := 0;
  condition_score numeric := 0;
  quantity_score numeric := 0;
  freshness_score numeric := 0;
  supplier_score numeric := 0;

  w_type numeric := 25;
  w_size numeric := 20;
  w_quality numeric := 15;
  w_city numeric := 15;
  w_condition numeric := 8;
  w_quantity numeric := 7;
  w_freshness numeric := 5;
  w_supplier numeric := 5;

  total_score numeric := 0;
  is_eligible boolean := true;

  v_normalized_order_type text;
  v_normalized_batch_type text;
  v_quality_grades text[] := ARRAY['A+', 'A', 'B+', 'B', 'C', 'scrap'];
  v_order_quality_idx integer;
  v_batch_quality_idx integer;
  v_quality_distance integer;
  v_supplier_rating numeric;
  v_batch_age_hours numeric;
  v_qty_ratio numeric;
BEGIN
  v_normalized_order_type := lower(trim(COALESCE(p_order.pallet_type, '')));
  v_normalized_batch_type := lower(trim(COALESCE(p_batch.pallet_type, '')));

  IF v_normalized_order_type IN ('خشب', 'خشبي', 'خشبية', 'wood', 'wooden') THEN
    v_normalized_order_type := 'wood';
  ELSIF v_normalized_order_type IN ('بلاستيك', 'بلاستيكي', 'بلاستيكية', 'plastic') THEN
    v_normalized_order_type := 'plastic';
  END IF;

  IF v_normalized_batch_type IN ('خشب', 'خشبي', 'خشبية', 'wood', 'wooden') THEN
    v_normalized_batch_type := 'wood';
  ELSIF v_normalized_batch_type IN ('بلاستيك', 'بلاستيكي', 'بلاستيكية', 'plastic') THEN
    v_normalized_batch_type := 'plastic';
  END IF;

  IF v_normalized_order_type = v_normalized_batch_type THEN
    type_score := 100;
  ELSIF p_order.pallet_type = p_batch.pallet_type THEN
    type_score := 100;
  ELSE
    is_eligible := false;
    type_score := 0;
  END IF;

  IF lower(trim(p_order.size)) = lower(trim(p_batch.size)) THEN
    size_score := 100;
  ELSE
    is_eligible := false;
    size_score := 0;
  END IF;

  v_order_quality_idx := array_position(v_quality_grades, lower(trim(p_order.quality)));
  v_batch_quality_idx := array_position(v_quality_grades, lower(trim(p_batch.quality)));

  IF v_order_quality_idx IS NULL THEN
    v_order_quality_idx := array_position(v_quality_grades, p_order.quality);
  END IF;
  IF v_batch_quality_idx IS NULL THEN
    v_batch_quality_idx := array_position(v_quality_grades, p_batch.quality);
  END IF;

  IF lower(trim(p_order.quality)) = lower(trim(p_batch.quality))
     OR p_order.quality = p_batch.quality THEN
    quality_score := 100;
  ELSIF v_order_quality_idx IS NOT NULL AND v_batch_quality_idx IS NOT NULL THEN
    v_quality_distance := abs(v_order_quality_idx - v_batch_quality_idx);
    IF v_quality_distance = 1 AND COALESCE(p_order.accept_close_quality, false) THEN
      quality_score := 75;
    ELSIF v_quality_distance = 1 THEN
      quality_score := 40;
    ELSIF v_quality_distance = 2 AND COALESCE(p_order.accept_close_quality, false) THEN
      quality_score := 50;
    ELSE
      is_eligible := false;
      quality_score := 0;
    END IF;
  ELSE
    IF p_order.quality = p_batch.quality THEN
      quality_score := 100;
    ELSE
      is_eligible := false;
      quality_score := 0;
    END IF;
  END IF;

  IF lower(trim(COALESCE(p_order.city, ''))) = lower(trim(COALESCE(p_batch.city, '')))
     OR p_order.city = p_batch.city THEN
    city_score := 100;
  ELSIF COALESCE(p_order.accept_close_city, false) THEN
    city_score := 50;
  ELSE
    is_eligible := false;
    city_score := 0;
  END IF;

  IF p_order.pallet_condition IS NULL OR p_order.pallet_condition = '' THEN
    condition_score := 80;
  ELSIF lower(trim(p_order.pallet_condition)) = lower(trim(COALESCE(p_batch.pallet_condition, '')))
     OR p_order.pallet_condition = p_batch.pallet_condition THEN
    condition_score := 100;
  ELSE
    condition_score := 30;
  END IF;

  IF p_batch.available_quantity >= p_order.quantity THEN
    quantity_score := 100;
  ELSIF COALESCE(p_order.accept_partial_delivery, false) THEN
    v_qty_ratio := p_batch.available_quantity::numeric / GREATEST(p_order.quantity, 1)::numeric;
    quantity_score := GREATEST(30, v_qty_ratio * 100);
  ELSE
    IF p_batch.available_quantity < p_order.quantity THEN
      quantity_score := 20;
    END IF;
  END IF;

  v_batch_age_hours := EXTRACT(EPOCH FROM (now() - p_batch.created_at)) / 3600.0;
  IF v_batch_age_hours <= 6 THEN
    freshness_score := 100;
  ELSIF v_batch_age_hours <= 24 THEN
    freshness_score := 85;
  ELSIF v_batch_age_hours <= 72 THEN
    freshness_score := 65;
  ELSIF v_batch_age_hours <= 168 THEN
    freshness_score := 45;
  ELSE
    freshness_score := 25;
  END IF;

  SELECT COALESCE(trust_rating, 3.0)
  INTO v_supplier_rating
  FROM user_profiles
  WHERE phone = p_batch.phone
  LIMIT 1;

  IF NOT FOUND THEN
    v_supplier_rating := 3.0;
  END IF;

  supplier_score := LEAST(100, (v_supplier_rating / 5.0) * 100);

  IF NOT is_eligible THEN
    total_score := 0;
  ELSE
    total_score := (
      type_score * w_type +
      size_score * w_size +
      quality_score * w_quality +
      city_score * w_city +
      condition_score * w_condition +
      quantity_score * w_quantity +
      freshness_score * w_freshness +
      supplier_score * w_supplier
    ) / 100.0;
  END IF;

  RETURN jsonb_build_object(
    'total_score', round(total_score, 2),
    'is_eligible', is_eligible,
    'breakdown', jsonb_build_object(
      'type', jsonb_build_object('score', type_score, 'weight', w_type),
      'size', jsonb_build_object('score', size_score, 'weight', w_size),
      'quality', jsonb_build_object('score', quality_score, 'weight', w_quality),
      'city', jsonb_build_object('score', city_score, 'weight', w_city),
      'condition', jsonb_build_object('score', condition_score, 'weight', w_condition),
      'quantity', jsonb_build_object('score', quantity_score, 'weight', w_quantity),
      'freshness', jsonb_build_object('score', freshness_score, 'weight', w_freshness),
      'supplier', jsonb_build_object('score', supplier_score, 'weight', w_supplier)
    ),
    'flexibility_used', jsonb_build_object(
      'close_quality', (quality_score > 0 AND quality_score < 100),
      'close_city', (city_score > 0 AND city_score < 100),
      'partial_delivery', (quantity_score > 0 AND quantity_score < 100 AND p_batch.available_quantity < p_order.quantity)
    )
  );
END;
$$;

-- ==================================================================
-- الخطوة 4: دالة أولوية الطلب
-- ==================================================================

CREATE OR REPLACE FUNCTION ai_order_priority(p_order RECORD)
RETURNS numeric
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  priority numeric := 0;
  age_hours numeric;
  v_buyer_history integer;
BEGIN
  age_hours := EXTRACT(EPOCH FROM (now() - p_order.created_at)) / 3600.0;

  IF age_hours > 48 THEN
    priority := priority + 50;
  ELSIF age_hours > 24 THEN
    priority := priority + 35;
  ELSIF age_hours > 12 THEN
    priority := priority + 20;
  ELSIF age_hours > 6 THEN
    priority := priority + 10;
  ELSE
    priority := priority + 5;
  END IF;

  IF p_order.quantity >= 100 THEN
    priority := priority + 20;
  ELSIF p_order.quantity >= 50 THEN
    priority := priority + 15;
  ELSIF p_order.quantity >= 20 THEN
    priority := priority + 10;
  ELSE
    priority := priority + 5;
  END IF;

  SELECT COUNT(*) INTO v_buyer_history
  FROM deals
  WHERE buyer_phone = p_order.phone
    AND status IN ('completed', 'delivered', 'matched', 'supplier_confirmed', 'buyer_confirmed');

  IF v_buyer_history >= 10 THEN
    priority := priority + 25;
  ELSIF v_buyer_history >= 5 THEN
    priority := priority + 15;
  ELSIF v_buyer_history >= 1 THEN
    priority := priority + 8;
  END IF;

  IF p_order.status = 'partially_matched' THEN
    priority := priority + 15;
  END IF;

  RETURN priority;
END;
$$;

-- ==================================================================
-- الخطوة 5: المحرك الرئيسي الموحد
-- ==================================================================

CREATE OR REPLACE FUNCTION ai_match_engine(
  p_trigger_type text,
  p_trigger_id uuid,
  p_max_deals integer DEFAULT 5
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_time timestamptz := clock_timestamp();
  v_lock_key bigint;
  v_got_lock boolean;

  v_results jsonb := '[]'::jsonb;
  v_total_evaluated integer := 0;
  v_total_matched integer := 0;
  v_total_failed integer := 0;

  v_order RECORD;
  v_batch RECORD;
  v_score_result jsonb;
  v_total_score numeric;
  v_new_deal_id uuid;
  v_match_qty integer;

  v_commission numeric;
  v_supplier_price numeric;
  v_platform_fee numeric;
  v_buyer_price numeric;

  v_processing_ms integer;
  v_remaining_qty integer;

  v_min_score numeric := 60;
BEGIN
  v_lock_key := ('x' || left(replace(p_trigger_id::text, '-', ''), 15))::bit(63)::bigint;
  v_got_lock := pg_try_advisory_xact_lock(v_lock_key);

  IF NOT v_got_lock THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'concurrent_lock',
      'message', 'Another matching process is running for this item'
    );
  END IF;

  SELECT COALESCE(
    (SELECT (settings->>'commission_per_pallet')::numeric
     FROM platform_settings LIMIT 1),
    0.25
  ) INTO v_commission;

  -- =============================================================
  -- المسار 1: مخزون جديد -> البحث عن طلبات مناسبة
  -- =============================================================
  IF p_trigger_type = 'inventory' THEN

    SELECT * INTO v_batch FROM inventory_batches WHERE id = p_trigger_id;

    IF NOT FOUND
       OR v_batch.status != 'active'
       OR v_batch.available_quantity <= 0
       OR COALESCE(v_batch.hide_from_matching, false) = true
       OR COALESCE(v_batch.publish_to_market, true) = false
    THEN
      RETURN jsonb_build_object('success', true, 'matched', 0, 'reason', 'batch_not_eligible');
    END IF;

    FOR v_order IN
      SELECT o.*
      FROM orders o
      WHERE o.status IN ('unmatched', 'pending', 'partially_matched')
        AND o.phone != v_batch.phone
      ORDER BY
        CASE WHEN o.status = 'partially_matched' THEN 0 ELSE 1 END,
        o.created_at ASC
      LIMIT 50
    LOOP
      SELECT * INTO v_batch FROM inventory_batches WHERE id = p_trigger_id;
      IF v_batch.available_quantity <= 0 THEN
        EXIT;
      END IF;

      v_total_evaluated := v_total_evaluated + 1;

      v_score_result := ai_score_match(v_order, v_batch);
      v_total_score := (v_score_result->>'total_score')::numeric;

      IF NOT (v_score_result->>'is_eligible')::boolean OR v_total_score < v_min_score THEN
        CONTINUE;
      END IF;

      v_remaining_qty := v_order.quantity - COALESCE(v_order.matched_quantity, 0);
      IF v_remaining_qty <= 0 THEN
        CONTINUE;
      END IF;

      v_match_qty := LEAST(v_remaining_qty, v_batch.available_quantity);
      IF v_match_qty <= 0 THEN
        CONTINUE;
      END IF;

      IF v_match_qty < v_remaining_qty AND NOT COALESCE(v_order.accept_partial_delivery, false) THEN
        IF v_batch.available_quantity < v_order.quantity THEN
          CONTINUE;
        END IF;
      END IF;

      v_supplier_price := COALESCE(v_batch.price_per_pallet, 0);
      v_platform_fee := v_commission * v_match_qty;
      v_buyer_price := (v_supplier_price * v_match_qty) + v_platform_fee;

      BEGIN
        INSERT INTO deals (
          id, deal_ref, request_id,
          order_id, inventory_batch_id,
          buyer_phone, supplier_phone,
          pallet_type, size, quality, city,
          quantity, final_price,
          supplier_price, platform_fee, buyer_price,
          platform_fee_per_pallet,
          status, source,
          created_at, updated_at
        ) VALUES (
          gen_random_uuid(),
          'DEL-' || upper(substr(md5(random()::text), 1, 6)),
          v_order.request_id,
          v_order.id,
          v_batch.id,
          v_order.phone,
          v_batch.phone,
          v_batch.pallet_type,
          v_batch.size,
          v_batch.quality,
          v_batch.city,
          v_match_qty,
          v_buyer_price,
          v_supplier_price * v_match_qty,
          v_platform_fee,
          v_buyer_price,
          v_commission,
          'matched',
          'ai_engine_v3',
          now(), now()
        )
        RETURNING id INTO v_new_deal_id;

        UPDATE inventory_batches
        SET available_quantity = available_quantity - v_match_qty,
            reserved_quantity = COALESCE(reserved_quantity, 0) + v_match_qty,
            updated_at = now()
        WHERE id = v_batch.id
          AND available_quantity >= v_match_qty;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Insufficient inventory quantity';
        END IF;

        UPDATE orders
        SET matched_quantity = COALESCE(matched_quantity, 0) + v_match_qty,
            status = CASE
              WHEN COALESCE(matched_quantity, 0) + v_match_qty >= quantity THEN 'matched'
              ELSE 'partially_matched'
            END,
            updated_at = now()
        WHERE id = v_order.id;

        v_processing_ms := EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000;

        INSERT INTO matching_analytics (
          id, order_id, batch_id,
          match_score, match_status,
          pallet_type, size, quality, quantity, city,
          buyer_phone, supplier_phone,
          processing_time_ms, match_factors,
          engine_version, trigger_source,
          candidates_evaluated, deal_id, score_breakdown,
          created_at
        ) VALUES (
          gen_random_uuid(), v_order.id, v_batch.id,
          v_total_score, 'matched',
          v_batch.pallet_type, v_batch.size, v_batch.quality,
          v_match_qty, v_batch.city,
          v_order.phone, v_batch.phone,
          v_processing_ms, v_score_result->'flexibility_used',
          'v3', 'inventory_insert',
          v_total_evaluated, v_new_deal_id, v_score_result->'breakdown',
          now()
        );

        v_total_matched := v_total_matched + 1;

        v_results := v_results || jsonb_build_object(
          'deal_id', v_new_deal_id,
          'order_id', v_order.id,
          'score', v_total_score,
          'quantity', v_match_qty
        );

        IF v_total_matched >= p_max_deals THEN
          EXIT;
        END IF;

      EXCEPTION WHEN OTHERS THEN
        v_total_failed := v_total_failed + 1;
        v_processing_ms := EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000;

        INSERT INTO matching_analytics (
          id, order_id, batch_id,
          match_score, match_status,
          pallet_type, size, quality, quantity, city,
          buyer_phone, supplier_phone,
          processing_time_ms, match_factors,
          engine_version, trigger_source,
          candidates_evaluated, score_breakdown,
          created_at
        ) VALUES (
          gen_random_uuid(), v_order.id, v_batch.id,
          v_total_score, 'failed',
          v_batch.pallet_type, v_batch.size, v_batch.quality,
          v_match_qty, v_batch.city,
          v_order.phone, v_batch.phone,
          v_processing_ms,
          jsonb_build_object('error', SQLERRM),
          'v3', 'inventory_insert',
          v_total_evaluated, v_score_result->'breakdown',
          now()
        );
      END;
    END LOOP;

  -- =============================================================
  -- المسار 2: طلب جديد -> البحث عن مخزون (Multi-Batch)
  -- =============================================================
  ELSIF p_trigger_type = 'order' THEN

    SELECT * INTO v_order FROM orders WHERE id = p_trigger_id;

    IF NOT FOUND OR v_order.status NOT IN ('unmatched', 'pending', 'partially_matched') THEN
      RETURN jsonb_build_object('success', true, 'matched', 0, 'reason', 'order_not_eligible');
    END IF;

    v_remaining_qty := v_order.quantity - COALESCE(v_order.matched_quantity, 0);

    IF v_remaining_qty <= 0 THEN
      RETURN jsonb_build_object('success', true, 'matched', 0, 'reason', 'order_already_fulfilled');
    END IF;

    FOR v_batch IN
      SELECT ib.*
      FROM inventory_batches ib
      WHERE ib.status = 'active'
        AND ib.available_quantity > 0
        AND COALESCE(ib.hide_from_matching, false) = false
        AND COALESCE(ib.publish_to_market, true) = true
        AND ib.phone != v_order.phone
      ORDER BY ib.created_at ASC
      LIMIT 100
    LOOP
      v_total_evaluated := v_total_evaluated + 1;

      v_score_result := ai_score_match(v_order, v_batch);
      v_total_score := (v_score_result->>'total_score')::numeric;

      IF NOT (v_score_result->>'is_eligible')::boolean OR v_total_score < v_min_score THEN
        CONTINUE;
      END IF;

      SELECT * INTO v_order FROM orders WHERE id = p_trigger_id;
      v_remaining_qty := v_order.quantity - COALESCE(v_order.matched_quantity, 0);

      IF v_remaining_qty <= 0 THEN
        EXIT;
      END IF;

      SELECT * INTO v_batch FROM inventory_batches WHERE id = v_batch.id;
      IF v_batch.available_quantity <= 0 THEN
        CONTINUE;
      END IF;

      v_match_qty := LEAST(v_remaining_qty, v_batch.available_quantity);
      IF v_match_qty <= 0 THEN
        CONTINUE;
      END IF;

      IF v_match_qty < v_remaining_qty AND NOT COALESCE(v_order.accept_partial_delivery, false) THEN
        IF v_batch.available_quantity < v_remaining_qty THEN
          CONTINUE;
        END IF;
      END IF;

      v_supplier_price := COALESCE(v_batch.price_per_pallet, 0);
      v_platform_fee := v_commission * v_match_qty;
      v_buyer_price := (v_supplier_price * v_match_qty) + v_platform_fee;

      BEGIN
        INSERT INTO deals (
          id, deal_ref, request_id,
          order_id, inventory_batch_id,
          buyer_phone, supplier_phone,
          pallet_type, size, quality, city,
          quantity, final_price,
          supplier_price, platform_fee, buyer_price,
          platform_fee_per_pallet,
          status, source,
          created_at, updated_at
        ) VALUES (
          gen_random_uuid(),
          'DEL-' || upper(substr(md5(random()::text), 1, 6)),
          v_order.request_id,
          v_order.id,
          v_batch.id,
          v_order.phone,
          v_batch.phone,
          v_batch.pallet_type,
          v_batch.size,
          v_batch.quality,
          v_batch.city,
          v_match_qty,
          v_buyer_price,
          v_supplier_price * v_match_qty,
          v_platform_fee,
          v_buyer_price,
          v_commission,
          'matched',
          'ai_engine_v3',
          now(), now()
        )
        RETURNING id INTO v_new_deal_id;

        UPDATE inventory_batches
        SET available_quantity = available_quantity - v_match_qty,
            reserved_quantity = COALESCE(reserved_quantity, 0) + v_match_qty,
            updated_at = now()
        WHERE id = v_batch.id
          AND available_quantity >= v_match_qty;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Insufficient inventory quantity';
        END IF;

        UPDATE orders
        SET matched_quantity = COALESCE(matched_quantity, 0) + v_match_qty,
            status = CASE
              WHEN COALESCE(matched_quantity, 0) + v_match_qty >= quantity THEN 'matched'
              ELSE 'partially_matched'
            END,
            updated_at = now()
        WHERE id = v_order.id;

        v_processing_ms := EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000;

        INSERT INTO matching_analytics (
          id, order_id, batch_id,
          match_score, match_status,
          pallet_type, size, quality, quantity, city,
          buyer_phone, supplier_phone,
          processing_time_ms, match_factors,
          engine_version, trigger_source,
          candidates_evaluated, deal_id, score_breakdown,
          created_at
        ) VALUES (
          gen_random_uuid(), v_order.id, v_batch.id,
          v_total_score, 'matched',
          v_batch.pallet_type, v_batch.size, v_batch.quality,
          v_match_qty, v_batch.city,
          v_order.phone, v_batch.phone,
          v_processing_ms, v_score_result->'flexibility_used',
          'v3', 'order_insert',
          v_total_evaluated, v_new_deal_id, v_score_result->'breakdown',
          now()
        );

        v_total_matched := v_total_matched + 1;

        v_results := v_results || jsonb_build_object(
          'deal_id', v_new_deal_id,
          'batch_id', v_batch.id,
          'score', v_total_score,
          'quantity', v_match_qty
        );

        SELECT * INTO v_order FROM orders WHERE id = p_trigger_id;
        v_remaining_qty := v_order.quantity - COALESCE(v_order.matched_quantity, 0);

        IF v_remaining_qty <= 0 OR v_total_matched >= p_max_deals THEN
          EXIT;
        END IF;

      EXCEPTION WHEN OTHERS THEN
        v_total_failed := v_total_failed + 1;
        v_processing_ms := EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000;

        INSERT INTO matching_analytics (
          id, order_id, batch_id,
          match_score, match_status,
          pallet_type, size, quality, quantity, city,
          buyer_phone, supplier_phone,
          processing_time_ms, match_factors,
          engine_version, trigger_source,
          candidates_evaluated, score_breakdown,
          created_at
        ) VALUES (
          gen_random_uuid(), v_order.id, v_batch.id,
          v_total_score, 'failed',
          v_batch.pallet_type, v_batch.size, v_batch.quality,
          v_match_qty, v_batch.city,
          v_order.phone, v_batch.phone,
          v_processing_ms,
          jsonb_build_object('error', SQLERRM),
          'v3', 'order_insert',
          v_total_evaluated, v_score_result->'breakdown',
          now()
        );
      END;
    END LOOP;

  END IF;

  v_processing_ms := EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000;

  RETURN jsonb_build_object(
    'success', true,
    'engine_version', 'v3',
    'trigger_type', p_trigger_type,
    'trigger_id', p_trigger_id,
    'evaluated', v_total_evaluated,
    'matched', v_total_matched,
    'failed', v_total_failed,
    'processing_ms', v_processing_ms,
    'deals', v_results
  );
END;
$$;

-- ==================================================================
-- الخطوة 6: Trigger واحد للمخزون
-- ==================================================================

CREATE OR REPLACE FUNCTION ai_match_on_inventory_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'active'
     AND NEW.available_quantity > 0
     AND COALESCE(NEW.hide_from_matching, false) = false
     AND COALESCE(NEW.publish_to_market, true) = true
  THEN
    PERFORM ai_match_engine('inventory', NEW.id, 10);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ai_match_inventory ON inventory_batches;
CREATE TRIGGER trg_ai_match_inventory
  AFTER INSERT ON inventory_batches
  FOR EACH ROW
  EXECUTE FUNCTION ai_match_on_inventory_insert();

-- ==================================================================
-- الخطوة 7: Trigger واحد للطلبات
-- ==================================================================

CREATE OR REPLACE FUNCTION ai_match_on_order_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status IN ('unmatched', 'pending') THEN
    PERFORM ai_match_engine('order', NEW.id, 10);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ai_match_order ON orders;
CREATE TRIGGER trg_ai_match_order
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION ai_match_on_order_insert();

-- ==================================================================
-- الخطوة 8: تسجيل الصفقات اليدوية
-- ==================================================================

CREATE OR REPLACE FUNCTION ai_log_deal_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.source IS NULL OR NEW.source != 'ai_engine_v3' THEN
    INSERT INTO matching_analytics (
      id, order_id, batch_id,
      match_score, match_status,
      pallet_type, size, quality, quantity, city,
      buyer_phone, supplier_phone,
      processing_time_ms, match_factors,
      engine_version, trigger_source,
      deal_id,
      created_at
    ) VALUES (
      gen_random_uuid(), NEW.order_id, NEW.inventory_batch_id,
      90, 'matched',
      NEW.pallet_type, NEW.size, NEW.quality,
      NEW.quantity, NEW.city,
      NEW.buyer_phone, NEW.supplier_phone,
      0,
      jsonb_build_object('source', COALESCE(NEW.source, 'manual')),
      'external', COALESCE(NEW.source, 'manual'),
      NEW.id,
      now()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ai_log_deal ON deals;
CREATE TRIGGER trg_ai_log_deal
  AFTER INSERT ON deals
  FOR EACH ROW
  EXECUTE FUNCTION ai_log_deal_creation();

-- ==================================================================
-- الخطوة 9: المطابقة اليدوية
-- ==================================================================

CREATE FUNCTION manual_match_existing_orders(p_order_id uuid)
RETURNS TABLE (
  success boolean,
  deal_id uuid,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_matched integer;
  v_first_deal_id uuid;
BEGIN
  v_result := ai_match_engine('order', p_order_id, 10);

  v_matched := COALESCE((v_result->>'matched')::integer, 0);

  IF v_matched > 0 THEN
    v_first_deal_id := (v_result->'deals'->0->>'deal_id')::uuid;
    RETURN QUERY SELECT true, v_first_deal_id,
      format('تم إنشاء %s صفقة (تم تقييم %s مرشح)', v_matched, (v_result->>'evaluated')::text);
  ELSE
    RETURN QUERY SELECT false, NULL::uuid,
      format('لم يتم العثور على مطابقة (تم تقييم %s مرشح)', COALESCE((v_result->>'evaluated')::text, '0'));
  END IF;
END;
$$;

-- ==================================================================
-- الخطوة 10: المطابقة الجماعية
-- ==================================================================

CREATE OR REPLACE FUNCTION ai_bulk_match_all_pending()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_result jsonb;
  v_total_orders integer := 0;
  v_total_matched integer := 0;
  v_total_deals integer := 0;
  v_results jsonb := '[]'::jsonb;
BEGIN
  FOR v_order IN
    SELECT o.*
    FROM orders o
    WHERE o.status IN ('unmatched', 'pending', 'partially_matched')
    ORDER BY
      CASE WHEN o.status = 'partially_matched' THEN 0 ELSE 1 END,
      o.created_at ASC
    LIMIT 100
  LOOP
    v_total_orders := v_total_orders + 1;

    v_result := ai_match_engine('order', v_order.id, 10);

    IF COALESCE((v_result->>'matched')::integer, 0) > 0 THEN
      v_total_matched := v_total_matched + 1;
      v_total_deals := v_total_deals + (v_result->>'matched')::integer;

      v_results := v_results || jsonb_build_object(
        'order_id', v_order.id,
        'request_id', v_order.request_id,
        'deals_created', (v_result->>'matched')::integer
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'orders_processed', v_total_orders,
    'orders_matched', v_total_matched,
    'deals_created', v_total_deals,
    'details', v_results
  );
END;
$$;

-- ==================================================================
-- الخطوة 11: معاينة المرشحين بدون إنشاء صفقات
-- ==================================================================

CREATE OR REPLACE FUNCTION ai_preview_matches(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_batch RECORD;
  v_score_result jsonb;
  v_total_score numeric;
  v_candidates jsonb := '[]'::jsonb;
  v_count integer := 0;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Order not found');
  END IF;

  FOR v_batch IN
    SELECT ib.*
    FROM inventory_batches ib
    WHERE ib.status = 'active'
      AND ib.available_quantity > 0
      AND COALESCE(ib.hide_from_matching, false) = false
      AND COALESCE(ib.publish_to_market, true) = true
      AND ib.phone != v_order.phone
    ORDER BY ib.created_at ASC
    LIMIT 50
  LOOP
    v_score_result := ai_score_match(v_order, v_batch);
    v_total_score := (v_score_result->>'total_score')::numeric;

    IF (v_score_result->>'is_eligible')::boolean AND v_total_score >= 40 THEN
      v_candidates := v_candidates || jsonb_build_object(
        'batch_id', v_batch.id,
        'batch_ref', v_batch.batch_ref,
        'supplier_phone', v_batch.phone,
        'pallet_type', v_batch.pallet_type,
        'size', v_batch.size,
        'quality', v_batch.quality,
        'city', v_batch.city,
        'pallet_condition', v_batch.pallet_condition,
        'available_quantity', v_batch.available_quantity,
        'price_per_pallet', v_batch.price_per_pallet,
        'total_score', v_total_score,
        'score_breakdown', v_score_result->'breakdown',
        'flexibility_used', v_score_result->'flexibility_used',
        'would_match', v_total_score >= 60
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'order_id', p_order_id,
    'order_request_id', v_order.request_id,
    'candidates_count', v_count,
    'eligible_count', (SELECT COUNT(*) FROM jsonb_array_elements(v_candidates) e WHERE (e->>'would_match')::boolean = true),
    'candidates', v_candidates
  );
END;
$$;

-- ==================================================================
-- الخطوة 12: إحصائيات المطابقة
-- ==================================================================

CREATE FUNCTION get_matching_hub_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_today_matches integer;
  v_today_success integer;
  v_success_rate numeric;
  v_avg_time numeric;
  v_pending_orders integer;
  v_active_inventory integer;
  v_potential_matches integer;
  v_total_deals_today integer;
  v_avg_score numeric;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE match_status = 'matched'),
    COALESCE(AVG(processing_time_ms) FILTER (WHERE match_status = 'matched'), 0),
    COALESCE(AVG(match_score) FILTER (WHERE match_status = 'matched'), 0)
  INTO v_today_matches, v_today_success, v_avg_time, v_avg_score
  FROM matching_analytics
  WHERE created_at >= CURRENT_DATE;

  IF v_today_matches > 0 THEN
    v_success_rate := round((v_today_success::numeric / v_today_matches) * 100, 1);
  ELSE
    v_success_rate := 0;
  END IF;

  SELECT COUNT(*) INTO v_total_deals_today
  FROM deals WHERE created_at >= CURRENT_DATE;

  SELECT COUNT(*) INTO v_pending_orders
  FROM orders WHERE status IN ('unmatched', 'pending', 'partially_matched');

  SELECT COUNT(*) INTO v_active_inventory
  FROM inventory_batches
  WHERE status = 'active'
    AND available_quantity > 0
    AND COALESCE(hide_from_matching, false) = false
    AND COALESCE(publish_to_market, true) = true;

  SELECT COUNT(DISTINCT o.id) INTO v_potential_matches
  FROM orders o
  WHERE o.status IN ('unmatched', 'pending', 'partially_matched')
    AND EXISTS (
      SELECT 1 FROM inventory_batches ib
      WHERE ib.status = 'active'
        AND ib.available_quantity > 0
        AND COALESCE(ib.hide_from_matching, false) = false
        AND COALESCE(ib.publish_to_market, true) = true
        AND ib.phone != o.phone
        AND (ib.pallet_type = o.pallet_type OR lower(trim(ib.pallet_type)) = lower(trim(o.pallet_type)))
        AND (ib.size = o.size OR lower(trim(ib.size)) = lower(trim(o.size)))
    );

  RETURN jsonb_build_object(
    'total_matches_today', v_today_success,
    'total_attempts_today', v_today_matches,
    'total_deals_today', v_total_deals_today,
    'success_rate', v_success_rate,
    'avg_match_time_seconds', round(v_avg_time / 1000.0, 2),
    'avg_match_score', round(v_avg_score, 1),
    'pending_orders', v_pending_orders,
    'active_inventory', v_active_inventory,
    'potential_matches', v_potential_matches,
    'engine_version', 'v3'
  );
END;
$$;

-- ==================================================================
-- الخطوة 13: الطلبات المعلقة مع المرشحين
-- ==================================================================

CREATE FUNCTION get_pending_orders_with_potential_matches(p_phone text DEFAULT NULL)
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
  accept_partial_delivery boolean,
  accept_close_quality boolean,
  accept_close_city boolean,
  matched_quantity integer,
  created_at timestamptz,
  potential_matches_count bigint,
  best_match_score numeric,
  waiting_time_hours numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
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
    COALESCE(o.accept_partial_delivery, false),
    COALESCE(o.accept_close_quality, false),
    COALESCE(o.accept_close_city, false),
    COALESCE(o.matched_quantity, 0),
    o.created_at,
    (
      SELECT COUNT(*)
      FROM inventory_batches ib
      WHERE ib.status = 'active'
        AND ib.available_quantity > 0
        AND COALESCE(ib.hide_from_matching, false) = false
        AND COALESCE(ib.publish_to_market, true) = true
        AND ib.phone != o.phone
        AND (ib.pallet_type = o.pallet_type OR lower(trim(ib.pallet_type)) = lower(trim(o.pallet_type)))
        AND (ib.size = o.size OR lower(trim(ib.size)) = lower(trim(o.size)))
        AND (ib.quality = o.quality OR lower(trim(ib.quality)) = lower(trim(o.quality))
             OR COALESCE(o.accept_close_quality, false) = true)
        AND (ib.city = o.city OR lower(trim(ib.city)) = lower(trim(o.city))
             OR COALESCE(o.accept_close_city, false) = true)
    ) AS potential_matches_count,
    COALESCE(
      (SELECT MAX(ma.match_score) FROM matching_analytics ma
       WHERE ma.order_id = o.id AND ma.match_status = 'matched'), 0
    ) AS best_match_score,
    round(EXTRACT(EPOCH FROM (now() - o.created_at)) / 3600.0, 1) AS waiting_time_hours
  FROM orders o
  WHERE o.status IN ('unmatched', 'pending', 'partially_matched')
    AND (p_phone IS NULL OR o.phone = p_phone)
  ORDER BY
    CASE WHEN o.status = 'partially_matched' THEN 0 ELSE 1 END,
    o.created_at ASC;
END;
$$;

-- ==================================================================
-- الخطوة 14: تحليلات متقدمة
-- ==================================================================

CREATE FUNCTION get_matching_analytics(p_time_range text DEFAULT '24h')
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_since timestamptz;
  v_totals jsonb;
  v_by_hour jsonb;
  v_by_quality jsonb;
  v_by_city jsonb;
  v_by_engine jsonb;
  v_flexibility_stats jsonb;
BEGIN
  v_since := CASE p_time_range
    WHEN '1h' THEN now() - interval '1 hour'
    WHEN '6h' THEN now() - interval '6 hours'
    WHEN '24h' THEN now() - interval '24 hours'
    WHEN '7d' THEN now() - interval '7 days'
    WHEN '30d' THEN now() - interval '30 days'
    ELSE now() - interval '24 hours'
  END;

  SELECT jsonb_build_object(
    'total_attempts', COUNT(*),
    'successful', COUNT(*) FILTER (WHERE match_status = 'matched'),
    'failed', COUNT(*) FILTER (WHERE match_status = 'failed'),
    'success_rate', CASE WHEN COUNT(*) > 0
      THEN round((COUNT(*) FILTER (WHERE match_status = 'matched'))::numeric / COUNT(*) * 100, 1)
      ELSE 0 END,
    'avg_score', round(COALESCE(AVG(match_score) FILTER (WHERE match_status = 'matched'), 0), 1),
    'avg_processing_ms', round(COALESCE(AVG(processing_time_ms), 0), 0),
    'avg_candidates', round(COALESCE(AVG(candidates_evaluated), 0), 1),
    'total_quantity_matched', COALESCE(SUM(quantity) FILTER (WHERE match_status = 'matched'), 0)
  ) INTO v_totals
  FROM matching_analytics WHERE created_at >= v_since;

  SELECT COALESCE(jsonb_agg(h ORDER BY h->>'hour'), '[]'::jsonb) INTO v_by_hour
  FROM (
    SELECT jsonb_build_object(
      'hour', to_char(date_trunc('hour', created_at), 'HH24:MI'),
      'total', COUNT(*),
      'matched', COUNT(*) FILTER (WHERE match_status = 'matched'),
      'avg_score', round(COALESCE(AVG(match_score), 0), 0)
    ) AS h
    FROM matching_analytics WHERE created_at >= v_since
    GROUP BY date_trunc('hour', created_at)
  ) sub;

  SELECT COALESCE(jsonb_agg(q), '[]'::jsonb) INTO v_by_quality
  FROM (
    SELECT jsonb_build_object(
      'quality', quality, 'total', COUNT(*),
      'matched', COUNT(*) FILTER (WHERE match_status = 'matched'),
      'avg_score', round(COALESCE(AVG(match_score), 0), 0)
    ) AS q
    FROM matching_analytics WHERE created_at >= v_since AND quality IS NOT NULL
    GROUP BY quality ORDER BY COUNT(*) DESC
  ) sub;

  SELECT COALESCE(jsonb_agg(c), '[]'::jsonb) INTO v_by_city
  FROM (
    SELECT jsonb_build_object(
      'city', city, 'total', COUNT(*),
      'matched', COUNT(*) FILTER (WHERE match_status = 'matched'),
      'avg_score', round(COALESCE(AVG(match_score), 0), 0)
    ) AS c
    FROM matching_analytics WHERE created_at >= v_since AND city IS NOT NULL
    GROUP BY city ORDER BY COUNT(*) DESC LIMIT 10
  ) sub;

  SELECT COALESCE(jsonb_agg(e), '[]'::jsonb) INTO v_by_engine
  FROM (
    SELECT jsonb_build_object(
      'engine', COALESCE(engine_version, 'unknown'),
      'total', COUNT(*),
      'matched', COUNT(*) FILTER (WHERE match_status = 'matched')
    ) AS e
    FROM matching_analytics WHERE created_at >= v_since
    GROUP BY engine_version
  ) sub;

  SELECT jsonb_build_object(
    'close_quality_used', COUNT(*) FILTER (WHERE match_factors->>'close_quality' = 'true' AND match_status = 'matched'),
    'close_city_used', COUNT(*) FILTER (WHERE match_factors->>'close_city' = 'true' AND match_status = 'matched'),
    'partial_delivery_used', COUNT(*) FILTER (WHERE match_factors->>'partial_delivery' = 'true' AND match_status = 'matched')
  ) INTO v_flexibility_stats
  FROM matching_analytics WHERE created_at >= v_since;

  RETURN jsonb_build_object(
    'time_range', p_time_range,
    'since', v_since,
    'totals', v_totals,
    'by_hour', v_by_hour,
    'by_quality', v_by_quality,
    'by_city', v_by_city,
    'by_engine_version', v_by_engine,
    'flexibility_usage', v_flexibility_stats
  );
END;
$$;

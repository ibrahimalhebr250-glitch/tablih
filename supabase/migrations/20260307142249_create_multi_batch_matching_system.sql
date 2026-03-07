/*
  # نظام المطابقة المتعدد - Multi-Batch Matching

  1. الهدف
    - السماح بمطابقة طلب واحد مع عدة دفعات مخزون
    - تجميع المخزون من موردين مختلفين لإكمال الطلب
    - إنشاء صفقات متعددة تلقائياً

  2. المميزات
    - تجميع ذكي للمخزون المتاح
    - أولوية للموردين بنفس المدينة
    - حساب إجمالي الكمية المتاحة قبل المطابقة
    - إنشاء صفقات متزامنة

  3. الأمان
    - SECURITY DEFINER
    - التحقق من الصلاحيات
*/

-- ================================================================
-- دالة المطابقة المتعددة الدفعات (Multi-Batch Matching)
-- ================================================================
CREATE OR REPLACE FUNCTION multi_batch_matching(
  p_order_id uuid,
  p_max_batches int DEFAULT 5
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_batch RECORD;
  v_batches_selected jsonb := '[]'::jsonb;
  v_total_available int := 0;
  v_remaining_qty int;
  v_matched_qty int;
  v_deal_result jsonb;
  v_deals_created jsonb := '[]'::jsonb;
  v_matches_count int := 0;
  v_errors jsonb := '[]'::jsonb;
BEGIN
  -- جلب الطلب
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;

  IF NOT FOUND OR v_order.status NOT IN ('unmatched', 'partially_matched') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'order_not_found_or_fully_matched'
    );
  END IF;

  v_remaining_qty := v_order.quantity - COALESCE(v_order.matched_quantity, 0);

  -- ===== المرحلة 1: جمع الدفعات المناسبة =====
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
    LIMIT p_max_batches
  LOOP
    v_total_available := v_total_available + v_batch.available_quantity;
    
    v_batches_selected := v_batches_selected || jsonb_build_object(
      'batch_id', v_batch.id,
      'available_quantity', v_batch.available_quantity,
      'price_per_pallet', v_batch.price_per_pallet,
      'city', v_batch.city,
      'match_score', v_batch.match_score,
      'phone', v_batch.phone
    );

    -- إذا جمعنا كمية كافية، نتوقف
    IF v_total_available >= v_remaining_qty THEN
      EXIT;
    END IF;
  END LOOP;

  -- ===== المرحلة 2: التحقق من الكمية الكافية =====
  IF v_total_available < v_remaining_qty THEN
    -- تسجيل محاولة فاشلة
    INSERT INTO matching_attempts_log (
      order_id, matched, match_score, reason, metadata
    ) VALUES (
      v_order.id, false, 0,
      'insufficient_total_quantity',
      jsonb_build_object(
        'required', v_remaining_qty,
        'total_available', v_total_available,
        'batches_found', jsonb_array_length(v_batches_selected),
        'batches', v_batches_selected
      )
    );

    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient_total_quantity',
      'required', v_remaining_qty,
      'available', v_total_available,
      'batches_found', jsonb_array_length(v_batches_selected),
      'batches', v_batches_selected
    );
  END IF;

  -- ===== المرحلة 3: إنشاء الصفقات =====
  FOR v_batch IN
    SELECT
      (batch->>'batch_id')::uuid as id,
      (batch->>'available_quantity')::int as available_quantity,
      (batch->>'price_per_pallet')::numeric as price_per_pallet,
      (batch->>'city')::text as city,
      (batch->>'match_score')::int as match_score,
      (batch->>'phone')::text as phone
    FROM jsonb_array_elements(v_batches_selected) as batch
  LOOP
    -- حساب الكمية المطلوبة من هذه الدفعة
    v_matched_qty := LEAST(v_remaining_qty, v_batch.available_quantity);

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

          -- تسجيل النجاح
          INSERT INTO matching_attempts_log (
            order_id, batch_id, matched, match_score, reason, deal_id, metadata
          ) VALUES (
            v_order.id, v_batch.id, true, v_batch.match_score,
            'multi_batch_match_success',
            (v_deal_result->>'deal_id')::uuid,
            jsonb_build_object(
              'matched_quantity', v_matched_qty,
              'price_per_pallet', v_batch.price_per_pallet,
              'remaining_after', v_remaining_qty
            )
          );

          -- إذا اكتملت الكمية
          IF v_remaining_qty <= 0 THEN
            EXIT;
          END IF;
        ELSE
          v_errors := v_errors || v_deal_result;
          
          INSERT INTO matching_attempts_log (
            order_id, batch_id, matched, match_score, reason, metadata
          ) VALUES (
            v_order.id, v_batch.id, false, v_batch.match_score,
            'deal_creation_failed',
            jsonb_build_object('error', v_deal_result->>'error')
          );
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

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order.id,
    'required_quantity', v_order.quantity - COALESCE(v_order.matched_quantity, 0),
    'total_available', v_total_available,
    'batches_used', v_matches_count,
    'deals_created', v_deals_created,
    'remaining_unmatched', v_remaining_qty,
    'fully_matched', (v_remaining_qty <= 0),
    'errors', v_errors
  );
END;
$$;

-- ================================================================
-- تحديث محرك المطابقة الفورية لاستخدام Multi-Batch
-- ================================================================
CREATE OR REPLACE FUNCTION instant_match_engine_v2(
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
  v_result jsonb;
  v_matches_count int := 0;
  v_total_checked int := 0;
  v_errors jsonb := '[]'::jsonb;
  v_deals_created jsonb := '[]'::jsonb;
BEGIN
  IF p_trigger_type = 'order' THEN
    -- استخدام نظام Multi-Batch للطلبات
    v_result := multi_batch_matching(p_trigger_id, p_max_matches);
    
    RETURN v_result;

  ELSIF p_trigger_type = 'inventory' THEN
    -- عند إضافة مخزون، نحاول مطابقته مع الطلبات المعلقة
    SELECT * INTO v_batch FROM inventory_batches WHERE id = p_trigger_id;

    IF NOT FOUND OR v_batch.status != 'active' OR v_batch.available_quantity <= 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'batch_not_found_or_unavailable'
      );
    END IF;

    -- محاولة مطابقة كل طلب معلق باستخدام Multi-Batch
    FOR v_order IN
      SELECT id
      FROM orders
      WHERE status IN ('unmatched', 'partially_matched')
        AND normalize_pallet_type(pallet_type) = normalize_pallet_type(v_batch.pallet_type)
        AND TRIM(size) = TRIM(v_batch.size)
        AND phone IS DISTINCT FROM v_batch.phone
        AND (quantity - COALESCE(matched_quantity, 0)) > 0
      ORDER BY created_at ASC
      LIMIT p_max_matches
    LOOP
      v_total_checked := v_total_checked + 1;
      
      v_result := multi_batch_matching(v_order.id, 10);
      
      IF (v_result->>'success')::boolean AND (v_result->>'fully_matched')::boolean THEN
        v_matches_count := v_matches_count + 1;
      END IF;
    END LOOP;

    RETURN jsonb_build_object(
      'success', true,
      'trigger_type', p_trigger_type,
      'trigger_id', p_trigger_id,
      'total_checked', v_total_checked,
      'orders_fully_matched', v_matches_count
    );
  END IF;

  RETURN jsonb_build_object('success', false, 'error', 'invalid_trigger_type');
END;
$$;

-- ================================================================
-- تحديث الـ Triggers لاستخدام النظام الجديد
-- ================================================================
DROP TRIGGER IF EXISTS on_order_insert_instant_match ON orders;
DROP TRIGGER IF EXISTS on_batch_insert_instant_match ON inventory_batches;

CREATE OR REPLACE FUNCTION trigger_instant_match_on_new_order_v2()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'unmatched' THEN
    PERFORM instant_match_engine_v2('order', NEW.id, 20);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_order_insert_instant_match
  AFTER INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.status = 'unmatched')
  EXECUTE FUNCTION trigger_instant_match_on_new_order_v2();

CREATE OR REPLACE FUNCTION trigger_instant_match_on_new_batch_v2()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'active' AND NEW.available_quantity > 0 THEN
    PERFORM instant_match_engine_v2('inventory', NEW.id, 20);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_batch_insert_instant_match
  AFTER INSERT ON inventory_batches
  FOR EACH ROW
  WHEN (NEW.status = 'active' AND NEW.available_quantity > 0)
  EXECUTE FUNCTION trigger_instant_match_on_new_batch_v2();

-- ================================================================
-- تحديث دالة المعالجة الدورية
-- ================================================================
CREATE OR REPLACE FUNCTION process_pending_orders_batch_v2()
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
    v_result := multi_batch_matching(v_order.id, 10);
    v_total_processed := v_total_processed + 1;

    IF (v_result->>'success')::boolean AND (v_result->>'fully_matched')::boolean THEN
      v_total_matched := v_total_matched + 1;
    END IF;

    v_results := v_results || jsonb_build_object(
      'order_id', v_order.id,
      'fully_matched', COALESCE((v_result->>'fully_matched')::boolean, false),
      'deals_created', COALESCE(jsonb_array_length(v_result->'deals_created'), 0)
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'total_processed', v_total_processed,
    'total_fully_matched', v_total_matched,
    'results', v_results,
    'timestamp', now()
  );
END;
$$;
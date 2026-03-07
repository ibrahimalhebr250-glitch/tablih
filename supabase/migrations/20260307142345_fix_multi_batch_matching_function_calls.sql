/*
  # إصلاح استدعاء دالة إنشاء الصفقات

  1. المشكلة
    - دالة create_deal_with_reservation تحتاج 11 معامل
    - النظام الحالي يستدعيها بـ 5 معاملات فقط

  2. الحل
    - تحديث استدعاءات الدالة لتمرير جميع المعاملات المطلوبة
    - جلب البيانات من الطلب والمخزون قبل الاستدعاء

  3. الأمان
    - SECURITY DEFINER
*/

-- ================================================================
-- تحديث دالة Multi-Batch Matching مع الاستدعاء الصحيح
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
  v_batch_full RECORD;
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
      'phone', v_batch.phone,
      'pallet_type', v_batch.pallet_type,
      'size', v_batch.size,
      'quality', v_batch.quality
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
      (batch->>'phone')::text as phone,
      (batch->>'pallet_type')::text as pallet_type,
      (batch->>'size')::text as size,
      (batch->>'quality')::text as quality
    FROM jsonb_array_elements(v_batches_selected) as batch
  LOOP
    -- حساب الكمية المطلوبة من هذه الدفعة
    v_matched_qty := LEAST(v_remaining_qty, v_batch.available_quantity);

    IF v_matched_qty > 0 THEN
      BEGIN
        -- استدعاء الدالة بجميع المعاملات المطلوبة
        v_deal_result := create_deal_with_reservation(
          v_order.id,                    -- p_order_id
          v_batch.id,                    -- p_inventory_batch_id
          v_order.phone,                 -- p_buyer_phone
          v_batch.phone,                 -- p_supplier_phone
          v_batch.pallet_type,           -- p_pallet_type
          v_batch.size,                  -- p_size
          v_batch.quality,               -- p_quality
          v_batch.city,                  -- p_city
          v_matched_qty,                 -- p_quantity
          v_batch.price_per_pallet,      -- p_supplier_price
          v_order.request_id             -- p_request_id
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
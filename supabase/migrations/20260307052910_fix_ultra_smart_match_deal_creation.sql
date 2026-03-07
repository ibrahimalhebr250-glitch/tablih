/*
  # إصلاح دالة المطابقة الذكية لاستدعاء create_deal_with_reservation الصحيحة

  1. المشكلة
    - ultra_smart_match_orders تستدعي create_deal_with_reservation_v6 غير موجودة
    - يجب استخدام create_deal_with_reservation الموجودة

  2. الحل
    - تحديث الدالة لاستخدام التوقيع الصحيح
    - تمرير جميع المعاملات المطلوبة

  3. الأمان
    - SECURITY DEFINER
*/

CREATE OR REPLACE FUNCTION ultra_smart_match_orders()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_batch RECORD;
  v_quality_order jsonb := '{"A": 4, "B": 3, "C": 2, "Scrap": 1}'::jsonb;
  v_order_q int;
  v_batch_q int;
  v_matched_qty int;
  v_deal_result jsonb;
  v_matches_count int := 0;
  v_total_orders int := 0;
  v_errors jsonb := '[]'::jsonb;
BEGIN
  -- حساب عدد الطلبات المعلقة
  SELECT COUNT(*) INTO v_total_orders
  FROM orders
  WHERE status = 'unmatched';

  -- معالجة كل طلب معلق
  FOR v_order IN
    SELECT o.*
    FROM orders o
    WHERE o.status = 'unmatched'
      -- تجنب الطلبات التي لها صفقات نشطة
      AND NOT EXISTS (
        SELECT 1 FROM deals d 
        WHERE d.order_id = o.id 
          AND d.status NOT IN ('cancelled', 'failed')
      )
    ORDER BY o.created_at ASC
  LOOP
    v_order_q := COALESCE((v_quality_order->>v_order.quality)::int, 0);

    -- البحث عن مخزون مطابق
    FOR v_batch IN
      SELECT ib.*
      FROM inventory_batches ib
      WHERE ib.status = 'active'
        AND ib.available_quantity > 0
        -- مطابقة ذكية للنوع باستخدام التوحيد
        AND normalize_pallet_type(ib.pallet_type) = normalize_pallet_type(v_order.pallet_type)
        -- مطابقة المقاس
        AND TRIM(ib.size) = TRIM(v_order.size)
        -- منع المطابقة الذاتية
        AND ib.phone IS DISTINCT FROM v_order.phone
      ORDER BY 
        -- أولوية للمدينة المطابقة
        CASE WHEN TRIM(ib.city) = TRIM(v_order.city) THEN 1 ELSE 2 END,
        -- ثم السعر الأفضل
        ib.price_per_pallet ASC,
        -- ثم الأقدم
        ib.created_at ASC
      LIMIT 1
    LOOP
      v_batch_q := COALESCE((v_quality_order->>v_batch.quality)::int, 0);

      -- تحقق من الجودة
      IF v_order.accept_close_quality OR v_batch_q >= v_order_q THEN
        -- تحقق من المدينة
        IF v_order.accept_close_city OR TRIM(v_batch.city) = TRIM(v_order.city) THEN
          -- حساب الكمية المطابقة
          IF v_order.accept_partial_delivery THEN
            v_matched_qty := LEAST(v_order.quantity - COALESCE(v_order.matched_quantity, 0), v_batch.available_quantity);
          ELSE
            IF v_batch.available_quantity >= (v_order.quantity - COALESCE(v_order.matched_quantity, 0)) THEN
              v_matched_qty := v_order.quantity - COALESCE(v_order.matched_quantity, 0);
            ELSE
              v_matched_qty := 0;
            END IF;
          END IF;

          -- إذا وجدنا كمية مطابقة
          IF v_matched_qty > 0 THEN
            BEGIN
              -- إنشاء صفقة باستخدام الدالة الصحيحة
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
              ELSE
                v_errors := v_errors || jsonb_build_object(
                  'order_id', v_order.id,
                  'batch_id', v_batch.id,
                  'error', v_deal_result->>'error'
                );
              END IF;

            EXCEPTION WHEN OTHERS THEN
              v_errors := v_errors || jsonb_build_object(
                'order_id', v_order.id,
                'batch_id', v_batch.id,
                'error', SQLERRM
              );
            END;

            -- إذا تم استيفاء الطلب كاملاً، لا نستمر
            IF NOT v_order.accept_partial_delivery AND v_matched_qty >= (v_order.quantity - COALESCE(v_order.matched_quantity, 0)) THEN
              EXIT;
            END IF;
          END IF;
        END IF;
      END IF;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'total_orders_checked', v_total_orders,
    'matches_created', v_matches_count,
    'errors', v_errors
  );
END;
$$;

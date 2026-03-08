/*
  # تحسين نظام المطابقة مع تسجيل التحليلات

  1. التحديثات
    - تحديث دالة المطابقة التلقائية لتسجيل البيانات
    - إضافة triggers لتسجيل المطابقات تلقائياً
    - تحسين أداء النظام

  2. الميزات الجديدة
    - تسجيل تلقائي لكل محاولة مطابقة
    - حساب وقت المعالجة
    - تتبع عوامل المطابقة
*/

-- دالة محسنة للمطابقة التلقائية مع تسجيل التحليلات
CREATE OR REPLACE FUNCTION auto_match_order_on_inventory_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  matching_order RECORD;
  new_deal_id uuid;
  match_score numeric;
  start_time timestamptz;
  end_time timestamptz;
  processing_ms integer;
BEGIN
  start_time := clock_timestamp();

  IF NEW.status = 'active'
    AND NEW.available_quantity > 0
    AND NEW.publish_to_market = true
    AND NEW.hide_from_matching = false
  THEN
    FOR matching_order IN
      SELECT o.*
      FROM orders o
      WHERE o.status IN ('unmatched', 'pending', 'partially_matched')
        AND o.pallet_type = NEW.pallet_type
        AND o.size = NEW.size
        AND o.quality = NEW.quality
        AND o.city = NEW.city
        AND (o.pallet_condition IS NULL OR o.pallet_condition = NEW.pallet_condition)
        AND o.phone != NEW.phone
        AND o.quantity <= NEW.available_quantity
      ORDER BY o.created_at ASC
      LIMIT 1
    LOOP
      -- حساب نقاط المطابقة
      match_score := 100;
      
      IF matching_order.pallet_condition = NEW.pallet_condition THEN
        match_score := match_score + 0;
      ELSE
        match_score := match_score - 5;
      END IF;

      BEGIN
        SELECT create_deal_with_reservation(
          matching_order.id,
          NEW.id,
          matching_order.quantity,
          matching_order.phone,
          NEW.phone,
          'automated'
        ) INTO new_deal_id;

        end_time := clock_timestamp();
        processing_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;

        -- تسجيل المطابقة الناجحة
        PERFORM log_matching_attempt(
          matching_order.id,
          NEW.id,
          match_score,
          'matched',
          NEW.pallet_type,
          NEW.size,
          NEW.quality,
          matching_order.quantity,
          NEW.city,
          matching_order.phone,
          NEW.phone,
          processing_ms::integer,
          jsonb_build_object(
            'quality_match', NEW.quality = matching_order.quality,
            'condition_match', NEW.pallet_condition = matching_order.pallet_condition,
            'city_match', NEW.city = matching_order.city,
            'auto_matched', true
          )
        );

        IF matching_order.quantity < NEW.available_quantity THEN
          UPDATE orders
          SET status = 'fulfilled'
          WHERE id = matching_order.id;
        END IF;

      EXCEPTION WHEN OTHERS THEN
        end_time := clock_timestamp();
        processing_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;

        -- تسجيل المطابقة الفاشلة
        PERFORM log_matching_attempt(
          matching_order.id,
          NEW.id,
          match_score,
          'failed',
          NEW.pallet_type,
          NEW.size,
          NEW.quality,
          matching_order.quantity,
          NEW.city,
          matching_order.phone,
          NEW.phone,
          processing_ms::integer,
          jsonb_build_object(
            'error', SQLERRM,
            'auto_matched', true
          )
        );
      END;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- دالة محسنة للمطابقة اليدوية
CREATE OR REPLACE FUNCTION manual_match_existing_orders(p_order_id uuid)
RETURNS TABLE (
  success boolean,
  deal_id uuid,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_order RECORD;
  matching_batch RECORD;
  new_deal_id uuid;
  match_score numeric;
  start_time timestamptz;
  end_time timestamptz;
  processing_ms integer;
BEGIN
  start_time := clock_timestamp();

  SELECT * INTO target_order FROM orders WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Order not found';
    RETURN;
  END IF;

  IF target_order.status NOT IN ('unmatched', 'pending', 'partially_matched') THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Order is not available for matching';
    RETURN;
  END IF;

  FOR matching_batch IN
    SELECT ib.*
    FROM inventory_batches ib
    WHERE ib.status = 'active'
      AND ib.available_quantity >= target_order.quantity
      AND ib.publish_to_market = true
      AND ib.hide_from_matching = false
      AND ib.pallet_type = target_order.pallet_type
      AND ib.size = target_order.size
      AND ib.quality = target_order.quality
      AND ib.city = target_order.city
      AND (target_order.pallet_condition IS NULL OR ib.pallet_condition = target_order.pallet_condition)
      AND ib.phone != target_order.phone
    ORDER BY ib.created_at ASC
    LIMIT 1
  LOOP
    match_score := 95;

    BEGIN
      SELECT create_deal_with_reservation(
        target_order.id,
        matching_batch.id,
        target_order.quantity,
        target_order.phone,
        matching_batch.phone,
        'manual'
      ) INTO new_deal_id;

      end_time := clock_timestamp();
      processing_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;

      PERFORM log_matching_attempt(
        target_order.id,
        matching_batch.id,
        match_score,
        'matched',
        matching_batch.pallet_type,
        matching_batch.size,
        matching_batch.quality,
        target_order.quantity,
        matching_batch.city,
        target_order.phone,
        matching_batch.phone,
        processing_ms::integer,
        jsonb_build_object(
          'manual_match', true,
          'quality_match', true,
          'condition_match', true,
          'city_match', true
        )
      );

      RETURN QUERY SELECT true, new_deal_id, 'Match created successfully';
      RETURN;

    EXCEPTION WHEN OTHERS THEN
      end_time := clock_timestamp();
      processing_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;

      PERFORM log_matching_attempt(
        target_order.id,
        matching_batch.id,
        match_score,
        'failed',
        matching_batch.pallet_type,
        matching_batch.size,
        matching_batch.quality,
        target_order.quantity,
        matching_batch.city,
        target_order.phone,
        matching_batch.phone,
        processing_ms::integer,
        jsonb_build_object(
          'manual_match', true,
          'error', SQLERRM
        )
      );

      RETURN QUERY SELECT false, NULL::uuid, 'Error creating match: ' || SQLERRM;
      RETURN;
    END;
  END LOOP;

  RETURN QUERY SELECT false, NULL::uuid, 'No matching inventory found';
  RETURN;
END;
$$;

-- Trigger لتسجيل المطابقات عند إنشاء صفقة
CREATE OR REPLACE FUNCTION log_deal_creation_analytics()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  order_data RECORD;
  batch_data RECORD;
BEGIN
  SELECT * INTO order_data FROM orders WHERE id = NEW.order_id;
  SELECT * INTO batch_data FROM inventory_batches WHERE id = NEW.batch_id;

  IF FOUND THEN
    PERFORM log_matching_attempt(
      NEW.order_id,
      NEW.batch_id,
      90,
      'matched',
      batch_data.pallet_type,
      batch_data.size,
      batch_data.quality,
      NEW.quantity,
      batch_data.city,
      NEW.buyer_phone,
      NEW.supplier_phone,
      0,
      jsonb_build_object(
        'deal_created', true,
        'deal_id', NEW.id,
        'source', COALESCE(NEW.source, 'unknown')
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- إنشاء trigger للتسجيل
DROP TRIGGER IF EXISTS trigger_log_deal_creation ON deals;
CREATE TRIGGER trigger_log_deal_creation
  AFTER INSERT ON deals
  FOR EACH ROW
  EXECUTE FUNCTION log_deal_creation_analytics();

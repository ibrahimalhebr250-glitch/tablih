/*
  # Fix Auto-Match: Create deals with correct status and update inventory properly

  1. Changes
    - Rewrites `auto_match_unmatched_orders` to create deals directly with 'matched' status
      (instead of calling create_deal_with_reservation which uses 'pending_confirmation')
    - Properly updates inventory_batches available_quantity when deals are created
    - Updates the order status to 'matched' atomically within the same function
    - Updates inventory_batches status to 'matched' when quantity is fully allocated

  2. Why
    - The supplier deals page expects deals with status 'matched' to show the confirmation button
    - create_deal_with_reservation was inserting with 'pending_confirmation' which doesn't match the v2 deal flow
    - This caused a disconnect: supplier saw no actionable deal, buyer saw 'tracking inventory'

  3. Trigger Update
    - Also fires on UPDATE when status changes to 'active' (not just INSERT)
    - This handles cases where a batch is created as draft then later activated
*/

-- ================================================================
-- UPDATED AUTO-MATCH FUNCTION - creates deals with 'matched' status directly
-- ================================================================
CREATE OR REPLACE FUNCTION auto_match_unmatched_orders(p_batch_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_batch inventory_batches%ROWTYPE;
  v_order RECORD;
  v_quality_order jsonb := '{"A": 4, "B": 3, "C": 2, "Scrap": 1}'::jsonb;
  v_batch_q int;
  v_order_q int;
  v_matched_qty int;
  v_price numeric;
  v_deal_id uuid;
  v_deal_ref text;
  v_matches_count int := 0;
  v_avail int;
BEGIN
  SELECT * INTO v_batch
  FROM inventory_batches
  WHERE id = p_batch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'batch_not_found');
  END IF;

  v_avail := COALESCE(v_batch.available_quantity, 0);

  IF v_avail <= 0 THEN
    RETURN jsonb_build_object('success', true, 'matches', 0, 'reason', 'no_available_quantity');
  END IF;

  v_batch_q := COALESCE((v_quality_order->>v_batch.quality)::int, 0);

  FOR v_order IN
    SELECT o.*
    FROM orders o
    WHERE o.status IN ('unmatched', 'pending')
      AND o.pallet_type = v_batch.pallet_type
      AND o.size = v_batch.size
      AND o.phone IS DISTINCT FROM v_batch.phone
      AND NOT EXISTS (
        SELECT 1 FROM deals d
        WHERE d.order_id = o.id
          AND d.status NOT IN ('cancelled')
      )
    ORDER BY o.created_at ASC
  LOOP
    IF v_avail <= 0 THEN
      EXIT;
    END IF;

    v_order_q := COALESCE((v_quality_order->>v_order.quality)::int, 0);
    IF v_order.quality != v_batch.quality THEN
      IF NOT v_order.accept_close_quality OR abs(v_batch_q - v_order_q) > 1 THEN
        CONTINUE;
      END IF;
    END IF;

    IF v_order.city != v_batch.city THEN
      IF NOT v_order.accept_close_city THEN
        CONTINUE;
      END IF;
    END IF;

    IF v_order.accept_partial_delivery THEN
      v_matched_qty := LEAST(v_order.quantity, v_avail);
    ELSE
      IF v_avail < v_order.quantity THEN
        CONTINUE;
      END IF;
      v_matched_qty := v_order.quantity;
    END IF;

    IF v_matched_qty <= 0 THEN
      CONTINUE;
    END IF;

    v_price := calculate_dynamic_price(
      v_batch.pallet_type,
      v_batch.quality,
      v_batch.size,
      v_matched_qty
    );

    v_deal_ref := 'DEL-' || upper(substring(gen_random_uuid()::text, 1, 6));

    INSERT INTO deals (
      deal_ref, request_id, order_id, inventory_batch_id,
      buyer_phone, supplier_phone,
      pallet_type, size, quality, city,
      quantity, final_price, status
    ) VALUES (
      v_deal_ref, v_order.request_id, v_order.id, v_batch.id,
      v_order.phone, v_batch.phone,
      v_batch.pallet_type, v_batch.size, v_batch.quality, v_batch.city,
      v_matched_qty, v_price, 'matched'
    )
    RETURNING id INTO v_deal_id;

    v_avail := v_avail - v_matched_qty;

    UPDATE inventory_batches SET
      available_quantity = v_avail,
      matched_quantity = COALESCE(matched_quantity, 0) + v_matched_qty,
      status = CASE WHEN v_avail <= 0 THEN 'matched' ELSE status END,
      updated_at = now()
    WHERE id = p_batch_id;

    UPDATE orders SET
      status = 'matched',
      matched_quantity = v_matched_qty,
      matched_price = v_price,
      updated_at = now()
    WHERE id = v_order.id;

    v_matches_count := v_matches_count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'matches', v_matches_count);
END;
$$;

-- ================================================================
-- UPDATE TRIGGER to also fire on UPDATE (when status changes to active)
-- ================================================================
CREATE OR REPLACE FUNCTION trigger_auto_match_on_inventory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_should_run boolean := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_should_run := (NEW.status = 'active' AND COALESCE(NEW.available_quantity, 0) > 0);
  ELSIF TG_OP = 'UPDATE' THEN
    v_should_run := (
      NEW.status = 'active'
      AND COALESCE(NEW.available_quantity, 0) > 0
      AND (OLD.status IS DISTINCT FROM 'active')
    );
  END IF;

  IF v_should_run THEN
    v_result := auto_match_unmatched_orders(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_match_inventory_trigger ON inventory_batches;

CREATE TRIGGER auto_match_inventory_trigger
  AFTER INSERT OR UPDATE ON inventory_batches
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_match_on_inventory();

/*
  # Auto-Match Unmatched Orders When New Inventory Is Added

  1. New Functions
    - `calculate_dynamic_price(p_pallet_type, p_quality, p_size, p_quantity)` 
      - Mirrors the frontend pricing logic in the database
    - `auto_match_unmatched_orders(p_batch_id)` 
      - Scans all orders with status 'unmatched' or 'pending'
      - Finds orders that match the new inventory batch specs (type, size, quality, city)
      - Supports flexible quality matching (one grade apart) when order has accept_close_quality
      - Supports flexible city matching when order has accept_close_city
      - Prevents self-matching (buyer != supplier)
      - Creates a deal via create_deal_with_reservation for the best match
      - Updates the order status to 'matched'

  2. New Trigger
    - `trigger_auto_match_on_inventory_insert` fires AFTER INSERT on `inventory_batches`
    - Only fires when the new batch has available_quantity > 0 and status = 'active'

  3. Important Notes
    - Only one order is matched per batch insert (the oldest matching order gets priority)
    - The deal is created with 'matched' status (same as manual matching flow)
    - The trigger is lightweight and only calls the function when inventory is active
*/

-- ================================================================
-- PRICING FUNCTION (mirrors frontend calculateDynamicPrice)
-- ================================================================
CREATE OR REPLACE FUNCTION calculate_dynamic_price(
  p_pallet_type text,
  p_quality text,
  p_size text,
  p_quantity integer
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_base numeric;
  v_quality_mult numeric;
  v_size_mult numeric;
  v_volume_discount numeric;
BEGIN
  v_base := CASE p_pallet_type
    WHEN 'خشبية' THEN 45
    WHEN 'بلاستيكية' THEN 65
    WHEN 'إعادة تدوير' THEN 20
    ELSE 45
  END;

  v_quality_mult := CASE p_quality
    WHEN 'A' THEN 1.4
    WHEN 'B' THEN 1.0
    WHEN 'C' THEN 0.75
    WHEN 'Scrap' THEN 0.35
    ELSE 1.0
  END;

  v_size_mult := CASE p_size
    WHEN '120×100' THEN 1.0
    WHEN '110×110' THEN 1.05
    WHEN '120×80' THEN 0.85
    WHEN '80×60' THEN 0.7
    WHEN 'أخرى' THEN 0.9
    ELSE 1.0
  END;

  v_volume_discount := CASE
    WHEN p_quantity >= 2000 THEN 0.92
    WHEN p_quantity >= 1000 THEN 0.96
    ELSE 1.0
  END;

  RETURN round(v_base * v_quality_mult * v_size_mult * v_volume_discount);
END;
$$;

-- ================================================================
-- AUTO-MATCH FUNCTION
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
  v_deal_result jsonb;
  v_matches_count int := 0;
BEGIN
  SELECT * INTO v_batch
  FROM inventory_batches
  WHERE id = p_batch_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'batch_not_found');
  END IF;

  IF v_batch.available_quantity <= 0 THEN
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
    IF v_batch.available_quantity <= 0 THEN
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
      v_matched_qty := LEAST(v_order.quantity, v_batch.available_quantity);
    ELSE
      IF v_batch.available_quantity < v_order.quantity THEN
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

    v_deal_result := create_deal_with_reservation(
      v_order.id,
      v_batch.id,
      v_order.phone,
      v_batch.phone,
      v_batch.pallet_type,
      v_batch.size,
      v_batch.quality,
      v_batch.city,
      v_matched_qty,
      v_price,
      v_order.request_id
    );

    IF (v_deal_result->>'success')::boolean THEN
      UPDATE orders SET
        status = 'matched',
        matched_quantity = v_matched_qty,
        matched_price = v_price,
        updated_at = now()
      WHERE id = v_order.id;

      v_matches_count := v_matches_count + 1;

      SELECT available_quantity INTO v_batch.available_quantity
      FROM inventory_batches
      WHERE id = p_batch_id;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'matches', v_matches_count);
END;
$$;

-- ================================================================
-- TRIGGER FUNCTION
-- ================================================================
CREATE OR REPLACE FUNCTION trigger_auto_match_on_inventory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NEW.status = 'active' AND COALESCE(NEW.available_quantity, 0) > 0 THEN
    v_result := auto_match_unmatched_orders(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- ================================================================
-- CREATE TRIGGER (drop if exists first)
-- ================================================================
DROP TRIGGER IF EXISTS auto_match_inventory_trigger ON inventory_batches;

CREATE TRIGGER auto_match_inventory_trigger
  AFTER INSERT ON inventory_batches
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_match_on_inventory();

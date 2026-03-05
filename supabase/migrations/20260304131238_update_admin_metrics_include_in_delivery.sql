/*
  # Update admin_get_deal_metrics_v4 to include in_delivery

  ## Summary
  Updates the metrics function so that deals with status `in_delivery`
  are counted as "active deals" alongside `inventory_reserved` deals.
*/

CREATE OR REPLACE FUNCTION admin_get_deal_metrics_v4()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_deals       int;
  v_awaiting_buyer  int;
  v_active_deals    int;
  v_stalled_deals   int;
  v_completed_deals int;
  v_cancelled_deals int;
  v_volume_today    int;
  v_stall_threshold timestamptz := now() - interval '3 days';
BEGIN
  SELECT COUNT(*) INTO v_new_deals       FROM deals WHERE status = 'matched';
  SELECT COUNT(*) INTO v_awaiting_buyer  FROM deals WHERE status = 'awaiting_buyer';
  SELECT COUNT(*) INTO v_active_deals    FROM deals WHERE status IN ('inventory_reserved', 'in_delivery');
  SELECT COUNT(*) INTO v_stalled_deals   FROM deals
    WHERE status IN ('inventory_reserved', 'in_delivery')
    AND reserved_at IS NOT NULL AND reserved_at < v_stall_threshold;
  SELECT COUNT(*) INTO v_completed_deals FROM deals WHERE status = 'completed';
  SELECT COUNT(*) INTO v_cancelled_deals FROM deals WHERE status = 'cancelled';
  SELECT COALESCE(SUM(quantity), 0) INTO v_volume_today
    FROM deals
    WHERE status = 'completed' AND completed_at >= CURRENT_DATE;

  RETURN jsonb_build_object(
    'new_deals',       v_new_deals,
    'awaiting_buyer',  v_awaiting_buyer,
    'active_deals',    v_active_deals,
    'stalled_deals',   v_stalled_deals,
    'completed_deals', v_completed_deals,
    'cancelled_deals', v_cancelled_deals,
    'volume_today',    v_volume_today
  );
END;
$$;

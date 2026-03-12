/*
  # Fix get_finance_dashboard_metrics to Include Sale Request Commissions

  The current function only counts commissions from the deals table.
  Sale request commissions are stored directly in commission_settlements
  with deal_reference = 'sale_request:...' and deal_id = NULL.

  This migration updates the function to:
  - total_commission: sum from deals + pending sale_request commissions
  - settled_commission: all settled commission_settlements (both types)
  - outstanding_commission: total - settled
*/

CREATE OR REPLACE FUNCTION get_finance_dashboard_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_pallets bigint;
  v_deals_commission numeric;
  v_sale_request_commission numeric;
  v_total_commission numeric;
  v_settled_commission numeric;
  v_outstanding_commission numeric;
BEGIN
  SELECT COALESCE(SUM(quantity), 0) INTO v_total_pallets
  FROM deals
  WHERE status NOT IN ('cancelled');

  SELECT COALESCE(SUM(quantity * COALESCE(platform_fee_per_pallet, 1.00)), 0)
  INTO v_deals_commission
  FROM deals
  WHERE status NOT IN ('cancelled');

  SELECT COALESCE(SUM(COALESCE(total_commission, commission_amount, 0)), 0)
  INTO v_sale_request_commission
  FROM commission_settlements
  WHERE deal_id IS NULL
    AND deal_reference LIKE 'sale_request:%';

  v_total_commission := v_deals_commission + v_sale_request_commission;

  SELECT COALESCE(SUM(COALESCE(total_commission, commission_amount, 0)), 0)
  INTO v_settled_commission
  FROM commission_settlements
  WHERE status = 'settled';

  v_outstanding_commission := v_total_commission - v_settled_commission;

  RETURN jsonb_build_object(
    'total_pallets', v_total_pallets,
    'total_commission', v_total_commission,
    'settled_commission', v_settled_commission,
    'outstanding_commission', GREATEST(v_outstanding_commission, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_finance_dashboard_metrics() TO authenticated, anon;

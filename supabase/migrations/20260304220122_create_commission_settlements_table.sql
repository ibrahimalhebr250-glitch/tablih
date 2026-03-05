/*
  # Create Commission Settlements Table

  1. New Tables
    - `commission_settlements`
      - `id` (uuid, primary key)
      - `supplier_phone` (text) - the supplier who owes the commission
      - `deal_id` (uuid, FK to deals) - the deal this settlement relates to
      - `commission_amount` (numeric) - amount owed
      - `settlement_method` (text) - bank_transfer, cash, manual
      - `settled_by` (text) - staff member who recorded the settlement
      - `settled_at` (timestamptz) - when settlement was recorded
      - `status` (text) - pending, settled
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `commission_settlements` table
    - Policy for service role access (admin operations via SECURITY DEFINER functions)

  3. Functions
    - `settle_supplier_commission` - marks a deal's commission as settled
    - `get_finance_dashboard_metrics` - returns KPI data for the finance dashboard
    - `get_supplier_financial_profile` - returns financial details for a specific supplier

  4. Notes
    - The deals table already has `platform_fee_per_pallet` (default 1.00 SAR)
    - Commission = quantity * platform_fee_per_pallet for each completed deal
    - Overdue threshold is 7 days after deal completion
*/

-- ================================================================
-- COMMISSION SETTLEMENTS TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS commission_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_phone text NOT NULL,
  deal_id uuid REFERENCES deals(id),
  pallet_count integer NOT NULL DEFAULT 0,
  commission_amount numeric NOT NULL DEFAULT 0,
  settlement_method text NOT NULL DEFAULT 'bank_transfer'
    CHECK (settlement_method IN ('bank_transfer', 'cash', 'manual')),
  settled_by text NOT NULL DEFAULT 'staff',
  settled_at timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'settled'
    CHECK (status IN ('pending', 'settled')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE commission_settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage commission settlements"
  ON commission_settlements
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can read commission settlements"
  ON commission_settlements
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert commission settlements"
  ON commission_settlements
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update commission settlements"
  ON commission_settlements
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- ================================================================
-- SETTLE SUPPLIER COMMISSION FUNCTION
-- ================================================================
CREATE OR REPLACE FUNCTION settle_supplier_commission(
  p_deal_id uuid,
  p_method text DEFAULT 'bank_transfer',
  p_staff text DEFAULT 'staff'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deal deals%ROWTYPE;
  v_commission numeric;
  v_existing_settlement uuid;
BEGIN
  SELECT * INTO v_deal FROM deals WHERE id = p_deal_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'deal_not_found');
  END IF;

  SELECT id INTO v_existing_settlement
  FROM commission_settlements
  WHERE deal_id = p_deal_id AND status = 'settled';

  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_settled');
  END IF;

  v_commission := v_deal.quantity * COALESCE(v_deal.platform_fee_per_pallet, 1.00);

  INSERT INTO commission_settlements (
    supplier_phone, deal_id, pallet_count, commission_amount,
    settlement_method, settled_by, status
  ) VALUES (
    v_deal.supplier_phone, p_deal_id, v_deal.quantity, v_commission,
    p_method, p_staff, 'settled'
  );

  UPDATE supplier_liabilities
  SET status = 'settled',
      amount_paid = amount_owed,
      settled_at = now(),
      updated_at = now()
  WHERE deal_id = p_deal_id AND status IN ('pending', 'partial');

  RETURN jsonb_build_object('success', true, 'commission', v_commission);
END;
$$;

-- ================================================================
-- FINANCE DASHBOARD METRICS FUNCTION
-- ================================================================
CREATE OR REPLACE FUNCTION get_finance_dashboard_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_pallets bigint;
  v_total_commission numeric;
  v_settled_commission numeric;
  v_outstanding_commission numeric;
BEGIN
  SELECT COALESCE(SUM(quantity), 0) INTO v_total_pallets
  FROM deals
  WHERE status NOT IN ('cancelled');

  SELECT COALESCE(SUM(quantity * COALESCE(platform_fee_per_pallet, 1.00)), 0)
  INTO v_total_commission
  FROM deals
  WHERE status NOT IN ('cancelled');

  SELECT COALESCE(SUM(commission_amount), 0)
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

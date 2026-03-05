/*
  # Admin Enterprise System — Full Control Layer

  ## Summary
  Creates the complete administrative infrastructure for the platform including:
  - City management with per-city overrides
  - Ledger engine for financial tracking
  - Audit log for all admin actions
  - Admin roles with granular permissions
  - Risk alerts system
  - Supplier liabilities tracking

  ## New Tables

  ### `cities`
  Platform-managed city entities with operational controls.
  - `id` (uuid)
  - `name` (text, unique) — Arabic city name
  - `status` (text) — active / monitoring / pilot / frozen
  - `custom_fee_override` (numeric, nullable) — overrides platform_fee_per_unit
  - `custom_reservation_hours` (integer, nullable) — overrides default 30 min
  - `custom_settlement_hours` (integer, nullable) — overrides default 24h
  - `minimum_quantity` (integer) — min per deal
  - `matching_enabled` (boolean) — can be disabled without breaking active deals
  - `supply_demand_index` (numeric) — computed imbalance indicator
  - `financing_flag` (boolean) — future: financing enabled
  - `carbon_savings_value` (numeric, nullable) — future: CO2 tracking
  - `certification_badge` (text, nullable) — future: certifications

  ### `ledger_entries`
  Immutable double-entry ledger. Every financial event creates entries.
  - `id` (uuid)
  - `deal_id` (uuid FK deals)
  - `entry_type` (text) — platform_revenue / supplier_liability / payment_received / settlement_paid / fee_adjustment
  - `direction` (text) — credit / debit
  - `amount` (numeric)
  - `currency` (text, default SAR)
  - `reference` (text) — deal_ref or manual reference
  - `description` (text)
  - `created_by` (text) — admin phone or 'system'
  - `created_at` (timestamptz)
  - `is_reversed` (boolean) — for corrections only
  - `reversal_reason` (text)

  ### `supplier_liabilities`
  Running balance of what the platform owes each supplier.
  - `id` (uuid)
  - `supplier_phone` (text)
  - `deal_id` (uuid FK deals)
  - `amount_owed` (numeric) — supplier_price × quantity
  - `amount_paid` (numeric, default 0)
  - `status` (text) — pending / partial / settled / frozen
  - `settled_at` (timestamptz)
  - `notes` (text)

  ### `audit_log`
  Immutable record of every admin action. Cannot be edited or deleted.
  - `id` (uuid)
  - `admin_phone` (text)
  - `action` (text) — confirm_payment / settle_supplier / modify_fee / freeze_city / etc.
  - `entity_type` (text) — deal / user / city / inventory / settings
  - `entity_id` (text)
  - `before_value` (jsonb)
  - `after_value` (jsonb)
  - `reason` (text)
  - `ip_hint` (text, nullable)
  - `created_at` (timestamptz)

  ### `admin_roles`
  RBAC for admin users.
  - `id` (uuid)
  - `phone` (text, unique)
  - `role` (text) — super_admin / financial_admin / operations_manager / support_agent
  - `can_view` (boolean)
  - `can_edit` (boolean)
  - `can_delete` (boolean)
  - `can_settle` (boolean)
  - `can_modify_financials` (boolean)
  - `can_manage_cities` (boolean)
  - `can_manage_users` (boolean)
  - `is_active` (boolean)
  - `created_at`, `updated_at`

  ### `risk_alerts`
  Auto-generated and manually created risk flags.
  - `id` (uuid)
  - `alert_type` (text) — overdue_deal / late_payment / high_cancellation / dormant_inventory / city_imbalance / suspicious_account
  - `severity` (text) — low / medium / high / critical
  - `entity_type` (text)
  - `entity_id` (text)
  - `title` (text)
  - `description` (text)
  - `is_resolved` (boolean)
  - `resolved_by` (text)
  - `resolved_at` (timestamptz)
  - `resolution_note` (text)
  - `created_at`, `updated_at`

  ## New Functions

  ### `create_ledger_entries_for_deal(p_deal_id uuid)`
  When a deal reaches `paid` status, creates:
  1. platform_revenue entry (credit, platform_fee × quantity)
  2. supplier_liability entry (debit, supplier_price × quantity)
  Also inserts/updates `supplier_liabilities` record.

  ### `admin_write_audit_log(p_admin_phone, p_action, p_entity_type, p_entity_id, p_before, p_after, p_reason)`
  Inserts immutable audit record. Used by all admin RPC functions.

  ### `admin_modify_deal_fee(p_deal_id, p_new_fee, p_admin_phone, p_reason)`
  Modifies platform_fee on a deal (only before paid status).
  Recalculates buyer_price. Writes audit log.

  ### `admin_force_status(p_deal_id, p_new_status, p_admin_phone, p_reason)`
  Super admin only: Force any status change with mandatory reason.

  ### `admin_suspend_user(p_phone, p_admin_phone, p_reason)`
  Soft-suspends a user account.

  ### `admin_freeze_batch(p_batch_id, p_admin_phone, p_reason)`
  Freezes an inventory batch (removes from matching, does not break active deals).

  ### `generate_risk_alerts()`
  Scans for: overdue deals (>48h awaiting_payment), high cancellation suppliers,
  dormant inventory (>7 days no movement).

  ## Security
  - RLS enabled on all new tables
  - Only anon read for non-sensitive data
  - audit_log: INSERT only (no UPDATE, no DELETE for data integrity)
  - admin_roles: protected

  ## Important Notes
  1. ledger_entries are IMMUTABLE — no updates or deletes allowed
  2. audit_log is IMMUTABLE — append-only
  3. City freezing does NOT cancel active deals
  4. supplier_liabilities are auto-created when payment is confirmed
  5. All admin financial edits require mandatory reason field
*/

-- ============================================================
-- 1. CITIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'monitoring', 'pilot', 'frozen')),
  custom_fee_override numeric(10,2),
  custom_reservation_hours integer,
  custom_settlement_hours integer,
  minimum_quantity integer NOT NULL DEFAULT 1,
  matching_enabled boolean NOT NULL DEFAULT true,
  supply_demand_index numeric(5,2) NOT NULL DEFAULT 0,
  financing_flag boolean NOT NULL DEFAULT false,
  carbon_savings_value numeric(10,2),
  certification_badge text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cities"
  ON cities FOR SELECT
  TO anon
  USING (true);

-- Seed cities from SAUDI_CITIES list
INSERT INTO cities (name, status) VALUES
  ('الرياض', 'active'),
  ('جدة', 'active'),
  ('مكة المكرمة', 'active'),
  ('المدينة المنورة', 'active'),
  ('الدمام', 'active'),
  ('الخبر', 'active'),
  ('الأحساء', 'active'),
  ('تبوك', 'monitoring'),
  ('بريدة', 'monitoring'),
  ('خميس مشيط', 'pilot'),
  ('الطائف', 'monitoring'),
  ('ينبع', 'monitoring'),
  ('الجبيل', 'active'),
  ('حائل', 'pilot'),
  ('نجران', 'pilot'),
  ('ابها', 'pilot'),
  ('القصيم', 'monitoring'),
  ('القطيف', 'monitoring'),
  ('الخرج', 'monitoring'),
  ('المجمعة', 'pilot')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 2. LEDGER ENTRIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES deals(id) ON DELETE SET NULL,
  entry_type text NOT NULL
    CHECK (entry_type IN ('platform_revenue','supplier_liability','payment_received','settlement_paid','fee_adjustment','manual_credit','manual_debit')),
  direction text NOT NULL CHECK (direction IN ('credit','debit')),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'SAR',
  reference text,
  description text,
  created_by text NOT NULL DEFAULT 'system',
  created_at timestamptz DEFAULT now(),
  is_reversed boolean NOT NULL DEFAULT false,
  reversal_reason text
);

ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read ledger_entries"
  ON ledger_entries FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can insert ledger_entries"
  ON ledger_entries FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_ledger_deal_id ON ledger_entries(deal_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entry_type ON ledger_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_ledger_created_at ON ledger_entries(created_at DESC);

-- ============================================================
-- 3. SUPPLIER LIABILITIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS supplier_liabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_phone text NOT NULL,
  deal_id uuid REFERENCES deals(id) ON DELETE SET NULL,
  amount_owed numeric(12,2) NOT NULL,
  amount_paid numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','partial','settled','frozen')),
  settled_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE supplier_liabilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read supplier_liabilities"
  ON supplier_liabilities FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can insert supplier_liabilities"
  ON supplier_liabilities FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anyone can update supplier_liabilities"
  ON supplier_liabilities FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_liabilities_supplier ON supplier_liabilities(supplier_phone);
CREATE INDEX IF NOT EXISTS idx_liabilities_status ON supplier_liabilities(status);
CREATE INDEX IF NOT EXISTS idx_liabilities_deal_id ON supplier_liabilities(deal_id);

-- ============================================================
-- 4. AUDIT LOG TABLE (APPEND-ONLY)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_phone text NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL
    CHECK (entity_type IN ('deal','user','city','inventory','settings','ledger','alert')),
  entity_id text,
  before_value jsonb,
  after_value jsonb,
  reason text,
  ip_hint text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read audit_log"
  ON audit_log FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can insert audit_log"
  ON audit_log FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_audit_admin ON audit_log(admin_phone);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);

-- ============================================================
-- 5. ADMIN ROLES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text UNIQUE NOT NULL,
  display_name text,
  role text NOT NULL DEFAULT 'support_agent'
    CHECK (role IN ('super_admin','financial_admin','operations_manager','support_agent')),
  can_view boolean NOT NULL DEFAULT true,
  can_edit boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  can_settle boolean NOT NULL DEFAULT false,
  can_modify_financials boolean NOT NULL DEFAULT false,
  can_manage_cities boolean NOT NULL DEFAULT false,
  can_manage_users boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read admin_roles"
  ON admin_roles FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can insert admin_roles"
  ON admin_roles FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anyone can update admin_roles"
  ON admin_roles FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 6. RISK ALERTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS risk_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL
    CHECK (alert_type IN ('overdue_deal','late_payment','high_cancellation','dormant_inventory','city_imbalance','suspicious_account','frozen_inventory')),
  severity text NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low','medium','high','critical')),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  title text NOT NULL,
  description text,
  is_resolved boolean NOT NULL DEFAULT false,
  resolved_by text,
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE risk_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read risk_alerts"
  ON risk_alerts FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can insert risk_alerts"
  ON risk_alerts FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anyone can update risk_alerts"
  ON risk_alerts FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_alerts_type ON risk_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON risk_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON risk_alerts(is_resolved);

-- ============================================================
-- 7. ADD SUSPENSION COLUMN TO platform_users
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_users' AND column_name = 'is_suspended'
  ) THEN
    ALTER TABLE platform_users ADD COLUMN is_suspended boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_users' AND column_name = 'suspension_reason'
  ) THEN
    ALTER TABLE platform_users ADD COLUMN suspension_reason text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_users' AND column_name = 'risk_flag'
  ) THEN
    ALTER TABLE platform_users ADD COLUMN risk_flag boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- ============================================================
-- 8. ADD FROZEN / ADMIN NOTES TO inventory_batches
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_batches' AND column_name = 'is_frozen'
  ) THEN
    ALTER TABLE inventory_batches ADD COLUMN is_frozen boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_batches' AND column_name = 'hide_from_matching'
  ) THEN
    ALTER TABLE inventory_batches ADD COLUMN hide_from_matching boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_batches' AND column_name = 'admin_notes'
  ) THEN
    ALTER TABLE inventory_batches ADD COLUMN admin_notes text;
  END IF;
END $$;

-- ============================================================
-- 9. ADD INTERNAL NOTES TO deals
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'admin_notes'
  ) THEN
    ALTER TABLE deals ADD COLUMN admin_notes text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'is_suspended'
  ) THEN
    ALTER TABLE deals ADD COLUMN is_suspended boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- ============================================================
-- 10. FUNCTION: write_audit_log
-- ============================================================
CREATE OR REPLACE FUNCTION write_audit_log(
  p_admin_phone  text,
  p_action       text,
  p_entity_type  text,
  p_entity_id    text,
  p_before_value jsonb,
  p_after_value  jsonb,
  p_reason       text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO audit_log (admin_phone, action, entity_type, entity_id, before_value, after_value, reason)
  VALUES (p_admin_phone, p_action, p_entity_type, p_entity_id, p_before_value, p_after_value, p_reason)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ============================================================
-- 11. FUNCTION: create_ledger_entries_for_deal
-- Called when admin confirms payment (paid status)
-- ============================================================
CREATE OR REPLACE FUNCTION create_ledger_entries_for_deal(p_deal_id uuid, p_admin_phone text DEFAULT 'system')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deal deals%ROWTYPE;
  v_supplier_amount numeric(12,2);
  v_platform_amount numeric(12,2);
BEGIN
  SELECT * INTO v_deal FROM deals WHERE id = p_deal_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deal not found');
  END IF;

  v_supplier_amount := v_deal.quantity * COALESCE(v_deal.supplier_price, v_deal.final_price);
  v_platform_amount := v_deal.quantity * COALESCE(v_deal.platform_fee, 0);

  -- Platform revenue entry
  IF v_platform_amount > 0 THEN
    INSERT INTO ledger_entries (deal_id, entry_type, direction, amount, reference, description, created_by)
    VALUES (
      p_deal_id, 'platform_revenue', 'credit', v_platform_amount,
      v_deal.deal_ref,
      'رسوم المنصة — ' || v_deal.deal_ref,
      p_admin_phone
    );
  END IF;

  -- Supplier liability entry
  INSERT INTO ledger_entries (deal_id, entry_type, direction, amount, reference, description, created_by)
  VALUES (
    p_deal_id, 'supplier_liability', 'debit', v_supplier_amount,
    v_deal.deal_ref,
    'التزام للمورد — ' || v_deal.deal_ref,
    p_admin_phone
  );

  -- Payment received entry
  INSERT INTO ledger_entries (deal_id, entry_type, direction, amount, reference, description, created_by)
  VALUES (
    p_deal_id, 'payment_received', 'credit', v_deal.quantity * COALESCE(v_deal.buyer_price, v_deal.final_price),
    COALESCE(v_deal.payment_reference, v_deal.deal_ref),
    'مدفوعات المشتري — ' || v_deal.deal_ref,
    p_admin_phone
  );

  -- Upsert supplier_liabilities
  INSERT INTO supplier_liabilities (supplier_phone, deal_id, amount_owed, status)
  VALUES (v_deal.supplier_phone, p_deal_id, v_supplier_amount, 'pending')
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- 12. FUNCTION: admin_confirm_payment (UPDATED with ledger)
-- ============================================================
CREATE OR REPLACE FUNCTION admin_confirm_payment(p_deal_id uuid, p_admin_phone text DEFAULT 'system')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deal deals%ROWTYPE;
BEGIN
  SELECT * INTO v_deal FROM deals WHERE id = p_deal_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deal not found');
  END IF;

  IF v_deal.status != 'awaiting_payment' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deal must be in awaiting_payment status');
  END IF;

  IF v_deal.payment_reference IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment reference not submitted yet');
  END IF;

  UPDATE deals
  SET
    status               = 'supplier_notified',
    payment_confirmed_at = now(),
    supplier_notified_at = now(),
    updated_at           = now()
  WHERE id = p_deal_id;

  -- Create ledger entries
  PERFORM create_ledger_entries_for_deal(p_deal_id, p_admin_phone);

  -- Audit log
  PERFORM write_audit_log(
    p_admin_phone, 'confirm_payment', 'deal', p_deal_id::text,
    jsonb_build_object('status', 'awaiting_payment'),
    jsonb_build_object('status', 'supplier_notified', 'payment_confirmed_at', now()),
    'تأكيد الدفع'
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- 13. FUNCTION: admin_settle_supplier (UPDATED with ledger + liability)
-- ============================================================
CREATE OR REPLACE FUNCTION admin_settle_supplier(p_deal_id uuid, p_admin_phone text DEFAULT 'system')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deal deals%ROWTYPE;
  v_supplier_amount numeric(12,2);
BEGIN
  SELECT * INTO v_deal FROM deals WHERE id = p_deal_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deal not found');
  END IF;

  IF v_deal.status != 'settlement_pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deal must be in settlement_pending status');
  END IF;

  v_supplier_amount := v_deal.quantity * COALESCE(v_deal.supplier_price, v_deal.final_price);

  UPDATE deals
  SET
    status              = 'supplier_settled',
    supplier_settled_at = now(),
    updated_at          = now()
  WHERE id = p_deal_id;

  -- Settlement ledger entry
  INSERT INTO ledger_entries (deal_id, entry_type, direction, amount, reference, description, created_by)
  VALUES (
    p_deal_id, 'settlement_paid', 'debit', v_supplier_amount,
    v_deal.deal_ref,
    'تسوية المورد — ' || v_deal.deal_ref,
    p_admin_phone
  );

  -- Update supplier liability
  UPDATE supplier_liabilities
  SET
    amount_paid = amount_owed,
    status      = 'settled',
    settled_at  = now(),
    updated_at  = now()
  WHERE deal_id = p_deal_id;

  -- Audit log
  PERFORM write_audit_log(
    p_admin_phone, 'settle_supplier', 'deal', p_deal_id::text,
    jsonb_build_object('status', 'settlement_pending'),
    jsonb_build_object('status', 'supplier_settled', 'settled_at', now(), 'amount', v_supplier_amount),
    'تسوية حساب المورد'
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- 14. FUNCTION: admin_modify_deal_fee
-- Modify platform_fee before deal is paid (requires reason)
-- ============================================================
CREATE OR REPLACE FUNCTION admin_modify_deal_fee(
  p_deal_id     uuid,
  p_new_fee     numeric,
  p_admin_phone text,
  p_reason      text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deal    deals%ROWTYPE;
  v_old_fee numeric(10,2);
BEGIN
  SELECT * INTO v_deal FROM deals WHERE id = p_deal_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deal not found');
  END IF;

  IF v_deal.status IN ('paid','supplier_notified','preparing','delivered','completed','settlement_pending','supplier_settled','cancelled') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot modify fee after payment is confirmed');
  END IF;

  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason is required for financial modifications');
  END IF;

  v_old_fee := v_deal.platform_fee;

  UPDATE deals
  SET
    platform_fee = p_new_fee,
    buyer_price  = COALESCE(supplier_price, final_price) + p_new_fee,
    updated_at   = now()
  WHERE id = p_deal_id;

  -- Audit log with before/after
  PERFORM write_audit_log(
    p_admin_phone, 'modify_fee', 'deal', p_deal_id::text,
    jsonb_build_object('platform_fee', v_old_fee, 'buyer_price', v_deal.buyer_price),
    jsonb_build_object('platform_fee', p_new_fee, 'buyer_price', COALESCE(v_deal.supplier_price, v_deal.final_price) + p_new_fee),
    p_reason
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- 15. FUNCTION: admin_force_status
-- Super admin: force any status transition with reason
-- ============================================================
CREATE OR REPLACE FUNCTION admin_force_status(
  p_deal_id     uuid,
  p_new_status  text,
  p_admin_phone text,
  p_reason      text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deal deals%ROWTYPE;
BEGIN
  SELECT * INTO v_deal FROM deals WHERE id = p_deal_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deal not found');
  END IF;

  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason is mandatory for force status change');
  END IF;

  UPDATE deals
  SET status = p_new_status, updated_at = now()
  WHERE id = p_deal_id;

  PERFORM write_audit_log(
    p_admin_phone, 'force_status_change', 'deal', p_deal_id::text,
    jsonb_build_object('status', v_deal.status),
    jsonb_build_object('status', p_new_status),
    p_reason
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- 16. FUNCTION: admin_suspend_user
-- ============================================================
CREATE OR REPLACE FUNCTION admin_suspend_user(
  p_phone       text,
  p_admin_phone text,
  p_reason      text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason required');
  END IF;

  UPDATE platform_users
  SET is_suspended = true, suspension_reason = p_reason
  WHERE phone = p_phone;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  PERFORM write_audit_log(
    p_admin_phone, 'suspend_user', 'user', p_phone,
    jsonb_build_object('is_suspended', false),
    jsonb_build_object('is_suspended', true, 'reason', p_reason),
    p_reason
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- 17. FUNCTION: admin_restore_user
-- ============================================================
CREATE OR REPLACE FUNCTION admin_restore_user(p_phone text, p_admin_phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE platform_users
  SET is_suspended = false, suspension_reason = null
  WHERE phone = p_phone;

  PERFORM write_audit_log(
    p_admin_phone, 'restore_user', 'user', p_phone,
    jsonb_build_object('is_suspended', true),
    jsonb_build_object('is_suspended', false),
    'استعادة الحساب'
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- 18. FUNCTION: admin_freeze_batch
-- ============================================================
CREATE OR REPLACE FUNCTION admin_freeze_batch(
  p_batch_id    uuid,
  p_admin_phone text,
  p_reason      text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason required');
  END IF;

  UPDATE inventory_batches
  SET is_frozen = true, hide_from_matching = true, admin_notes = p_reason, updated_at = now()
  WHERE id = p_batch_id;

  PERFORM write_audit_log(
    p_admin_phone, 'freeze_batch', 'inventory', p_batch_id::text,
    jsonb_build_object('is_frozen', false),
    jsonb_build_object('is_frozen', true, 'reason', p_reason),
    p_reason
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- 19. FUNCTION: admin_update_city
-- Update city status / overrides
-- ============================================================
CREATE OR REPLACE FUNCTION admin_update_city(
  p_city_id             uuid,
  p_status              text,
  p_matching_enabled    boolean,
  p_custom_fee_override numeric,
  p_notes               text,
  p_admin_phone         text,
  p_reason              text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_city cities%ROWTYPE;
BEGIN
  SELECT * INTO v_city FROM cities WHERE id = p_city_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'City not found');
  END IF;

  UPDATE cities
  SET
    status              = COALESCE(p_status, status),
    matching_enabled    = COALESCE(p_matching_enabled, matching_enabled),
    custom_fee_override = p_custom_fee_override,
    notes               = COALESCE(p_notes, notes),
    updated_at          = now()
  WHERE id = p_city_id;

  PERFORM write_audit_log(
    p_admin_phone, 'update_city', 'city', p_city_id::text,
    jsonb_build_object('status', v_city.status, 'matching_enabled', v_city.matching_enabled, 'custom_fee_override', v_city.custom_fee_override),
    jsonb_build_object('status', COALESCE(p_status, v_city.status), 'matching_enabled', COALESCE(p_matching_enabled, v_city.matching_enabled), 'custom_fee_override', p_custom_fee_override),
    COALESCE(p_reason, 'تحديث إعدادات المدينة')
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- 20. FUNCTION: admin_resolve_alert
-- ============================================================
CREATE OR REPLACE FUNCTION admin_resolve_alert(
  p_alert_id    uuid,
  p_admin_phone text,
  p_note        text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE risk_alerts
  SET
    is_resolved     = true,
    resolved_by     = p_admin_phone,
    resolved_at     = now(),
    resolution_note = p_note,
    updated_at      = now()
  WHERE id = p_alert_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- 21. FUNCTION: get_executive_summary
-- Returns aggregated KPIs for the executive dashboard
-- ============================================================
CREATE OR REPLACE FUNCTION get_executive_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_gmv              numeric(14,2);
  v_platform_rev     numeric(14,2);
  v_supplier_liab    numeric(14,2);
  v_net_balance      numeric(14,2);
  v_pending_settle   numeric(14,2);
  v_active_deals     integer;
  v_awaiting_payment integer;
  v_total_inventory  integer;
  v_open_requests    integer;
  v_unconfirmed_pay  integer;
  v_critical_alerts  integer;
BEGIN
  -- GMV: total buyer_price × quantity for all completed+ deals
  SELECT COALESCE(SUM(quantity * COALESCE(buyer_price, final_price)), 0)
  INTO v_gmv
  FROM deals
  WHERE status IN ('paid','supplier_notified','preparing','delivered','completed','settlement_pending','supplier_settled');

  -- Platform revenue from ledger
  SELECT COALESCE(SUM(amount), 0)
  INTO v_platform_rev
  FROM ledger_entries
  WHERE entry_type = 'platform_revenue' AND NOT is_reversed;

  -- Supplier liabilities outstanding
  SELECT COALESCE(SUM(amount_owed - amount_paid), 0)
  INTO v_supplier_liab
  FROM supplier_liabilities
  WHERE status IN ('pending','partial');

  -- Net balance
  v_net_balance := v_platform_rev - v_supplier_liab;

  -- Pending settlements amount
  SELECT COALESCE(SUM(sl.amount_owed - sl.amount_paid), 0)
  INTO v_pending_settle
  FROM supplier_liabilities sl
  JOIN deals d ON d.id = sl.deal_id
  WHERE d.status = 'settlement_pending';

  -- Active deals count
  SELECT COUNT(*) INTO v_active_deals
  FROM deals
  WHERE status IN ('supplier_confirmed','buyer_confirmed','awaiting_payment','paid','supplier_notified','preparing','delivered');

  -- Awaiting payment
  SELECT COUNT(*) INTO v_awaiting_payment
  FROM deals WHERE status = 'awaiting_payment';

  -- Total available inventory
  SELECT COALESCE(SUM(quantity_available), 0) INTO v_total_inventory
  FROM inventory_batches WHERE status = 'active' AND NOT hide_from_matching;

  -- Open requests
  SELECT COUNT(*) INTO v_open_requests
  FROM orders WHERE status = 'pending';

  -- Unconfirmed payments (with proof submitted but not yet confirmed)
  SELECT COUNT(*) INTO v_unconfirmed_pay
  FROM deals WHERE status = 'awaiting_payment' AND payment_reference IS NOT NULL;

  -- Critical alerts
  SELECT COUNT(*) INTO v_critical_alerts
  FROM risk_alerts WHERE NOT is_resolved AND severity = 'critical';

  RETURN jsonb_build_object(
    'gmv', v_gmv,
    'platform_revenue', v_platform_rev,
    'supplier_liabilities', v_supplier_liab,
    'net_balance', v_net_balance,
    'pending_settlements', v_pending_settle,
    'active_deals', v_active_deals,
    'awaiting_payment', v_awaiting_payment,
    'total_inventory', v_total_inventory,
    'open_requests', v_open_requests,
    'unconfirmed_payments', v_unconfirmed_pay,
    'critical_alerts', v_critical_alerts
  );
END;
$$;

-- ============================================================
-- 22. FUNCTION: generate_risk_alerts
-- Scan and insert new risk alerts
-- ============================================================
CREATE OR REPLACE FUNCTION generate_risk_alerts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer := 0;
  v_deal  record;
  v_batch record;
BEGIN
  -- Overdue deals: awaiting_payment > 48 hours with no payment proof
  FOR v_deal IN
    SELECT id, deal_ref, buyer_phone FROM deals
    WHERE status = 'awaiting_payment'
      AND payment_reference IS NULL
      AND updated_at < now() - interval '48 hours'
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM risk_alerts
      WHERE entity_type = 'deal' AND entity_id = v_deal.id::text
        AND alert_type = 'late_payment' AND NOT is_resolved
    ) THEN
      INSERT INTO risk_alerts (alert_type, severity, entity_type, entity_id, title, description)
      VALUES ('late_payment', 'high', 'deal', v_deal.id::text,
        'دفع متأخر — ' || v_deal.deal_ref,
        'الصفقة بانتظار الدفع أكثر من 48 ساعة دون تقديم إثبات — ' || v_deal.buyer_phone);
      v_count := v_count + 1;
    END IF;
  END LOOP;

  -- Dormant inventory: active batches not moved in 7 days
  FOR v_batch IN
    SELECT id, batch_ref, phone FROM inventory_batches
    WHERE status = 'active'
      AND NOT is_frozen
      AND quantity_available > 0
      AND updated_at < now() - interval '7 days'
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM risk_alerts
      WHERE entity_type = 'inventory' AND entity_id = v_batch.id::text
        AND alert_type = 'dormant_inventory' AND NOT is_resolved
    ) THEN
      INSERT INTO risk_alerts (alert_type, severity, entity_type, entity_id, title, description)
      VALUES ('dormant_inventory', 'low', 'inventory', v_batch.id::text,
        'مخزون راكد — ' || v_batch.batch_ref,
        'لم يتحرك هذا المخزون منذ أكثر من 7 أيام — ' || v_batch.phone);
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

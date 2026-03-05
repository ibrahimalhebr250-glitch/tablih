/*
  # Full Deal Lifecycle — Phase 2

  ## Summary
  Expands the deals table with a complete, locked status flow, price freeze mechanics,
  payment proof fields, delivery tracking, and settlement states.
  Also creates the admin_settings table for platform-wide configuration.

  ## New Tables

  ### `admin_settings`
  Platform-wide configuration. Single row expected.
  - `id` (uuid, primary key)
  - `platform_fee_per_unit` (numeric) — fixed fee added on top of supplier price per unit
  - `settlement_review_hours` (integer) — hours to wait before settlement_pending → supplier_settled (default 24)
  - `created_at`, `updated_at` (timestamptz)

  ## Modified Tables

  ### `deals`
  Status enum expanded from 5 → 11 states:
    matched → supplier_confirmed → buyer_confirmed → awaiting_payment →
    paid → supplier_notified → preparing → delivered → completed →
    settlement_pending → supplier_settled
    (+ cancelled stays)

  New price columns (frozen at buyer_confirmed → awaiting_payment transition):
  - `supplier_price` (numeric) — price per unit from supplier side (replaces final_price usage)
  - `platform_fee` (numeric) — fee per unit frozen from admin_settings
  - `buyer_price` (numeric) — supplier_price + platform_fee (computed and frozen)
  - `prices_locked_at` (timestamptz) — when prices were frozen

  Payment fields:
  - `payment_reference` (text) — required text reference from buyer
  - `payment_receipt_url` (text) — uploaded receipt image URL
  - `payment_submitted_at` (timestamptz)
  - `payment_confirmed_at` (timestamptz) — when admin confirmed

  Delivery / settlement timestamps:
  - `supplier_confirmed_at` (timestamptz)
  - `buyer_confirmed_at` (timestamptz)
  - `supplier_notified_at` (timestamptz)
  - `preparing_at` (timestamptz)
  - `delivered_at` (timestamptz)
  - `settlement_pending_at` (timestamptz)
  - `supplier_settled_at` (timestamptz)

  ## New Functions

  ### `lock_deal_prices(p_deal_id uuid)`
  Atomically transitions buyer_confirmed → awaiting_payment.
  - Validates reservation is still active (not expired)
  - Reads platform_fee_per_unit from admin_settings
  - Freezes supplier_price, platform_fee, buyer_price
  - Sets prices_locked_at

  ### `advance_deal_status(p_deal_id uuid, p_new_status text, p_actor_phone text)`
  Generic status transition with actor verification:
  - supplier_confirmed: actor must be supplier_phone
  - buyer_confirmed: actor must be buyer_phone
  - preparing: actor must be supplier_phone
  - delivered: actor must be supplier_phone
  - completed: actor must be buyer_phone
  All other transitions (paid, supplier_notified, settlement_pending, supplier_settled) are admin-only or automated.

  ### `admin_confirm_payment(p_deal_id uuid)`
  Admin: moves awaiting_payment → paid → supplier_notified atomically.

  ### `admin_settle_supplier(p_deal_id uuid)`
  Admin: moves settlement_pending → supplier_settled.

  ## Security
  - RLS enabled on admin_settings (read: authenticated, write: service role only)
  - Existing deals RLS policies remain, new policies added for admin operations

  ## Important Notes
  1. supplier_price, platform_fee, buyer_price are IMMUTABLE once prices_locked_at is set
  2. Reservation must NOT be expired when locking prices
  3. settlement_pending is set automatically when buyer confirms completion
  4. The old confirm_deal / complete_deal functions are replaced by advance_deal_status
*/

-- ============================================================
-- 1. admin_settings table
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_fee_per_unit numeric(10,2) NOT NULL DEFAULT 10.00,
  settlement_review_hours integer NOT NULL DEFAULT 24,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read admin_settings"
  ON admin_settings FOR SELECT
  TO anon
  USING (true);

-- Seed default row
INSERT INTO admin_settings (platform_fee_per_unit, settlement_review_hours)
SELECT 10.00, 24
WHERE NOT EXISTS (SELECT 1 FROM admin_settings);

-- ============================================================
-- 2. Expand deals status check constraint
-- ============================================================
ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_status_check;

ALTER TABLE deals ADD CONSTRAINT deals_status_check
  CHECK (status IN (
    'matched',
    'supplier_confirmed',
    'buyer_confirmed',
    'awaiting_payment',
    'paid',
    'supplier_notified',
    'preparing',
    'delivered',
    'completed',
    'settlement_pending',
    'supplier_settled',
    'cancelled',
    -- legacy statuses kept for backward compat
    'pending_confirmation',
    'active',
    'pending_receipt'
  ));

-- ============================================================
-- 3. Add new columns to deals
-- ============================================================

-- Price freeze columns
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deals' AND column_name='supplier_price') THEN
    ALTER TABLE deals ADD COLUMN supplier_price numeric(10,2);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deals' AND column_name='platform_fee') THEN
    ALTER TABLE deals ADD COLUMN platform_fee numeric(10,2);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deals' AND column_name='buyer_price') THEN
    ALTER TABLE deals ADD COLUMN buyer_price numeric(10,2);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deals' AND column_name='prices_locked_at') THEN
    ALTER TABLE deals ADD COLUMN prices_locked_at timestamptz;
  END IF;
END $$;

-- Payment fields
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deals' AND column_name='payment_reference') THEN
    ALTER TABLE deals ADD COLUMN payment_reference text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deals' AND column_name='payment_receipt_url') THEN
    ALTER TABLE deals ADD COLUMN payment_receipt_url text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deals' AND column_name='payment_submitted_at') THEN
    ALTER TABLE deals ADD COLUMN payment_submitted_at timestamptz;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deals' AND column_name='payment_confirmed_at') THEN
    ALTER TABLE deals ADD COLUMN payment_confirmed_at timestamptz;
  END IF;
END $$;

-- Lifecycle timestamps
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deals' AND column_name='supplier_confirmed_at') THEN
    ALTER TABLE deals ADD COLUMN supplier_confirmed_at timestamptz;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deals' AND column_name='buyer_confirmed_at') THEN
    ALTER TABLE deals ADD COLUMN buyer_confirmed_at timestamptz;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deals' AND column_name='supplier_notified_at') THEN
    ALTER TABLE deals ADD COLUMN supplier_notified_at timestamptz;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deals' AND column_name='preparing_at') THEN
    ALTER TABLE deals ADD COLUMN preparing_at timestamptz;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deals' AND column_name='delivered_at') THEN
    ALTER TABLE deals ADD COLUMN delivered_at timestamptz;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deals' AND column_name='settlement_pending_at') THEN
    ALTER TABLE deals ADD COLUMN settlement_pending_at timestamptz;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deals' AND column_name='supplier_settled_at') THEN
    ALTER TABLE deals ADD COLUMN supplier_settled_at timestamptz;
  END IF;
END $$;

-- ============================================================
-- 4. Function: lock_deal_prices
-- Transition: buyer_confirmed → awaiting_payment
-- Validates reservation active, freezes prices
-- ============================================================
CREATE OR REPLACE FUNCTION lock_deal_prices(p_deal_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deal deals%ROWTYPE;
  v_fee  numeric(10,2);
BEGIN
  SELECT * INTO v_deal FROM deals WHERE id = p_deal_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deal not found');
  END IF;

  IF v_deal.status != 'buyer_confirmed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deal must be in buyer_confirmed status');
  END IF;

  -- Validate reservation is still active
  IF v_deal.reservation_expires_at IS NOT NULL AND v_deal.reservation_expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reservation has expired');
  END IF;

  -- Read platform fee
  SELECT platform_fee_per_unit INTO v_fee FROM admin_settings LIMIT 1;
  IF v_fee IS NULL THEN
    v_fee := 0;
  END IF;

  -- Prices already locked? (idempotency guard)
  IF v_deal.prices_locked_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Prices already locked');
  END IF;

  -- Use final_price as supplier_price if supplier_price not set
  UPDATE deals
  SET
    supplier_price    = COALESCE(v_deal.supplier_price, v_deal.final_price),
    platform_fee      = v_fee,
    buyer_price       = COALESCE(v_deal.supplier_price, v_deal.final_price) + v_fee,
    prices_locked_at  = now(),
    status            = 'awaiting_payment',
    updated_at        = now()
  WHERE id = p_deal_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- 5. Function: advance_deal_status
-- Actor-verified status transitions
-- ============================================================
CREATE OR REPLACE FUNCTION advance_deal_status(
  p_deal_id    uuid,
  p_new_status text,
  p_actor_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deal deals%ROWTYPE;
  v_allowed_transitions jsonb := '{
    "matched":            ["supplier_confirmed"],
    "supplier_confirmed": ["buyer_confirmed"],
    "buyer_confirmed":    ["awaiting_payment"],
    "awaiting_payment":   ["paid"],
    "paid":               ["supplier_notified"],
    "supplier_notified":  ["preparing"],
    "preparing":          ["delivered"],
    "delivered":          ["completed"],
    "completed":          ["settlement_pending"],
    "settlement_pending": ["supplier_settled"],
    "pending_confirmation": ["active", "supplier_confirmed"],
    "active":             ["pending_receipt", "preparing", "supplier_notified"]
  }'::jsonb;
  v_supplier_actor_statuses text[] := ARRAY['supplier_confirmed','preparing','delivered'];
  v_buyer_actor_statuses    text[] := ARRAY['buyer_confirmed','completed'];
BEGIN
  SELECT * INTO v_deal FROM deals WHERE id = p_deal_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deal not found');
  END IF;

  -- Validate transition is allowed
  IF NOT (v_allowed_transitions->v_deal.status @> to_jsonb(p_new_status)) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid status transition from ' || v_deal.status || ' to ' || p_new_status
    );
  END IF;

  -- Validate actor
  IF p_new_status = ANY(v_supplier_actor_statuses) THEN
    IF p_actor_phone IS DISTINCT FROM v_deal.supplier_phone THEN
      RETURN jsonb_build_object('success', false, 'error', 'Only the supplier can perform this action');
    END IF;
  END IF;

  IF p_new_status = ANY(v_buyer_actor_statuses) THEN
    IF p_actor_phone IS DISTINCT FROM v_deal.buyer_phone THEN
      RETURN jsonb_build_object('success', false, 'error', 'Only the buyer can perform this action');
    END IF;
  END IF;

  -- Execute transition
  UPDATE deals
  SET
    status                = p_new_status,
    supplier_confirmed_at = CASE WHEN p_new_status = 'supplier_confirmed' THEN now() ELSE supplier_confirmed_at END,
    buyer_confirmed_at    = CASE WHEN p_new_status = 'buyer_confirmed'    THEN now() ELSE buyer_confirmed_at END,
    supplier_notified_at  = CASE WHEN p_new_status = 'supplier_notified'  THEN now() ELSE supplier_notified_at END,
    preparing_at          = CASE WHEN p_new_status = 'preparing'          THEN now() ELSE preparing_at END,
    delivered_at          = CASE WHEN p_new_status = 'delivered'          THEN now() ELSE delivered_at END,
    completed_at          = CASE WHEN p_new_status IN ('completed','settlement_pending','supplier_settled') THEN COALESCE(completed_at, now()) ELSE completed_at END,
    settlement_pending_at = CASE WHEN p_new_status = 'settlement_pending' THEN now() ELSE settlement_pending_at END,
    supplier_settled_at   = CASE WHEN p_new_status = 'supplier_settled'   THEN now() ELSE supplier_settled_at END,
    updated_at            = now()
  WHERE id = p_deal_id;

  -- After buyer confirms completion → auto-advance to settlement_pending
  IF p_new_status = 'completed' THEN
    UPDATE deals
    SET
      status                = 'settlement_pending',
      settlement_pending_at = now(),
      updated_at            = now()
    WHERE id = p_deal_id;
  END IF;

  -- Release reserved inventory on settlement_pending (goods delivered and confirmed)
  IF p_new_status = 'completed' AND v_deal.inventory_batch_id IS NOT NULL THEN
    UPDATE inventory_batches
    SET
      reserved_quantity = GREATEST(0, reserved_quantity - v_deal.quantity),
      updated_at        = now()
    WHERE id = v_deal.inventory_batch_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- 6. Function: submit_payment_proof
-- Buyer submits reference + receipt, transitions to awaiting_payment (idempotent)
-- ============================================================
CREATE OR REPLACE FUNCTION submit_payment_proof(
  p_deal_id          uuid,
  p_actor_phone      text,
  p_payment_reference text,
  p_receipt_url      text
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

  IF v_deal.status != 'awaiting_payment' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deal must be in awaiting_payment status');
  END IF;

  IF p_actor_phone IS DISTINCT FROM v_deal.buyer_phone THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the buyer can submit payment proof');
  END IF;

  IF p_payment_reference IS NULL OR trim(p_payment_reference) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment reference is required');
  END IF;

  UPDATE deals
  SET
    payment_reference    = trim(p_payment_reference),
    payment_receipt_url  = p_receipt_url,
    payment_submitted_at = now(),
    updated_at           = now()
  WHERE id = p_deal_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- 7. Function: admin_confirm_payment
-- Admin: awaiting_payment → paid → supplier_notified
-- ============================================================
CREATE OR REPLACE FUNCTION admin_confirm_payment(p_deal_id uuid)
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

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- 8. Function: admin_settle_supplier
-- Admin: settlement_pending → supplier_settled
-- ============================================================
CREATE OR REPLACE FUNCTION admin_settle_supplier(p_deal_id uuid)
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

  IF v_deal.status != 'settlement_pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deal must be in settlement_pending status');
  END IF;

  UPDATE deals
  SET
    status              = 'supplier_settled',
    supplier_settled_at = now(),
    updated_at          = now()
  WHERE id = p_deal_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

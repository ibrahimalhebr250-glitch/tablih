/*
  # Reservation System — Full Implementation

  ## Summary
  Creates the `reservations` table for temporary inventory holds,
  adds quantity separation columns to `inventory_batches`,
  rebuilds atomic RPC functions to manage the full deal lifecycle,
  and adds an expiry function that releases stale reservations.

  ## New Tables

  ### `reservations`
  Tracks each temporary inventory hold created at match time.
  - `id` (uuid, primary key)
  - `deal_id` (uuid, FK → deals)
  - `inventory_batch_id` (uuid, FK → inventory_batches)
  - `quantity` (integer) – quantity held by this reservation
  - `reserved_at` (timestamptz) – when the reservation was created
  - `expires_at` (timestamptz) – reserved_at + 30 minutes
  - `status` (text) – active | confirmed | expired | cancelled

  ## Modified Tables

  ### `inventory_batches`
  - `quantity_total` (integer) – total stock, never changes
  - `quantity_available` (integer) – matchable stock
  - `quantity_reserved` (integer) – held by active/confirmed deals

  ## New / Updated Functions

  ### `create_deal_with_reservation(params jsonb)`
  Atomically:
  1. Checks quantity_available >= requested quantity
  2. Decrements quantity_available
  3. Increments quantity_reserved
  4. Inserts deal record with status = 'pending_confirmation'
  5. Inserts reservation record (expires in 30 min)

  ### `confirm_deal(deal_id uuid)`
  Atomically confirms a pending deal:
  1. Checks reservation is still active and not expired
  2. Marks reservation as 'confirmed'
  3. Sets deal status to 'active'

  ### `cancel_deal(deal_id uuid, reason text)`
  Atomically cancels a deal:
  1. Restores quantity_available += quantity
  2. Decrements quantity_reserved
  3. Marks reservation as 'cancelled'
  4. Sets deal status to 'cancelled'

  ### `expire_reservations()`
  Called periodically to clean up stale reservations:
  1. Finds active reservations where expires_at < now()
  2. For each: restores inventory, marks reservation expired, cancels deal

  ### `complete_deal(deal_id uuid)`
  Marks deal completed and reduces quantity_reserved.

  ## Security
  - RLS enabled on reservations table
  - All inventory mutations happen inside atomic transactions

  ## Important Notes
  1. Matching engine must ONLY read quantity_available
  2. quantity_total must never be modified after batch creation
  3. quantity_reserved is freed on: confirmed → complete, cancel, or expire
  4. No negative quantities enforced via GREATEST(0, …)
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Ensure inventory_batches has all three quantity columns
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_batches' AND column_name = 'quantity_total'
  ) THEN
    ALTER TABLE inventory_batches ADD COLUMN quantity_total integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_batches' AND column_name = 'quantity_reserved'
  ) THEN
    ALTER TABLE inventory_batches ADD COLUMN quantity_reserved integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Backfill quantity_total from quantity_available for existing rows
UPDATE inventory_batches
SET quantity_total = GREATEST(quantity_available, COALESCE(quantity_total, 0))
WHERE quantity_total = 0 AND quantity_available > 0;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Create reservations table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reservations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id             uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  inventory_batch_id  uuid NOT NULL REFERENCES inventory_batches(id) ON DELETE CASCADE,
  quantity            integer NOT NULL CHECK (quantity > 0),
  reserved_at         timestamptz NOT NULL DEFAULT now(),
  expires_at          timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  status              text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'confirmed', 'expired', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_reservations_deal_id       ON reservations(deal_id);
CREATE INDEX IF NOT EXISTS idx_reservations_batch_id      ON reservations(inventory_batch_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status        ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_expires_at    ON reservations(expires_at);

ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reservations"
  ON reservations FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can insert reservations"
  ON reservations FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anyone can update reservations"
  ON reservations FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. create_deal_with_reservation — atomic match → deal + reservation
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION create_deal_with_reservation(
  p_order_id           uuid,
  p_inventory_batch_id uuid,
  p_buyer_phone        text,
  p_supplier_phone     text,
  p_pallet_type        text,
  p_size               text,
  p_quality            text,
  p_city               text,
  p_quantity           integer,
  p_final_price        numeric,
  p_request_id         text
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_batch   inventory_batches%ROWTYPE;
  v_deal_id uuid;
  v_deal_ref text;
BEGIN
  -- Lock inventory batch to prevent race conditions
  SELECT * INTO v_batch
  FROM inventory_batches
  WHERE id = p_inventory_batch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Inventory batch not found');
  END IF;

  IF v_batch.quantity_available < p_quantity THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient available quantity',
      'available', v_batch.quantity_available
    );
  END IF;

  -- Generate deal ref
  v_deal_ref := 'DEL-' || upper(substring(gen_random_uuid()::text, 1, 6));

  -- Insert deal
  INSERT INTO deals (
    deal_ref, request_id, order_id, inventory_batch_id,
    buyer_phone, supplier_phone,
    pallet_type, size, quality, city,
    quantity, final_price, status
  ) VALUES (
    v_deal_ref, p_request_id, p_order_id, p_inventory_batch_id,
    p_buyer_phone, p_supplier_phone,
    p_pallet_type, p_size, p_quality, p_city,
    p_quantity, p_final_price, 'pending_confirmation'
  )
  RETURNING id INTO v_deal_id;

  -- Move quantity: available → reserved
  UPDATE inventory_batches
  SET
    quantity_available = quantity_available - p_quantity,
    quantity_reserved  = quantity_reserved  + p_quantity,
    updated_at         = now()
  WHERE id = p_inventory_batch_id;

  -- Insert reservation (30 min window)
  INSERT INTO reservations (
    deal_id, inventory_batch_id, quantity,
    reserved_at, expires_at, status
  ) VALUES (
    v_deal_id, p_inventory_batch_id, p_quantity,
    now(), now() + interval '30 minutes', 'active'
  );

  RETURN jsonb_build_object(
    'success', true,
    'deal_id', v_deal_id,
    'deal_ref', v_deal_ref
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. confirm_deal — buyer confirms within 30 min window
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION confirm_deal(p_deal_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_deal        deals%ROWTYPE;
  v_reservation reservations%ROWTYPE;
BEGIN
  SELECT * INTO v_deal FROM deals WHERE id = p_deal_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deal not found');
  END IF;

  IF v_deal.status != 'pending_confirmation' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deal is not pending confirmation');
  END IF;

  -- Check reservation
  SELECT * INTO v_reservation
  FROM reservations
  WHERE deal_id = p_deal_id AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active reservation found');
  END IF;

  IF v_reservation.expires_at < now() THEN
    -- Auto-expire before confirming
    UPDATE reservations SET status = 'expired' WHERE id = v_reservation.id;
    -- Restore inventory
    UPDATE inventory_batches
    SET
      quantity_available = quantity_available + v_reservation.quantity,
      quantity_reserved  = GREATEST(0, quantity_reserved - v_reservation.quantity),
      updated_at         = now()
    WHERE id = v_reservation.inventory_batch_id;
    UPDATE deals
    SET status = 'cancelled', cancelled_at = now(), cancel_reason = 'انتهت مهلة التأكيد', updated_at = now()
    WHERE id = p_deal_id;
    RETURN jsonb_build_object('success', false, 'error', 'Reservation expired');
  END IF;

  -- Confirm: mark reservation confirmed, deal active
  UPDATE reservations SET status = 'confirmed' WHERE id = v_reservation.id;
  UPDATE deals
  SET status = 'active', confirmed_at = now(), updated_at = now()
  WHERE id = p_deal_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. cancel_deal — manual cancellation, restores inventory
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION cancel_deal(p_deal_id uuid, p_reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_deal        deals%ROWTYPE;
  v_reservation reservations%ROWTYPE;
BEGIN
  SELECT * INTO v_deal FROM deals WHERE id = p_deal_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deal not found');
  END IF;

  IF v_deal.status IN ('completed', 'cancelled') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deal cannot be cancelled in current status');
  END IF;

  -- Find any active or confirmed reservation
  SELECT * INTO v_reservation
  FROM reservations
  WHERE deal_id = p_deal_id AND status IN ('active', 'confirmed')
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    UPDATE reservations SET status = 'cancelled' WHERE id = v_reservation.id;
    -- Restore inventory: only return quantity_available if not yet confirmed
    -- (confirmed deals already moved qty_available; on cancel we restore it back)
    UPDATE inventory_batches
    SET
      quantity_available = quantity_available + v_reservation.quantity,
      quantity_reserved  = GREATEST(0, quantity_reserved - v_reservation.quantity),
      updated_at         = now()
    WHERE id = v_reservation.inventory_batch_id;
  ELSIF v_deal.status IN ('active', 'pending_receipt') AND v_deal.inventory_batch_id IS NOT NULL THEN
    -- Fallback: no reservation row but deal was active
    UPDATE inventory_batches
    SET
      quantity_available = quantity_available + v_deal.quantity,
      quantity_reserved  = GREATEST(0, quantity_reserved - v_deal.quantity),
      updated_at         = now()
    WHERE id = v_deal.inventory_batch_id;
  END IF;

  UPDATE deals
  SET
    status       = 'cancelled',
    cancelled_at = now(),
    cancel_reason = p_reason,
    updated_at   = now()
  WHERE id = p_deal_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. expire_reservations — background sweep (call every minute)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION expire_reservations()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_rec   reservations%ROWTYPE;
  v_count integer := 0;
BEGIN
  FOR v_rec IN
    SELECT * FROM reservations
    WHERE status = 'active' AND expires_at < now()
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Expire reservation
    UPDATE reservations SET status = 'expired' WHERE id = v_rec.id;

    -- Restore inventory
    UPDATE inventory_batches
    SET
      quantity_available = quantity_available + v_rec.quantity,
      quantity_reserved  = GREATEST(0, quantity_reserved - v_rec.quantity),
      updated_at         = now()
    WHERE id = v_rec.inventory_batch_id;

    -- Cancel deal
    UPDATE deals
    SET
      status        = 'cancelled',
      cancelled_at  = now(),
      cancel_reason = 'انتهت مهلة التأكيد',
      updated_at    = now()
    WHERE id = v_rec.deal_id AND status = 'pending_confirmation';

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'expired_count', v_count);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. complete_deal — receipt confirmed, release quantity_reserved
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION complete_deal(p_deal_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_deal deals%ROWTYPE;
BEGIN
  SELECT * INTO v_deal FROM deals WHERE id = p_deal_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deal not found');
  END IF;

  IF v_deal.status != 'pending_receipt' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deal must be in pending_receipt status');
  END IF;

  IF v_deal.inventory_batch_id IS NOT NULL THEN
    UPDATE inventory_batches
    SET
      quantity_reserved = GREATEST(0, quantity_reserved - v_deal.quantity),
      updated_at        = now()
    WHERE id = v_deal.inventory_batch_id;
  END IF;

  UPDATE deals
  SET
    status       = 'completed',
    completed_at = now(),
    updated_at   = now()
  WHERE id = p_deal_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

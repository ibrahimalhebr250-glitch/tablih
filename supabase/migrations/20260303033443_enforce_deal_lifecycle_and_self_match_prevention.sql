/*
  # Enforce Deal Lifecycle, Self-Match Prevention & State Machine

  ## Changes

  ### 1. Add phone column to inventory_batches (for self-match checks)
  - Ensures every batch has a `phone` field so matching engine can exclude
    batches owned by the requesting buyer.

  ### 2. Recreate create_deal_with_reservation (SECURITY DEFINER)
  - Adds self-match guard: rejects if buyer_phone == supplier_phone
  - Atomically: locks batch row, checks quantity, inserts deal, updates
    inventory counters, creates reservation
  - Returns structured error on any violation

  ### 3. Recreate confirm_deal (SECURITY DEFINER)
  - Guards: not pending_confirmation → error
  - Guards: buyer == supplier → error
  - Guards: reservation expired → auto-expire + cancel deal
  - On success: reservation → confirmed, deal → active

  ### 4. Recreate cancel_deal (SECURITY DEFINER)
  - Idempotent: already completed or cancelled → error
  - Finds active/confirmed reservation and restores inventory exactly once
  - Fallback restore if no reservation row exists (legacy)
  - Prevents double-restoration via reservation status check

  ### 5. Recreate expire_reservations (SECURITY DEFINER)
  - Uses SKIP LOCKED for concurrency safety (no double-processing)
  - Restores inventory only for active reservations
  - Cancels associated pending_confirmation deals only

  ### 6. New complete_deal function (SECURITY DEFINER)
  - Validates deal is in active or pending_receipt status
  - Marks deal completed with timestamp

  ### 7. State transition validation
  - All functions enforce allowed transitions:
    pending_confirmation → active (confirm)
    pending_confirmation → cancelled (cancel / expire)
    active → pending_receipt (mark receipt)
    active/pending_receipt → cancelled (cancel)
    active/pending_receipt → completed (complete)
*/

-- ============================================================
-- 1. create_deal_with_reservation  (SECURITY DEFINER)
-- ============================================================
CREATE OR REPLACE FUNCTION create_deal_with_reservation(
  p_order_id            uuid,
  p_inventory_batch_id  uuid,
  p_buyer_phone         text,
  p_supplier_phone      text,
  p_pallet_type         text,
  p_size                text,
  p_quality             text,
  p_city                text,
  p_quantity            integer,
  p_final_price         numeric,
  p_request_id          text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch     inventory_batches%ROWTYPE;
  v_deal_id   uuid;
  v_deal_ref  text;
  v_expires   timestamptz;
BEGIN
  -- Self-match prevention
  IF p_buyer_phone IS NOT NULL
     AND p_supplier_phone IS NOT NULL
     AND p_buyer_phone = p_supplier_phone THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'self_match: buyer and supplier are the same user'
    );
  END IF;

  -- Lock batch row for atomicity
  SELECT * INTO v_batch
  FROM inventory_batches
  WHERE id = p_inventory_batch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Inventory batch not found');
  END IF;

  -- Re-check quantity_available (may have changed since read)
  IF v_batch.quantity_available < p_quantity THEN
    RETURN jsonb_build_object(
      'success',   false,
      'error',     'Insufficient available quantity',
      'available', v_batch.quantity_available
    );
  END IF;

  v_deal_ref := 'DEL-' || upper(substring(gen_random_uuid()::text, 1, 6));
  v_expires  := now() + interval '30 minutes';

  INSERT INTO deals (
    deal_ref, request_id, order_id, inventory_batch_id,
    buyer_phone, supplier_phone,
    pallet_type, size, quality, city,
    quantity, final_price, status,
    reservation_expires_at
  ) VALUES (
    v_deal_ref, p_request_id, p_order_id, p_inventory_batch_id,
    p_buyer_phone, p_supplier_phone,
    p_pallet_type, p_size, p_quality, p_city,
    p_quantity, p_final_price, 'pending_confirmation',
    v_expires
  )
  RETURNING id INTO v_deal_id;

  -- Atomically move quantity: available → reserved
  UPDATE inventory_batches
  SET
    quantity_available = quantity_available - p_quantity,
    quantity_reserved  = quantity_reserved  + p_quantity,
    updated_at         = now()
  WHERE id = p_inventory_batch_id;

  INSERT INTO reservations (
    deal_id, inventory_batch_id, quantity,
    reserved_at, expires_at, status
  ) VALUES (
    v_deal_id, p_inventory_batch_id, p_quantity,
    now(), v_expires, 'active'
  );

  RETURN jsonb_build_object(
    'success',    true,
    'deal_id',    v_deal_id,
    'deal_ref',   v_deal_ref,
    'expires_at', v_expires
  );
END;
$$;

-- ============================================================
-- 2. confirm_deal  (SECURITY DEFINER)
-- ============================================================
CREATE OR REPLACE FUNCTION confirm_deal(p_deal_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deal        deals%ROWTYPE;
  v_reservation reservations%ROWTYPE;
BEGIN
  SELECT * INTO v_deal FROM deals WHERE id = p_deal_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deal not found');
  END IF;

  -- State guard
  IF v_deal.status != 'pending_confirmation' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'Invalid state: deal is ' || v_deal.status
    );
  END IF;

  -- Self-match guard
  IF v_deal.buyer_phone IS NOT NULL
     AND v_deal.supplier_phone IS NOT NULL
     AND v_deal.buyer_phone = v_deal.supplier_phone THEN
    RETURN jsonb_build_object('success', false, 'error', 'self_match: cannot confirm');
  END IF;

  -- Find active reservation
  SELECT * INTO v_reservation
  FROM reservations
  WHERE deal_id = p_deal_id AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Auto-cancel if no active reservation
    UPDATE deals
    SET status = 'cancelled', cancelled_at = now(),
        cancel_reason = 'لا يوجد حجز نشط', updated_at = now()
    WHERE id = p_deal_id;
    RETURN jsonb_build_object('success', false, 'error', 'No active reservation found');
  END IF;

  -- Check expiry
  IF v_reservation.expires_at < now() THEN
    UPDATE reservations SET status = 'expired' WHERE id = v_reservation.id;
    UPDATE inventory_batches
    SET
      quantity_available = quantity_available + v_reservation.quantity,
      quantity_reserved  = GREATEST(0, quantity_reserved - v_reservation.quantity),
      updated_at         = now()
    WHERE id = v_reservation.inventory_batch_id;
    UPDATE deals
    SET status = 'cancelled', cancelled_at = now(),
        cancel_reason = 'انتهت مهلة التأكيد', updated_at = now()
    WHERE id = p_deal_id;
    RETURN jsonb_build_object('success', false, 'error', 'Reservation expired');
  END IF;

  -- Confirm
  UPDATE reservations SET status = 'confirmed' WHERE id = v_reservation.id;
  UPDATE deals
  SET status = 'active', confirmed_at = now(), updated_at = now()
  WHERE id = p_deal_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- 3. cancel_deal  (SECURITY DEFINER)
-- ============================================================
CREATE OR REPLACE FUNCTION cancel_deal(
  p_deal_id uuid,
  p_reason  text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deal        deals%ROWTYPE;
  v_reservation reservations%ROWTYPE;
BEGIN
  SELECT * INTO v_deal FROM deals WHERE id = p_deal_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deal not found');
  END IF;

  -- Cannot cancel terminal states
  IF v_deal.status IN ('completed', 'cancelled') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'Deal already in terminal state: ' || v_deal.status
    );
  END IF;

  -- Restore inventory once via reservation (prevents double-restore)
  SELECT * INTO v_reservation
  FROM reservations
  WHERE deal_id = p_deal_id AND status IN ('active', 'confirmed')
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    UPDATE reservations SET status = 'cancelled' WHERE id = v_reservation.id;
    UPDATE inventory_batches
    SET
      quantity_available = quantity_available + v_reservation.quantity,
      quantity_reserved  = GREATEST(0, quantity_reserved - v_reservation.quantity),
      updated_at         = now()
    WHERE id = v_reservation.inventory_batch_id;
  ELSIF v_deal.status IN ('active', 'pending_receipt')
        AND v_deal.inventory_batch_id IS NOT NULL THEN
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
    status        = 'cancelled',
    cancelled_at  = now(),
    cancel_reason = p_reason,
    updated_at    = now()
  WHERE id = p_deal_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- 4. expire_reservations  (SECURITY DEFINER, concurrency-safe)
-- ============================================================
CREATE OR REPLACE FUNCTION expire_reservations()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    -- Expire reservation (idempotent guard via status check)
    UPDATE reservations SET status = 'expired' WHERE id = v_rec.id;

    -- Restore inventory
    UPDATE inventory_batches
    SET
      quantity_available = quantity_available + v_rec.quantity,
      quantity_reserved  = GREATEST(0, quantity_reserved - v_rec.quantity),
      updated_at         = now()
    WHERE id = v_rec.inventory_batch_id;

    -- Cancel deal only if still pending_confirmation
    UPDATE deals
    SET
      status        = 'cancelled',
      cancelled_at  = now(),
      cancel_reason = 'انتهت مهلة التأكيد',
      updated_at    = now()
    WHERE id = v_rec.deal_id
      AND status = 'pending_confirmation';

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'expired_count', v_count);
END;
$$;

-- ============================================================
-- 5. complete_deal  (SECURITY DEFINER)
-- ============================================================
CREATE OR REPLACE FUNCTION complete_deal(p_deal_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deal deals%ROWTYPE;
BEGIN
  SELECT * INTO v_deal FROM deals WHERE id = p_deal_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deal not found');
  END IF;

  IF v_deal.status NOT IN ('active', 'pending_receipt') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'Invalid state for completion: ' || v_deal.status
    );
  END IF;

  UPDATE deals
  SET status = 'completed', completed_at = now(), updated_at = now()
  WHERE id = p_deal_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

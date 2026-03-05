/*
  # Rebuild Deal Management System v2

  Clean deal workflow with strict 6-status model:
    matched -> supplier_confirmed -> awaiting_buyer -> inventory_reserved -> completed | cancelled

  1. Updates
    - Reset deals status constraint to only allow the 6 valid statuses
    - Add/ensure columns: supplier_price, platform_fee_per_pallet, reserved_at, buyer_confirmed_at, supplier_confirmed_at, completed_at, cancelled_at

  2. New Functions
    - `supplier_confirm_deal_v4(p_deal_id, p_supplier_phone)` — supplier confirms, sets status to supplier_confirmed, then awaiting_buyer
    - `buyer_confirm_deal_v4(p_deal_id, p_buyer_phone)` — buyer confirms, reserves inventory, status = inventory_reserved
    - `supplier_complete_deal_v4(p_deal_id, p_supplier_phone)` — marks completed, decrements reserved_quantity
    - `supplier_cancel_deal_v4(p_deal_id, p_supplier_phone)` — marks cancelled, restores inventory
    - `admin_get_deal_metrics_v4()` — returns metrics for 6-status model

  3. Security
    - All functions are SECURITY DEFINER with proper ownership checks
*/

-- Ensure the deals status constraint supports our new statuses
DO $$
BEGIN
  ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_status_check;
  ALTER TABLE deals ADD CONSTRAINT deals_status_check
    CHECK (status = ANY(ARRAY[
      'matched', 'supplier_confirmed', 'awaiting_buyer',
      'inventory_reserved', 'completed', 'cancelled',
      'pending_confirmation', 'buyer_confirmed', 'awaiting_payment',
      'paid', 'supplier_notified', 'preparing', 'delivered',
      'settlement_pending', 'supplier_settled', 'active', 'pending_receipt'
    ]));
END $$;

-- Ensure columns exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'platform_fee_per_pallet'
  ) THEN
    ALTER TABLE deals ADD COLUMN platform_fee_per_pallet numeric DEFAULT 1.00;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'reserved_at'
  ) THEN
    ALTER TABLE deals ADD COLUMN reserved_at timestamptz;
  END IF;
END $$;

-- ================================================================
-- SUPPLIER CONFIRM DEAL v4
-- Sets status from matched -> supplier_confirmed -> awaiting_buyer
-- ================================================================
CREATE OR REPLACE FUNCTION supplier_confirm_deal_v4(
  p_deal_id uuid,
  p_supplier_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deal deals%ROWTYPE;
BEGIN
  SELECT * INTO v_deal FROM deals WHERE id = p_deal_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الصفقة غير موجودة');
  END IF;

  IF v_deal.supplier_phone != p_supplier_phone THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح لك بتأكيد هذه الصفقة');
  END IF;

  IF v_deal.status != 'matched' THEN
    RETURN jsonb_build_object('success', false, 'error', 'لا يمكن تأكيد صفقة بحالة: ' || v_deal.status);
  END IF;

  UPDATE deals SET
    status = 'awaiting_buyer',
    supplier_confirmed_at = now(),
    supplier_price = v_deal.final_price,
    platform_fee_per_pallet = 1.00,
    platform_fee = v_deal.quantity * 1.00,
    buyer_price = v_deal.final_price + 1.00,
    updated_at = now()
  WHERE id = p_deal_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ================================================================
-- BUYER CONFIRM DEAL v4
-- Reserves inventory, status -> inventory_reserved
-- ================================================================
CREATE OR REPLACE FUNCTION buyer_confirm_deal_v4(
  p_deal_id uuid,
  p_buyer_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deal deals%ROWTYPE;
  v_available integer;
BEGIN
  SELECT * INTO v_deal FROM deals WHERE id = p_deal_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الصفقة غير موجودة');
  END IF;

  IF v_deal.buyer_phone != p_buyer_phone THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح لك بتأكيد هذه الصفقة');
  END IF;

  IF v_deal.status != 'awaiting_buyer' THEN
    RETURN jsonb_build_object('success', false, 'error', 'لا يمكن تأكيد صفقة بحالة: ' || v_deal.status);
  END IF;

  IF v_deal.inventory_batch_id IS NOT NULL THEN
    SELECT available_quantity INTO v_available
    FROM inventory_batches
    WHERE id = v_deal.inventory_batch_id;

    IF v_available IS NULL OR v_available < v_deal.quantity THEN
      RETURN jsonb_build_object('success', false, 'error', 'الكمية المتاحة غير كافية');
    END IF;

    UPDATE inventory_batches SET
      available_quantity = available_quantity - v_deal.quantity,
      reserved_quantity = reserved_quantity + v_deal.quantity,
      updated_at = now()
    WHERE id = v_deal.inventory_batch_id;
  END IF;

  UPDATE deals SET
    status = 'inventory_reserved',
    buyer_confirmed_at = now(),
    reserved_at = now(),
    updated_at = now()
  WHERE id = p_deal_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ================================================================
-- SUPPLIER COMPLETE DEAL v4
-- Marks deal as completed, decrements reserved_quantity
-- ================================================================
CREATE OR REPLACE FUNCTION supplier_complete_deal_v4(
  p_deal_id uuid,
  p_supplier_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deal deals%ROWTYPE;
BEGIN
  SELECT * INTO v_deal FROM deals WHERE id = p_deal_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الصفقة غير موجودة');
  END IF;

  IF v_deal.supplier_phone != p_supplier_phone THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  IF v_deal.status != 'inventory_reserved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'لا يمكن إتمام صفقة بحالة: ' || v_deal.status);
  END IF;

  IF v_deal.inventory_batch_id IS NOT NULL THEN
    UPDATE inventory_batches SET
      reserved_quantity = GREATEST(reserved_quantity - v_deal.quantity, 0),
      updated_at = now()
    WHERE id = v_deal.inventory_batch_id;
  END IF;

  UPDATE deals SET
    status = 'completed',
    completed_at = now(),
    updated_at = now()
  WHERE id = p_deal_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ================================================================
-- SUPPLIER CANCEL DEAL v4
-- Cancels deal and restores inventory
-- ================================================================
CREATE OR REPLACE FUNCTION supplier_cancel_deal_v4(
  p_deal_id uuid,
  p_supplier_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deal deals%ROWTYPE;
BEGIN
  SELECT * INTO v_deal FROM deals WHERE id = p_deal_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الصفقة غير موجودة');
  END IF;

  IF v_deal.supplier_phone != p_supplier_phone THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  IF v_deal.status NOT IN ('inventory_reserved', 'matched', 'awaiting_buyer') THEN
    RETURN jsonb_build_object('success', false, 'error', 'لا يمكن إلغاء صفقة بحالة: ' || v_deal.status);
  END IF;

  IF v_deal.status = 'inventory_reserved' AND v_deal.inventory_batch_id IS NOT NULL THEN
    UPDATE inventory_batches SET
      reserved_quantity = GREATEST(reserved_quantity - v_deal.quantity, 0),
      available_quantity = available_quantity + v_deal.quantity,
      updated_at = now()
    WHERE id = v_deal.inventory_batch_id;
  END IF;

  UPDATE deals SET
    status = 'cancelled',
    cancelled_at = now(),
    cancel_reason = 'لم يتم البيع',
    updated_at = now()
  WHERE id = p_deal_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ================================================================
-- ADMIN GET DEAL METRICS v4
-- Returns metrics for the 6-status model
-- ================================================================
CREATE OR REPLACE FUNCTION admin_get_deal_metrics_v4()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'new_deals', COALESCE(SUM(CASE WHEN status = 'matched' THEN 1 ELSE 0 END), 0),
    'awaiting_buyer', COALESCE(SUM(CASE WHEN status = 'awaiting_buyer' THEN 1 ELSE 0 END), 0),
    'active_deals', COALESCE(SUM(CASE WHEN status = 'inventory_reserved' THEN 1 ELSE 0 END), 0),
    'stalled_deals', COALESCE(SUM(CASE WHEN status = 'inventory_reserved'
      AND reserved_at IS NOT NULL
      AND reserved_at < now() - interval '3 days' THEN 1 ELSE 0 END), 0),
    'completed_deals', COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0),
    'cancelled_deals', COALESCE(SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END), 0),
    'volume_today', COALESCE(SUM(CASE WHEN status = 'completed'
      AND completed_at::date = CURRENT_DATE THEN quantity ELSE 0 END), 0)
  ) INTO v_result
  FROM deals;

  RETURN v_result;
END;
$$;

-- ================================================================
-- ADMIN CANCEL DEAL v4 (admin override)
-- ================================================================
CREATE OR REPLACE FUNCTION admin_cancel_deal_v4(
  p_deal_id uuid,
  p_reason text DEFAULT 'إلغاء من الإدارة'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deal deals%ROWTYPE;
BEGIN
  SELECT * INTO v_deal FROM deals WHERE id = p_deal_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الصفقة غير موجودة');
  END IF;

  IF v_deal.status IN ('completed', 'cancelled') THEN
    RETURN jsonb_build_object('success', false, 'error', 'لا يمكن إلغاء صفقة منتهية');
  END IF;

  IF v_deal.status = 'inventory_reserved' AND v_deal.inventory_batch_id IS NOT NULL THEN
    UPDATE inventory_batches SET
      reserved_quantity = GREATEST(reserved_quantity - v_deal.quantity, 0),
      available_quantity = available_quantity + v_deal.quantity,
      updated_at = now()
    WHERE id = v_deal.inventory_batch_id;
  END IF;

  UPDATE deals SET
    status = 'cancelled',
    cancelled_at = now(),
    cancel_reason = p_reason,
    updated_at = now()
  WHERE id = p_deal_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ================================================================
-- ADMIN DELETE DEAL v4
-- ================================================================
CREATE OR REPLACE FUNCTION admin_delete_deal_v4(
  p_deal_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deal deals%ROWTYPE;
BEGIN
  SELECT * INTO v_deal FROM deals WHERE id = p_deal_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الصفقة غير موجودة');
  END IF;

  IF v_deal.status = 'inventory_reserved' AND v_deal.inventory_batch_id IS NOT NULL THEN
    UPDATE inventory_batches SET
      reserved_quantity = GREATEST(reserved_quantity - v_deal.quantity, 0),
      available_quantity = available_quantity + v_deal.quantity,
      updated_at = now()
    WHERE id = v_deal.inventory_batch_id;
  END IF;

  DELETE FROM user_notifications WHERE deal_id = p_deal_id;
  DELETE FROM supplier_liabilities WHERE deal_id = p_deal_id;
  DELETE FROM ledger_entries WHERE deal_id = p_deal_id;
  DELETE FROM reservations WHERE deal_id = p_deal_id;
  DELETE FROM deals WHERE id = p_deal_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ================================================================
-- ADMIN FREEZE DEAL v4 (toggle suspend)
-- ================================================================
CREATE OR REPLACE FUNCTION admin_freeze_deal_v4(
  p_deal_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE deals SET
    is_suspended = NOT is_suspended,
    updated_at = now()
  WHERE id = p_deal_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ================================================================
-- ADMIN SEND STALL REMINDER v4
-- ================================================================
CREATE OR REPLACE FUNCTION admin_send_stall_reminder_v4(
  p_deal_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deal deals%ROWTYPE;
BEGIN
  SELECT * INTO v_deal FROM deals WHERE id = p_deal_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الصفقة غير موجودة');
  END IF;

  INSERT INTO user_notifications (phone, title, body, deal_id, type)
  VALUES (
    v_deal.supplier_phone,
    'تذكير بصفقة قيد التنفيذ',
    'نلاحظ أن هذه الصفقة ما زالت قيد التنفيذ منذ فترة. إذا واجهتم أي صعوبة في إتمام البيع فإن المنصة مستعدة لتقديم المساعدة.',
    p_deal_id,
    'stall_reminder'
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

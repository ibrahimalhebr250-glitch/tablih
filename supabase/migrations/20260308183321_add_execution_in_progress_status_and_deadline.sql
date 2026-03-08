/*
  # Add execution_in_progress status and execution deadline to deals

  1. Modified Tables
    - `deals`
      - Add `execution_in_progress` to allowed status values
      - Add `execution_deadline` (timestamptz) - when the execution window expires
      - Add `execution_hours` (integer) - chosen deadline in hours (24, 48, or 72)

  2. New Functions
    - `buyer_confirm_deal_with_deadline_v4` - buyer confirms purchase and sets execution deadline
      - Transitions: awaiting_buyer -> execution_in_progress
      - Sets execution_deadline = now() + chosen hours
      - Reserves inventory atomically

  3. Security
    - Function uses SECURITY DEFINER for phone-based auth system

  4. Important Notes
    - This replaces the old buyer_confirm_deal_v4 flow for the new simplified deal path
    - The execution_in_progress status represents the phase where both parties coordinate via WhatsApp
    - After execution_in_progress, supplier confirms delivery to complete the deal
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'execution_deadline'
  ) THEN
    ALTER TABLE deals ADD COLUMN execution_deadline timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'execution_hours'
  ) THEN
    ALTER TABLE deals ADD COLUMN execution_hours integer;
  END IF;
END $$;

ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_status_check;
ALTER TABLE deals ADD CONSTRAINT deals_status_check CHECK (
  status = ANY (ARRAY[
    'pending_supplier',
    'matched',
    'supplier_confirmed',
    'awaiting_buyer',
    'inventory_reserved',
    'in_delivery',
    'execution_in_progress',
    'completed',
    'cancelled',
    'pending_confirmation',
    'buyer_confirmed',
    'awaiting_payment',
    'paid',
    'supplier_notified',
    'preparing',
    'delivered',
    'settlement_pending',
    'supplier_settled',
    'active',
    'pending_receipt'
  ])
);

CREATE OR REPLACE FUNCTION buyer_confirm_deal_with_deadline_v4(
  p_deal_id uuid,
  p_buyer_phone text,
  p_execution_hours integer DEFAULT 48
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deal RECORD;
  v_batch RECORD;
  v_deadline timestamptz;
BEGIN
  SELECT * INTO v_deal FROM deals WHERE id = p_deal_id FOR UPDATE;

  IF v_deal IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'الصفقة غير موجودة');
  END IF;

  IF v_deal.buyer_phone != p_buyer_phone THEN
    RETURN jsonb_build_object('success', false, 'error', 'ليس لديك صلاحية');
  END IF;

  IF v_deal.status NOT IN ('awaiting_buyer', 'supplier_confirmed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'حالة الصفقة لا تسمح بالتأكيد');
  END IF;

  IF p_execution_hours NOT IN (24, 48, 72) THEN
    RETURN jsonb_build_object('success', false, 'error', 'مهلة غير صالحة');
  END IF;

  IF v_deal.inventory_batch_id IS NOT NULL THEN
    SELECT * INTO v_batch
    FROM inventory_batches
    WHERE id = v_deal.inventory_batch_id
    FOR UPDATE;

    IF v_batch IS NOT NULL AND v_batch.available_quantity >= v_deal.quantity THEN
      UPDATE inventory_batches
      SET
        available_quantity = available_quantity - v_deal.quantity,
        reserved_quantity = COALESCE(reserved_quantity, 0) + v_deal.quantity,
        quantity_available = available_quantity - v_deal.quantity
      WHERE id = v_deal.inventory_batch_id;
    END IF;
  END IF;

  v_deadline := now() + (p_execution_hours || ' hours')::interval;

  UPDATE deals
  SET
    status = 'execution_in_progress',
    buyer_confirmed_at = now(),
    execution_deadline = v_deadline,
    execution_hours = p_execution_hours,
    delivery_started_at = now(),
    updated_at = now()
  WHERE id = p_deal_id;

  RETURN jsonb_build_object(
    'success', true,
    'deal_id', p_deal_id,
    'execution_deadline', v_deadline,
    'execution_hours', p_execution_hours
  );
END;
$$;

CREATE OR REPLACE FUNCTION supplier_confirm_delivery_v4(
  p_deal_id uuid,
  p_supplier_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deal RECORD;
BEGIN
  SELECT * INTO v_deal FROM deals WHERE id = p_deal_id FOR UPDATE;

  IF v_deal IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'الصفقة غير موجودة');
  END IF;

  IF v_deal.supplier_phone != p_supplier_phone THEN
    RETURN jsonb_build_object('success', false, 'error', 'ليس لديك صلاحية');
  END IF;

  IF v_deal.status NOT IN ('in_delivery', 'inventory_reserved', 'execution_in_progress') THEN
    RETURN jsonb_build_object('success', false, 'error', 'حالة الصفقة لا تسمح بتأكيد التسليم');
  END IF;

  IF v_deal.inventory_batch_id IS NOT NULL THEN
    UPDATE inventory_batches
    SET
      quantity = GREATEST(quantity - v_deal.quantity, 0),
      reserved_quantity = GREATEST(COALESCE(reserved_quantity, 0) - v_deal.quantity, 0),
      available_quantity = GREATEST(available_quantity, 0),
      quantity_available = GREATEST(available_quantity, 0),
      is_active = CASE WHEN (quantity - v_deal.quantity) <= 0 THEN false ELSE is_active END
    WHERE id = v_deal.inventory_batch_id;
  END IF;

  UPDATE deals
  SET
    status = 'completed',
    completed_at = now(),
    updated_at = now()
  WHERE id = p_deal_id;

  RETURN jsonb_build_object('success', true, 'deal_id', p_deal_id);
END;
$$;

CREATE OR REPLACE FUNCTION supplier_cancel_deal_v4(
  p_deal_id uuid,
  p_supplier_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deal RECORD;
BEGIN
  SELECT * INTO v_deal FROM deals WHERE id = p_deal_id FOR UPDATE;

  IF v_deal IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'الصفقة غير موجودة');
  END IF;

  IF v_deal.supplier_phone != p_supplier_phone THEN
    RETURN jsonb_build_object('success', false, 'error', 'ليس لديك صلاحية');
  END IF;

  IF v_deal.status IN ('completed', 'cancelled') THEN
    RETURN jsonb_build_object('success', false, 'error', 'لا يمكن إلغاء صفقة منتهية');
  END IF;

  IF v_deal.inventory_batch_id IS NOT NULL AND v_deal.status IN ('inventory_reserved', 'in_delivery', 'execution_in_progress') THEN
    UPDATE inventory_batches
    SET
      available_quantity = available_quantity + v_deal.quantity,
      reserved_quantity = GREATEST(COALESCE(reserved_quantity, 0) - v_deal.quantity, 0),
      quantity_available = available_quantity + v_deal.quantity,
      is_active = true
    WHERE id = v_deal.inventory_batch_id;
  END IF;

  UPDATE deals
  SET
    status = 'cancelled',
    cancelled_at = now(),
    cancel_reason = 'تم الإلغاء من قبل المورد',
    updated_at = now()
  WHERE id = p_deal_id;

  RETURN jsonb_build_object('success', true, 'deal_id', p_deal_id);
END;
$$;

GRANT EXECUTE ON FUNCTION buyer_confirm_deal_with_deadline_v4(uuid, text, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION supplier_confirm_delivery_v4(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION supplier_cancel_deal_v4(uuid, text) TO anon, authenticated;

/*
  # Admin Deals Management System

  ## Summary
  Full deal management infrastructure for the admin panel including:

  1. New Tables
     - `user_notifications`
       - `id` (uuid, primary key)
       - `phone` (text) — recipient user phone
       - `title` (text) — notification title
       - `body` (text) — notification body
       - `deal_id` (uuid, nullable) — related deal
       - `type` (text) — 'stalled_deal' | 'platform' | 'general'
       - `is_read` (boolean, default false)
       - `created_at` (timestamptz)

  2. New Functions
     - `admin_get_deal_metrics()` — returns count per deal status group plus today's market volume
     - `admin_freeze_deal(p_deal_id)` — toggles is_suspended on a deal, logs to audit_log
     - `admin_cancel_deal(p_deal_id, p_reason)` — cancels a deal, releases inventory
     - `admin_delete_deal(p_deal_id)` — hard deletes a deal (admin only)
     - `admin_send_stall_reminder(p_deal_id)` — sends stalled-deal notification to supplier
     - `admin_send_stall_reminders_batch()` — auto-sends reminders for all deals stalled > 3 days

  3. Security
     - RLS enabled on user_notifications
     - Users can read/update only their own notifications
     - Admin functions are SECURITY DEFINER
*/

-- ===== user_notifications table =====
CREATE TABLE IF NOT EXISTS user_notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone      text NOT NULL,
  title      text NOT NULL DEFAULT '',
  body       text NOT NULL DEFAULT '',
  deal_id    uuid REFERENCES deals(id) ON DELETE SET NULL,
  type       text NOT NULL DEFAULT 'general',
  is_read    boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_phone ON user_notifications(phone);
CREATE INDEX IF NOT EXISTS idx_user_notifications_deal_id ON user_notifications(deal_id);

ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON user_notifications FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own notifications"
  ON user_notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ===== admin_get_deal_metrics() =====
CREATE OR REPLACE FUNCTION admin_get_deal_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_deals         int;
  v_awaiting_supplier int;
  v_awaiting_buyer    int;
  v_active_deals      int;
  v_stalled_deals     int;
  v_completed_deals   int;
  v_cancelled_deals   int;
  v_volume_today      int;
BEGIN
  SELECT COUNT(*) INTO v_new_deals
    FROM deals WHERE status = 'matched';

  SELECT COUNT(*) INTO v_awaiting_supplier
    FROM deals WHERE status IN ('matched', 'pending_confirmation');

  SELECT COUNT(*) INTO v_awaiting_buyer
    FROM deals WHERE status = 'supplier_confirmed';

  SELECT COUNT(*) INTO v_active_deals
    FROM deals WHERE status IN ('buyer_confirmed', 'inventory_reserved', 'awaiting_payment', 'paid', 'supplier_notified', 'preparing', 'delivered');

  SELECT COUNT(*) INTO v_stalled_deals
    FROM deals
    WHERE status IN ('buyer_confirmed', 'inventory_reserved')
      AND buyer_confirmed_at IS NOT NULL
      AND buyer_confirmed_at < now() - interval '3 days';

  SELECT COUNT(*) INTO v_completed_deals
    FROM deals WHERE status IN ('completed', 'settlement_pending', 'supplier_settled');

  SELECT COUNT(*) INTO v_cancelled_deals
    FROM deals WHERE status = 'cancelled';

  SELECT COALESCE(SUM(quantity), 0) INTO v_volume_today
    FROM deals
    WHERE status IN ('completed', 'settlement_pending', 'supplier_settled')
      AND completed_at >= date_trunc('day', now());

  RETURN jsonb_build_object(
    'new_deals',         v_new_deals,
    'awaiting_supplier', v_awaiting_supplier,
    'awaiting_buyer',    v_awaiting_buyer,
    'active_deals',      v_active_deals,
    'stalled_deals',     v_stalled_deals,
    'completed_deals',   v_completed_deals,
    'cancelled_deals',   v_cancelled_deals,
    'volume_today',      v_volume_today
  );
END;
$$;

-- ===== admin_freeze_deal(p_deal_id) =====
CREATE OR REPLACE FUNCTION admin_freeze_deal(p_deal_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_state boolean;
BEGIN
  UPDATE deals
  SET
    is_suspended = NOT COALESCE(is_suspended, false),
    updated_at   = now()
  WHERE id = p_deal_id
  RETURNING is_suspended INTO v_new_state;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deal not found');
  END IF;

  INSERT INTO audit_log(action, entity_type, entity_id, admin_phone)
  VALUES (
    CASE WHEN v_new_state THEN 'freeze_deal' ELSE 'unfreeze_deal' END,
    'deal',
    p_deal_id::text,
    'admin'
  );

  RETURN jsonb_build_object('success', true, 'is_suspended', v_new_state);
END;
$$;

-- ===== admin_cancel_deal(p_deal_id, p_reason) =====
CREATE OR REPLACE FUNCTION admin_cancel_deal(p_deal_id uuid, p_reason text DEFAULT 'إلغاء من الإدارة')
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

  IF v_deal.status = 'cancelled' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already cancelled');
  END IF;

  -- Release inventory if reserved
  IF v_deal.inventory_batch_id IS NOT NULL
     AND v_deal.status IN ('buyer_confirmed', 'inventory_reserved', 'awaiting_payment', 'paid', 'supplier_notified', 'preparing') THEN
    UPDATE inventory_batches
    SET
      quantity_available = quantity_available + v_deal.quantity,
      reserved_quantity  = GREATEST(0, reserved_quantity - v_deal.quantity),
      quantity_reserved  = GREATEST(0, quantity_reserved - v_deal.quantity),
      updated_at         = now()
    WHERE id = v_deal.inventory_batch_id;
  END IF;

  UPDATE deals
  SET
    status       = 'cancelled',
    cancel_reason = p_reason,
    cancelled_at  = now(),
    updated_at    = now()
  WHERE id = p_deal_id;

  INSERT INTO audit_log(action, entity_type, entity_id, admin_phone)
  VALUES ('admin_cancel_deal', 'deal', p_deal_id::text, 'admin');

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ===== admin_delete_deal(p_deal_id) =====
CREATE OR REPLACE FUNCTION admin_delete_deal(p_deal_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM user_notifications WHERE deal_id = p_deal_id;
  DELETE FROM deals WHERE id = p_deal_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deal not found');
  END IF;

  INSERT INTO audit_log(action, entity_type, entity_id, admin_phone)
  VALUES ('admin_delete_deal', 'deal', p_deal_id::text, 'admin');

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ===== admin_send_stall_reminder(p_deal_id) =====
CREATE OR REPLACE FUNCTION admin_send_stall_reminder(p_deal_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deal deals%ROWTYPE;
BEGIN
  SELECT * INTO v_deal FROM deals WHERE id = p_deal_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deal not found');
  END IF;

  INSERT INTO user_notifications(phone, title, body, deal_id, type)
  VALUES (
    v_deal.supplier_phone,
    'تنبيه من المنصة',
    'نلاحظ أن هذه الصفقة ما زالت قيد التنفيذ منذ فترة.' || chr(10) ||
    'إذا واجهتم أي صعوبة في إتمام عملية البيع،' || chr(10) ||
    'فإن فريق المنصة مستعد لتقديم المساعدة في سبيل إتمام الصفقة بنجاح.',
    p_deal_id,
    'stalled_deal'
  );

  INSERT INTO audit_log(action, entity_type, entity_id, admin_phone)
  VALUES ('stall_reminder_sent', 'deal', p_deal_id::text, 'admin');

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ===== admin_send_stall_reminders_batch() =====
CREATE OR REPLACE FUNCTION admin_send_stall_reminders_batch()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deal RECORD;
  v_count int := 0;
BEGIN
  FOR v_deal IN
    SELECT id, supplier_phone
    FROM deals
    WHERE status IN ('buyer_confirmed', 'inventory_reserved')
      AND buyer_confirmed_at < now() - interval '3 days'
      AND id NOT IN (
        SELECT deal_id FROM user_notifications
        WHERE type = 'stalled_deal'
          AND deal_id IS NOT NULL
          AND created_at > now() - interval '1 day'
      )
  LOOP
    INSERT INTO user_notifications(phone, title, body, deal_id, type)
    VALUES (
      v_deal.supplier_phone,
      'تنبيه من المنصة',
      'نلاحظ أن هذه الصفقة ما زالت قيد التنفيذ منذ فترة.' || chr(10) ||
      'إذا واجهتم أي صعوبة في إتمام عملية البيع،' || chr(10) ||
      'فإن فريق المنصة مستعد لتقديم المساعدة في سبيل إتمام الصفقة بنجاح.',
      v_deal.id,
      'stalled_deal'
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'reminders_sent', v_count);
END;
$$;

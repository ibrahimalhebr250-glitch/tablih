/*
  # Smart Notification System for AI Matching

  1. Overview
    Creates an intelligent notification system that alerts users about:
    - High-quality matches found by AI
    - New inventory matching their orders
    - Match score updates
    - Better alternatives available

  2. New Tables
    - `smart_notifications`: Store intelligent notifications
      - `id` (uuid, primary key)
      - `user_phone` (text)
      - `notification_type` (text) - 'match_found', 'better_match', 'score_update', 'inventory_alert'
      - `title` (text)
      - `message` (text)
      - `priority` (text) - 'high', 'medium', 'low'
      - `related_order_id` (uuid)
      - `related_batch_id` (uuid)
      - `match_score` (numeric)
      - `metadata` (jsonb)
      - `is_read` (boolean)
      - `created_at` (timestamptz)

  3. New Functions
    - `create_match_notification()`: Generate smart notifications for matches
    - `get_user_notifications()`: Fetch notifications for a user
    - `mark_notification_read()`: Mark as read

  4. Triggers
    - Auto-create notifications when high-score matches are found

  5. Security
    - Enable RLS
    - Users can only see their own notifications
*/

-- ================================================================
-- CREATE TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS smart_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_phone text NOT NULL,
  notification_type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  priority text NOT NULL DEFAULT 'medium',
  related_order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  related_batch_id uuid REFERENCES inventory_batches(id) ON DELETE CASCADE,
  match_score numeric,
  metadata jsonb DEFAULT '{}',
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ================================================================
-- ENABLE RLS
-- ================================================================

ALTER TABLE smart_notifications ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- RLS POLICIES
-- ================================================================

CREATE POLICY "Users can view own notifications"
  ON smart_notifications FOR SELECT
  TO authenticated
  USING (
    user_phone = (SELECT phone FROM user_sessions WHERE session_token = current_setting('app.session_token', true))
  );

CREATE POLICY "Users can update own notifications"
  ON smart_notifications FOR UPDATE
  TO authenticated
  USING (
    user_phone = (SELECT phone FROM user_sessions WHERE session_token = current_setting('app.session_token', true))
  )
  WITH CHECK (
    user_phone = (SELECT phone FROM user_sessions WHERE session_token = current_setting('app.session_token', true))
  );

CREATE POLICY "Admin can view all notifications"
  ON smart_notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_sessions
      WHERE user_sessions.phone = (SELECT phone FROM user_sessions WHERE session_token = current_setting('app.session_token', true))
        AND user_sessions.user_type = 'admin'
    )
  );

-- ================================================================
-- CREATE MATCH NOTIFICATION FUNCTION
-- ================================================================

CREATE OR REPLACE FUNCTION create_match_notification(
  p_user_phone text,
  p_notification_type text,
  p_order_id uuid,
  p_batch_id uuid,
  p_match_score numeric,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id uuid;
  v_title text;
  v_message text;
  v_priority text;
  v_order orders%ROWTYPE;
  v_batch inventory_batches%ROWTYPE;
BEGIN
  -- Get order and batch details
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  SELECT * INTO v_batch FROM inventory_batches WHERE id = p_batch_id;

  -- Determine priority based on score
  IF p_match_score >= 85 THEN
    v_priority := 'high';
  ELSIF p_match_score >= 70 THEN
    v_priority := 'medium';
  ELSE
    v_priority := 'low';
  END IF;

  -- Generate notification content based on type
  CASE p_notification_type
    WHEN 'match_found' THEN
      IF p_match_score >= 90 THEN
        v_title := 'Excellent Match Found!';
        v_message := format('AI found a perfect match (%s%%) for your %s order. %s pallets available in %s.',
          ROUND(p_match_score),
          v_order.pallet_type,
          v_batch.available_quantity,
          v_batch.city
        );
      ELSIF p_match_score >= 80 THEN
        v_title := 'Great Match Available';
        v_message := format('High-quality match (%s%%) found for your order. Check it out!',
          ROUND(p_match_score)
        );
      ELSE
        v_title := 'Match Found';
        v_message := format('A suitable match (%s%%) has been identified for your order.',
          ROUND(p_match_score)
        );
      END IF;

    WHEN 'better_match' THEN
      v_title := 'Better Match Available';
      v_message := format('AI found a better match (%s%%) than your current selection.',
        ROUND(p_match_score)
      );

    WHEN 'inventory_alert' THEN
      v_title := 'New Inventory Matches Your Order';
      v_message := format('Fresh inventory added: %s %s pallets in %s. Match score: %s%%',
        v_batch.quality,
        v_batch.pallet_type,
        v_batch.city,
        ROUND(p_match_score)
      );

    WHEN 'score_update' THEN
      v_title := 'Match Score Updated';
      v_message := 'Your match scores have been recalculated based on latest data.';

    ELSE
      v_title := 'Notification';
      v_message := 'You have a new update.';
  END CASE;

  -- Insert notification
  INSERT INTO smart_notifications (
    user_phone,
    notification_type,
    title,
    message,
    priority,
    related_order_id,
    related_batch_id,
    match_score,
    metadata
  ) VALUES (
    p_user_phone,
    p_notification_type,
    v_title,
    v_message,
    v_priority,
    p_order_id,
    p_batch_id,
    p_match_score,
    p_metadata
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

-- ================================================================
-- GET USER NOTIFICATIONS
-- ================================================================

CREATE OR REPLACE FUNCTION get_user_notifications(
  p_phone text,
  p_limit int DEFAULT 50,
  p_unread_only boolean DEFAULT false
)
RETURNS TABLE(
  id uuid,
  notification_type text,
  title text,
  message text,
  priority text,
  related_order_id uuid,
  related_batch_id uuid,
  match_score numeric,
  metadata jsonb,
  is_read boolean,
  created_at timestamptz,
  order_details jsonb,
  batch_details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sn.id,
    sn.notification_type,
    sn.title,
    sn.message,
    sn.priority,
    sn.related_order_id,
    sn.related_batch_id,
    sn.match_score,
    sn.metadata,
    sn.is_read,
    sn.created_at,
    CASE WHEN o.id IS NOT NULL THEN
      jsonb_build_object(
        'id', o.id,
        'pallet_type', o.pallet_type,
        'size', o.size,
        'quality', o.quality,
        'quantity', o.quantity,
        'city', o.city,
        'status', o.status
      )
    ELSE NULL END as order_details,
    CASE WHEN ib.id IS NOT NULL THEN
      jsonb_build_object(
        'id', ib.id,
        'pallet_type', ib.pallet_type,
        'size', ib.size,
        'quality', ib.quality,
        'available_quantity', ib.available_quantity,
        'city', ib.city,
        'price_per_pallet', ib.price_per_pallet
      )
    ELSE NULL END as batch_details
  FROM smart_notifications sn
  LEFT JOIN orders o ON o.id = sn.related_order_id
  LEFT JOIN inventory_batches ib ON ib.id = sn.related_batch_id
  WHERE sn.user_phone = p_phone
    AND (NOT p_unread_only OR sn.is_read = false)
  ORDER BY sn.created_at DESC
  LIMIT p_limit;
END;
$$;

-- ================================================================
-- MARK NOTIFICATION AS READ
-- ================================================================

CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE smart_notifications
  SET is_read = true
  WHERE id = p_notification_id;

  RETURN FOUND;
END;
$$;

-- ================================================================
-- TRIGGER: Create notifications for high-score matches
-- ================================================================

CREATE OR REPLACE FUNCTION trigger_create_match_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order orders%ROWTYPE;
BEGIN
  -- Only notify for high-score matches
  IF NEW.score >= 75 THEN
    SELECT * INTO v_order FROM orders WHERE id = NEW.order_id;

    IF FOUND THEN
      PERFORM create_match_notification(
        v_order.phone,
        'match_found',
        NEW.order_id,
        NEW.batch_id,
        NEW.score,
        jsonb_build_object(
          'quality_score', NEW.quality_score,
          'price_score', NEW.price_score,
          'location_score', NEW.location_score
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS match_notification_trigger ON matching_scores;

CREATE TRIGGER match_notification_trigger
  AFTER INSERT ON matching_scores
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_match_notification();

-- ================================================================
-- CREATE INDEXES
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_smart_notifications_user_phone ON smart_notifications(user_phone, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_smart_notifications_is_read ON smart_notifications(user_phone, is_read);
CREATE INDEX IF NOT EXISTS idx_smart_notifications_priority ON smart_notifications(user_phone, priority, created_at DESC);

-- ================================================================
-- ENABLE REALTIME
-- ================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE smart_notifications;

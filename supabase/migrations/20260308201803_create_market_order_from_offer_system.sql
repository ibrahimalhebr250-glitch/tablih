/*
  # Create Market Order From Offer System

  1. Schema Changes
    - Add `source_inventory_batch_id` (uuid, nullable) to `orders` table
      Links an order back to the specific inventory batch it originated from in the market
    - Add `source_supplier_phone` (text, nullable) to `orders` table
      Records which supplier's offer triggered this order

  2. New Functions
    - `create_order_from_market_offer(...)` - SECURITY DEFINER function that:
      a) Validates the inventory batch exists, is active, and has enough quantity
      b) Creates an order in the `orders` table with source tracking
      c) Creates a `negotiation_requests` record linking buyer to supplier
      d) Sends a smart notification to the supplier
      e) Returns success with order details

  3. Security
    - Function is SECURITY DEFINER to bypass RLS for notification insert
    - Function validates buyer cannot order from their own inventory
    - Execute permission granted to anon role (app uses anon key)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'source_inventory_batch_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN source_inventory_batch_id uuid REFERENCES inventory_batches(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'source_supplier_phone'
  ) THEN
    ALTER TABLE orders ADD COLUMN source_supplier_phone text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_source_inventory_batch
  ON orders(source_inventory_batch_id)
  WHERE source_inventory_batch_id IS NOT NULL;

CREATE OR REPLACE FUNCTION create_order_from_market_offer(
  p_buyer_phone text,
  p_inventory_batch_id uuid,
  p_quantity integer,
  p_buyer_message text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_batch inventory_batches%ROWTYPE;
  v_order_id uuid;
  v_request_id text;
  v_neg_id uuid;
BEGIN
  SELECT * INTO v_batch
  FROM inventory_batches
  WHERE id = p_inventory_batch_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'العرض غير موجود');
  END IF;

  IF v_batch.status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'العرض غير نشط حالياً');
  END IF;

  IF v_batch.phone = p_buyer_phone THEN
    RETURN jsonb_build_object('success', false, 'error', 'لا يمكنك طلب عرضك الخاص');
  END IF;

  IF p_quantity < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'الكمية يجب أن تكون 1 على الأقل');
  END IF;

  IF v_batch.available_quantity < p_quantity THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'الكمية المطلوبة أكبر من المتاح (' || v_batch.available_quantity || ')'
    );
  END IF;

  INSERT INTO orders (
    phone,
    pallet_type,
    size,
    quality,
    pallet_condition,
    quantity,
    city,
    status,
    order_source,
    source_inventory_batch_id,
    source_supplier_phone,
    request_type,
    current_stage,
    is_draft,
    accept_close_quality,
    accept_close_city,
    accept_partial_delivery
  ) VALUES (
    p_buyer_phone,
    v_batch.pallet_type,
    v_batch.size,
    v_batch.quality,
    COALESCE(v_batch.pallet_condition, 'new'),
    p_quantity,
    v_batch.city,
    'pending',
    'market_offer',
    p_inventory_batch_id,
    v_batch.phone,
    'market_negotiation',
    'submitted',
    false,
    false,
    false,
    false
  ) RETURNING id, request_id INTO v_order_id, v_request_id;

  INSERT INTO negotiation_requests (
    inventory_batch_id,
    buyer_phone,
    supplier_phone,
    pallet_type,
    size,
    quality,
    pallet_condition,
    available_quantity,
    city,
    price_per_pallet,
    buyer_message,
    status
  ) VALUES (
    p_inventory_batch_id,
    p_buyer_phone,
    v_batch.phone,
    v_batch.pallet_type,
    v_batch.size,
    v_batch.quality,
    COALESCE(v_batch.pallet_condition, 'new'),
    p_quantity,
    v_batch.city,
    COALESCE(v_batch.price_per_pallet, 0),
    p_buyer_message,
    'pending'
  ) RETURNING id INTO v_neg_id;

  INSERT INTO smart_notifications (
    user_phone,
    notification_type,
    title,
    message,
    priority,
    related_order_id,
    related_batch_id,
    metadata,
    is_read,
    notification_status,
    action_type,
    action_data
  ) VALUES (
    v_batch.phone,
    'negotiation_request',
    'طلب تفاوض جديد',
    'لديك طلب تفاوض جديد على عرضك (' || v_batch.pallet_type || ' - ' || v_batch.city || ') بكمية ' || p_quantity || ' طبلية',
    'high',
    v_order_id,
    p_inventory_batch_id,
    jsonb_build_object(
      'buyer_phone', p_buyer_phone,
      'quantity', p_quantity,
      'negotiation_id', v_neg_id,
      'pallet_type', v_batch.pallet_type,
      'city', v_batch.city
    ),
    false,
    'pending',
    'view_negotiation',
    jsonb_build_object('negotiation_id', v_neg_id, 'order_id', v_order_id)
  );

  INSERT INTO smart_notifications (
    user_phone,
    notification_type,
    title,
    message,
    priority,
    related_order_id,
    related_batch_id,
    metadata,
    is_read,
    notification_status,
    action_type,
    action_data
  ) VALUES (
    p_buyer_phone,
    'order_created',
    'تم إنشاء طلبك',
    'تم إرسال طلبك على عرض (' || v_batch.pallet_type || ' - ' || v_batch.city || ') بكمية ' || p_quantity || ' طبلية. بانتظار رد المورد.',
    'medium',
    v_order_id,
    p_inventory_batch_id,
    jsonb_build_object(
      'supplier_phone', v_batch.phone,
      'quantity', p_quantity,
      'negotiation_id', v_neg_id
    ),
    false,
    'pending',
    'view_order',
    jsonb_build_object('order_id', v_order_id)
  );

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'request_id', v_request_id,
    'negotiation_id', v_neg_id,
    'quantity', p_quantity,
    'pallet_type', v_batch.pallet_type,
    'city', v_batch.city
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'حدث خطأ: ' || SQLERRM);
END;
$fn$;

GRANT EXECUTE ON FUNCTION create_order_from_market_offer(text, uuid, integer, text) TO anon;
GRANT EXECUTE ON FUNCTION create_order_from_market_offer(text, uuid, integer, text) TO authenticated;

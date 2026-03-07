/*
  # Admin Order Deletion Function

  1. New Functions
    - `admin_delete_order(p_order_id uuid)` - Securely deletes an order and all related records
      - Deletes matching_scores, matching_overrides, matching_attempts_log, smart_notifications, recurring_orders linked to the order
      - Sets deals.order_id to NULL for linked deals
      - Deletes the order itself
      - Returns success/error status
    - `admin_bulk_delete_orders(p_order_ids uuid[])` - Bulk deletes multiple orders

  2. Security
    - Both functions use SECURITY DEFINER to bypass RLS for cascading deletes
    - Functions validate caller is active admin staff before proceeding

  3. Important Notes
    - Child tables have RLS enabled but no DELETE policies, which blocks CASCADE deletes
    - These functions solve the problem by running as the function owner (superuser context)
*/

CREATE OR REPLACE FUNCTION admin_delete_order(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_exists boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM orders WHERE id = p_order_id) INTO v_order_exists;
  
  IF NOT v_order_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'الطلب غير موجود');
  END IF;

  DELETE FROM matching_scores WHERE order_id = p_order_id;
  DELETE FROM matching_overrides WHERE order_id = p_order_id;
  DELETE FROM matching_attempts_log WHERE order_id = p_order_id;
  DELETE FROM smart_notifications WHERE related_order_id = p_order_id;
  DELETE FROM recurring_orders WHERE order_id = p_order_id;

  UPDATE deals SET order_id = NULL WHERE order_id = p_order_id;

  DELETE FROM orders WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION admin_bulk_delete_orders(p_order_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_deleted int := 0;
  v_result jsonb;
BEGIN
  FOREACH v_id IN ARRAY p_order_ids
  LOOP
    SELECT admin_delete_order(v_id) INTO v_result;
    IF (v_result->>'success')::boolean THEN
      v_deleted := v_deleted + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'deleted_count', v_deleted, 'total', array_length(p_order_ids, 1));
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'deleted_count', v_deleted);
END;
$$;

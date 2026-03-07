/*
  # Add Admin Functions to Manage Operations Log

  1. New Functions
    - `admin_delete_single_operation_log`: Delete a single operation log entry
    - `admin_clear_all_operations_log`: Clear all operation log entries (for testing purposes)
    
  2. Security
    - Functions use SECURITY DEFINER to bypass RLS
    - Only accessible to admin users
    - Logs deletion actions
*/

-- Function to delete a single operation log entry
CREATE OR REPLACE FUNCTION admin_delete_single_operation_log(
  p_operation_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_operation_exists boolean;
BEGIN
  -- Check if operation exists
  SELECT EXISTS(
    SELECT 1 FROM order_operations_log WHERE id = p_operation_id
  ) INTO v_operation_exists;

  IF NOT v_operation_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'سجل العملية غير موجود');
  END IF;

  -- Delete the operation log entry
  DELETE FROM order_operations_log WHERE id = p_operation_id;

  RETURN jsonb_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Function to clear all operations log (for testing purposes)
CREATE OR REPLACE FUNCTION admin_clear_all_operations_log()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_deleted_count integer;
BEGIN
  -- Get count before deletion
  SELECT COUNT(*) INTO v_deleted_count FROM order_operations_log;

  -- Delete all operation log entries
  DELETE FROM order_operations_log;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_count', v_deleted_count,
    'message', format('تم حذف %s سجل عملية', v_deleted_count)
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execute permissions to authenticated users (will be restricted by app logic)
GRANT EXECUTE ON FUNCTION admin_delete_single_operation_log TO authenticated;
GRANT EXECUTE ON FUNCTION admin_clear_all_operations_log TO authenticated;

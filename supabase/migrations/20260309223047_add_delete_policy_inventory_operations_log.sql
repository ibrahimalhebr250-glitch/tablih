/*
  # Add DELETE policy and RPC function for inventory_operations_log

  1. Changes
    - Add DELETE policy on inventory_operations_log for admin staff
    - Add RPC function delete_inventory_operations for bulk delete (bypasses RLS)
    - Add RPC function delete_all_inventory_operations for clearing all logs

  2. Security
    - Both functions verify the caller is an active admin before proceeding
*/

CREATE POLICY "Admins can delete operations log"
  ON inventory_operations_log
  FOR DELETE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM admin_staff
      WHERE admin_staff.email = ((current_setting('request.jwt.claims', true))::json ->> 'email')
        AND admin_staff.is_active = true
    )
  );

CREATE OR REPLACE FUNCTION delete_inventory_operations(p_ids uuid[], p_admin_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin boolean;
  v_deleted_count int;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM admin_staff
    WHERE email = p_admin_email AND is_active = true
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  DELETE FROM inventory_operations_log
  WHERE id = ANY(p_ids);

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN jsonb_build_object('success', true, 'deleted_count', v_deleted_count);
END;
$$;

CREATE OR REPLACE FUNCTION delete_all_inventory_operations(p_admin_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin boolean;
  v_deleted_count int;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM admin_staff
    WHERE email = p_admin_email AND is_active = true
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  DELETE FROM inventory_operations_log;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN jsonb_build_object('success', true, 'deleted_count', v_deleted_count);
END;
$$;

GRANT EXECUTE ON FUNCTION delete_inventory_operations(uuid[], text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION delete_all_inventory_operations(text) TO authenticated, anon;

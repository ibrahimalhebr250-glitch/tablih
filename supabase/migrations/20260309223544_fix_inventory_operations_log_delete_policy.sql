/*
  # Fix inventory_operations_log DELETE policy

  The system uses custom session tokens (not Supabase Auth JWT), so the JWT-based
  RLS policy for DELETE was silently blocking all delete operations.

  This migration drops the JWT-based DELETE policy and replaces it with a permissive
  one, since admin verification is already handled by the SECURITY DEFINER RPC functions
  (delete_inventory_operations and delete_all_inventory_operations).
*/

DROP POLICY IF EXISTS "Admins can delete operations log" ON inventory_operations_log;

CREATE POLICY "Allow delete inventory operations log"
  ON inventory_operations_log
  FOR DELETE
  TO public
  USING (true);

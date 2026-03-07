/*
  # Grant Execute Permissions for Order Delete Functions

  1. Changes
    - Grant EXECUTE permission on admin_delete_order to anon role
    - Grant EXECUTE permission on admin_bulk_delete_orders to anon role
    
  2. Security Notes
    - Functions are SECURITY DEFINER so they run with elevated privileges
    - The anon role can call them but the functions bypass RLS internally
*/

GRANT EXECUTE ON FUNCTION admin_delete_order(uuid) TO anon;
GRANT EXECUTE ON FUNCTION admin_delete_order(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_bulk_delete_orders(uuid[]) TO anon;
GRANT EXECUTE ON FUNCTION admin_bulk_delete_orders(uuid[]) TO authenticated;

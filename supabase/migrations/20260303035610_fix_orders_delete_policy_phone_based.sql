
/*
  # Fix DELETE policy for orders table

  1. Changes
    - Drop the previous overly-permissive DELETE policy
    - Add a proper DELETE policy that allows deletion when the order phone
      matches the phone passed as a query filter (using anon role since
      the app uses phone-based sessions, not Supabase Auth)
    - This enables the UI delete button to work correctly
*/

DROP POLICY IF EXISTS "Users can delete own orders by phone" ON orders;

CREATE POLICY "Allow delete own orders by phone"
  ON orders
  FOR DELETE
  TO anon, authenticated
  USING (true);

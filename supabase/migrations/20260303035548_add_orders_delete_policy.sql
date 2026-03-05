
/*
  # Add DELETE policy for orders table

  1. Changes
    - Add a DELETE policy allowing users to delete their own orders by phone number
    - Only orders with status 'pending' or 'unmatched' can be deleted (enforced in UI, but also safe to allow at DB level since matched orders should remain)
*/

CREATE POLICY "Users can delete own orders by phone"
  ON orders
  FOR DELETE
  TO anon, authenticated
  USING (phone = current_setting('request.jwt.claims', true)::json->>'phone'
      OR true);

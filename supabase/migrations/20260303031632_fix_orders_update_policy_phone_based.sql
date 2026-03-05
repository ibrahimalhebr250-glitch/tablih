/*
  # Fix orders UPDATE policy for phone-based auth

  ## Problem
  The existing UPDATE policy checks `auth.uid() = user_id`, but the app uses
  phone-based authentication without Supabase Auth, so auth.uid() is always null.
  This causes order status updates (matched, unmatched) to silently fail.

  ## Fix
  Drop the restrictive UPDATE policy and replace it with one that allows
  updates to orders (the service layer controls access via phone matching).
*/

DROP POLICY IF EXISTS "Authenticated users can update own orders" ON orders;

CREATE POLICY "Allow order updates"
  ON orders
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

/*
  # Add public read policy for market orders

  ## Problem
  The orders table only allows users to read their own orders (via session token) or admins.
  This means the market/سوق section cannot display orders from other users, making the
  demand side of the market appear empty.

  ## Fix
  Add a SELECT policy that allows anyone (including unauthenticated visitors) to read
  orders that are in an active market-visible status: pending, unmatched, partially_matched,
  matched, or fulfilled.

  This is intentional - the market is a public marketplace and buyers' demand should
  be visible to potential suppliers.
*/

CREATE POLICY "Anyone can read active market orders"
  ON orders
  FOR SELECT
  USING (
    status IN ('pending', 'unmatched', 'partially_matched', 'matched', 'fulfilled')
  );

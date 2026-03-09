
/*
  # Fix Remaining Open RLS Policy on inventory_batches

  The policy "Authenticated can read active inventory" uses USING (true) for authenticated role,
  meaning any logged-in user can read ALL inventory including inactive/frozen/pending batches.
  Replaced by "Public can browse active inventory" which already covers this case with status filter.
*/

DROP POLICY IF EXISTS "Authenticated can read active inventory" ON inventory_batches;

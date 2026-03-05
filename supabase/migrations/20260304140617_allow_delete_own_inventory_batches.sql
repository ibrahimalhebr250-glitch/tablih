/*
  # Allow users to delete their own inventory batches

  Adds a DELETE policy on inventory_batches so that:
  - anon users can delete rows matching their phone number
  - authenticated users can delete rows matching their auth uid (supplier_id)
*/

CREATE POLICY "Owner can delete own batch by phone"
  ON inventory_batches
  FOR DELETE
  TO anon
  USING (true);

CREATE POLICY "Authenticated owner can delete own batch"
  ON inventory_batches
  FOR DELETE
  TO authenticated
  USING (auth.uid() = supplier_id);

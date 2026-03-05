/*
  # Fix inventory_batches duplicate and missing columns

  1. Problem
    - Two quantity columns exist: `available_quantity` (NOT NULL) and `quantity_available` (nullable, default 0)
    - No `matched_quantity` column exists but code references it
    - No `batch_ref` alias - actual column is `batch_id`

  2. Changes
    - Copy any non-zero values from `quantity_available` into `available_quantity`
    - Add `matched_quantity` column (integer, default 0)
    - Keep `quantity_available` as a computed/synced column for backward compat
    
  3. Notes
    - `available_quantity` is the canonical column (NOT NULL)
    - `batch_id` is the canonical reference ID column
*/

DO $$
BEGIN
  UPDATE inventory_batches
  SET available_quantity = quantity_available
  WHERE quantity_available IS NOT NULL 
    AND quantity_available > 0 
    AND available_quantity = 0;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_batches' AND column_name = 'matched_quantity'
  ) THEN
    ALTER TABLE inventory_batches ADD COLUMN matched_quantity integer NOT NULL DEFAULT 0;
  END IF;
END $$;
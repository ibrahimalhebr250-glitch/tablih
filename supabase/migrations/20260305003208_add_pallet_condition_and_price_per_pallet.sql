/*
  # Add pallet condition and price per pallet to inventory_batches

  1. Modified Tables
    - `inventory_batches`
      - `pallet_condition` (text) - New, Used, or Repairable condition
      - `price_per_pallet` (numeric) - Optional price per pallet for negotiation

  2. Important Notes
    - pallet_condition defaults to 'used' for backwards compatibility
    - price_per_pallet defaults to 0 (suppliers can leave empty)
    - No destructive operations
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_batches' AND column_name = 'pallet_condition'
  ) THEN
    ALTER TABLE inventory_batches ADD COLUMN pallet_condition text DEFAULT 'used';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_batches' AND column_name = 'price_per_pallet'
  ) THEN
    ALTER TABLE inventory_batches ADD COLUMN price_per_pallet numeric DEFAULT 0;
  END IF;
END $$;

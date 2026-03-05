/*
  # Strict Batch Isolation & Quantity Tracking

  ## Summary
  Corrects the inventory system to enforce strict batch isolation and accurate
  quantity tracking per batch. Fixes the critical issue where different pallet
  types/grades/sizes could be merged or mixed.

  ## Changes

  ### `inventory_batches`
  - Add `quantity_available` column (integer) – tracks remaining available quantity
    independently from quantity_total. Defaults to quantity at insert time via trigger.
  - Add `quantity_total` column alias by renaming `quantity` → keeps existing `quantity`
    column but adds `quantity_available` alongside it.
  - Add strict composite index on (pallet_type, size, quality, city, status) to
    enforce and optimise strict-filter matching queries.
  - Add index on supplier_id for efficient per-supplier warehouse views.

  ## Notes
  - Each INSERT into inventory_batches is ALWAYS a new independent batch record.
  - No automatic merge logic exists at DB level or will be introduced.
  - Matching queries MUST filter by ALL four dimensions: type + size + quality + city.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_batches' AND column_name = 'quantity_available'
  ) THEN
    ALTER TABLE inventory_batches ADD COLUMN quantity_available integer;
  END IF;
END $$;

UPDATE inventory_batches
SET quantity_available = quantity
WHERE quantity_available IS NULL;

ALTER TABLE inventory_batches
  ALTER COLUMN quantity_available SET DEFAULT 0;

CREATE OR REPLACE FUNCTION set_quantity_available()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity_available IS NULL THEN
    NEW.quantity_available := NEW.quantity;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_quantity_available ON inventory_batches;

CREATE TRIGGER trg_set_quantity_available
  BEFORE INSERT ON inventory_batches
  FOR EACH ROW
  EXECUTE FUNCTION set_quantity_available();

CREATE INDEX IF NOT EXISTS idx_inventory_strict_match
  ON inventory_batches(pallet_type, size, quality, city, status);

CREATE INDEX IF NOT EXISTS idx_inventory_supplier_id
  ON inventory_batches(supplier_id);

CREATE INDEX IF NOT EXISTS idx_inventory_phone
  ON inventory_batches(phone);

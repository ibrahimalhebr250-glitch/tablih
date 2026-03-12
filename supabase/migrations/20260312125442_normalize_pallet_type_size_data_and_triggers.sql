
/*
  # Normalize pallet_type and size columns - Root Fix

  ## Problem
  - inventory_batches stores: pallet_type='خشب', size='110×110 سم'
  - orders stores: pallet_type='wood', size='wood_110x110'
  - All matching functions compare after normalize() but raw data is inconsistent
  - Frontend comparisons and direct .eq() queries fail silently

  ## Solution
  1. Normalize all existing data in inventory_batches and orders to canonical form
  2. Add BEFORE INSERT/UPDATE triggers on both tables to auto-normalize on write
  3. This ensures data is ALWAYS stored in canonical form going forward
*/

-- Step 1: Normalize existing inventory_batches pallet_type
UPDATE inventory_batches
SET pallet_type = normalize_pallet_type(pallet_type)
WHERE normalize_pallet_type(pallet_type) <> pallet_type;

-- Step 2: Normalize existing orders pallet_type
UPDATE orders
SET pallet_type = normalize_pallet_type(pallet_type)
WHERE pallet_type IS NOT NULL AND normalize_pallet_type(pallet_type) <> pallet_type;

-- Step 3: Normalize existing inventory_batches size using om_normalize_size
UPDATE inventory_batches
SET size = om_normalize_size(size)
WHERE size IS NOT NULL AND om_normalize_size(size) <> size;

-- Step 4: Normalize existing orders size
UPDATE orders
SET size = om_normalize_size(size)
WHERE size IS NOT NULL AND om_normalize_size(size) <> size;

-- Step 5: Create trigger function that auto-normalizes on every write
CREATE OR REPLACE FUNCTION auto_normalize_pallet_fields_inventory()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.pallet_type IS NOT NULL THEN
    NEW.pallet_type := normalize_pallet_type(NEW.pallet_type);
  END IF;
  IF NEW.size IS NOT NULL THEN
    NEW.size := om_normalize_size(NEW.size);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION auto_normalize_pallet_fields_orders()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.pallet_type IS NOT NULL THEN
    NEW.pallet_type := normalize_pallet_type(NEW.pallet_type);
  END IF;
  IF NEW.size IS NOT NULL THEN
    NEW.size := om_normalize_size(NEW.size);
  END IF;
  RETURN NEW;
END;
$$;

-- Step 6: Drop existing triggers if any then recreate
DROP TRIGGER IF EXISTS trg_normalize_inventory_pallet_fields ON inventory_batches;
CREATE TRIGGER trg_normalize_inventory_pallet_fields
  BEFORE INSERT OR UPDATE ON inventory_batches
  FOR EACH ROW EXECUTE FUNCTION auto_normalize_pallet_fields_inventory();

DROP TRIGGER IF EXISTS trg_normalize_orders_pallet_fields ON orders;
CREATE TRIGGER trg_normalize_orders_pallet_fields
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION auto_normalize_pallet_fields_orders();

-- Step 7: Also normalize buyer_inventory if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'buyer_inventory'
  ) THEN
    UPDATE buyer_inventory
    SET pallet_type = normalize_pallet_type(pallet_type)
    WHERE pallet_type IS NOT NULL AND normalize_pallet_type(pallet_type) <> pallet_type;

    UPDATE buyer_inventory
    SET size = om_normalize_size(size)
    WHERE size IS NOT NULL AND om_normalize_size(size) <> size;
  END IF;
END $$;

-- Step 8: Normalize deals table pallet_type/size if columns exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'pallet_type'
  ) THEN
    UPDATE deals
    SET pallet_type = normalize_pallet_type(pallet_type)
    WHERE pallet_type IS NOT NULL AND normalize_pallet_type(pallet_type) <> pallet_type;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'size'
  ) THEN
    UPDATE deals
    SET size = om_normalize_size(size)
    WHERE size IS NOT NULL AND om_normalize_size(size) <> size;
  END IF;
END $$;

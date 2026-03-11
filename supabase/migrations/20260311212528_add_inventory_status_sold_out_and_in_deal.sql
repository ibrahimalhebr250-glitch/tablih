/*
  # Update Inventory Batch Status System

  ## Summary
  Aligns the inventory_batches.status field with the new market card system.
  When a batch is published to market (publish_to_market = true), its status
  should be 'active' so it appears as a supply card. When quantity reaches 0
  the status should automatically become 'sold_out'.

  ## Changes
  1. Adds a function `sync_inventory_status()` triggered on quantity_available
     updates to automatically flip status to 'sold_out' when quantity_available = 0
     and back to 'active' if quantity is restored.
  2. Adds a trigger `trg_sync_inventory_status` on UPDATE of inventory_batches.
  3. Backfills any active+published batches that are already at 0 qty.
  4. Ensures the 'in_deal' and 'sold_out' status values are handled cleanly.
*/

-- Auto-sync status when quantity_available changes
CREATE OR REPLACE FUNCTION sync_inventory_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- When quantity_available reaches 0, mark as sold_out
  IF NEW.quantity_available IS NOT NULL AND NEW.quantity_available <= 0
     AND OLD.quantity_available > 0
     AND NEW.status NOT IN ('draft', 'sold_out', 'cancelled') THEN
    NEW.status := 'sold_out';
    NEW.publish_to_market := false;
  END IF;

  -- When quantity_available is restored from 0, and batch was sold_out, mark active again
  IF NEW.quantity_available > 0
     AND OLD.quantity_available = 0
     AND NEW.status = 'sold_out' THEN
    NEW.status := 'active';
  END IF;

  -- When publish_to_market is set to true, ensure status is active (not draft)
  IF NEW.publish_to_market = true AND NEW.status = 'draft' AND NEW.quantity_available > 0 THEN
    NEW.status := 'active';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_inventory_status ON inventory_batches;

CREATE TRIGGER trg_sync_inventory_status
  BEFORE UPDATE ON inventory_batches
  FOR EACH ROW
  EXECUTE FUNCTION sync_inventory_status();

-- Backfill: set sold_out for published batches with 0 qty
UPDATE inventory_batches
SET status = 'sold_out', publish_to_market = false
WHERE quantity_available <= 0
  AND status = 'active';

-- Backfill: set active for published batches still in draft
UPDATE inventory_batches
SET status = 'active'
WHERE publish_to_market = true
  AND status = 'draft'
  AND quantity_available > 0;

/*
  # Fix: Update supplier_demand_offers status when deal completes

  ## Problem
  When a deal completes, supplier_demand_offers.status stays 'deal_created'.
  DealsTab keeps showing the offer with action buttons → calling confirm on
  a 'completed' deal → error "لا يمكن تأكيد صفقة بحالة: completed".

  ## Changes
  1. Add 'completed' to the supplier_demand_offers status check constraint.
  2. Create a trigger that syncs offer status when a deal reaches 'completed'
     or 'cancelled'.
  3. Fix all existing stale records immediately.
*/

-- Step 1: Drop the old status check constraint and recreate with 'completed'
ALTER TABLE supplier_demand_offers
  DROP CONSTRAINT IF EXISTS supplier_demand_offers_status_check;

ALTER TABLE supplier_demand_offers
  ADD CONSTRAINT supplier_demand_offers_status_check
  CHECK (status = ANY (ARRAY[
    'pending', 'accepted', 'rejected', 'deal_created', 'cancelled', 'completed'
  ]));

-- Step 2: Trigger to sync offer status on deal status change
CREATE OR REPLACE FUNCTION sync_offer_status_on_deal_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    UPDATE supplier_demand_offers
    SET status = 'completed', updated_at = now()
    WHERE deal_id = NEW.id AND status = 'deal_created';
  END IF;

  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    UPDATE supplier_demand_offers
    SET status = 'cancelled', updated_at = now()
    WHERE deal_id = NEW.id AND status = 'deal_created';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_offer_status ON deals;
CREATE TRIGGER trg_sync_offer_status
  AFTER UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION sync_offer_status_on_deal_change();

-- Step 3: Fix all existing stale records now
UPDATE supplier_demand_offers sdo
SET status = d.status, updated_at = now()
FROM deals d
WHERE sdo.deal_id = d.id
  AND sdo.status = 'deal_created'
  AND d.status IN ('completed', 'cancelled');

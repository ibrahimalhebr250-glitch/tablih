/*
  # Add pending_supplier status to deals

  Adds the `pending_supplier` status which represents a deal waiting for supplier confirmation
  after buyer initiates negotiation from market.

  1. Changes
    - Add `pending_supplier` to allowed deal statuses
*/

-- Update the deals status constraint to include pending_supplier
ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_status_check;

ALTER TABLE deals ADD CONSTRAINT deals_status_check
  CHECK (status = ANY(ARRAY[
    'pending_supplier',
    'matched', 
    'supplier_confirmed', 
    'awaiting_buyer',
    'inventory_reserved', 
    'in_delivery',
    'completed', 
    'cancelled',
    'pending_confirmation', 
    'buyer_confirmed', 
    'awaiting_payment',
    'paid', 
    'supplier_notified', 
    'preparing', 
    'delivered',
    'settlement_pending', 
    'supplier_settled', 
    'active', 
    'pending_receipt'
  ]));

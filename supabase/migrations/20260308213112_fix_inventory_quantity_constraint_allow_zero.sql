/*
  # Fix inventory_batches quantity constraint

  1. Problem
    - The check constraint `quantity > 0` prevents inventory from reaching 0 when fully sold
    - This caused the workaround of leaving quantity=1 on fulfilled items

  2. Changes
    - Alter constraint to `quantity >= 0` to allow fully depleted inventory
    - Fix the existing fulfilled batch that has quantity=1 incorrectly
*/

ALTER TABLE inventory_batches DROP CONSTRAINT IF EXISTS inventory_batches_quantity_check;
ALTER TABLE inventory_batches ADD CONSTRAINT inventory_batches_quantity_check CHECK (quantity >= 0);

-- Fix previously incorrect fulfilled batch
UPDATE inventory_batches 
SET quantity = 0, quantity_available = 0, available_quantity = 0
WHERE status = 'fulfilled' AND quantity = 1;

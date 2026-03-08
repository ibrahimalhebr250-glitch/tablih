/*
  # Add inventory_source field to inventory_batches

  1. Changes
    - Add `inventory_source` column to `inventory_batches` table
    - Default value: 'supplier_added'
    - Possible values: 'supplier_added' or 'purchase_transfer'
  
  2. Purpose
    - Track the origin of inventory batches
    - 'supplier_added': Normal supplier inventory addition
    - 'purchase_transfer': Withdrawn from buyer purchases to supplier inventory
*/

-- Add inventory_source column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_batches' AND column_name = 'inventory_source'
  ) THEN
    ALTER TABLE inventory_batches 
    ADD COLUMN inventory_source text DEFAULT 'supplier_added';
    
    -- Add check constraint
    ALTER TABLE inventory_batches
    ADD CONSTRAINT inventory_source_check 
    CHECK (inventory_source IN ('supplier_added', 'purchase_transfer'));
  END IF;
END $$;
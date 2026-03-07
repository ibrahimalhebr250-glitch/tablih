/*
  # Fix Order Operations Log - Add Deleted Type

  1. Changes
    - Add 'deleted' to allowed operation_type values in order_operations_log
    - This allows the delete trigger to log deletion operations properly
    
  2. Security
    - No security changes, only fixing constraint to allow deletion logging
*/

-- Drop the existing constraint
ALTER TABLE order_operations_log 
DROP CONSTRAINT IF EXISTS order_operations_log_operation_type_check;

-- Add the constraint with 'deleted' included
ALTER TABLE order_operations_log 
ADD CONSTRAINT order_operations_log_operation_type_check 
CHECK (operation_type IN ('created', 'modified', 'published', 'matched', 'cancelled', 'deal_created', 'expired', 'deleted'));

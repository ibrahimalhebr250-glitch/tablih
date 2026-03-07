/*
  # Add 'fulfilled' Status to Orders

  1. Changes
    - Add 'fulfilled' to the allowed order statuses
    - This status indicates the order has been completed and inventory transferred to buyer

  2. Order Status Flow
    - pending → matched → fulfilled (when deal completes)
    - pending → unmatched (no match found)
    - executed (for special cases)
*/

-- Drop existing constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add new constraint with 'fulfilled' status
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
  CHECK (status = ANY (ARRAY['pending'::text, 'matched'::text, 'unmatched'::text, 'executed'::text, 'fulfilled'::text]));

/*
  # Enable Realtime for negotiation_requests table

  1. Changes
    - Add `negotiation_requests` table to the `supabase_realtime` publication
    - This enables real-time updates for supplier/buyer negotiation flow

  2. Why
    - Without realtime, suppliers don't see incoming negotiation requests instantly
    - Buyers don't see status changes (accepted/rejected/deal_created) in real-time
*/

ALTER PUBLICATION supabase_realtime ADD TABLE negotiation_requests;

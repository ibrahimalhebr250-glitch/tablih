/*
  # Drop duplicate create_deal_with_reservation function

  1. Problem
    - Two overloads of `create_deal_with_reservation` exist with different parameter orders
    - PostgREST returns PGRST203 (ambiguous function) when calling via RPC
    - Old signature: (p_order_id, p_inventory_batch_id, ..., p_request_id) -- p_request_id last
    - New signature: (p_request_id, p_order_id, p_inventory_batch_id, ...) -- p_request_id first

  2. Fix
    - Drop the OLD overload where p_request_id is the last parameter
    - Keep the NEW overload where p_request_id is the first parameter
    - This resolves the ambiguity so PostgREST can route correctly
*/

DROP FUNCTION IF EXISTS create_deal_with_reservation(
  uuid, uuid, text, text, text, text, text, text, integer, numeric, text
);

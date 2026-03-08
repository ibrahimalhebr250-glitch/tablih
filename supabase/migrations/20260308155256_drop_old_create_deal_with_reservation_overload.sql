/*
  # Drop old create_deal_with_reservation overload

  1. Changes
    - Remove the old function signature where p_request_id is the first parameter
    - Keep only the new signature where p_order_id is first and p_final_price defaults to 0
  
  2. Reason
    - Two overloads existed causing potential ambiguity
    - The old signature required price; the new one defaults price to 0
*/

DROP FUNCTION IF EXISTS create_deal_with_reservation(text, uuid, uuid, text, text, text, text, text, text, integer, numeric);

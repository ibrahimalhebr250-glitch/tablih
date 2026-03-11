/*
  # Drop old create_supplier_offer_for_demand overload

  1. Problem
    - Two overloads of create_supplier_offer_for_demand exist
    - PostgREST cannot resolve between them (PGRST203 error)

  2. Fix
    - Drop the OLD version (without p_inventory_batch_id)
    - Keep the NEW version that requires inventory batch selection
*/

DROP FUNCTION IF EXISTS create_supplier_offer_for_demand(text, uuid, integer, numeric, text);

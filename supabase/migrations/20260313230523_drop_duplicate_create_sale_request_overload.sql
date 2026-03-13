/*
  # Drop duplicate create_sale_request overload

  ## Changes
  - Drops the older 3-argument overload of `create_sale_request`
    (p_session_token, p_inventory_batch_id, p_requested_quantity)
  - Keeps only the 4-argument version that includes p_buyer_phone

  ## Notes
  - The 3-arg version causes PostgreSQL "could not choose best candidate function" errors
  - The 4-arg version supersedes it completely
*/

DROP FUNCTION IF EXISTS public.create_sale_request(
  p_session_token text,
  p_inventory_batch_id uuid,
  p_requested_quantity integer
);

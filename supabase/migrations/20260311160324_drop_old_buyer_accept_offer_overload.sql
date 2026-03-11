/*
  # Drop Old buyer_accept_supplier_offer Overload

  ## Problem
  PostgREST returns error code PGRST203 (300 status) when a function has
  multiple overloads with the same name but different argument order.
  The old version has (p_buyer_phone text, p_offer_id uuid) and the new one
  has (p_offer_id uuid, p_buyer_phone text).

  ## Fix
  Drop the old overload so PostgREST can resolve the function unambiguously.
  The frontend calls with named parameters {p_buyer_phone, p_offer_id} which
  works with either signature, but PostgREST refuses to pick when multiple exist.
*/

DROP FUNCTION IF EXISTS buyer_accept_supplier_offer(p_buyer_phone text, p_offer_id uuid);

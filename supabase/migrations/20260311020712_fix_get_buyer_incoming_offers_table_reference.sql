/*
  # Fix get_buyer_incoming_offers function

  1. Bug Fix
    - The function referenced a non-existent `user_profiles` table
    - Changed to use the correct `platform_users` table
    - This was causing the buyer to never see incoming supplier offers on their orders

  2. Impact
    - Buyers can now see supplier offers on their demand orders in "طلباتي" tab
    - The offers section "عروض المورّدين على طلباتك" will now load correctly
*/

CREATE OR REPLACE FUNCTION get_buyer_incoming_offers(p_buyer_phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id',               sdo.id,
      'order_id',         sdo.order_id,
      'supplier_phone',   sdo.supplier_phone,
      'quantity',         sdo.quantity,
      'price_per_pallet', sdo.price_per_pallet,
      'supplier_message', sdo.supplier_message,
      'status',           sdo.status,
      'deal_id',          sdo.deal_id,
      'created_at',       sdo.created_at,
      'pallet_type',      o.pallet_type,
      'size',             o.size,
      'quality',          o.quality,
      'city',             o.city,
      'order_quantity',   o.quantity,
      'supplier_name',    COALESCE(pu.company_name, pu.display_name, sdo.supplier_phone)
    )
    ORDER BY sdo.created_at DESC
  ) INTO v_result
  FROM supplier_demand_offers sdo
  JOIN orders o ON o.id = sdo.order_id
  LEFT JOIN platform_users pu ON pu.phone = sdo.supplier_phone
  WHERE sdo.buyer_phone = p_buyer_phone
  AND sdo.status NOT IN ('cancelled');

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

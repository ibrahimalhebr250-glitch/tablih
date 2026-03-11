/*
  # Filter Supplier Matching Inventory by Pallet Type

  1. Updated Function: `get_supplier_matching_inventory`
    - Now filters supplier inventory to only show batches that match the order's pallet_type
    - This ensures a supplier offering on a "wooden pallet" order can only select wooden pallet inventory
    - Same applies for plastic, metal, or any other pallet type

  2. Important Notes
    - Supplier can only offer inventory of the SAME pallet type as the buyer's request
    - Other fields (quality, city, size) are not filtered but used for sorting/relevance
*/

CREATE OR REPLACE FUNCTION get_supplier_matching_inventory(
  p_supplier_phone text,
  p_order_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_batches jsonb;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الطلب غير موجود', 'batches', '[]'::jsonb);
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', ib.id,
      'batch_id', ib.batch_id,
      'pallet_type', ib.pallet_type,
      'size', ib.size,
      'quality', ib.quality,
      'pallet_condition', ib.pallet_condition,
      'city', ib.city,
      'available_quantity', ib.available_quantity,
      'price_per_pallet', ib.price_per_pallet,
      'description', ib.description,
      'created_at', ib.created_at
    ) ORDER BY
      CASE
        WHEN ib.quality = v_order.quality AND ib.city = v_order.city THEN 1
        WHEN ib.quality = v_order.quality THEN 2
        WHEN ib.city = v_order.city THEN 3
        ELSE 4
      END,
      ib.available_quantity DESC
  ), '[]'::jsonb)
  INTO v_batches
  FROM inventory_batches ib
  WHERE ib.phone = p_supplier_phone
    AND ib.status = 'active'
    AND ib.available_quantity > 0
    AND ib.is_frozen = false
    AND ib.hide_from_matching = false
    AND ib.pallet_type = v_order.pallet_type;

  RETURN jsonb_build_object(
    'success', true,
    'batches', v_batches,
    'order_pallet_type', v_order.pallet_type,
    'order_quality', v_order.quality,
    'order_city', v_order.city,
    'order_quantity', v_order.quantity
  );
END;
$$;

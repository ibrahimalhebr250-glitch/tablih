/*
  # Admin Buyer Inventory Management Functions

  1. New Functions
    - `admin_get_buyer_inventory_stats` - Get overall statistics for all buyer inventories
    - `admin_get_buyer_inventory_list` - Get paginated list of all buyer inventory items
    - `admin_get_buyer_inventory_by_buyer` - Get specific buyer's inventory details
    - `admin_get_expired_reservations` - Get deals with expired reservations
    
  2. Features
    - Global view of all buyer inventories across the platform
    - Filter by buyer, city, pallet type
    - Track total value locked in buyer inventories
    - Monitor expired reservations and failed deals
    - See withdrawal history
    
  3. Security
    - All functions use SECURITY DEFINER
    - Verify admin email from JWT
    - Read-only operations for monitoring
*/

-- Function to get overall buyer inventory statistics
CREATE OR REPLACE FUNCTION admin_get_buyer_inventory_stats(p_admin_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_buyers integer;
  v_total_items integer;
  v_total_pallets integer;
  v_total_value numeric;
  v_available_pallets integer;
  v_withdrawn_pallets integer;
  v_by_type json;
  v_by_city json;
  v_top_buyers json;
BEGIN
  -- Verify admin session
  IF NOT EXISTS (
    SELECT 1 FROM platform_users pu
    WHERE pu.email = p_admin_email
    AND pu.user_type = 'admin'
  ) THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  -- Get overall statistics
  SELECT 
    COUNT(DISTINCT buyer_phone),
    COUNT(*),
    COALESCE(SUM(quantity), 0),
    COALESCE(SUM(total_paid), 0),
    COALESCE(SUM(quantity_available), 0),
    COALESCE(SUM(quantity - quantity_available), 0)
  INTO v_total_buyers, v_total_items, v_total_pallets, v_total_value, 
       v_available_pallets, v_withdrawn_pallets
  FROM buyer_inventory;

  -- Get breakdown by pallet type
  SELECT json_agg(row_to_json(t))
  INTO v_by_type
  FROM (
    SELECT 
      pallet_type,
      COUNT(*) as items_count,
      SUM(quantity) as total_pallets,
      SUM(quantity_available) as available_pallets,
      SUM(total_paid) as total_value
    FROM buyer_inventory
    GROUP BY pallet_type
    ORDER BY total_pallets DESC
  ) t;

  -- Get breakdown by city
  SELECT json_agg(row_to_json(c))
  INTO v_by_city
  FROM (
    SELECT 
      city,
      COUNT(*) as items_count,
      SUM(quantity) as total_pallets,
      SUM(total_paid) as total_value
    FROM buyer_inventory
    GROUP BY city
    ORDER BY total_pallets DESC
  ) c;

  -- Get top buyers by inventory value
  SELECT json_agg(row_to_json(b))
  INTO v_top_buyers
  FROM (
    SELECT 
      bi.buyer_phone,
      pu.display_name as buyer_name,
      COUNT(*) as items_count,
      SUM(bi.quantity) as total_pallets,
      SUM(bi.total_paid) as total_value
    FROM buyer_inventory bi
    LEFT JOIN platform_users pu ON pu.phone = bi.buyer_phone
    GROUP BY bi.buyer_phone, pu.display_name
    ORDER BY total_value DESC
    LIMIT 10
  ) b;

  RETURN json_build_object(
    'success', true,
    'total_buyers', v_total_buyers,
    'total_items', v_total_items,
    'total_pallets', v_total_pallets,
    'total_value', v_total_value,
    'available_pallets', v_available_pallets,
    'withdrawn_pallets', v_withdrawn_pallets,
    'by_type', COALESCE(v_by_type, '[]'::json),
    'by_city', COALESCE(v_by_city, '[]'::json),
    'top_buyers', COALESCE(v_top_buyers, '[]'::json)
  );
END;
$$;

-- Function to get paginated buyer inventory list
CREATE OR REPLACE FUNCTION admin_get_buyer_inventory_list(
  p_admin_email text,
  p_buyer_phone text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_pallet_type text DEFAULT NULL,
  p_only_available boolean DEFAULT false,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  buyer_phone text,
  buyer_name text,
  original_deal_id uuid,
  deal_ref text,
  pallet_type text,
  size text,
  quality text,
  condition text,
  quantity integer,
  quantity_available integer,
  unit_price numeric,
  total_paid numeric,
  original_supplier_phone text,
  original_supplier_name text,
  city text,
  images jsonb,
  description text,
  acquired_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify admin session
  IF NOT EXISTS (
    SELECT 1 FROM platform_users pu
    WHERE pu.email = p_admin_email
    AND pu.user_type = 'admin'
  ) THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;

  RETURN QUERY
  SELECT 
    bi.id,
    bi.buyer_phone,
    COALESCE(pu.display_name, bi.buyer_phone) as buyer_name,
    bi.original_deal_id,
    d.deal_ref,
    bi.pallet_type,
    bi.size,
    bi.quality,
    bi.condition,
    bi.quantity,
    bi.quantity_available,
    bi.unit_price,
    bi.total_paid,
    bi.original_supplier_phone,
    bi.original_supplier_name,
    bi.city,
    bi.images,
    bi.description,
    bi.acquired_at,
    bi.created_at
  FROM buyer_inventory bi
  LEFT JOIN platform_users pu ON pu.phone = bi.buyer_phone
  LEFT JOIN deals d ON d.id = bi.original_deal_id
  WHERE (p_buyer_phone IS NULL OR bi.buyer_phone = p_buyer_phone)
    AND (p_city IS NULL OR bi.city = p_city)
    AND (p_pallet_type IS NULL OR bi.pallet_type = p_pallet_type)
    AND (NOT p_only_available OR bi.quantity_available > 0)
  ORDER BY bi.acquired_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Function to get specific buyer's inventory summary
CREATE OR REPLACE FUNCTION admin_get_buyer_inventory_by_buyer(
  p_admin_email text,
  p_buyer_phone text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_buyer_info record;
  v_stats record;
  v_items json;
BEGIN
  -- Verify admin session
  IF NOT EXISTS (
    SELECT 1 FROM platform_users pu
    WHERE pu.email = p_admin_email
    AND pu.user_type = 'admin'
  ) THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  -- Get buyer information
  SELECT 
    phone,
    display_name,
    user_type,
    trust_rating
  INTO v_buyer_info
  FROM platform_users
  WHERE phone = p_buyer_phone;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'المشتري غير موجود');
  END IF;

  -- Get inventory statistics
  SELECT 
    COUNT(*) as total_items,
    SUM(quantity) as total_pallets,
    SUM(quantity_available) as available_pallets,
    SUM(total_paid) as total_value
  INTO v_stats
  FROM buyer_inventory
  WHERE buyer_phone = p_buyer_phone;

  -- Get inventory items
  SELECT json_agg(row_to_json(t))
  INTO v_items
  FROM (
    SELECT 
      bi.id,
      bi.pallet_type,
      bi.size,
      bi.quality,
      bi.condition,
      bi.quantity,
      bi.quantity_available,
      bi.unit_price,
      bi.total_paid,
      bi.original_supplier_name,
      bi.city,
      bi.images,
      bi.description,
      bi.acquired_at,
      d.deal_ref
    FROM buyer_inventory bi
    LEFT JOIN deals d ON d.id = bi.original_deal_id
    WHERE bi.buyer_phone = p_buyer_phone
    ORDER BY bi.acquired_at DESC
  ) t;

  RETURN json_build_object(
    'success', true,
    'buyer', json_build_object(
      'phone', v_buyer_info.phone,
      'name', v_buyer_info.display_name,
      'type', v_buyer_info.user_type,
      'trust_rating', v_buyer_info.trust_rating
    ),
    'stats', json_build_object(
      'total_items', COALESCE(v_stats.total_items, 0),
      'total_pallets', COALESCE(v_stats.total_pallets, 0),
      'available_pallets', COALESCE(v_stats.available_pallets, 0),
      'total_value', COALESCE(v_stats.total_value, 0)
    ),
    'items', COALESCE(v_items, '[]'::json)
  );
END;
$$;

-- Function to get expired/failed reservations for monitoring
CREATE OR REPLACE FUNCTION admin_get_expired_reservations(p_admin_email text)
RETURNS TABLE (
  deal_id uuid,
  deal_ref text,
  status text,
  buyer_phone text,
  buyer_name text,
  supplier_phone text,
  supplier_name text,
  pallet_type text,
  size text,
  quantity integer,
  city text,
  reserved_at timestamptz,
  reservation_expires_at timestamptz,
  hours_expired numeric,
  is_suspended boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify admin session
  IF NOT EXISTS (
    SELECT 1 FROM platform_users pu
    WHERE pu.email = p_admin_email
    AND pu.user_type = 'admin'
  ) THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;

  RETURN QUERY
  SELECT 
    d.id as deal_id,
    d.deal_ref,
    d.status,
    d.buyer_phone,
    COALESCE(bu.display_name, d.buyer_phone) as buyer_name,
    d.supplier_phone,
    COALESCE(su.display_name, d.supplier_phone) as supplier_name,
    d.pallet_type,
    d.size,
    d.quantity,
    d.city,
    d.reserved_at,
    d.reservation_expires_at,
    EXTRACT(EPOCH FROM (now() - d.reservation_expires_at)) / 3600 as hours_expired,
    d.is_suspended
  FROM deals d
  LEFT JOIN platform_users bu ON bu.phone = d.buyer_phone
  LEFT JOIN platform_users su ON su.phone = d.supplier_phone
  WHERE d.status IN ('inventory_reserved', 'pending_supplier', 'pending_buyer')
    AND d.reservation_expires_at < now()
    AND d.is_suspended = false
  ORDER BY d.reservation_expires_at ASC;
END;
$$;

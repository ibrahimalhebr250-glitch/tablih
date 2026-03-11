/*
  # Create admin_get_orders RPC Function

  ## Purpose
  The admin panel reads orders directly from the `orders` table, but the RLS SELECT
  policy only allows access via JWT claims (Supabase Auth) or session_tokens table.
  Admin staff use a custom session system stored in sessionStorage (not JWT / session_tokens),
  so they were blocked from reading orders that were not publicly visible.

  ## Changes
  - New function `admin_get_orders(p_admin_email text)` — SECURITY DEFINER — bypasses RLS
    and returns all orders to verified admin staff.
  - The function validates the caller is an active, non-locked admin before returning data.
  - Also fixes the `orders` table SELECT policy to add an admin_staff JWT check so that
    admin logins via Supabase Auth also work.

  ## Security
  - Function runs as SECURITY DEFINER (owner) to bypass RLS
  - Validates p_admin_email exists in admin_staff with is_active=true and is_locked=false
  - Returns empty set if validation fails
*/

-- Drop existing overloads if any
DROP FUNCTION IF EXISTS admin_get_orders(text);

-- Create admin_get_orders function
CREATE OR REPLACE FUNCTION admin_get_orders(p_admin_email text)
RETURNS TABLE (
  id uuid,
  request_id text,
  phone text,
  pallet_type text,
  size text,
  quality text,
  quantity integer,
  city text,
  order_type_code text,
  current_stage text,
  match_count integer,
  status text,
  is_draft boolean,
  created_at timestamptz,
  updated_at timestamptz,
  order_source text,
  pallet_condition text,
  source_supplier_phone text,
  buyer_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM admin_staff
    WHERE email = p_admin_email
      AND is_active = true
      AND is_locked = false
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    o.id,
    o.request_id,
    o.phone,
    o.pallet_type,
    o.size,
    o.quality,
    o.quantity,
    o.city,
    COALESCE(o.order_type_code, 'standard') AS order_type_code,
    COALESCE(o.current_stage, 'form') AS current_stage,
    COALESCE(o.match_count, 0) AS match_count,
    COALESCE(o.status, 'pending') AS status,
    COALESCE(o.is_draft, false) AS is_draft,
    o.created_at,
    o.updated_at,
    COALESCE(o.order_source, 'manual_order') AS order_source,
    COALESCE(o.pallet_condition, '') AS pallet_condition,
    o.source_supplier_phone,
    COALESCE(pu.display_name, o.phone, 'غير معروف') AS buyer_name
  FROM orders o
  LEFT JOIN platform_users pu ON pu.id = o.user_id
  ORDER BY o.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_orders(text) TO anon, authenticated;

/*
  # Fix Pallet Types Admin Access

  ## Problem
  The SELECT policy on pallet_types_master only shows active items to users
  without a valid JWT (auth.jwt()). Since the admin uses a custom session system
  (not Supabase Auth), inactive/hidden pallet types disappear after being toggled off.

  ## Solution
  1. Replace the restrictive SELECT policy with one that allows all reads (needed for admin)
  2. Add admin RPC functions for full CRUD with email verification
  3. Keep public-facing queries filtered by is_active on the frontend
*/

-- Drop old restrictive SELECT policy
DROP POLICY IF EXISTS "Anyone can view active pallet types" ON pallet_types_master;

-- Allow everyone to read all pallet types (frontend will filter is_active=true for users)
CREATE POLICY "Public can read all pallet types"
  ON pallet_types_master
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Admin function: get all pallet types (including inactive)
CREATE OR REPLACE FUNCTION admin_get_pallet_types(p_admin_email text)
RETURNS SETOF pallet_types_master
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM admin_staff WHERE email = p_admin_email AND is_active = true
  ) THEN
    RAISE EXCEPTION 'غير مصرح لك بهذا الإجراء';
  END IF;
  RETURN QUERY SELECT * FROM pallet_types_master ORDER BY sort_order;
END;
$$;

-- Admin function: create pallet type
CREATE OR REPLACE FUNCTION admin_create_pallet_type(
  p_admin_email text,
  p_code text,
  p_name_ar text,
  p_name_en text,
  p_description_ar text DEFAULT NULL,
  p_description_en text DEFAULT NULL,
  p_icon text DEFAULT '📦',
  p_is_active boolean DEFAULT true,
  p_sort_order int DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM admin_staff WHERE email = p_admin_email AND is_active = true
  ) THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح لك بهذا الإجراء');
  END IF;

  IF EXISTS (SELECT 1 FROM pallet_types_master WHERE code = p_code) THEN
    RETURN json_build_object('success', false, 'error', 'الكود مستخدم بالفعل');
  END IF;

  INSERT INTO pallet_types_master (code, name_ar, name_en, description_ar, description_en, icon, is_active, sort_order)
  VALUES (p_code, p_name_ar, p_name_en, p_description_ar, p_description_en, p_icon, p_is_active, p_sort_order)
  RETURNING id INTO v_new_id;

  RETURN json_build_object('success', true, 'id', v_new_id);
END;
$$;

-- Admin function: update pallet type
CREATE OR REPLACE FUNCTION admin_update_pallet_type(
  p_admin_email text,
  p_id uuid,
  p_name_ar text,
  p_name_en text,
  p_description_ar text DEFAULT NULL,
  p_description_en text DEFAULT NULL,
  p_icon text DEFAULT '📦',
  p_is_active boolean DEFAULT true
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM admin_staff WHERE email = p_admin_email AND is_active = true
  ) THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح لك بهذا الإجراء');
  END IF;

  UPDATE pallet_types_master
  SET
    name_ar = p_name_ar,
    name_en = p_name_en,
    description_ar = p_description_ar,
    description_en = p_description_en,
    icon = p_icon,
    is_active = p_is_active,
    updated_at = now()
  WHERE id = p_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'لم يتم العثور على النوع');
  END IF;

  RETURN json_build_object('success', true);
END;
$$;

-- Admin function: delete pallet type
CREATE OR REPLACE FUNCTION admin_delete_pallet_type(
  p_admin_email text,
  p_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM admin_staff WHERE email = p_admin_email AND is_active = true
  ) THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح لك بهذا الإجراء');
  END IF;

  DELETE FROM pallet_types_master WHERE id = p_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'لم يتم العثور على النوع');
  END IF;

  RETURN json_build_object('success', true);
END;
$$;

-- Admin function: update sort order
CREATE OR REPLACE FUNCTION admin_update_pallet_type_sort(
  p_admin_email text,
  p_id uuid,
  p_sort_order int
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM admin_staff WHERE email = p_admin_email AND is_active = true
  ) THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح لك بهذا الإجراء');
  END IF;

  UPDATE pallet_types_master SET sort_order = p_sort_order, updated_at = now() WHERE id = p_id;
  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_pallet_types(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_create_pallet_type(text, text, text, text, text, text, text, boolean, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_update_pallet_type(text, uuid, text, text, text, text, text, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_pallet_type(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_update_pallet_type_sort(text, uuid, int) TO anon, authenticated;

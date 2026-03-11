/*
  # Create Admin City Insert/Update RPC Functions (v2)

  ## Problem
  addCity and updateCity were calling the cities table directly as anon,
  causing RLS violations. The existing admin_update_city has a different signature.

  ## Solution
  - Create admin_add_city with email-based auth (SECURITY DEFINER)
  - Create admin_update_city_v2 with email-based auth to avoid signature conflict
*/

CREATE OR REPLACE FUNCTION admin_add_city(
  p_admin_email text,
  p_name text,
  p_status text DEFAULT 'active',
  p_minimum_quantity int DEFAULT 1,
  p_matching_enabled boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trimmed text;
BEGIN
  v_trimmed := trim(p_name);

  IF v_trimmed = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'اسم المدينة مطلوب');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM admin_staff
    WHERE email = p_admin_email
      AND is_active = true
      AND is_locked = false
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح لك بهذا الإجراء');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM admin_permissions ap
    JOIN admin_staff ads ON ads.role = ap.role
    WHERE ads.email = p_admin_email
      AND ap.section = 'market'
      AND ap.can_edit = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'لا تملك صلاحية إضافة المدن');
  END IF;

  IF EXISTS (SELECT 1 FROM cities WHERE lower(name) = lower(v_trimmed)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'المدينة موجودة مسبقاً');
  END IF;

  INSERT INTO cities (name, status, minimum_quantity, matching_enabled)
  VALUES (v_trimmed, p_status, p_minimum_quantity, p_matching_enabled);

  RETURN jsonb_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION admin_update_city_v2(
  p_admin_email text,
  p_city_id uuid,
  p_name text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_minimum_quantity int DEFAULT NULL,
  p_matching_enabled boolean DEFAULT NULL
)
RETURNS jsonb
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
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح لك بهذا الإجراء');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM admin_permissions ap
    JOIN admin_staff ads ON ads.role = ap.role
    WHERE ads.email = p_admin_email
      AND ap.section = 'market'
      AND ap.can_edit = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'لا تملك صلاحية تعديل المدن');
  END IF;

  UPDATE cities SET
    name             = COALESCE(p_name, name),
    status           = COALESCE(p_status, status),
    minimum_quantity = COALESCE(p_minimum_quantity, minimum_quantity),
    matching_enabled = COALESCE(p_matching_enabled, matching_enabled)
  WHERE id = p_city_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'المدينة غير موجودة');
  END IF;

  RETURN jsonb_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION admin_add_city TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_update_city_v2 TO anon, authenticated;

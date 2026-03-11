/*
  # Fix Admin Passwords and All crypt() Functions

  1. Reset admin staff passwords to known values using pgcrypto (now enabled)
  2. Fix manage_admin_staff and other functions to include pgcrypto in search_path

  New passwords:
    admin@palletmarket.com     -> Admin@2024!
    market@palletmarket.com    -> Market@2024!
    deals@palletmarket.com     -> Deals@2024!
    finance@palletmarket.com   -> Finance@2024!
    support@palletmarket.com   -> Support@2024!
*/

-- Reset all admin passwords to known values
UPDATE admin_staff SET password_hash = crypt('Admin@2024!', gen_salt('bf', 8))
WHERE email = 'admin@palletmarket.com';

UPDATE admin_staff SET password_hash = crypt('Market@2024!', gen_salt('bf', 8))
WHERE email = 'market@palletmarket.com';

UPDATE admin_staff SET password_hash = crypt('Deals@2024!', gen_salt('bf', 8))
WHERE email = 'deals@palletmarket.com';

UPDATE admin_staff SET password_hash = crypt('Finance@2024!', gen_salt('bf', 8))
WHERE email = 'finance@palletmarket.com';

UPDATE admin_staff SET password_hash = crypt('Support@2024!', gen_salt('bf', 8))
WHERE email = 'support@palletmarket.com';

-- Also reset failed_login_attempts and unlock all accounts
UPDATE admin_staff SET
  failed_login_attempts = 0,
  is_locked = false,
  locked_until = NULL,
  last_failed_login_at = NULL;

-- Fix manage_admin_staff to use pgcrypto
CREATE OR REPLACE FUNCTION public.manage_admin_staff(
  p_admin_email text,
  p_action text,
  p_staff_data jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_admin_role text;
  v_staff_id uuid;
  v_result jsonb;
BEGIN
  SELECT role INTO v_admin_role
  FROM admin_staff
  WHERE email = p_admin_email AND is_active = true;

  IF v_admin_role != 'system_admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'ليس لديك صلاحية إدارة الموظفين');
  END IF;

  IF p_action = 'list' THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', id, 'email', email, 'full_name', full_name,
        'phone', phone, 'role', role, 'is_active', is_active,
        'is_locked', is_locked, 'last_login_at', last_login_at, 'created_at', created_at
      )
    ) INTO v_result FROM admin_staff ORDER BY created_at DESC;
    RETURN jsonb_build_object('success', true, 'staff', COALESCE(v_result, '[]'::jsonb));

  ELSIF p_action = 'create' THEN
    INSERT INTO admin_staff (email, password_hash, full_name, phone, role, is_active, created_by)
    VALUES (
      p_staff_data->>'email',
      crypt(p_staff_data->>'password', gen_salt('bf', 8)),
      p_staff_data->>'full_name',
      p_staff_data->>'phone',
      p_staff_data->>'role',
      COALESCE((p_staff_data->>'is_active')::boolean, true),
      p_admin_email
    ) RETURNING id INTO v_staff_id;
    RETURN jsonb_build_object('success', true, 'staff_id', v_staff_id);

  ELSIF p_action = 'update' THEN
    UPDATE admin_staff SET
      full_name   = COALESCE(p_staff_data->>'full_name', full_name),
      phone       = COALESCE(p_staff_data->>'phone', phone),
      role        = COALESCE(p_staff_data->>'role', role),
      is_active   = COALESCE((p_staff_data->>'is_active')::boolean, is_active),
      password_hash = CASE
        WHEN p_staff_data->>'password' IS NOT NULL
        THEN crypt(p_staff_data->>'password', gen_salt('bf', 8))
        ELSE password_hash
      END,
      updated_at  = now()
    WHERE id = (p_staff_data->>'id')::uuid;
    RETURN jsonb_build_object('success', true);

  ELSIF p_action = 'delete' THEN
    DELETE FROM admin_staff
    WHERE id = (p_staff_data->>'id')::uuid AND email != p_admin_email;
    RETURN jsonb_build_object('success', true);

  ELSIF p_action = 'unlock' THEN
    UPDATE admin_staff SET
      is_locked = false, locked_until = NULL, failed_login_attempts = 0
    WHERE id = (p_staff_data->>'id')::uuid;
    RETURN jsonb_build_object('success', true);

  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'عملية غير معروفة');
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.manage_admin_staff(text, text, jsonb) TO anon, authenticated;

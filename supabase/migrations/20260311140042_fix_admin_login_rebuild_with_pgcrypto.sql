/*
  # Fix Admin Login - Rebuild function with pgcrypto in search_path

  The crypt() function from pgcrypto was not found because the function's
  search_path was set to 'public' only. Adding 'extensions' ensures pgcrypto
  is accessible. We also add public to cover both cases.
*/

CREATE OR REPLACE FUNCTION public.admin_staff_login(
  p_email text,
  p_password text,
  p_user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_staff_record RECORD;
  v_permissions  jsonb;
  v_password_valid boolean;
BEGIN
  SELECT
    id, email, password_hash, full_name, phone, role,
    is_active, is_locked, locked_until
  INTO v_staff_record
  FROM admin_staff
  WHERE email = p_email;

  IF NOT FOUND THEN
    PERFORM log_admin_login(p_email, 'failed', p_user_agent, NULL);
    RETURN jsonb_build_object('success', false, 'error', 'البريد الإلكتروني أو كلمة المرور غير صحيحة');
  END IF;

  IF NOT v_staff_record.is_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'هذا الحساب غير مفعل للدخول إلى لوحة الإدارة');
  END IF;

  IF v_staff_record.is_locked THEN
    IF v_staff_record.locked_until IS NOT NULL AND v_staff_record.locked_until > now() THEN
      RETURN jsonb_build_object('success', false, 'error', 'الحساب مقفل مؤقتاً. يرجى المحاولة لاحقاً');
    ELSE
      UPDATE admin_staff
      SET is_locked = false, locked_until = NULL, failed_login_attempts = 0
      WHERE id = v_staff_record.id;
    END IF;
  END IF;

  v_password_valid := (v_staff_record.password_hash = crypt(p_password, v_staff_record.password_hash));

  IF NOT v_password_valid THEN
    UPDATE admin_staff
    SET
      failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1,
      last_failed_login_at  = now(),
      is_locked     = CASE WHEN COALESCE(failed_login_attempts, 0) + 1 >= 5 THEN true ELSE false END,
      locked_until  = CASE WHEN COALESCE(failed_login_attempts, 0) + 1 >= 5 THEN now() + interval '30 minutes' ELSE NULL END
    WHERE id = v_staff_record.id;

    PERFORM log_admin_login(p_email, 'failed', p_user_agent, NULL);
    RETURN jsonb_build_object('success', false, 'error', 'البريد الإلكتروني أو كلمة المرور غير صحيحة');
  END IF;

  SELECT jsonb_object_agg(
    section,
    jsonb_build_object('can_view', can_view, 'can_create', can_create, 'can_edit', can_edit, 'can_delete', can_delete)
  )
  INTO v_permissions
  FROM admin_permissions
  WHERE role = v_staff_record.role;

  UPDATE admin_staff
  SET last_login_at = now(), failed_login_attempts = 0, last_failed_login_at = NULL
  WHERE id = v_staff_record.id;

  PERFORM log_admin_login(p_email, 'login', p_user_agent, NULL);

  RETURN jsonb_build_object(
    'success', true,
    'staff', jsonb_build_object(
      'id',          v_staff_record.id,
      'email',       v_staff_record.email,
      'full_name',   v_staff_record.full_name,
      'phone',       v_staff_record.phone,
      'role',        v_staff_record.role,
      'permissions', COALESCE(v_permissions, '{}'::jsonb)
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_staff_login(text, text, text) TO anon, authenticated;

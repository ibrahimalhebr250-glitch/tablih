/*
  # نظام تسجيل دخول الموظفين وإدارة الصلاحيات

  ## الدوال الجديدة
  
  ### 1. admin_staff_login
    - تسجيل دخول موظف إدارة
    - التحقق من البريد وكلمة المرور
    - التحقق من تفعيل الحساب
    - إرجاع بيانات الموظف والصلاحيات
    
  ### 2. get_admin_permissions
    - جلب صلاحيات موظف حسب دوره
    - إرجاع قائمة الأقسام المسموحة
    
  ### 3. verify_admin_permission
    - التحقق من صلاحية موظف لقسم معين
*/

-- دالة تسجيل دخول موظفي الإدارة
CREATE OR REPLACE FUNCTION admin_staff_login(
  p_email text,
  p_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_staff_record RECORD;
  v_permissions jsonb;
  v_password_valid boolean;
BEGIN
  -- البحث عن الموظف
  SELECT 
    id,
    email,
    password_hash,
    full_name,
    phone,
    role,
    is_active,
    is_locked,
    locked_until
  INTO v_staff_record
  FROM admin_staff
  WHERE email = p_email;

  -- التحقق من وجود الحساب
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
    );
  END IF;

  -- التحقق من تفعيل الحساب
  IF NOT v_staff_record.is_active THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'هذا الحساب غير مفعل للدخول إلى لوحة الإدارة'
    );
  END IF;

  -- التحقق من قفل الحساب
  IF v_staff_record.is_locked THEN
    IF v_staff_record.locked_until IS NOT NULL AND v_staff_record.locked_until > now() THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'الحساب مقفل مؤقتاً. يرجى المحاولة لاحقاً'
      );
    ELSE
      -- فك القفل إذا انتهت المدة
      UPDATE admin_staff 
      SET is_locked = false, locked_until = NULL, failed_login_attempts = 0
      WHERE id = v_staff_record.id;
    END IF;
  END IF;

  -- التحقق من كلمة المرور
  v_password_valid := (v_staff_record.password_hash = crypt(p_password, v_staff_record.password_hash));

  IF NOT v_password_valid THEN
    -- تسجيل محاولة فاشلة
    UPDATE admin_staff 
    SET 
      failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1,
      last_failed_login_at = now(),
      is_locked = CASE 
        WHEN COALESCE(failed_login_attempts, 0) + 1 >= 5 THEN true 
        ELSE false 
      END,
      locked_until = CASE 
        WHEN COALESCE(failed_login_attempts, 0) + 1 >= 5 THEN now() + interval '30 minutes'
        ELSE NULL
      END
    WHERE id = v_staff_record.id;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
    );
  END IF;

  -- جلب الصلاحيات
  SELECT jsonb_object_agg(
    section,
    jsonb_build_object(
      'can_view', can_view,
      'can_create', can_create,
      'can_edit', can_edit,
      'can_delete', can_delete
    )
  )
  INTO v_permissions
  FROM admin_permissions
  WHERE role = v_staff_record.role;

  -- تحديث آخر تسجيل دخول ومسح المحاولات الفاشلة
  UPDATE admin_staff 
  SET 
    last_login_at = now(),
    failed_login_attempts = 0,
    last_failed_login_at = NULL
  WHERE id = v_staff_record.id;

  -- إرجاع البيانات
  RETURN jsonb_build_object(
    'success', true,
    'staff', jsonb_build_object(
      'id', v_staff_record.id,
      'email', v_staff_record.email,
      'full_name', v_staff_record.full_name,
      'phone', v_staff_record.phone,
      'role', v_staff_record.role,
      'permissions', COALESCE(v_permissions, '{}'::jsonb)
    )
  );
END;
$$;

-- دالة جلب صلاحيات موظف
CREATE OR REPLACE FUNCTION get_admin_permissions(
  p_role text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_permissions jsonb;
BEGIN
  SELECT jsonb_object_agg(
    section,
    jsonb_build_object(
      'can_view', can_view,
      'can_create', can_create,
      'can_edit', can_edit,
      'can_delete', can_delete
    )
  )
  INTO v_permissions
  FROM admin_permissions
  WHERE role = p_role;

  RETURN COALESCE(v_permissions, '{}'::jsonb);
END;
$$;

-- دالة التحقق من صلاحية
CREATE OR REPLACE FUNCTION verify_admin_permission(
  p_email text,
  p_section text,
  p_action text DEFAULT 'view'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role text;
  v_has_permission boolean;
BEGIN
  -- جلب دور الموظف
  SELECT role INTO v_role
  FROM admin_staff
  WHERE email = p_email AND is_active = true;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- التحقق من الصلاحية
  IF p_action = 'view' THEN
    SELECT can_view INTO v_has_permission
    FROM admin_permissions
    WHERE role = v_role AND section = p_section;
  ELSIF p_action = 'create' THEN
    SELECT can_create INTO v_has_permission
    FROM admin_permissions
    WHERE role = v_role AND section = p_section;
  ELSIF p_action = 'edit' THEN
    SELECT can_edit INTO v_has_permission
    FROM admin_permissions
    WHERE role = v_role AND section = p_section;
  ELSIF p_action = 'delete' THEN
    SELECT can_delete INTO v_has_permission
    FROM admin_permissions
    WHERE role = v_role AND section = p_section;
  ELSE
    RETURN false;
  END IF;

  RETURN COALESCE(v_has_permission, false);
END;
$$;

-- دالة إدارة موظفي الإدارة
CREATE OR REPLACE FUNCTION manage_admin_staff(
  p_admin_email text,
  p_action text,
  p_staff_data jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_role text;
  v_staff_id uuid;
  v_result jsonb;
BEGIN
  -- التحقق من أن المتصل هو مدير نظام
  SELECT role INTO v_admin_role
  FROM admin_staff
  WHERE email = p_admin_email AND is_active = true;

  IF v_admin_role != 'system_admin' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'ليس لديك صلاحية إدارة الموظفين'
    );
  END IF;

  -- تنفيذ العملية
  IF p_action = 'list' THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', id,
        'email', email,
        'full_name', full_name,
        'phone', phone,
        'role', role,
        'is_active', is_active,
        'is_locked', is_locked,
        'last_login_at', last_login_at,
        'created_at', created_at
      )
    )
    INTO v_result
    FROM admin_staff
    ORDER BY created_at DESC;

    RETURN jsonb_build_object(
      'success', true,
      'staff', COALESCE(v_result, '[]'::jsonb)
    );

  ELSIF p_action = 'create' THEN
    INSERT INTO admin_staff (
      email,
      password_hash,
      full_name,
      phone,
      role,
      is_active,
      created_by
    ) VALUES (
      p_staff_data->>'email',
      crypt(p_staff_data->>'password', gen_salt('bf')),
      p_staff_data->>'full_name',
      p_staff_data->>'phone',
      p_staff_data->>'role',
      COALESCE((p_staff_data->>'is_active')::boolean, true),
      p_admin_email
    )
    RETURNING id INTO v_staff_id;

    RETURN jsonb_build_object(
      'success', true,
      'staff_id', v_staff_id
    );

  ELSIF p_action = 'update' THEN
    UPDATE admin_staff
    SET
      full_name = COALESCE(p_staff_data->>'full_name', full_name),
      phone = COALESCE(p_staff_data->>'phone', phone),
      role = COALESCE(p_staff_data->>'role', role),
      is_active = COALESCE((p_staff_data->>'is_active')::boolean, is_active),
      password_hash = CASE 
        WHEN p_staff_data->>'password' IS NOT NULL 
        THEN crypt(p_staff_data->>'password', gen_salt('bf'))
        ELSE password_hash
      END,
      updated_at = now()
    WHERE id = (p_staff_data->>'id')::uuid;

    RETURN jsonb_build_object('success', true);

  ELSIF p_action = 'delete' THEN
    DELETE FROM admin_staff 
    WHERE id = (p_staff_data->>'id')::uuid
      AND email != p_admin_email; -- لا يمكن حذف نفسك

    RETURN jsonb_build_object('success', true);

  ELSIF p_action = 'unlock' THEN
    UPDATE admin_staff
    SET 
      is_locked = false,
      locked_until = NULL,
      failed_login_attempts = 0
    WHERE id = (p_staff_data->>'id')::uuid;

    RETURN jsonb_build_object('success', true);

  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'عملية غير معروفة'
    );
  END IF;
END;
$$;

-- دالة جلب كل الأدوار والصلاحيات
CREATE OR REPLACE FUNCTION get_all_roles_permissions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'role', role,
      'role_name_ar', CASE role
        WHEN 'system_admin' THEN 'مدير النظام'
        WHEN 'market_manager' THEN 'مدير السوق'
        WHEN 'deals_manager' THEN 'مدير الصفقات'
        WHEN 'finance_manager' THEN 'مدير المالية'
        WHEN 'support_staff' THEN 'موظف دعم'
        ELSE role
      END,
      'sections', (
        SELECT jsonb_object_agg(
          section,
          jsonb_build_object(
            'can_view', can_view,
            'can_create', can_create,
            'can_edit', can_edit,
            'can_delete', can_delete
          )
        )
        FROM admin_permissions p
        WHERE p.role = roles.role
      )
    )
  )
  INTO v_result
  FROM (
    SELECT DISTINCT role
    FROM admin_permissions
  ) roles;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

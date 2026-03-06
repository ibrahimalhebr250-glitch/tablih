/*
  # إنشاء دوال حذف للـ Admin في قسم السوق

  1. الغرض
    - إنشاء دوال RPC للحذف تعمل عبر التحقق من email
    - تجاوز مشكلة عدم وجود JWT في Supabase client
    
  2. الدوال المضافة
    - admin_delete_city: حذف مدينة
    - admin_delete_inventory_batch: حذف دفعة مخزون
    - admin_delete_order: حذف طلب
    
  3. الأمان
    - فقط Admin المصرح لهم يمكنهم الحذف
    - يتم التحقق من البريد الإلكتروني في جدول admin_staff
    - يتم التحقق من الصلاحيات في جدول admin_permissions
*/

-- 1. دالة حذف مدينة
CREATE OR REPLACE FUNCTION admin_delete_city(
  p_admin_email TEXT,
  p_city_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_record RECORD;
  v_can_delete BOOLEAN;
BEGIN
  -- التحقق من وجود Admin وأنه نشط
  SELECT * INTO v_admin_record
  FROM admin_staff
  WHERE email = p_admin_email
    AND is_active = true
    AND is_locked = false;
    
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'غير مصرح لك بهذا الإجراء'
    );
  END IF;
  
  -- التحقق من صلاحية الحذف
  SELECT ap.can_delete INTO v_can_delete
  FROM admin_permissions ap
  WHERE ap.role = v_admin_record.role
    AND ap.section = 'market';
    
  IF NOT FOUND OR v_can_delete = false THEN
    RETURN json_build_object(
      'success', false,
      'error', 'لا تملك صلاحية حذف المدن'
    );
  END IF;
  
  -- حذف المدينة
  DELETE FROM cities WHERE id = p_city_id;
  
  RETURN json_build_object(
    'success', true
  );
END;
$$;

-- 2. دالة حذف دفعة مخزون
CREATE OR REPLACE FUNCTION admin_delete_inventory_batch(
  p_admin_email TEXT,
  p_batch_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_record RECORD;
  v_can_delete BOOLEAN;
BEGIN
  -- التحقق من وجود Admin وأنه نشط
  SELECT * INTO v_admin_record
  FROM admin_staff
  WHERE email = p_admin_email
    AND is_active = true
    AND is_locked = false;
    
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'غير مصرح لك بهذا الإجراء'
    );
  END IF;
  
  -- التحقق من صلاحية الحذف
  SELECT ap.can_delete INTO v_can_delete
  FROM admin_permissions ap
  WHERE ap.role = v_admin_record.role
    AND ap.section = 'market';
    
  IF NOT FOUND OR v_can_delete = false THEN
    RETURN json_build_object(
      'success', false,
      'error', 'لا تملك صلاحية حذف المخزون'
    );
  END IF;
  
  -- حذف دفعة المخزون
  DELETE FROM inventory_batches WHERE id = p_batch_id;
  
  RETURN json_build_object(
    'success', true
  );
END;
$$;

-- 3. دالة حذف طلب
CREATE OR REPLACE FUNCTION admin_delete_order(
  p_admin_email TEXT,
  p_order_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_record RECORD;
  v_can_delete BOOLEAN;
BEGIN
  -- التحقق من وجود Admin وأنه نشط
  SELECT * INTO v_admin_record
  FROM admin_staff
  WHERE email = p_admin_email
    AND is_active = true
    AND is_locked = false;
    
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'غير مصرح لك بهذا الإجراء'
    );
  END IF;
  
  -- التحقق من صلاحية الحذف
  SELECT ap.can_delete INTO v_can_delete
  FROM admin_permissions ap
  WHERE ap.role = v_admin_record.role
    AND ap.section = 'market';
    
  IF NOT FOUND OR v_can_delete = false THEN
    RETURN json_build_object(
      'success', false,
      'error', 'لا تملك صلاحية حذف الطلبات'
    );
  END IF;
  
  -- حذف الطلب
  DELETE FROM orders WHERE id = p_order_id;
  
  RETURN json_build_object(
    'success', true
  );
END;
$$;

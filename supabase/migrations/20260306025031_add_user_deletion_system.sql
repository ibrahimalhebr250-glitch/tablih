/*
  # نظام حذف المستخدمين

  1. الوظائف الجديدة
    - admin_delete_users: حذف واحد أو أكثر من المستخدمين
    - حذف جميع بيانات المستخدم من الجداول المرتبطة
    
  2. البيانات المحذوفة
    - الحساب الرئيسي (platform_users)
    - الأدوار (user_roles)
    - الطلبات (orders)
    - المخزون (inventory_batches)
    - الصفقات (deals)
    - التقييمات (visitor_ratings, ratings_comments)
    
  3. الأمان
    - فقط Admin مع صلاحية التعديل في قسم المستخدمين
    - التحقق من البريد الإلكتروني والحالة
*/

-- دالة حذف مستخدم واحد أو أكثر
CREATE OR REPLACE FUNCTION admin_delete_users(
  p_admin_email TEXT,
  p_user_ids UUID[]
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_record RECORD;
  v_can_edit BOOLEAN;
  v_deleted_count INTEGER := 0;
  v_user_id UUID;
  v_phone TEXT;
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
  
  -- التحقق من صلاحية التعديل في قسم المستخدمين
  SELECT ap.can_edit INTO v_can_edit
  FROM admin_permissions ap
  WHERE ap.role = v_admin_record.role
    AND ap.section = 'users';
    
  IF NOT FOUND OR v_can_edit = false THEN
    RETURN json_build_object(
      'success', false,
      'error', 'لا تملك صلاحية حذف المستخدمين'
    );
  END IF;
  
  -- حذف كل مستخدم من القائمة
  FOREACH v_user_id IN ARRAY p_user_ids
  LOOP
    -- الحصول على رقم الجوال
    SELECT phone INTO v_phone
    FROM platform_users
    WHERE id = v_user_id;
    
    IF FOUND THEN
      -- حذف التقييمات والتعليقات
      DELETE FROM ratings_comments WHERE rater_phone = v_phone OR rated_phone = v_phone;
      DELETE FROM visitor_ratings WHERE rater_phone = v_phone OR rated_phone = v_phone;
      
      -- حذف الصفقات المرتبطة
      DELETE FROM deals WHERE buyer_phone = v_phone OR supplier_phone = v_phone;
      
      -- حذف المخزون
      DELETE FROM inventory_batches WHERE supplier_phone = v_phone;
      
      -- حذف الطلبات
      DELETE FROM orders WHERE phone = v_phone;
      
      -- حذف الأدوار
      DELETE FROM user_roles WHERE phone = v_phone;
      
      -- حذف الحساب الرئيسي
      DELETE FROM platform_users WHERE id = v_user_id;
      
      v_deleted_count := v_deleted_count + 1;
    END IF;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'deleted_count', v_deleted_count
  );
END;
$$;

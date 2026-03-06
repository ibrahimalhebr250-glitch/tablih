/*
  # إنشاء دالة admin_delete_users

  1. الدالة
    - admin_delete_users: حذف مستخدمين بناءً على IDs
    
  2. الأمان
    - فقط system_admin يمكنه حذف المستخدمين
    - حذف شامل لجميع البيانات المرتبطة
*/

-- دالة حذف مستخدمين بناءً على IDs
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
  v_can_delete BOOLEAN;
  v_user_id UUID;
  v_user_phone TEXT;
  v_deleted_count INT := 0;
  v_failed_count INT := 0;
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
    AND ap.section = 'users';
    
  IF NOT FOUND OR v_can_delete = false THEN
    RETURN json_build_object(
      'success', false,
      'error', 'لا تملك صلاحية حذف المستخدمين'
    );
  END IF;
  
  -- حذف كل مستخدم بدون قيود
  FOREACH v_user_id IN ARRAY p_user_ids
  LOOP
    BEGIN
      -- الحصول على رقم الجوال للمستخدم
      SELECT phone INTO v_user_phone
      FROM platform_users
      WHERE id = v_user_id;
      
      IF v_user_phone IS NULL THEN
        v_failed_count := v_failed_count + 1;
        CONTINUE;
      END IF;
      
      -- حذف التعليقات
      DELETE FROM ratings_comments WHERE commenter_phone = v_user_phone;
      DELETE FROM ratings_comments 
      WHERE rating_id IN (
        SELECT id FROM marketplace_ratings WHERE rater_phone = v_user_phone OR rated_phone = v_user_phone
      );
      
      -- حذف التقييمات
      DELETE FROM marketplace_ratings WHERE rater_phone = v_user_phone OR rated_phone = v_user_phone;
      DELETE FROM user_ratings WHERE rater_phone = v_user_phone OR rated_phone = v_user_phone;
      
      -- حذف التسويات
      DELETE FROM commission_settlements WHERE supplier_phone = v_user_phone;
      
      -- حذف الصفقات
      DELETE FROM deals WHERE buyer_phone = v_user_phone OR supplier_phone = v_user_phone;
      
      -- حذف صور المخزون
      DELETE FROM inventory_images WHERE batch_id IN (
        SELECT id FROM inventory_batches WHERE phone = v_user_phone
      );
      
      -- حذف المخزون
      DELETE FROM inventory_batches WHERE phone = v_user_phone;
      
      -- حذف الطلبات
      DELETE FROM orders WHERE phone = v_user_phone;
      
      -- حذف الأدوار
      DELETE FROM user_roles WHERE phone = v_user_phone;
      
      -- حذف الجلسات
      DELETE FROM session_tokens WHERE phone = v_user_phone;
      
      -- حذف المستخدم
      DELETE FROM platform_users WHERE id = v_user_id;
      
      v_deleted_count := v_deleted_count + 1;
    EXCEPTION WHEN OTHERS THEN
      v_failed_count := v_failed_count + 1;
    END;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'deleted_count', v_deleted_count,
    'failed_count', v_failed_count,
    'message', format('تم حذف %s مستخدم بنجاح', v_deleted_count)
  );
END;
$$;

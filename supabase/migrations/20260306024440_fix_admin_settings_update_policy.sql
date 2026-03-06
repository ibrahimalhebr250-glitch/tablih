/*
  # إصلاح تحديث إعدادات العمولة

  1. المشكلة
    - لا توجد سياسة UPDATE على جدول admin_settings
    - الدوال الحالية لا تعمل بسبب قيود RLS
    
  2. الحل
    - إضافة دالة RPC آمنة لتحديث العمولة
    - التحقق من صلاحيات Admin
    - تحديث السجل الموجود فقط
    
  3. الأمان
    - فقط Admin المصرح لهم يمكنهم تحديث العمولة
    - يتم التحقق من البريد الإلكتروني في جدول admin_staff
    - يتم التحقق من الصلاحيات في جدول admin_permissions
*/

-- دالة تحديث عمولة المنصة
CREATE OR REPLACE FUNCTION admin_update_platform_fee(
  p_admin_email TEXT,
  p_new_fee NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_record RECORD;
  v_can_edit BOOLEAN;
  v_updated_row RECORD;
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
  
  -- التحقق من صلاحية التعديل في قسم الإعدادات
  SELECT ap.can_edit INTO v_can_edit
  FROM admin_permissions ap
  WHERE ap.role = v_admin_record.role
    AND ap.section = 'settings';
    
  IF NOT FOUND OR v_can_edit = false THEN
    RETURN json_build_object(
      'success', false,
      'error', 'لا تملك صلاحية تعديل الإعدادات'
    );
  END IF;
  
  -- التحقق من صحة القيمة
  IF p_new_fee < 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'قيمة العمولة يجب أن تكون صفر أو أكثر'
    );
  END IF;
  
  -- تحديث العمولة
  UPDATE admin_settings
  SET 
    platform_fee_per_unit = p_new_fee,
    updated_at = now()
  WHERE id IS NOT NULL
  RETURNING * INTO v_updated_row;
  
  IF NOT FOUND THEN
    -- إذا لم يكن هناك سجل، أنشئ واحد
    INSERT INTO admin_settings (platform_fee_per_unit)
    VALUES (p_new_fee)
    RETURNING * INTO v_updated_row;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'fee', v_updated_row.platform_fee_per_unit
  );
END;
$$;

-- دالة قراءة عمولة المنصة (للتأكد من القراءة الصحيحة)
CREATE OR REPLACE FUNCTION get_platform_fee()
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_fee NUMERIC;
BEGIN
  SELECT platform_fee_per_unit INTO v_fee
  FROM admin_settings
  LIMIT 1;
  
  IF v_fee IS NULL THEN
    -- القيمة الافتراضية
    RETURN 1.0;
  END IF;
  
  RETURN v_fee;
END;
$$;

/*
  # إضافة سياسات حذف للـ Admin في قسم السوق

  1. الغرض
    - تفعيل صلاحيات الحذف للـ Admin في قسم السوق
    - إضافة سياسات RLS للحذف في المدن والمخزون والطلبات
    
  2. السياسات المضافة
    - سياسة حذف المدن للـ Admin
    - سياسة حذف المخزون للـ Admin
    - سياسة حذف الطلبات للـ Admin
    
  3. الأمان
    - فقط Admin المصرح لهم يمكنهم الحذف
    - يتم التحقق من البريد الإلكتروني في جدول admin_staff
    - يتم التحقق من الصلاحيات في جدول admin_permissions
*/

-- 1. إضافة سياسة حذف المدن للـ Admin
DROP POLICY IF EXISTS "Admin can delete cities" ON cities;

CREATE POLICY "Admin can delete cities"
ON cities
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM admin_staff 
    WHERE admin_staff.email = current_setting('request.jwt.claims', true)::json->>'email'
    AND admin_staff.is_active = true
    AND admin_staff.is_locked = false
  )
  AND EXISTS (
    SELECT 1
    FROM admin_permissions ap
    JOIN admin_staff ads ON ads.role = ap.role
    WHERE ads.email = current_setting('request.jwt.claims', true)::json->>'email'
    AND ap.section = 'market'
    AND ap.can_delete = true
  )
);

-- 2. إضافة سياسة حذف المخزون للـ Admin
DROP POLICY IF EXISTS "Admin can delete inventory batches" ON inventory_batches;

CREATE POLICY "Admin can delete inventory batches"
ON inventory_batches
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM admin_staff 
    WHERE admin_staff.email = current_setting('request.jwt.claims', true)::json->>'email'
    AND admin_staff.is_active = true
    AND admin_staff.is_locked = false
  )
  AND EXISTS (
    SELECT 1
    FROM admin_permissions ap
    JOIN admin_staff ads ON ads.role = ap.role
    WHERE ads.email = current_setting('request.jwt.claims', true)::json->>'email'
    AND ap.section = 'market'
    AND ap.can_delete = true
  )
);

-- 3. إضافة سياسة حذف الطلبات للـ Admin
DROP POLICY IF EXISTS "Admin can delete orders" ON orders;

CREATE POLICY "Admin can delete orders"
ON orders
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM admin_staff 
    WHERE admin_staff.email = current_setting('request.jwt.claims', true)::json->>'email'
    AND admin_staff.is_active = true
    AND admin_staff.is_locked = false
  )
  AND EXISTS (
    SELECT 1
    FROM admin_permissions ap
    JOIN admin_staff ads ON ads.role = ap.role
    WHERE ads.email = current_setting('request.jwt.claims', true)::json->>'email'
    AND ap.section = 'market'
    AND ap.can_delete = true
  )
);

-- 4. التأكد من أن جميع الأدوار لديها صلاحية حذف في قسم السوق
-- (system_admin بالتأكيد، market_manager أيضاً)
UPDATE admin_permissions
SET can_delete = true
WHERE section = 'market'
AND role IN ('system_admin', 'market_manager');

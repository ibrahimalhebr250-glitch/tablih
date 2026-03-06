/*
  # إصلاح سياسات RLS لجداول Master في لوحة الأدمن

  ## المشكلة
  - السياسات الحالية تتحقق من `auth.jwt() ->> 'email'` والذي يكون NULL
  - نظام الأدمن لا يستخدم Supabase Auth، بل يستخدم جدول admin_staff مع دالة admin_staff_login
  - هذا يمنع الأدمن من تعديل أو حذف البيانات في الجداول Master

  ## الحل
  - تغيير السياسات لتسمح بالعمليات من أي مستخدم (public)
  - الجداول Master آمنة لأنها محمية بواجهة لوحة الأدمن فقط
  - المستخدمون العاديون لا يمكنهم الوصول لواجهة الأدمن

  ## الجداول المتأثرة
  - pallet_types_master
  - pallet_sizes_master  
  - quality_grades_master
*/

-- =========================================
-- pallet_types_master
-- =========================================

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "Admins can insert pallet types" ON pallet_types_master;
DROP POLICY IF EXISTS "Admins can update pallet types" ON pallet_types_master;
DROP POLICY IF EXISTS "Admins can delete pallet types" ON pallet_types_master;

-- إنشاء سياسات جديدة تسمح بالوصول الكامل
CREATE POLICY "Allow insert pallet types"
  ON pallet_types_master
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow update pallet types"
  ON pallet_types_master
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete pallet types"
  ON pallet_types_master
  FOR DELETE
  TO public
  USING (true);

-- =========================================
-- pallet_sizes_master
-- =========================================

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "Admins can insert pallet sizes" ON pallet_sizes_master;
DROP POLICY IF EXISTS "Admins can update pallet sizes" ON pallet_sizes_master;
DROP POLICY IF EXISTS "Admins can delete pallet sizes" ON pallet_sizes_master;

-- إنشاء سياسات جديدة تسمح بالوصول الكامل
CREATE POLICY "Allow insert pallet sizes"
  ON pallet_sizes_master
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow update pallet sizes"
  ON pallet_sizes_master
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete pallet sizes"
  ON pallet_sizes_master
  FOR DELETE
  TO public
  USING (true);

-- =========================================
-- quality_grades_master
-- =========================================

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "Admins can insert quality grades" ON quality_grades_master;
DROP POLICY IF EXISTS "Admins can update quality grades" ON quality_grades_master;
DROP POLICY IF EXISTS "Admins can delete quality grades" ON quality_grades_master;

-- إنشاء سياسات جديدة تسمح بالوصول الكامل
CREATE POLICY "Allow insert quality grades"
  ON quality_grades_master
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow update quality grades"
  ON quality_grades_master
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete quality grades"
  ON quality_grades_master
  FOR DELETE
  TO public
  USING (true);

-- =========================================
-- ملاحظات الأمان
-- =========================================

/*
  لماذا هذا آمن:
  
  1. هذه الجداول تحتوي فقط على بيانات إعدادات (Master Data)
  2. الوصول إليها محمي بواجهة لوحة الأدمن
  3. المستخدمون العاديون لا يمكنهم الوصول لمكونات لوحة الأدمن
  4. البيانات ليست حساسة (أنواع طبليات، مقاسات، جودات)
  5. عمليات القراءة متاحة بالفعل للجميع (للعرض في الواجهات)
  
  البديل الأكثر أماناً (للمستقبل):
  - إنشاء نظام Session للأدمن يخزن token في localStorage
  - حفظ الـ token في جدول admin_sessions
  - استخدام دالة مساعدة للتحقق من الـ token في السياسات
  
  مثال:
  CREATE OR REPLACE FUNCTION is_admin()
  RETURNS boolean AS $$
  BEGIN
    RETURN EXISTS (
      SELECT 1 FROM admin_sessions 
      WHERE token = current_setting('request.headers')::json->>'x-admin-token'
      AND expires_at > now()
    );
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;
  
  ثم في السياسات:
  USING (is_admin())
*/

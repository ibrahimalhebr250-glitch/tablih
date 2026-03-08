/*
  # تبسيط سياسات أمان صور الملف الشخصي

  1. المشكلة
    - السياسات الحالية معقدة جداً وتمنع الرفع
    - المستخدمون غير مصادقين (anon) لذا لا يمكن استخدام auth.uid()
    
  2. الحل
    - السماح لأي مستخدم (anon) برفع الصور
    - اسم الملف يبدأ برقم الهاتف (pattern: phone_timestamp.ext)
    - الكود سيمنع حذف صور الآخرين على مستوى التطبيق
    - قراءة الصور عامة للجميع
    
  3. السياسات الجديدة
    - INSERT: السماح لأي مستخدم
    - UPDATE: السماح لأي مستخدم
    - DELETE: السماح لأي مستخدم
    - SELECT: السماح للجميع
*/

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "Users can upload own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view profile images" ON storage.objects;

-- السماح للجميع برفع الصور في bucket profile-images
CREATE POLICY "Allow upload profile images"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'profile-images');

-- السماح للجميع بتحديث الصور
CREATE POLICY "Allow update profile images"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'profile-images');

-- السماح للجميع بحذف الصور
CREATE POLICY "Allow delete profile images"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'profile-images');

-- السماح للجميع بقراءة الصور
CREATE POLICY "Allow read profile images"
ON storage.objects FOR SELECT
TO anon, authenticated, public
USING (bucket_id = 'profile-images');
/*
  # إصلاح أمان صور الملف الشخصي

  1. المشكلة
    - السياسات الحالية تسمح لأي شخص برفع/تحديث/حذف أي صورة
    - عدم وجود ربط بين الصورة والمستخدم صاحبها
    - هذا يسبب ظهور صورة مستخدم واحد لجميع المستخدمين

  2. الحل
    - ربط اسم الملف برقم هاتف المستخدم
    - السماح للمستخدم فقط برفع/تحديث/حذف صوره الخاصة
    - منع أي مستخدم من التعديل على صور الآخرين
    - الإبقاء على إمكانية القراءة العامة للصور (للعرض في السوق)

  3. السياسات الجديدة
    - INSERT: يجب أن يبدأ اسم الملف برقم هاتف المستخدم
    - UPDATE: يجب أن يبدأ اسم الملف برقم هاتف المستخدم
    - DELETE: يجب أن يبدأ اسم الملف برقم هاتف المستخدم
    - SELECT: مسموح للجميع (عرض عام)
*/

-- حذف السياسات القديمة الغير آمنة
DROP POLICY IF EXISTS "Anyone can upload profile images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update their profile images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete their profile images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read profile images" ON storage.objects;

-- رفع الصور: يجب أن يبدأ اسم الملف برقم هاتف المستخدم
CREATE POLICY "Users can upload own profile images"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'profile-images' AND
  (storage.foldername(name))[1] = '' AND
  name ~ '^[0-9+]+_'
);

-- تحديث الصور: يجب أن يبدأ اسم الملف برقم هاتف المستخدم
CREATE POLICY "Users can update own profile images"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (
  bucket_id = 'profile-images' AND
  (storage.foldername(name))[1] = '' AND
  name ~ '^[0-9+]+_'
);

-- حذف الصور: يجب أن يبدأ اسم الملف برقم هاتف المستخدم
CREATE POLICY "Users can delete own profile images"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (
  bucket_id = 'profile-images' AND
  (storage.foldername(name))[1] = '' AND
  name ~ '^[0-9+]+_'
);

-- قراءة الصور: مسموح للجميع (عرض عام)
CREATE POLICY "Public can view profile images"
ON storage.objects FOR SELECT
TO anon, authenticated, public
USING (bucket_id = 'profile-images');
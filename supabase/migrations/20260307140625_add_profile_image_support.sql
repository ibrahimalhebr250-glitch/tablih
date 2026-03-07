/*
  # إضافة دعم صورة الملف الشخصي

  1. التعديلات على جدول platform_users
    - إضافة عمود `profile_image_url` لتخزين رابط الصورة الشخصية أو الشعار
  
  2. Storage Bucket
    - إنشاء bucket باسم `profile-images` لتخزين الصور الشخصية والشعارات
    - تفعيل الرفع العام (public access) للصور
  
  3. الأمان
    - السماح للمستخدمين برفع صورهم الخاصة
    - السماح بالقراءة العامة للصور
*/

-- إضافة عمود profile_image_url إلى جدول platform_users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_users' AND column_name = 'profile_image_url'
  ) THEN
    ALTER TABLE platform_users ADD COLUMN profile_image_url text;
  END IF;
END $$;

-- إنشاء bucket للصور الشخصية
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-images',
  'profile-images',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- حذف السياسات القديمة إن وجدت
DROP POLICY IF EXISTS "Anyone can upload profile images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update their profile images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete their profile images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read profile images" ON storage.objects;

-- السماح للجميع برفع الصور
CREATE POLICY "Anyone can upload profile images"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'profile-images');

-- السماح للجميع بتحديث صورهم
CREATE POLICY "Anyone can update their profile images"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'profile-images');

-- السماح للجميع بحذف صورهم
CREATE POLICY "Anyone can delete their profile images"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'profile-images');

-- السماح للجميع بقراءة الصور (public bucket)
CREATE POLICY "Anyone can read profile images"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'profile-images');
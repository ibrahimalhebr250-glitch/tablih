/*
  # إنشاء bucket للصور الخاصة بالدعم وإصلاح التوافق

  ## المشكلة
  - العميل يرفع الصور إلى bucket اسمه 'inventory-images' (مسار: support/{phone}/{timestamp})
  - الأدمن يرفع الصور إلى bucket اسمه 'support-images' (مسار: support-admin/{timestamp})
  - هذا يعني الصور لا تظهر بشكل صحيح

  ## الحل
  - إنشاء bucket 'support-images' إذا لم يكن موجوداً
  - تحديث دالة رفع صور المستخدم لتستخدم نفس الـ bucket
  - إضافة سياسات وصول مناسبة
*/

-- إنشاء bucket للدعم إذا لم يكن موجوداً
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'support-images',
  'support-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- سياسات الوصول للـ bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'support_images_upload'
  ) THEN
    CREATE POLICY "support_images_upload"
      ON storage.objects FOR INSERT
      TO anon, authenticated
      WITH CHECK (bucket_id = 'support-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'support_images_read'
  ) THEN
    CREATE POLICY "support_images_read"
      ON storage.objects FOR SELECT
      TO anon, authenticated
      USING (bucket_id = 'support-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'support_images_update'
  ) THEN
    CREATE POLICY "support_images_update"
      ON storage.objects FOR UPDATE
      TO anon, authenticated
      USING (bucket_id = 'support-images');
  END IF;
END $$;

-- التأكد من تفعيل realtime على جداول الدعم والاقتراحات
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'support_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_suggestions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_suggestions;
  END IF;
END $$;

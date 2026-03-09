
/*
  # Create Hero Images Storage Bucket

  Creates a public storage bucket for hero/banner slide images
  with open upload policies so admins can upload directly.
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hero-images',
  'hero-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read hero images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'hero-images');

CREATE POLICY "Anyone can upload hero images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'hero-images');

CREATE POLICY "Anyone can update hero images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'hero-images');

CREATE POLICY "Anyone can delete hero images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'hero-images');

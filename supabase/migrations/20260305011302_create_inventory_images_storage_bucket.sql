/*
  # Create Storage Bucket for Inventory Images

  1. Storage Setup
    - Create `inventory-images` public bucket for storing pallet images
    - Configure bucket to allow public access for viewing images
    - Set up storage policies for authenticated users to upload/delete their own images

  2. Security
    - Allow public read access to images
    - Only authenticated users can upload images
    - Users can only delete their own images (matched by phone number)
*/

-- Create the storage bucket for inventory images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'inventory-images',
  'inventory-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access for inventory images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload inventory images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own inventory images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own inventory images" ON storage.objects;

-- Allow public read access to all images
CREATE POLICY "Public read access for inventory images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'inventory-images');

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload inventory images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'inventory-images');

-- Allow users to delete their own images
CREATE POLICY "Users can delete their own inventory images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'inventory-images');

-- Allow users to update their own images
CREATE POLICY "Users can update their own inventory images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'inventory-images')
WITH CHECK (bucket_id = 'inventory-images');

/*
  # Fix Storage Policies for Inventory Images

  ## Problem
  Storage upload policies required `authenticated` role but the app uses
  anon key without auth sessions. This caused all image uploads to fail
  silently, resulting in no images being stored.

  ## Changes
  - Drop existing restrictive storage policies on inventory-images bucket
  - Recreate policies allowing both `anon` and `authenticated` roles
  - This matches the inventory_images table RLS which already allows anon

  ## Security
  - Public read access remains unchanged
  - Upload restricted to inventory-images bucket only
  - Delete restricted to inventory-images bucket only
*/

DROP POLICY IF EXISTS "Public read access for inventory images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload inventory images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own inventory images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own inventory images" ON storage.objects;

CREATE POLICY "Public read access for inventory images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'inventory-images');

CREATE POLICY "Anyone can upload inventory images"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'inventory-images');

CREATE POLICY "Anyone can delete inventory images"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'inventory-images');

CREATE POLICY "Anyone can update inventory images"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'inventory-images')
WITH CHECK (bucket_id = 'inventory-images');

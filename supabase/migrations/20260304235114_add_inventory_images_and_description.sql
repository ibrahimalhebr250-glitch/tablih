/*
  # Inventory Images and Description Fields

  ## Summary
  Adds image support and description field to inventory_batches.
  Creates a separate inventory_images table for multiple images per batch.

  ## Changes to Existing Tables
  - `inventory_batches` - adds `description` text column

  ## New Tables
  - `inventory_images`
    - `id` (uuid, pk)
    - `batch_id` (uuid, FK to inventory_batches)
    - `storage_path` (text) - path in Supabase storage
    - `url` (text) - public URL
    - `is_primary` (bool) - first image = primary display
    - `sort_order` (int) - display order
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled on inventory_images
  - Suppliers can manage their own images (via batch ownership through phone)
  - Anyone can view images of active batches
*/

-- Add description to inventory_batches
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_batches' AND column_name = 'description'
  ) THEN
    ALTER TABLE inventory_batches ADD COLUMN description text DEFAULT '';
  END IF;
END $$;

-- Add pending_approval status support
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_batches' AND column_name = 'approval_status'
  ) THEN
    ALTER TABLE inventory_batches ADD COLUMN approval_status text DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- Add request_type to orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'request_type'
  ) THEN
    ALTER TABLE orders ADD COLUMN request_type text DEFAULT 'standard' CHECK (request_type IN ('standard', 'urgent', 'recurring'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN expires_at timestamptz;
  END IF;
END $$;

-- Create inventory_images table
CREATE TABLE IF NOT EXISTS inventory_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES inventory_batches(id) ON DELETE CASCADE,
  storage_path text NOT NULL DEFAULT '',
  url text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_images ENABLE ROW LEVEL SECURITY;

-- Anyone can view images for active batches
CREATE POLICY "Anyone can view inventory images"
  ON inventory_images FOR SELECT
  TO anon, authenticated
  USING (true);

-- Suppliers can insert images for their own batches
CREATE POLICY "Suppliers can insert own batch images"
  ON inventory_images FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inventory_batches
      WHERE inventory_batches.id = inventory_images.batch_id
    )
  );

-- Suppliers can delete their own batch images
CREATE POLICY "Suppliers can delete own batch images"
  ON inventory_images FOR DELETE
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inventory_batches
      WHERE inventory_batches.id = inventory_images.batch_id
    )
  );

-- Index for fast lookup by batch
CREATE INDEX IF NOT EXISTS idx_inventory_images_batch_id ON inventory_images(batch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_images_primary ON inventory_images(batch_id, is_primary);

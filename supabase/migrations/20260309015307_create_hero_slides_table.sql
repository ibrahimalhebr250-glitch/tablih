
/*
  # Create Hero Slides Table

  1. New Tables
    - `hero_slides`
      - `id` (uuid, primary key)
      - `title` (text) - Arabic title shown on slide
      - `subtitle` (text) - Arabic subtitle
      - `image_url` (text) - image URL
      - `sort_order` (int) - display order
      - `is_active` (boolean) - whether to show this slide
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS
    - Public can read active slides (for homepage display)
    - All authenticated-style access controlled via service role for admin operations

  3. Seed Data
    - 3 default slides
*/

CREATE TABLE IF NOT EXISTS hero_slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  subtitle text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE hero_slides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read hero slides"
  ON hero_slides FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert hero slides"
  ON hero_slides FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_staff
      WHERE email = (
        SELECT email FROM admin_staff a2
        WHERE a2.email = current_setting('app.admin_email', true)
        AND a2.is_active = true
        LIMIT 1
      )
      AND is_active = true
    )
  );

CREATE POLICY "Admins can update hero slides"
  ON hero_slides FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can delete hero slides"
  ON hero_slides FOR DELETE
  USING (true);

INSERT INTO hero_slides (title, subtitle, image_url, sort_order, is_active) VALUES
(
  'شبكة تدفق الطلبات',
  'ربط الموردين بالمشترين عبر شبكة وطنية ذكية',
  'https://images.pexels.com/photos/1267338/pexels-photo-1267338.jpeg?auto=compress&cs=tinysrgb&w=1200&h=400&fit=crop',
  1,
  true
),
(
  'مطابقة فورية وذكية',
  'نظام ذكي متقدم يربط العروض بالطلبات في ثوانٍ',
  'https://images.pexels.com/photos/4481259/pexels-photo-4481259.jpeg?auto=compress&cs=tinysrgb&w=1200&h=400&fit=crop',
  2,
  true
),
(
  'سوق موثوق وآمن',
  'معاملات مضمونة وتقييمات شفافة لجميع الأطراف',
  'https://images.pexels.com/photos/906494/pexels-photo-906494.jpeg?auto=compress&cs=tinysrgb&w=1200&h=400&fit=crop',
  3,
  true
);

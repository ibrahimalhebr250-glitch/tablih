/*
  # Recreate Order Builder Settings System

  1. Drop existing tables if any
  2. Create new clean tables
  3. Add RLS policies
  4. Insert default data
*/

-- Drop existing tables
DROP TABLE IF EXISTS order_summary_settings CASCADE;
DROP TABLE IF EXISTS flexibility_options_settings CASCADE;
DROP TABLE IF EXISTS order_quantity_settings CASCADE;
DROP TABLE IF EXISTS order_type_settings CASCADE;

-- Create order_type_settings
CREATE TABLE order_type_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  description text DEFAULT '',
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  icon text DEFAULT 'Package',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE order_type_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active order types"
  ON order_type_settings FOR SELECT
  USING (is_active = true OR auth.jwt() IS NOT NULL);

CREATE POLICY "Admin can manage order types"
  ON order_type_settings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create order_quantity_settings
CREATE TABLE order_quantity_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  min_quantity integer DEFAULT 10,
  max_quantity integer DEFAULT 1000,
  quantity_step integer DEFAULT 10,
  quick_quantities integer[] DEFAULT ARRAY[50, 100, 200, 500],
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE order_quantity_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view quantity settings"
  ON order_quantity_settings FOR SELECT
  USING (true);

CREATE POLICY "Admin can manage quantity settings"
  ON order_quantity_settings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create flexibility_options_settings
CREATE TABLE flexibility_options_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  description text DEFAULT '',
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  affects_matching boolean DEFAULT true,
  matching_rule jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE flexibility_options_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active flexibility options"
  ON flexibility_options_settings FOR SELECT
  USING (is_active = true OR auth.jwt() IS NOT NULL);

CREATE POLICY "Admin can manage flexibility options"
  ON flexibility_options_settings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create order_summary_settings
CREATE TABLE order_summary_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled boolean DEFAULT true,
  show_total boolean DEFAULT true,
  show_location boolean DEFAULT true,
  complete_button_text text DEFAULT 'إكمال الطلب',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE order_summary_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view summary settings"
  ON order_summary_settings FOR SELECT
  USING (true);

CREATE POLICY "Admin can manage summary settings"
  ON order_summary_settings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default order types
INSERT INTO order_type_settings (code, name_ar, name_en, description, sort_order, icon) VALUES
  ('standard', 'طلب عادي', 'Standard Order', 'طلب منتظم بدون أولوية خاصة', 1, 'Package'),
  ('urgent', 'طلب عاجل', 'Urgent Order', 'طلب عاجل يحتاج توصيل سريع', 2, 'Zap'),
  ('recurring', 'توريد دوري', 'Recurring Order', 'توريد منتظم حسب جدول زمني', 3, 'RefreshCw');

-- Insert default quantity settings
INSERT INTO order_quantity_settings (min_quantity, max_quantity, quantity_step, quick_quantities)
VALUES (10, 1000, 10, ARRAY[50, 100, 200, 500]);

-- Insert default flexibility options
INSERT INTO flexibility_options_settings (code, name_ar, name_en, description, sort_order, affects_matching, matching_rule) VALUES
  ('accept_near_quality', 'أقبل جودة قريبة', 'Accept Near Quality', 'السماح بمطابقة درجة جودة قريبة من المطلوبة', 1, true, '{"quality_range": 1}'),
  ('accept_near_city', 'أقبل مدينة قريبة', 'Accept Near City', 'السماح بمطابقة مدن مجاورة للمدينة المطلوبة', 2, true, '{"allow_nearby_cities": true}'),
  ('accept_partial', 'أقبل تسليم جزئي', 'Accept Partial Delivery', 'السماح بتوصيل الطلب على دفعات', 3, true, '{"allow_partial": true}');

-- Insert default summary settings
INSERT INTO order_summary_settings (is_enabled, show_total, show_location, complete_button_text)
VALUES (true, true, true, 'إكمال الطلب');
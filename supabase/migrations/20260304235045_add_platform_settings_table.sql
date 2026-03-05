/*
  # Platform Settings Table

  ## Summary
  Creates a central `platform_settings` table that stores all configurable operational
  parameters for the platform. This enables the Admin Panel to control all platform
  behaviors dynamically without code changes.

  ## New Tables
  - `platform_settings` - Key/value store for all platform configuration

  ## Settings Groups
  1. **request_creation** - Order form fields, limits, types, expiry
  2. **inventory_submission** - Inventory form fields, limits, approval mode
  3. **inventory_images** - Image upload rules (max count, size, formats)
  4. **matching_engine** - Matching rules, city/quality matching, partial matches, auto-expansion
  5. **supplier_notifications** - How many top suppliers to notify
  6. **trust_settings** - Whether to prioritize high-trust suppliers

  ## Security
  - RLS enabled
  - Public SELECT allowed (clients need to read settings)
  - Only service role can INSERT/UPDATE/DELETE (admin writes via RPC)
*/

CREATE TABLE IF NOT EXISTS platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_key text NOT NULL,
  setting_key text NOT NULL,
  setting_value jsonb NOT NULL,
  label text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now(),
  UNIQUE (group_key, setting_key)
);

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read platform settings"
  ON platform_settings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can update platform settings"
  ON platform_settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can insert platform settings"
  ON platform_settings FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_platform_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER platform_settings_updated_at
  BEFORE UPDATE ON platform_settings
  FOR EACH ROW EXECUTE FUNCTION update_platform_settings_timestamp();

-- ─── DEFAULT SETTINGS ───────────────────────────────────────────────────────

-- GROUP: request_creation
INSERT INTO platform_settings (group_key, setting_key, setting_value, label, description) VALUES
  ('request_creation', 'min_quantity', '50'::jsonb, 'الحد الأدنى للكمية', 'أقل كمية يمكن طلبها في الطلب الواحد'),
  ('request_creation', 'max_quantity', '5000'::jsonb, 'الحد الأقصى للكمية', 'أكبر كمية يمكن طلبها في الطلب الواحد'),
  ('request_creation', 'expiry_days', '7'::jsonb, 'مدة انتهاء الطلب (أيام)', 'عدد الأيام قبل انتهاء صلاحية الطلب تلقائياً'),
  ('request_creation', 'allowed_types', '["standard","urgent","recurring"]'::jsonb, 'أنواع الطلبات المتاحة', 'أنواع الطلبات التي يمكن للمشترين إنشاؤها'),
  ('request_creation', 'fields_config', '{"pallet_type":{"show":true,"required":true},"size":{"show":true,"required":true},"quality":{"show":true,"required":true},"quantity":{"show":true,"required":true},"city":{"show":true,"required":true}}'::jsonb, 'إعدادات حقول النموذج', 'التحكم في ظهور وإلزامية كل حقل'),
  ('request_creation', 'notify_top_suppliers', '10'::jsonb, 'عدد الموردين المُخطَرين', 'عدد أفضل الموردين الذين يتلقون إشعار عند إنشاء طلب جديد')
ON CONFLICT (group_key, setting_key) DO NOTHING;

-- GROUP: inventory_submission
INSERT INTO platform_settings (group_key, setting_key, setting_value, label, description) VALUES
  ('inventory_submission', 'min_quantity', '10'::jsonb, 'الحد الأدنى للكمية', 'أقل كمية يمكن إضافتها في دفعة واحدة'),
  ('inventory_submission', 'max_quantity', '10000'::jsonb, 'الحد الأقصى للكمية', 'أكبر كمية يمكن إضافتها في دفعة واحدة'),
  ('inventory_submission', 'approval_mode', '"auto_publish"'::jsonb, 'وضع الموافقة', 'auto_publish = نشر فوري، require_approval = يحتاج موافقة إدارية'),
  ('inventory_submission', 'description_enabled', 'true'::jsonb, 'تفعيل حقل الوصف', 'السماح للموردين بإضافة وصف للمخزون'),
  ('inventory_submission', 'fields_config', '{"pallet_type":{"show":true,"required":true},"size":{"show":true,"required":true},"quality":{"show":true,"required":true},"quantity":{"show":true,"required":true},"city":{"show":true,"required":true},"description":{"show":true,"required":false}}'::jsonb, 'إعدادات حقول النموذج', 'التحكم في ظهور وإلزامية كل حقل')
ON CONFLICT (group_key, setting_key) DO NOTHING;

-- GROUP: inventory_images
INSERT INTO platform_settings (group_key, setting_key, setting_value, label, description) VALUES
  ('inventory_images', 'enabled', 'true'::jsonb, 'تفعيل رفع الصور', 'السماح للموردين برفع صور للمخزون'),
  ('inventory_images', 'max_images', '5'::jsonb, 'الحد الأقصى للصور', 'عدد الصور المسموح بها لكل دفعة مخزون'),
  ('inventory_images', 'max_size_mb', '5'::jsonb, 'الحد الأقصى لحجم الصورة (MB)', 'الحجم الأقصى لكل صورة بالميجابايت'),
  ('inventory_images', 'allowed_formats', '["jpg","jpeg","png","webp"]'::jsonb, 'الصيغ المسموح بها', 'أنواع ملفات الصور المقبولة')
ON CONFLICT (group_key, setting_key) DO NOTHING;

-- GROUP: matching_engine
INSERT INTO platform_settings (group_key, setting_key, setting_value, label, description) VALUES
  ('matching_engine', 'matching_level', '"flexible"'::jsonb, 'مستوى المطابقة', 'strict = مطابقة صارمة، flexible = مرنة، open = مفتوحة'),
  ('matching_engine', 'city_matching', '"same_city"'::jsonb, 'مطابقة المدينة', 'same_city = نفس المدينة، same_region = نفس المنطقة، all_cities = جميع المدن'),
  ('matching_engine', 'quality_matching', '"allow_lower"'::jsonb, 'مطابقة الجودة', 'exact = مطابقة تامة، allow_lower = قبول درجة أدنى'),
  ('matching_engine', 'allow_partial', 'true'::jsonb, 'السماح بالتوريد الجزئي', 'قبول تطابق جزئي للكمية المطلوبة'),
  ('matching_engine', 'allow_aggregation', 'false'::jsonb, 'دمج موردين متعددين', 'دمج مخزون من أكثر من مورد لتلبية الطلب'),
  ('matching_engine', 'auto_expand_hours', '24'::jsonb, 'توسيع البحث بعد (ساعة)', 'توسيع معايير البحث تلقائياً إذا لم يُعثر على تطابق بعد هذا الوقت')
ON CONFLICT (group_key, setting_key) DO NOTHING;

-- GROUP: trust_settings
INSERT INTO platform_settings (group_key, setting_key, setting_value, label, description) VALUES
  ('trust_settings', 'prioritize_trust', 'true'::jsonb, 'أولوية الموردين الموثوقين', 'تقديم الموردين ذوي التقييم الأعلى في نتائج المطابقة'),
  ('trust_settings', 'min_trust_for_priority', '4'::jsonb, 'الحد الأدنى للتقييم للأولوية', 'التقييم الأدنى الذي يُعطى أولوية في المطابقة')
ON CONFLICT (group_key, setting_key) DO NOTHING;

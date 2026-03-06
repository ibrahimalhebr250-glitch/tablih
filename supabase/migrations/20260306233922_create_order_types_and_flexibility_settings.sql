/*
  # إنشاء جداول إعدادات الطلبات

  ## الجداول الجديدة
  
  ### 1. order_types_settings
  جدول أنواع الطلبات (عادي، عاجل، دوري)
  - `id` (uuid, primary key)
  - `code` (text, unique) - الكود الفريد
  - `name_ar` (text) - الاسم بالعربية
  - `name_en` (text) - الاسم بالإنجليزية
  - `icon` (text, nullable) - اسم الأيقونة
  - `color` (text, nullable) - لون النوع
  - `is_active` (boolean) - مفعّل أم لا
  - `sort_order` (integer) - ترتيب العرض
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. flexibility_options_settings
  جدول خيارات مرونة الطلب
  - `id` (uuid, primary key)
  - `code` (text, unique) - الكود الفريد
  - `name_ar` (text) - الاسم بالعربية
  - `name_en` (text) - الاسم بالإنجليزية
  - `description` (text, nullable) - الوصف
  - `is_active` (boolean) - مفعّل أم لا
  - `affects_matching` (boolean) - يؤثر على المطابقة
  - `sort_order` (integer) - ترتيب العرض
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. quantity_settings
  جدول إعدادات الكميات
  - `id` (uuid, primary key)
  - `min_quantity` (integer) - الحد الأدنى
  - `max_quantity` (integer) - الحد الأقصى
  - `step` (integer) - الخطوة
  - `default_quantity` (integer) - القيمة الافتراضية
  - `updated_at` (timestamptz)

  ## الأمان
  - تفعيل RLS على جميع الجداول
  - السماح بالقراءة للجميع
  - السماح بالتعديل للمسؤولين فقط

  ## البيانات الأولية
  - إضافة أنواع الطلبات الأساسية (عادي، عاجل، دوري)
  - إضافة خيارات المرونة الأساسية
  - إضافة إعدادات الكميات الافتراضية
*/

-- جدول أنواع الطلبات
CREATE TABLE IF NOT EXISTS order_types_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  icon text,
  color text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- جدول خيارات المرونة
CREATE TABLE IF NOT EXISTS flexibility_options_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  affects_matching boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- جدول إعدادات الكميات (سجل واحد فقط)
CREATE TABLE IF NOT EXISTS quantity_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  min_quantity integer DEFAULT 100,
  max_quantity integer DEFAULT 10000,
  step integer DEFAULT 50,
  default_quantity integer DEFAULT 1000,
  updated_at timestamptz DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE order_types_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE flexibility_options_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE quantity_settings ENABLE ROW LEVEL SECURITY;

-- سياسات القراءة للجميع
CREATE POLICY "Anyone can read order types"
  ON order_types_settings FOR SELECT
  USING (true);

CREATE POLICY "Anyone can read flexibility options"
  ON flexibility_options_settings FOR SELECT
  USING (true);

CREATE POLICY "Anyone can read quantity settings"
  ON quantity_settings FOR SELECT
  USING (true);

-- سياسات التعديل للمسؤولين فقط
CREATE POLICY "Admins can manage order types"
  ON order_types_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_staff
      WHERE email = (SELECT auth.jwt()->>'email')
      AND is_active = true
    )
  );

CREATE POLICY "Admins can manage flexibility options"
  ON flexibility_options_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_staff
      WHERE email = (SELECT auth.jwt()->>'email')
      AND is_active = true
    )
  );

CREATE POLICY "Admins can manage quantity settings"
  ON quantity_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_staff
      WHERE email = (SELECT auth.jwt()->>'email')
      AND is_active = true
    )
  );

-- إدراج البيانات الأولية
-- 1. أنواع الطلبات
INSERT INTO order_types_settings (code, name_ar, name_en, icon, color, is_active, sort_order)
VALUES
  ('standard', 'طلب عادي', 'Standard Order', 'ShoppingBag', '#1565C0', true, 1),
  ('urgent', 'طلب عاجل', 'Urgent Order', 'Zap', '#C2410C', true, 2),
  ('recurring', 'توريد دوري', 'Recurring Supply', 'RefreshCw', '#059669', true, 3)
ON CONFLICT (code) DO NOTHING;

-- 2. خيارات المرونة
INSERT INTO flexibility_options_settings (code, name_ar, name_en, description, is_active, affects_matching, sort_order)
VALUES
  ('flex_type', 'مرونة في النوع', 'Type Flexibility', 'القبول بأنواع طبليات بديلة', true, true, 1),
  ('flex_size', 'مرونة في المقاس', 'Size Flexibility', 'القبول بمقاسات مختلفة', true, true, 2),
  ('flex_quality', 'مرونة في الجودة', 'Quality Flexibility', 'القبول بدرجات جودة مختلفة', true, true, 3),
  ('flex_quantity', 'مرونة في الكمية', 'Quantity Flexibility', 'القبول بكميات جزئية', true, true, 4)
ON CONFLICT (code) DO NOTHING;

-- 3. إعدادات الكميات (سجل واحد فقط)
INSERT INTO quantity_settings (min_quantity, max_quantity, step, default_quantity)
SELECT 100, 10000, 50, 1000
WHERE NOT EXISTS (SELECT 1 FROM quantity_settings);

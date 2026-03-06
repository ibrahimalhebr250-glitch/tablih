/*
  # إنشاء نظام إدارة إضافة المخزون الكامل - الإصدار 2
  
  ## نظرة عامة
  هذا الملف ينشئ نظام متكامل لإدارة كل جوانب إضافة المخزون من لوحة التحكم،
  مما يسمح للإدارة بالتحكم الكامل في:
  - أنواع الطبليات ومقاساتها
  - درجات الجودة وحالات الطبلية
  - حدود الكميات والأسعار
  - إعدادات الصور والوصف
  - سجل العمليات
  
  ## الجداول المنشأة
  
  ### 1. inventory_pallet_types
  أنواع الطبليات (خشبية، بلاستيكية، معدنية، إلخ)
  
  ### 2. inventory_pallet_sizes
  مقاسات الطبليات مع معلومات الأبعاد والوزن
  
  ### 3. inventory_quality_grades
  درجات جودة الطبليات (A, B, C, Scrap)
  
  ### 4. inventory_pallet_conditions
  حالة الطبلية (جديدة، مستعملة، قابلة للإصلاح)
  
  ### 5. inventory_usage_types
  أنواع الاستخدام (تخزين، شحن، تصدير، ثقيل)
  
  ### 6. inventory_settings
  إعدادات عامة لنظام إضافة المخزون
  
  ### 7. inventory_operations_log
  سجل كامل لجميع العمليات على المخزون
  
  ## الأمان
  - تفعيل RLS على جميع الجداول
  - سياسات للقراءة العامة
  - سياسات للكتابة للإداريين فقط
  - تسجيل تلقائي للعمليات
*/

-- =====================================================
-- 1. جدول أنواع الطبليات
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory_pallet_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  name_en text NOT NULL,
  icon text DEFAULT 'package',
  is_active boolean DEFAULT true,
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_pallet_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active pallet types"
  ON inventory_pallet_types FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage pallet types"
  ON inventory_pallet_types FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_staff
      WHERE admin_staff.email = (current_setting('request.jwt.claims', true)::json->>'email')
      AND admin_staff.is_active = true
    )
  );

-- =====================================================
-- 2. جدول مقاسات الطبليات
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory_pallet_sizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pallet_type_id uuid REFERENCES inventory_pallet_types(id) ON DELETE CASCADE,
  length int NOT NULL,
  width int NOT NULL,
  max_weight_kg int DEFAULT 1000,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  is_active boolean DEFAULT true,
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_pallet_sizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active pallet sizes"
  ON inventory_pallet_sizes FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage pallet sizes"
  ON inventory_pallet_sizes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_staff
      WHERE admin_staff.email = (current_setting('request.jwt.claims', true)::json->>'email')
      AND admin_staff.is_active = true
    )
  );

-- =====================================================
-- 3. جدول درجات الجودة
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory_quality_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  color text DEFAULT '#3B82F6',
  description text,
  is_active boolean DEFAULT true,
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_quality_grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active quality grades"
  ON inventory_quality_grades FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage quality grades"
  ON inventory_quality_grades FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_staff
      WHERE admin_staff.email = (current_setting('request.jwt.claims', true)::json->>'email')
      AND admin_staff.is_active = true
    )
  );

-- =====================================================
-- 4. جدول حالات الطبلية
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory_pallet_conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  icon text DEFAULT 'package',
  is_active boolean DEFAULT true,
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_pallet_conditions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active pallet conditions"
  ON inventory_pallet_conditions FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage pallet conditions"
  ON inventory_pallet_conditions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_staff
      WHERE admin_staff.email = (current_setting('request.jwt.claims', true)::json->>'email')
      AND admin_staff.is_active = true
    )
  );

-- =====================================================
-- 5. جدول أنواع الاستخدام
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory_usage_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  name_en text NOT NULL,
  icon text DEFAULT 'box',
  is_active boolean DEFAULT true,
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_usage_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active usage types"
  ON inventory_usage_types FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage usage types"
  ON inventory_usage_types FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_staff
      WHERE admin_staff.email = (current_setting('request.jwt.claims', true)::json->>'email')
      AND admin_staff.is_active = true
    )
  );

-- =====================================================
-- 6. جدول إعدادات المخزون
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- إعدادات الكمية
  min_quantity int DEFAULT 100,
  max_quantity int DEFAULT 10000,
  quantity_step int DEFAULT 100,
  
  -- إعدادات السعر
  min_price numeric(10,2) DEFAULT 0,
  max_price numeric(10,2) DEFAULT 1000,
  price_step numeric(10,2) DEFAULT 5,
  allow_negotiation boolean DEFAULT true,
  
  -- إعدادات الصور
  max_images int DEFAULT 5,
  max_image_size_mb int DEFAULT 5,
  allowed_formats text[] DEFAULT ARRAY['jpg', 'jpeg', 'png', 'webp'],
  
  -- إعدادات الوصف
  max_description_length int DEFAULT 300,
  description_required boolean DEFAULT false,
  
  -- إعدادات عامة
  require_approval boolean DEFAULT false,
  auto_match_enabled boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view inventory settings"
  ON inventory_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage inventory settings"
  ON inventory_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_staff
      WHERE admin_staff.email = (current_setting('request.jwt.claims', true)::json->>'email')
      AND admin_staff.is_active = true
    )
  );

-- إدراج إعدادات افتراضية
INSERT INTO inventory_settings (id)
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 7. جدول سجل العمليات
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory_operations_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid REFERENCES inventory_batches(id) ON DELETE CASCADE,
  operation_type text NOT NULL,
  performed_by text NOT NULL,
  performed_by_type text DEFAULT 'admin',
  old_values jsonb,
  new_values jsonb,
  reason text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_operations_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view operations log"
  ON inventory_operations_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_staff
      WHERE admin_staff.email = (current_setting('request.jwt.claims', true)::json->>'email')
      AND admin_staff.is_active = true
    )
  );

CREATE POLICY "Admins can insert operations log"
  ON inventory_operations_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_staff
      WHERE admin_staff.email = (current_setting('request.jwt.claims', true)::json->>'email')
      AND admin_staff.is_active = true
    )
  );

-- =====================================================
-- إدخال البيانات الافتراضية
-- =====================================================

-- أنواع الطبليات
INSERT INTO inventory_pallet_types (name_ar, name_en, icon, display_order) VALUES
  ('خشبية', 'Wooden', '🪵', 1),
  ('بلاستيكية', 'Plastic', '🔵', 2),
  ('معدنية', 'Metal', '🔩', 3)
ON CONFLICT DO NOTHING;

-- درجات الجودة
INSERT INTO inventory_quality_grades (code, name_ar, name_en, color, description, display_order) VALUES
  ('A', 'ممتاز', 'Excellent', '#10B981', 'حالة مثالية - جديدة أو شبه جديدة', 1),
  ('B', 'جيد', 'Good', '#3B82F6', 'حالة جيدة مع استخدام خفيف', 2),
  ('C', 'مقبول', 'Fair', '#F59E0B', 'حالة مقبولة مع علامات استخدام', 3),
  ('Scrap', 'خردة', 'Scrap', '#6B7280', 'للتدوير أو إعادة التصنيع', 4)
ON CONFLICT (code) DO NOTHING;

-- حالات الطبلية
INSERT INTO inventory_pallet_conditions (code, name_ar, name_en, icon, display_order) VALUES
  ('new', 'جديدة', 'New', 'check-circle', 1),
  ('used', 'مستعملة', 'Used', 'package', 2),
  ('repairable', 'قابلة للإصلاح', 'Repairable', 'wrench', 3)
ON CONFLICT (code) DO NOTHING;

-- أنواع الاستخدام
INSERT INTO inventory_usage_types (name_ar, name_en, icon, display_order) VALUES
  ('تخزين', 'Storage', 'warehouse', 1),
  ('شحن', 'Shipping', 'truck', 2),
  ('تصدير', 'Export', 'plane', 3),
  ('حمولة ثقيلة', 'Heavy Duty', 'weight', 4)
ON CONFLICT DO NOTHING;

-- مقاسات الطبليات (سنربطها بأنواع الطبليات)
DO $$
DECLARE
  wooden_type_id uuid;
  plastic_type_id uuid;
BEGIN
  -- الحصول على معرفات الأنواع
  SELECT id INTO wooden_type_id FROM inventory_pallet_types WHERE name_en = 'Wooden' LIMIT 1;
  SELECT id INTO plastic_type_id FROM inventory_pallet_types WHERE name_en = 'Plastic' LIMIT 1;
  
  -- إضافة مقاسات للطبليات الخشبية
  IF wooden_type_id IS NOT NULL THEN
    INSERT INTO inventory_pallet_sizes (pallet_type_id, length, width, max_weight_kg, name_ar, name_en, display_order) VALUES
      (wooden_type_id, 100, 100, 1000, '100×100', '100×100', 1),
      (wooden_type_id, 100, 120, 1200, '100×120', '100×120', 2),
      (wooden_type_id, 120, 80, 1000, '120×80', '120×80', 3),
      (wooden_type_id, 120, 120, 1500, '120×120', '120×120', 4),
      (wooden_type_id, 100, 80, 800, '100×80', '100×80', 5),
      (wooden_type_id, 80, 120, 1000, 'يورو 80×120', 'Euro 80×120', 6)
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- إضافة مقاسات للطبليات البلاستيكية
  IF plastic_type_id IS NOT NULL THEN
    INSERT INTO inventory_pallet_sizes (pallet_type_id, length, width, max_weight_kg, name_ar, name_en, display_order) VALUES
      (plastic_type_id, 100, 100, 1200, '100×100', '100×100', 1),
      (plastic_type_id, 100, 120, 1400, '100×120', '100×120', 2),
      (plastic_type_id, 120, 80, 1200, '120×80', '120×80', 3),
      (plastic_type_id, 120, 120, 1800, '120×120', '120×120', 4)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- =====================================================
-- تفعيل Realtime على الجداول الجديدة
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE inventory_pallet_types;
ALTER PUBLICATION supabase_realtime ADD TABLE inventory_pallet_sizes;
ALTER PUBLICATION supabase_realtime ADD TABLE inventory_quality_grades;
ALTER PUBLICATION supabase_realtime ADD TABLE inventory_pallet_conditions;
ALTER PUBLICATION supabase_realtime ADD TABLE inventory_usage_types;
ALTER PUBLICATION supabase_realtime ADD TABLE inventory_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE inventory_operations_log;

-- =====================================================
-- Triggers لتحديث updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  -- التحقق من وجود Trigger قبل إنشائه
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_inventory_pallet_types_updated_at'
  ) THEN
    CREATE TRIGGER update_inventory_pallet_types_updated_at
      BEFORE UPDATE ON inventory_pallet_types
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_inventory_pallet_sizes_updated_at'
  ) THEN
    CREATE TRIGGER update_inventory_pallet_sizes_updated_at
      BEFORE UPDATE ON inventory_pallet_sizes
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_inventory_quality_grades_updated_at'
  ) THEN
    CREATE TRIGGER update_inventory_quality_grades_updated_at
      BEFORE UPDATE ON inventory_quality_grades
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_inventory_pallet_conditions_updated_at'
  ) THEN
    CREATE TRIGGER update_inventory_pallet_conditions_updated_at
      BEFORE UPDATE ON inventory_pallet_conditions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_inventory_usage_types_updated_at'
  ) THEN
    CREATE TRIGGER update_inventory_usage_types_updated_at
      BEFORE UPDATE ON inventory_usage_types
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_inventory_settings_updated_at'
  ) THEN
    CREATE TRIGGER update_inventory_settings_updated_at
      BEFORE UPDATE ON inventory_settings
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

/*
  # إضافة سياسات RLS لجداول إعدادات الطلبات

  ## الجداول
  - order_type_settings
  - flexibility_options_settings
  - order_quantity_settings
  - order_summary_settings

  ## السياسات
  - السماح بالعمليات الكاملة (CRUD) من أي مستخدم
  - هذا آمن لأن الواجهة محمية بلوحة الأدمن
*/

-- =========================================
-- order_type_settings
-- =========================================

-- التأكد من تفعيل RLS
ALTER TABLE order_type_settings ENABLE ROW LEVEL SECURITY;

-- حذف أي سياسات قديمة إن وجدت
DROP POLICY IF EXISTS "Admin can manage order types" ON order_type_settings;
DROP POLICY IF EXISTS "Public can view active order types" ON order_type_settings;

-- إنشاء سياسات جديدة
CREATE POLICY "Allow read order_type_settings"
  ON order_type_settings
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow insert order_type_settings"
  ON order_type_settings
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow update order_type_settings"
  ON order_type_settings
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete order_type_settings"
  ON order_type_settings
  FOR DELETE
  TO public
  USING (true);

-- =========================================
-- flexibility_options_settings
-- =========================================

-- التأكد من تفعيل RLS
ALTER TABLE flexibility_options_settings ENABLE ROW LEVEL SECURITY;

-- حذف أي سياسات قديمة إن وجدت
DROP POLICY IF EXISTS "Admin can manage flexibility options" ON flexibility_options_settings;
DROP POLICY IF EXISTS "Public can view active flexibility options" ON flexibility_options_settings;

-- إنشاء سياسات جديدة
CREATE POLICY "Allow read flexibility_options_settings"
  ON flexibility_options_settings
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow insert flexibility_options_settings"
  ON flexibility_options_settings
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow update flexibility_options_settings"
  ON flexibility_options_settings
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete flexibility_options_settings"
  ON flexibility_options_settings
  FOR DELETE
  TO public
  USING (true);

-- =========================================
-- order_quantity_settings
-- =========================================

-- التأكد من تفعيل RLS
ALTER TABLE order_quantity_settings ENABLE ROW LEVEL SECURITY;

-- حذف أي سياسات قديمة إن وجدت
DROP POLICY IF EXISTS "Admin can manage quantity settings" ON order_quantity_settings;
DROP POLICY IF EXISTS "Public can view quantity settings" ON order_quantity_settings;

-- إنشاء سياسات جديدة
CREATE POLICY "Allow read order_quantity_settings"
  ON order_quantity_settings
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow insert order_quantity_settings"
  ON order_quantity_settings
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow update order_quantity_settings"
  ON order_quantity_settings
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete order_quantity_settings"
  ON order_quantity_settings
  FOR DELETE
  TO public
  USING (true);

-- =========================================
-- order_summary_settings
-- =========================================

-- التأكد من تفعيل RLS
ALTER TABLE order_summary_settings ENABLE ROW LEVEL SECURITY;

-- حذف أي سياسات قديمة إن وجدت
DROP POLICY IF EXISTS "Admin can manage summary settings" ON order_summary_settings;
DROP POLICY IF EXISTS "Public can view summary settings" ON order_summary_settings;

-- إنشاء سياسات جديدة
CREATE POLICY "Allow read order_summary_settings"
  ON order_summary_settings
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow insert order_summary_settings"
  ON order_summary_settings
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow update order_summary_settings"
  ON order_summary_settings
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete order_summary_settings"
  ON order_summary_settings
  FOR DELETE
  TO public
  USING (true);

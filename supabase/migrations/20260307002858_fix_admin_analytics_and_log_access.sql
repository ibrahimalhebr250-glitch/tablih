/*
  # إصلاح الوصول لبيانات التحليلات وسجل العمليات

  1. التغييرات
    - إضافة سياسة قراءة مؤقتة لجدول order_analytics تسمح بالقراءة للجميع
    - إضافة سياسة قراءة مؤقتة لجدول order_operations_log تسمح بالقراءة للجميع
    - هذا حل مؤقت حتى يتم دمج نظام الإدارة مع Supabase Auth

  2. ملاحظات
    - هذه السياسات مؤقتة وينبغي استبدالها بنظام مصادقة كامل
    - البيانات حساسة وينبغي حمايتها في الإنتاج
*/

-- إضافة سياسة قراءة مؤقتة لجدول order_analytics
DROP POLICY IF EXISTS "Allow read access for analytics" ON order_analytics;
CREATE POLICY "Allow read access for analytics"
  ON order_analytics
  FOR SELECT
  TO public
  USING (true);

-- إضافة سياسة قراءة مؤقتة لجدول order_operations_log
DROP POLICY IF EXISTS "Allow read access for operations log" ON order_operations_log;
CREATE POLICY "Allow read access for operations log"
  ON order_operations_log
  FOR SELECT
  TO public
  USING (true);

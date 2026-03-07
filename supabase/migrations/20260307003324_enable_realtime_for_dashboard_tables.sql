/*
  # تفعيل Realtime للجداول المهمة في لوحة التحكم

  1. التغييرات
    - تفعيل Realtime على جدول audit_log (سجل النشاطات الإدارية)
    - تفعيل Realtime على جدول ledger_entries (السجلات المالية)
    - تفعيل Realtime على جدول supplier_liabilities (التزامات الموردين)

  2. الأهمية
    - يتيح هذا التحديثات اللحظية الفورية في لوحة التحكم
    - يحدث العرض فوراً عند أي تغيير في البيانات
    - يحسن تجربة المستخدم ودقة البيانات المعروضة
*/

-- تفعيل Realtime على جدول audit_log
ALTER PUBLICATION supabase_realtime ADD TABLE audit_log;

-- تفعيل Realtime على جدول ledger_entries
ALTER PUBLICATION supabase_realtime ADD TABLE ledger_entries;

-- تفعيل Realtime على جدول supplier_liabilities
ALTER PUBLICATION supabase_realtime ADD TABLE supplier_liabilities;

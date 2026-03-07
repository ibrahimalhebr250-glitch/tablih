/*
  # إضافة حالة partially_matched إلى جدول orders

  1. التغييرات
    - إضافة حالة 'partially_matched' إلى قائمة الحالات المسموحة
    - هذه الحالة تظهر عندما يتم مطابقة جزء من الطلب فقط

  2. الهدف
    - دعم المطابقة الجزئية للطلبات الكبيرة
*/

-- تحديث قيد الحالة ليشمل partially_matched
ALTER TABLE orders
DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders
ADD CONSTRAINT orders_status_check 
CHECK (status = ANY (ARRAY['pending'::text, 'matched'::text, 'unmatched'::text, 'partially_matched'::text, 'executed'::text, 'fulfilled'::text]));

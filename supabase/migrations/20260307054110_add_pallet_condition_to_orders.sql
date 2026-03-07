/*
  # إضافة حقل حالة الطبلية للطلبات

  1. التغييرات
    - إضافة عمود pallet_condition إلى جدول orders
    - القيم الممكنة: new, used, repairable
    - القيمة الافتراضية: new

  2. الهدف
    - تمكين المشترين من تحديد حالة الطبلية المطلوبة
    - تحسين دقة المطابقة بين الطلبات والمخزون

  3. الأمان
    - لا توجد تغييرات في RLS
*/

-- إضافة عمود حالة الطبلية إلى جدول orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'pallet_condition'
  ) THEN
    ALTER TABLE orders ADD COLUMN pallet_condition text DEFAULT 'new';
  END IF;
END $$;

-- تحديث الطلبات الموجودة لتكون 'new' افتراضياً
UPDATE orders
SET pallet_condition = 'new'
WHERE pallet_condition IS NULL;

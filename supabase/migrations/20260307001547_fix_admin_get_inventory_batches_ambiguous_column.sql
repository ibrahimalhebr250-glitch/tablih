/*
  # إصلاح خطأ العمود الغامض في دالة admin_get_inventory_batches

  1. المشكلة
    - العمود batch_id في الاستعلام الفرعي غامض
    - يسبب خطأ عند تنفيذ الدالة
    - يمنع عرض المخزون في لوحة التحكم الإدارية

  2. الحل
    - توضيح اسم الجدول في الاستعلام الفرعي (inventory_images.batch_id)
    - استبدال batch_id = ib.id بـ inventory_images.batch_id = ib.batch_id

  3. التأثير
    - إصلاح عرض المخزون في لوحة الإدارة
    - تمكين الإدارة من متابعة المخزون بشكل صحيح
*/

-- حذف الدالة القديمة وإعادة إنشائها بشكل صحيح
DROP FUNCTION IF EXISTS admin_get_inventory_batches(text, text, text, text, text);

CREATE OR REPLACE FUNCTION admin_get_inventory_batches(
  p_admin_email text,
  p_status text DEFAULT NULL,
  p_approval_status text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_supplier_phone text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  batch_id text,
  phone text,
  supplier_id uuid,
  pallet_type text,
  size text,
  quality text,
  quantity integer,
  available_quantity integer,
  price_per_pallet numeric,
  pallet_condition text,
  city text,
  description text,
  status text,
  approval_status text,
  image_url text,
  images_count bigint,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- التحقق من صلاحيات الإدارة
  IF NOT EXISTS (
    SELECT 1 FROM admin_staff
    WHERE email = p_admin_email
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin not found or inactive';
  END IF;

  RETURN QUERY
  SELECT 
    ib.id,
    ib.batch_id,
    ib.phone,
    ib.supplier_id,
    ib.pallet_type,
    ib.size,
    ib.quality,
    ib.quantity,
    ib.available_quantity,
    ib.price_per_pallet,
    ib.pallet_condition,
    ib.city,
    ib.description,
    ib.status,
    ib.approval_status,
    ib.image_url,
    (SELECT COUNT(*) FROM inventory_images ii WHERE ii.batch_id = ib.batch_id) as images_count,
    ib.created_at,
    ib.updated_at
  FROM inventory_batches ib
  WHERE 
    (p_status IS NULL OR ib.status = p_status) AND
    (p_approval_status IS NULL OR ib.approval_status = p_approval_status) AND
    (p_city IS NULL OR ib.city = p_city) AND
    (p_supplier_phone IS NULL OR ib.phone = p_supplier_phone)
  ORDER BY ib.created_at DESC;
END;
$$;
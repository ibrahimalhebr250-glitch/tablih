/*
  # دوال إدارة المخزون للوحة التحكم
  
  ## الدوال المنشأة
  
  ### 1. admin_get_inventory_batches
  جلب جميع المخزونات مع الفلترة
  
  ### 2. admin_get_draft_inventory
  جلب المخزونات غير المكتملة (Drafts)
  
  ### 3. admin_update_inventory_batch
  تحديث معلومات مخزون معين
  
  ### 4. admin_delete_inventory_batch
  حذف مخزون مع تسجيل السبب
  
  ### 5. admin_pause_inventory_batch
  إيقاف عرض مخزون مع تسجيل السبب
  
  ### 6. admin_activate_inventory_batch
  تفعيل مخزون موقوف
  
  ### 7. admin_approve_inventory_batch
  الموافقة على مخزون معلق
  
  ### 8. admin_reject_inventory_batch
  رفض مخزون معلق
  
  ### 9. log_inventory_operation
  تسجيل عملية في السجل
*/

-- =====================================================
-- 1. جلب جميع المخزونات مع الفلترة
-- =====================================================
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
  quantity int,
  available_quantity int,
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
) AS $$
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
    (SELECT COUNT(*) FROM inventory_images WHERE batch_id = ib.id) as images_count,
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. جلب المخزونات غير المكتملة (Drafts)
-- =====================================================
CREATE OR REPLACE FUNCTION admin_get_draft_inventory(
  p_admin_email text
)
RETURNS TABLE (
  id uuid,
  batch_id text,
  phone text,
  pallet_type text,
  size text,
  quality text,
  quantity int,
  city text,
  description text,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
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
    ib.pallet_type,
    ib.size,
    ib.quality,
    ib.quantity,
    ib.city,
    ib.description,
    ib.created_at,
    ib.updated_at
  FROM inventory_batches ib
  WHERE ib.status = 'draft'
  ORDER BY ib.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. تحديث معلومات مخزون معين
-- =====================================================
CREATE OR REPLACE FUNCTION admin_update_inventory_batch(
  p_admin_email text,
  p_batch_id uuid,
  p_pallet_type text DEFAULT NULL,
  p_size text DEFAULT NULL,
  p_quality text DEFAULT NULL,
  p_quantity int DEFAULT NULL,
  p_price_per_pallet numeric DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_pallet_condition text DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_old_values jsonb;
  v_new_values jsonb;
  v_updated_batch jsonb;
BEGIN
  -- التحقق من صلاحيات الإدارة
  IF NOT EXISTS (
    SELECT 1 FROM admin_staff
    WHERE email = p_admin_email
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin not found or inactive';
  END IF;

  -- حفظ القيم القديمة
  SELECT to_jsonb(ib) INTO v_old_values
  FROM inventory_batches ib
  WHERE ib.id = p_batch_id;

  IF v_old_values IS NULL THEN
    RAISE EXCEPTION 'Inventory batch not found';
  END IF;

  -- تحديث المخزون
  UPDATE inventory_batches
  SET
    pallet_type = COALESCE(p_pallet_type, pallet_type),
    size = COALESCE(p_size, size),
    quality = COALESCE(p_quality, quality),
    quantity = COALESCE(p_quantity, quantity),
    available_quantity = CASE 
      WHEN p_quantity IS NOT NULL THEN p_quantity - (quantity - available_quantity)
      ELSE available_quantity
    END,
    price_per_pallet = COALESCE(p_price_per_pallet, price_per_pallet),
    city = COALESCE(p_city, city),
    description = COALESCE(p_description, description),
    pallet_condition = COALESCE(p_pallet_condition, pallet_condition),
    updated_at = now()
  WHERE id = p_batch_id
  RETURNING to_jsonb(inventory_batches.*) INTO v_new_values;

  -- تسجيل العملية
  INSERT INTO inventory_operations_log (
    batch_id,
    operation_type,
    performed_by,
    performed_by_type,
    old_values,
    new_values,
    reason
  ) VALUES (
    p_batch_id,
    'update',
    p_admin_email,
    'admin',
    v_old_values,
    v_new_values,
    p_reason
  );

  RETURN json_build_object(
    'success', true,
    'batch', v_new_values
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. حذف مخزون مع تسجيل السبب
-- =====================================================
CREATE OR REPLACE FUNCTION admin_delete_inventory_batch(
  p_admin_email text,
  p_batch_id uuid,
  p_reason text
)
RETURNS json AS $$
DECLARE
  v_old_values jsonb;
  v_supplier_phone text;
BEGIN
  -- التحقق من صلاحيات الإدارة
  IF NOT EXISTS (
    SELECT 1 FROM admin_staff
    WHERE email = p_admin_email
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin not found or inactive';
  END IF;

  -- حفظ القيم القديمة
  SELECT to_jsonb(ib), ib.phone INTO v_old_values, v_supplier_phone
  FROM inventory_batches ib
  WHERE ib.id = p_batch_id;

  IF v_old_values IS NULL THEN
    RAISE EXCEPTION 'Inventory batch not found';
  END IF;

  -- تسجيل العملية قبل الحذف
  INSERT INTO inventory_operations_log (
    batch_id,
    operation_type,
    performed_by,
    performed_by_type,
    old_values,
    reason
  ) VALUES (
    p_batch_id,
    'delete',
    p_admin_email,
    'admin',
    v_old_values,
    p_reason
  );

  -- حذف المخزون
  DELETE FROM inventory_batches WHERE id = p_batch_id;

  RETURN json_build_object(
    'success', true,
    'supplier_phone', v_supplier_phone,
    'message', 'Inventory batch deleted successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. إيقاف عرض مخزون
-- =====================================================
CREATE OR REPLACE FUNCTION admin_pause_inventory_batch(
  p_admin_email text,
  p_batch_id uuid,
  p_reason text
)
RETURNS json AS $$
DECLARE
  v_old_values jsonb;
  v_new_values jsonb;
  v_supplier_phone text;
BEGIN
  -- التحقق من صلاحيات الإدارة
  IF NOT EXISTS (
    SELECT 1 FROM admin_staff
    WHERE email = p_admin_email
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin not found or inactive';
  END IF;

  -- حفظ القيم القديمة
  SELECT to_jsonb(ib), ib.phone INTO v_old_values, v_supplier_phone
  FROM inventory_batches ib
  WHERE ib.id = p_batch_id;

  IF v_old_values IS NULL THEN
    RAISE EXCEPTION 'Inventory batch not found';
  END IF;

  -- إيقاف المخزون
  UPDATE inventory_batches
  SET
    status = 'paused',
    updated_at = now(),
    admin_notes = COALESCE(admin_notes || ' | ', '') || 'تم الإيقاف: ' || p_reason
  WHERE id = p_batch_id
  RETURNING to_jsonb(inventory_batches.*) INTO v_new_values;

  -- تسجيل العملية
  INSERT INTO inventory_operations_log (
    batch_id,
    operation_type,
    performed_by,
    performed_by_type,
    old_values,
    new_values,
    reason
  ) VALUES (
    p_batch_id,
    'pause',
    p_admin_email,
    'admin',
    v_old_values,
    v_new_values,
    p_reason
  );

  RETURN json_build_object(
    'success', true,
    'supplier_phone', v_supplier_phone,
    'batch', v_new_values
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. تفعيل مخزون موقوف
-- =====================================================
CREATE OR REPLACE FUNCTION admin_activate_inventory_batch(
  p_admin_email text,
  p_batch_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_old_values jsonb;
  v_new_values jsonb;
BEGIN
  -- التحقق من صلاحيات الإدارة
  IF NOT EXISTS (
    SELECT 1 FROM admin_staff
    WHERE email = p_admin_email
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin not found or inactive';
  END IF;

  -- حفظ القيم القديمة
  SELECT to_jsonb(ib) INTO v_old_values
  FROM inventory_batches ib
  WHERE ib.id = p_batch_id;

  IF v_old_values IS NULL THEN
    RAISE EXCEPTION 'Inventory batch not found';
  END IF;

  -- تفعيل المخزون
  UPDATE inventory_batches
  SET
    status = 'active',
    updated_at = now(),
    admin_notes = CASE 
      WHEN p_notes IS NOT NULL THEN COALESCE(admin_notes || ' | ', '') || 'تم التفعيل: ' || p_notes
      ELSE admin_notes
    END
  WHERE id = p_batch_id
  RETURNING to_jsonb(inventory_batches.*) INTO v_new_values;

  -- تسجيل العملية
  INSERT INTO inventory_operations_log (
    batch_id,
    operation_type,
    performed_by,
    performed_by_type,
    old_values,
    new_values,
    notes
  ) VALUES (
    p_batch_id,
    'activate',
    p_admin_email,
    'admin',
    v_old_values,
    v_new_values,
    p_notes
  );

  RETURN json_build_object(
    'success', true,
    'batch', v_new_values
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. الموافقة على مخزون معلق
-- =====================================================
CREATE OR REPLACE FUNCTION admin_approve_inventory_batch(
  p_admin_email text,
  p_batch_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_old_values jsonb;
  v_new_values jsonb;
BEGIN
  -- التحقق من صلاحيات الإدارة
  IF NOT EXISTS (
    SELECT 1 FROM admin_staff
    WHERE email = p_admin_email
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin not found or inactive';
  END IF;

  -- حفظ القيم القديمة
  SELECT to_jsonb(ib) INTO v_old_values
  FROM inventory_batches ib
  WHERE ib.id = p_batch_id;

  IF v_old_values IS NULL THEN
    RAISE EXCEPTION 'Inventory batch not found';
  END IF;

  -- الموافقة على المخزون
  UPDATE inventory_batches
  SET
    approval_status = 'approved',
    status = 'active',
    updated_at = now(),
    admin_notes = CASE 
      WHEN p_notes IS NOT NULL THEN COALESCE(admin_notes || ' | ', '') || 'تمت الموافقة: ' || p_notes
      ELSE admin_notes
    END
  WHERE id = p_batch_id
  RETURNING to_jsonb(inventory_batches.*) INTO v_new_values;

  -- تسجيل العملية
  INSERT INTO inventory_operations_log (
    batch_id,
    operation_type,
    performed_by,
    performed_by_type,
    old_values,
    new_values,
    notes
  ) VALUES (
    p_batch_id,
    'approve',
    p_admin_email,
    'admin',
    v_old_values,
    v_new_values,
    p_notes
  );

  RETURN json_build_object(
    'success', true,
    'batch', v_new_values
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. رفض مخزون معلق
-- =====================================================
CREATE OR REPLACE FUNCTION admin_reject_inventory_batch(
  p_admin_email text,
  p_batch_id uuid,
  p_reason text
)
RETURNS json AS $$
DECLARE
  v_old_values jsonb;
  v_new_values jsonb;
  v_supplier_phone text;
BEGIN
  -- التحقق من صلاحيات الإدارة
  IF NOT EXISTS (
    SELECT 1 FROM admin_staff
    WHERE email = p_admin_email
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin not found or inactive';
  END IF;

  -- حفظ القيم القديمة
  SELECT to_jsonb(ib), ib.phone INTO v_old_values, v_supplier_phone
  FROM inventory_batches ib
  WHERE ib.id = p_batch_id;

  IF v_old_values IS NULL THEN
    RAISE EXCEPTION 'Inventory batch not found';
  END IF;

  -- رفض المخزون
  UPDATE inventory_batches
  SET
    approval_status = 'rejected',
    status = 'paused',
    updated_at = now(),
    admin_notes = COALESCE(admin_notes || ' | ', '') || 'تم الرفض: ' || p_reason
  WHERE id = p_batch_id
  RETURNING to_jsonb(inventory_batches.*) INTO v_new_values;

  -- تسجيل العملية
  INSERT INTO inventory_operations_log (
    batch_id,
    operation_type,
    performed_by,
    performed_by_type,
    old_values,
    new_values,
    reason
  ) VALUES (
    p_batch_id,
    'reject',
    p_admin_email,
    'admin',
    v_old_values,
    v_new_values,
    p_reason
  );

  RETURN json_build_object(
    'success', true,
    'supplier_phone', v_supplier_phone,
    'batch', v_new_values
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/*
  # دوال إدارة الإعدادات وأنواع الطبليات
  
  ## الدوال المنشأة
  
  ### 1. admin_update_inventory_settings
  تحديث إعدادات المخزون العامة
  
  ### 2. admin_manage_pallet_type
  إضافة/تحديث نوع طبلية
  
  ### 3. admin_manage_pallet_size
  إضافة/تحديث مقاس طبلية
  
  ### 4. admin_manage_quality_grade
  إضافة/تحديث درجة جودة
  
  ### 5. admin_manage_pallet_condition
  إضافة/تحديث حالة طبلية
  
  ### 6. admin_manage_usage_type
  إضافة/تحديث نوع استخدام
  
  ### 7. admin_toggle_item_status
  تفعيل/إيقاف أي عنصر
  
  ### 8. admin_delete_item
  حذف أي عنصر
*/

-- =====================================================
-- 1. تحديث إعدادات المخزون العامة
-- =====================================================
CREATE OR REPLACE FUNCTION admin_update_inventory_settings(
  p_admin_email text,
  p_settings jsonb
)
RETURNS json AS $$
DECLARE
  v_updated_settings jsonb;
BEGIN
  -- التحقق من صلاحيات الإدارة
  IF NOT EXISTS (
    SELECT 1 FROM admin_staff
    WHERE email = p_admin_email
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin not found or inactive';
  END IF;

  -- تحديث الإعدادات
  UPDATE inventory_settings
  SET
    min_quantity = COALESCE((p_settings->>'min_quantity')::int, min_quantity),
    max_quantity = COALESCE((p_settings->>'max_quantity')::int, max_quantity),
    quantity_step = COALESCE((p_settings->>'quantity_step')::int, quantity_step),
    min_price = COALESCE((p_settings->>'min_price')::numeric, min_price),
    max_price = COALESCE((p_settings->>'max_price')::numeric, max_price),
    price_step = COALESCE((p_settings->>'price_step')::numeric, price_step),
    allow_negotiation = COALESCE((p_settings->>'allow_negotiation')::boolean, allow_negotiation),
    max_images = COALESCE((p_settings->>'max_images')::int, max_images),
    max_image_size_mb = COALESCE((p_settings->>'max_image_size_mb')::int, max_image_size_mb),
    max_description_length = COALESCE((p_settings->>'max_description_length')::int, max_description_length),
    description_required = COALESCE((p_settings->>'description_required')::boolean, description_required),
    require_approval = COALESCE((p_settings->>'require_approval')::boolean, require_approval),
    auto_match_enabled = COALESCE((p_settings->>'auto_match_enabled')::boolean, auto_match_enabled),
    updated_at = now()
  WHERE id = '00000000-0000-0000-0000-000000000001'
  RETURNING to_jsonb(inventory_settings.*) INTO v_updated_settings;

  RETURN json_build_object(
    'success', true,
    'settings', v_updated_settings
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. إدارة أنواع الطبليات
-- =====================================================
CREATE OR REPLACE FUNCTION admin_manage_pallet_type(
  p_admin_email text,
  p_id uuid DEFAULT NULL,
  p_name_ar text DEFAULT NULL,
  p_name_en text DEFAULT NULL,
  p_icon text DEFAULT NULL,
  p_is_active boolean DEFAULT NULL,
  p_display_order int DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- التحقق من صلاحيات الإدارة
  IF NOT EXISTS (
    SELECT 1 FROM admin_staff
    WHERE email = p_admin_email
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin not found or inactive';
  END IF;

  IF p_id IS NULL THEN
    -- إضافة نوع جديد
    INSERT INTO inventory_pallet_types (name_ar, name_en, icon, is_active, display_order)
    VALUES (p_name_ar, p_name_en, COALESCE(p_icon, 'package'), COALESCE(p_is_active, true), COALESCE(p_display_order, 0))
    RETURNING to_jsonb(inventory_pallet_types.*) INTO v_result;
  ELSE
    -- تحديث نوع موجود
    UPDATE inventory_pallet_types
    SET
      name_ar = COALESCE(p_name_ar, name_ar),
      name_en = COALESCE(p_name_en, name_en),
      icon = COALESCE(p_icon, icon),
      is_active = COALESCE(p_is_active, is_active),
      display_order = COALESCE(p_display_order, display_order),
      updated_at = now()
    WHERE id = p_id
    RETURNING to_jsonb(inventory_pallet_types.*) INTO v_result;
  END IF;

  RETURN json_build_object(
    'success', true,
    'pallet_type', v_result
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. إدارة مقاسات الطبليات
-- =====================================================
CREATE OR REPLACE FUNCTION admin_manage_pallet_size(
  p_admin_email text,
  p_id uuid DEFAULT NULL,
  p_pallet_type_id uuid DEFAULT NULL,
  p_length int DEFAULT NULL,
  p_width int DEFAULT NULL,
  p_max_weight_kg int DEFAULT NULL,
  p_name_ar text DEFAULT NULL,
  p_name_en text DEFAULT NULL,
  p_is_active boolean DEFAULT NULL,
  p_display_order int DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- التحقق من صلاحيات الإدارة
  IF NOT EXISTS (
    SELECT 1 FROM admin_staff
    WHERE email = p_admin_email
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin not found or inactive';
  END IF;

  IF p_id IS NULL THEN
    -- إضافة مقاس جديد
    IF p_pallet_type_id IS NULL OR p_length IS NULL OR p_width IS NULL THEN
      RAISE EXCEPTION 'pallet_type_id, length, and width are required for new size';
    END IF;
    
    INSERT INTO inventory_pallet_sizes (
      pallet_type_id, length, width, max_weight_kg, name_ar, name_en, is_active, display_order
    )
    VALUES (
      p_pallet_type_id, p_length, p_width, 
      COALESCE(p_max_weight_kg, 1000),
      COALESCE(p_name_ar, p_length || '×' || p_width),
      COALESCE(p_name_en, p_length || '×' || p_width),
      COALESCE(p_is_active, true),
      COALESCE(p_display_order, 0)
    )
    RETURNING to_jsonb(inventory_pallet_sizes.*) INTO v_result;
  ELSE
    -- تحديث مقاس موجود
    UPDATE inventory_pallet_sizes
    SET
      pallet_type_id = COALESCE(p_pallet_type_id, pallet_type_id),
      length = COALESCE(p_length, length),
      width = COALESCE(p_width, width),
      max_weight_kg = COALESCE(p_max_weight_kg, max_weight_kg),
      name_ar = COALESCE(p_name_ar, name_ar),
      name_en = COALESCE(p_name_en, name_en),
      is_active = COALESCE(p_is_active, is_active),
      display_order = COALESCE(p_display_order, display_order),
      updated_at = now()
    WHERE id = p_id
    RETURNING to_jsonb(inventory_pallet_sizes.*) INTO v_result;
  END IF;

  RETURN json_build_object(
    'success', true,
    'pallet_size', v_result
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. إدارة درجات الجودة
-- =====================================================
CREATE OR REPLACE FUNCTION admin_manage_quality_grade(
  p_admin_email text,
  p_id uuid DEFAULT NULL,
  p_code text DEFAULT NULL,
  p_name_ar text DEFAULT NULL,
  p_name_en text DEFAULT NULL,
  p_color text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_is_active boolean DEFAULT NULL,
  p_display_order int DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- التحقق من صلاحيات الإدارة
  IF NOT EXISTS (
    SELECT 1 FROM admin_staff
    WHERE email = p_admin_email
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin not found or inactive';
  END IF;

  IF p_id IS NULL THEN
    -- إضافة درجة جديدة
    IF p_code IS NULL OR p_name_ar IS NULL OR p_name_en IS NULL THEN
      RAISE EXCEPTION 'code, name_ar, and name_en are required for new quality grade';
    END IF;
    
    INSERT INTO inventory_quality_grades (code, name_ar, name_en, color, description, is_active, display_order)
    VALUES (
      p_code, p_name_ar, p_name_en,
      COALESCE(p_color, '#3B82F6'),
      p_description,
      COALESCE(p_is_active, true),
      COALESCE(p_display_order, 0)
    )
    RETURNING to_jsonb(inventory_quality_grades.*) INTO v_result;
  ELSE
    -- تحديث درجة موجودة
    UPDATE inventory_quality_grades
    SET
      code = COALESCE(p_code, code),
      name_ar = COALESCE(p_name_ar, name_ar),
      name_en = COALESCE(p_name_en, name_en),
      color = COALESCE(p_color, color),
      description = COALESCE(p_description, description),
      is_active = COALESCE(p_is_active, is_active),
      display_order = COALESCE(p_display_order, display_order),
      updated_at = now()
    WHERE id = p_id
    RETURNING to_jsonb(inventory_quality_grades.*) INTO v_result;
  END IF;

  RETURN json_build_object(
    'success', true,
    'quality_grade', v_result
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. إدارة حالات الطبلية
-- =====================================================
CREATE OR REPLACE FUNCTION admin_manage_pallet_condition(
  p_admin_email text,
  p_id uuid DEFAULT NULL,
  p_code text DEFAULT NULL,
  p_name_ar text DEFAULT NULL,
  p_name_en text DEFAULT NULL,
  p_icon text DEFAULT NULL,
  p_is_active boolean DEFAULT NULL,
  p_display_order int DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- التحقق من صلاحيات الإدارة
  IF NOT EXISTS (
    SELECT 1 FROM admin_staff
    WHERE email = p_admin_email
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin not found or inactive';
  END IF;

  IF p_id IS NULL THEN
    -- إضافة حالة جديدة
    IF p_code IS NULL OR p_name_ar IS NULL OR p_name_en IS NULL THEN
      RAISE EXCEPTION 'code, name_ar, and name_en are required for new condition';
    END IF;
    
    INSERT INTO inventory_pallet_conditions (code, name_ar, name_en, icon, is_active, display_order)
    VALUES (
      p_code, p_name_ar, p_name_en,
      COALESCE(p_icon, 'package'),
      COALESCE(p_is_active, true),
      COALESCE(p_display_order, 0)
    )
    RETURNING to_jsonb(inventory_pallet_conditions.*) INTO v_result;
  ELSE
    -- تحديث حالة موجودة
    UPDATE inventory_pallet_conditions
    SET
      code = COALESCE(p_code, code),
      name_ar = COALESCE(p_name_ar, name_ar),
      name_en = COALESCE(p_name_en, name_en),
      icon = COALESCE(p_icon, icon),
      is_active = COALESCE(p_is_active, is_active),
      display_order = COALESCE(p_display_order, display_order),
      updated_at = now()
    WHERE id = p_id
    RETURNING to_jsonb(inventory_pallet_conditions.*) INTO v_result;
  END IF;

  RETURN json_build_object(
    'success', true,
    'pallet_condition', v_result
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. إدارة أنواع الاستخدام
-- =====================================================
CREATE OR REPLACE FUNCTION admin_manage_usage_type(
  p_admin_email text,
  p_id uuid DEFAULT NULL,
  p_name_ar text DEFAULT NULL,
  p_name_en text DEFAULT NULL,
  p_icon text DEFAULT NULL,
  p_is_active boolean DEFAULT NULL,
  p_display_order int DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- التحقق من صلاحيات الإدارة
  IF NOT EXISTS (
    SELECT 1 FROM admin_staff
    WHERE email = p_admin_email
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin not found or inactive';
  END IF;

  IF p_id IS NULL THEN
    -- إضافة نوع جديد
    IF p_name_ar IS NULL OR p_name_en IS NULL THEN
      RAISE EXCEPTION 'name_ar and name_en are required for new usage type';
    END IF;
    
    INSERT INTO inventory_usage_types (name_ar, name_en, icon, is_active, display_order)
    VALUES (
      p_name_ar, p_name_en,
      COALESCE(p_icon, 'box'),
      COALESCE(p_is_active, true),
      COALESCE(p_display_order, 0)
    )
    RETURNING to_jsonb(inventory_usage_types.*) INTO v_result;
  ELSE
    -- تحديث نوع موجود
    UPDATE inventory_usage_types
    SET
      name_ar = COALESCE(p_name_ar, name_ar),
      name_en = COALESCE(p_name_en, name_en),
      icon = COALESCE(p_icon, icon),
      is_active = COALESCE(p_is_active, is_active),
      display_order = COALESCE(p_display_order, display_order),
      updated_at = now()
    WHERE id = p_id
    RETURNING to_jsonb(inventory_usage_types.*) INTO v_result;
  END IF;

  RETURN json_build_object(
    'success', true,
    'usage_type', v_result
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. تفعيل/إيقاف أي عنصر
-- =====================================================
CREATE OR REPLACE FUNCTION admin_toggle_item_status(
  p_admin_email text,
  p_table_name text,
  p_item_id uuid,
  p_is_active boolean
)
RETURNS json AS $$
DECLARE
  v_query text;
  v_result jsonb;
BEGIN
  -- التحقق من صلاحيات الإدارة
  IF NOT EXISTS (
    SELECT 1 FROM admin_staff
    WHERE email = p_admin_email
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin not found or inactive';
  END IF;

  -- التحقق من اسم الجدول المسموح به
  IF p_table_name NOT IN (
    'inventory_pallet_types',
    'inventory_pallet_sizes',
    'inventory_quality_grades',
    'inventory_pallet_conditions',
    'inventory_usage_types'
  ) THEN
    RAISE EXCEPTION 'Invalid table name';
  END IF;

  -- تحديث الحالة
  v_query := format(
    'UPDATE %I SET is_active = $1, updated_at = now() WHERE id = $2 RETURNING to_jsonb(%I.*)',
    p_table_name, p_table_name
  );
  
  EXECUTE v_query USING p_is_active, p_item_id INTO v_result;

  RETURN json_build_object(
    'success', true,
    'item', v_result
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. حذف أي عنصر
-- =====================================================
CREATE OR REPLACE FUNCTION admin_delete_item(
  p_admin_email text,
  p_table_name text,
  p_item_id uuid
)
RETURNS json AS $$
DECLARE
  v_query text;
BEGIN
  -- التحقق من صلاحيات الإدارة
  IF NOT EXISTS (
    SELECT 1 FROM admin_staff
    WHERE email = p_admin_email
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin not found or inactive';
  END IF;

  -- التحقق من اسم الجدول المسموح به
  IF p_table_name NOT IN (
    'inventory_pallet_types',
    'inventory_pallet_sizes',
    'inventory_quality_grades',
    'inventory_pallet_conditions',
    'inventory_usage_types'
  ) THEN
    RAISE EXCEPTION 'Invalid table name';
  END IF;

  -- حذف العنصر
  v_query := format('DELETE FROM %I WHERE id = $1', p_table_name);
  EXECUTE v_query USING p_item_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Item deleted successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

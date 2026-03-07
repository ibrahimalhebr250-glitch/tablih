/*
  # إصلاح trigger نقل المخزون للمشتري - الإصدار 2

  1. المشكلة
    - العمود الصحيح هو image_url (نص) وليس image_urls (jsonb)
    - يجب تحويل image_url إلى jsonb array

  2. الحل
    - استخدام image_url وتحويله لـ jsonb array
    - استخدام pallet_condition

  3. الأمان
    - SECURITY DEFINER
*/

CREATE OR REPLACE FUNCTION transfer_inventory_to_buyer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_supplier_info record;
  v_batch_info record;
BEGIN
  -- Only process when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Get supplier information
    SELECT 
      pu.phone,
      COALESCE(pu.company_name, pu.display_name, 'مورد') as supplier_name
    INTO v_supplier_info
    FROM platform_users pu
    WHERE pu.phone = NEW.supplier_phone;

    -- Get original inventory batch information
    SELECT 
      CASE 
        WHEN ib.image_url IS NOT NULL AND ib.image_url != '' 
        THEN jsonb_build_array(ib.image_url)
        ELSE '[]'::jsonb
      END as images,
      ib.description,
      ib.pallet_condition as condition
    INTO v_batch_info
    FROM inventory_batches ib
    WHERE ib.id = NEW.inventory_batch_id;

    -- Transfer inventory to buyer's cloud warehouse
    INSERT INTO buyer_inventory (
      buyer_phone,
      original_deal_id,
      pallet_type,
      size,
      quality,
      condition,
      quantity,
      quantity_available,
      unit_price,
      total_paid,
      original_supplier_phone,
      original_supplier_name,
      city,
      images,
      description,
      acquired_at
    ) VALUES (
      NEW.buyer_phone,
      NEW.id,
      NEW.pallet_type,
      NEW.size,
      NEW.quality,
      v_batch_info.condition,
      NEW.quantity,
      NEW.quantity,  -- All quantity is available initially
      NEW.buyer_price,  -- Price buyer paid per unit
      NEW.buyer_price * NEW.quantity,  -- Total amount paid
      NEW.supplier_phone,
      v_supplier_info.supplier_name,
      NEW.city,
      v_batch_info.images,
      v_batch_info.description,
      now()
    )
    ON CONFLICT (original_deal_id) 
    DO UPDATE SET
      quantity = EXCLUDED.quantity,
      quantity_available = EXCLUDED.quantity_available,
      updated_at = now();

  END IF;

  RETURN NEW;
END;
$$;

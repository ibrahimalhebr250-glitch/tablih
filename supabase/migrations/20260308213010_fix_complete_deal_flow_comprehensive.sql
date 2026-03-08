/*
  # Fix Complete Deal Flow - Comprehensive

  This migration fixes the entire deal completion flow to ensure:
  1. Supplier inventory is properly deducted (quantity goes to 0, not 1)
  2. Buyer inventory is created with inventory_source = 'purchase_transfer'
  3. Duplicate triggers are removed
  4. All data is properly transferred

  ## Changes

  ### 1. buyer_inventory table
    - Add `inventory_source` column (text, default 'purchase_transfer')

  ### 2. supplier_confirm_delivery_v4
    - Fix GREATEST(quantity - deal_qty, 1) bug -> should be GREATEST(..., 0)
    - Properly zero out inventory when all sold

  ### 3. transfer_inventory_to_buyer trigger
    - Now sets inventory_source = 'purchase_transfer'
    - Properly handles all edge cases

  ### 4. Cleanup
    - Remove duplicate trigger (keep only one)
*/

-- Step 1: Add inventory_source column to buyer_inventory if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'buyer_inventory' AND column_name = 'inventory_source'
  ) THEN
    ALTER TABLE buyer_inventory ADD COLUMN inventory_source text DEFAULT 'purchase_transfer';
  END IF;
END $$;

-- Step 2: Remove duplicate trigger (keep only one)
DROP TRIGGER IF EXISTS trigger_transfer_inventory_to_buyer ON deals;

-- Step 3: Fix supplier_confirm_delivery_v4
CREATE OR REPLACE FUNCTION supplier_confirm_delivery_v4(
  p_deal_id uuid,
  p_supplier_phone text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_deal RECORD;
  v_new_quantity integer;
  v_new_reserved integer;
  v_new_available integer;
BEGIN
  SELECT * INTO v_deal FROM deals WHERE id = p_deal_id FOR UPDATE;

  IF v_deal IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'الصفقة غير موجودة');
  END IF;

  IF v_deal.supplier_phone != p_supplier_phone THEN
    RETURN jsonb_build_object('success', false, 'error', 'ليس لديك صلاحية');
  END IF;

  IF v_deal.status NOT IN ('in_delivery', 'inventory_reserved', 'execution_in_progress') THEN
    RETURN jsonb_build_object('success', false, 'error', 'حالة الصفقة لا تسمح بتأكيد التسليم');
  END IF;

  IF v_deal.inventory_batch_id IS NOT NULL THEN
    v_new_quantity := GREATEST(
      (SELECT ib.quantity FROM inventory_batches ib WHERE ib.id = v_deal.inventory_batch_id) - v_deal.quantity,
      0
    );

    v_new_reserved := GREATEST(
      (SELECT COALESCE(ib.reserved_quantity, 0) FROM inventory_batches ib WHERE ib.id = v_deal.inventory_batch_id) - v_deal.quantity,
      0
    );

    v_new_available := GREATEST(v_new_quantity - v_new_reserved, 0);

    UPDATE inventory_batches
    SET
      quantity = v_new_quantity,
      reserved_quantity = v_new_reserved,
      quantity_reserved = v_new_reserved,
      available_quantity = v_new_available,
      quantity_available = v_new_available,
      status = CASE WHEN v_new_quantity <= 0 THEN 'fulfilled' ELSE status END,
      updated_at = now()
    WHERE id = v_deal.inventory_batch_id;
  END IF;

  UPDATE deals
  SET
    status = 'completed',
    completed_at = now(),
    updated_at = now()
  WHERE id = p_deal_id;

  RETURN jsonb_build_object('success', true, 'deal_id', p_deal_id);
END;
$$;

-- Step 4: Fix transfer_inventory_to_buyer trigger function
CREATE OR REPLACE FUNCTION transfer_inventory_to_buyer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_supplier_info record;
  v_batch_info record;
  v_unit_price numeric;
  v_pallet_condition text;
  v_images jsonb;
  v_description text;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN

    v_unit_price := COALESCE(NEW.buyer_price, NEW.supplier_price, NEW.final_price, 0);

    SELECT
      COALESCE(pu.company_name, pu.display_name, 'مورد') as supplier_name
    INTO v_supplier_info
    FROM platform_users pu
    WHERE pu.phone = NEW.supplier_phone;

    v_pallet_condition := NULL;
    v_images := '[]'::jsonb;
    v_description := NULL;

    IF NEW.inventory_batch_id IS NOT NULL THEN
      SELECT
        ib.pallet_condition,
        CASE
          WHEN ib.image_url IS NOT NULL AND ib.image_url != ''
          THEN jsonb_build_array(ib.image_url)
          ELSE '[]'::jsonb
        END,
        ib.description
      INTO v_pallet_condition, v_images, v_description
      FROM inventory_batches ib
      WHERE ib.id = NEW.inventory_batch_id;
    END IF;

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
      inventory_source,
      acquired_at
    ) VALUES (
      NEW.buyer_phone,
      NEW.id,
      NEW.pallet_type,
      NEW.size,
      NEW.quality,
      v_pallet_condition,
      NEW.quantity,
      NEW.quantity,
      v_unit_price,
      v_unit_price * NEW.quantity,
      NEW.supplier_phone,
      COALESCE(v_supplier_info.supplier_name, 'مورد'),
      NEW.city,
      v_images,
      v_description,
      'purchase_transfer',
      now()
    )
    ON CONFLICT (original_deal_id)
    DO UPDATE SET
      quantity = EXCLUDED.quantity,
      quantity_available = EXCLUDED.quantity_available,
      inventory_source = 'purchase_transfer',
      updated_at = now();

  END IF;

  RETURN NEW;
END;
$$;

-- Step 5: Update existing buyer_inventory records that lack inventory_source
UPDATE buyer_inventory 
SET inventory_source = 'purchase_transfer' 
WHERE inventory_source IS NULL;

/*
  # Fix transfer_inventory_to_buyer trigger for NULL safety

  1. Problem
    - buyer_price can be NULL on some deals, causing the insert into buyer_inventory to fail
    - The trigger should gracefully handle missing pricing data by falling back to supplier_price or final_price

  2. Changes
    - Updated transfer_inventory_to_buyer function to use COALESCE for pricing fields
    - Also handles cases where inventory_batch_id might be NULL (deals from market offers)
*/

CREATE OR REPLACE FUNCTION transfer_inventory_to_buyer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_supplier_info record;
  v_batch_info record;
  v_unit_price numeric;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN

    v_unit_price := COALESCE(NEW.buyer_price, NEW.supplier_price, NEW.final_price, 0);

    SELECT
      pu.phone,
      COALESCE(pu.company_name, pu.display_name, 'مورد') as supplier_name
    INTO v_supplier_info
    FROM platform_users pu
    WHERE pu.phone = NEW.supplier_phone;

    IF NEW.inventory_batch_id IS NOT NULL THEN
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
    ELSE
      v_batch_info := ROW('[]'::jsonb, NULL::text, NULL::text);
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
      acquired_at
    ) VALUES (
      NEW.buyer_phone,
      NEW.id,
      NEW.pallet_type,
      NEW.size,
      NEW.quality,
      v_batch_info.condition,
      NEW.quantity,
      NEW.quantity,
      v_unit_price,
      v_unit_price * NEW.quantity,
      NEW.supplier_phone,
      COALESCE(v_supplier_info.supplier_name, 'مورد'),
      NEW.city,
      COALESCE(v_batch_info.images, '[]'::jsonb),
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

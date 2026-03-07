/*
  # Update Order Status When Deal Completes

  1. Changes
    - Modify `transfer_inventory_to_buyer` trigger to also update order status to 'fulfilled'
    - This ensures orders disappear from active orders list once the deal is completed
    - Orders with status 'fulfilled' indicate the buyer has received their items

  2. Logic
    - When deal status changes to 'completed'
    - Transfer inventory to buyer_inventory table
    - Update the associated order status to 'fulfilled'
    - This marks the end of the order lifecycle
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS trigger_transfer_inventory_to_buyer ON deals;
DROP FUNCTION IF EXISTS transfer_inventory_to_buyer();

-- Recreate function with order status update
CREATE OR REPLACE FUNCTION transfer_inventory_to_buyer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_supplier_info record;
  v_batch_info record;
  v_images_array jsonb;
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
      ib.image_url,
      ib.description,
      ib.pallet_condition
    INTO v_batch_info
    FROM inventory_batches ib
    WHERE ib.id = NEW.inventory_batch_id;

    -- Convert single image URL to jsonb array
    IF v_batch_info.image_url IS NOT NULL AND v_batch_info.image_url != '' THEN
      v_images_array := jsonb_build_array(v_batch_info.image_url);
    ELSE
      v_images_array := '[]'::jsonb;
    END IF;

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
      v_batch_info.pallet_condition,
      NEW.quantity,
      NEW.quantity,
      NEW.final_price,
      NEW.quantity * NEW.final_price,
      v_supplier_info.phone,
      v_supplier_info.supplier_name,
      NEW.city,
      v_images_array,
      v_batch_info.description,
      now()
    )
    ON CONFLICT (original_deal_id) DO NOTHING;

    -- Update order status to 'fulfilled' to remove it from active orders
    IF NEW.order_id IS NOT NULL THEN
      UPDATE orders
      SET 
        status = 'fulfilled',
        updated_at = now()
      WHERE id = NEW.order_id;
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER trigger_transfer_inventory_to_buyer
  AFTER UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION transfer_inventory_to_buyer();

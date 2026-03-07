/*
  # Fix Buyer Inventory to Include Platform Fees

  1. Changes
    - Update `transfer_inventory_to_buyer` function to calculate the total cost including platform fees
    - `unit_price` = buyer's actual cost per pallet (final_price + platform_fee_per_pallet)
    - `total_paid` = total amount buyer paid (total item cost + total platform fees)
    
  2. Reasoning
    - The buyer paid for both the inventory AND the platform fees
    - The total cost should reflect the actual money spent
    - This is important for accounting and future resale pricing decisions
    
  3. Security
    - No changes to RLS policies
    - Function remains SECURITY DEFINER for automatic execution
*/

-- Update the transfer function to include platform fees in calculations
CREATE OR REPLACE FUNCTION transfer_inventory_to_buyer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_supplier_info record;
  v_batch_info record;
  v_unit_price_with_fee numeric;
  v_total_paid_with_fees numeric;
BEGIN
  -- Only process when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Calculate the actual unit price paid by buyer (including platform fee)
    -- unit_price = final_price + platform_fee_per_pallet
    v_unit_price_with_fee := NEW.final_price + COALESCE(NEW.platform_fee_per_pallet, 0);
    
    -- Calculate total paid (item cost + total platform fees)
    -- total_paid = (final_price * quantity) + platform_fee
    v_total_paid_with_fees := (NEW.final_price * NEW.quantity) + COALESCE(NEW.platform_fee, 0);
    
    -- Get supplier information
    SELECT 
      pu.phone,
      COALESCE(pu.company_name, pu.display_name, 'مورد') as supplier_name
    INTO v_supplier_info
    FROM platform_users pu
    WHERE pu.phone = NEW.supplier_phone;

    -- Get original inventory batch information
    SELECT 
      ib.images,
      ib.description,
      ib.condition
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
      NEW.quantity, -- Initially all quantity is available
      v_unit_price_with_fee, -- Unit price including platform fee
      v_total_paid_with_fees, -- Total including all platform fees
      v_supplier_info.phone,
      v_supplier_info.supplier_name,
      NEW.city,
      v_batch_info.images,
      v_batch_info.description,
      now()
    )
    ON CONFLICT (original_deal_id) DO NOTHING; -- Prevent duplicates
    
  END IF;

  RETURN NEW;
END;
$$;

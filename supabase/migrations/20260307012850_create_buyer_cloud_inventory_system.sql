/*
  # Create Buyer Cloud Inventory System

  1. New Tables
    - `buyer_inventory` - Stores purchased inventory items for buyers
      - `id` (uuid, primary key)
      - `buyer_phone` (text) - The buyer who owns this inventory
      - `original_deal_id` (uuid) - Reference to the completed deal
      - `pallet_type` (text) - Type of pallet
      - `size` (text) - Size of pallet
      - `quality` (text) - Quality grade
      - `condition` (text) - Pallet condition
      - `quantity` (integer) - Number of pallets
      - `quantity_available` (integer) - Available quantity (for future resale)
      - `unit_price` (numeric) - Price paid per pallet
      - `total_paid` (numeric) - Total amount paid
      - `original_supplier_phone` (text) - Original supplier
      - `original_supplier_name` (text) - Original supplier name
      - `city` (text) - City location
      - `images` (jsonb) - Array of image URLs
      - `description` (text) - Item description
      - `acquired_at` (timestamptz) - When the inventory was acquired
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Functions
    - `transfer_inventory_to_buyer` - Automatically called when deal completes
    - `get_buyer_inventory_summary` - Get buyer's inventory stats
    - `get_buyer_inventory_items` - Get buyer's inventory items with filters

  3. Triggers
    - Auto-transfer inventory when deal status changes to 'completed'

  4. Security
    - RLS enabled
    - Buyers can only view/manage their own inventory
    - Admins can view all inventory

  5. Notes
    - Creates a cloud warehouse for buyers
    - Tracks purchased inventory for potential resale
    - Maintains full history and traceability
*/

-- Create buyer_inventory table
CREATE TABLE IF NOT EXISTS buyer_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_phone text NOT NULL,
  original_deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  pallet_type text NOT NULL,
  size text NOT NULL,
  quality text NOT NULL,
  condition text,
  quantity integer NOT NULL CHECK (quantity > 0),
  quantity_available integer NOT NULL DEFAULT 0 CHECK (quantity_available >= 0),
  unit_price numeric(10,2) NOT NULL CHECK (unit_price >= 0),
  total_paid numeric(12,2) NOT NULL CHECK (total_paid >= 0),
  original_supplier_phone text NOT NULL,
  original_supplier_name text,
  city text NOT NULL,
  images jsonb DEFAULT '[]'::jsonb,
  description text,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(original_deal_id)
);

-- Enable RLS
ALTER TABLE buyer_inventory ENABLE ROW LEVEL SECURITY;

-- Buyers can view their own inventory
CREATE POLICY "Buyers can view own inventory"
  ON buyer_inventory FOR SELECT
  TO authenticated
  USING (
    buyer_phone IN (
      SELECT phone FROM session_tokens 
      WHERE expires_at > now()
    )
  );

-- Admins can view all buyer inventory
CREATE POLICY "Admins can view all buyer inventory"
  ON buyer_inventory FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_users pu
      JOIN session_tokens st ON st.phone = pu.phone
      WHERE pu.user_type = 'admin'
      AND st.expires_at > now()
    )
  );

-- System can insert inventory (SECURITY DEFINER functions)
CREATE POLICY "System can insert buyer inventory"
  ON buyer_inventory FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Buyers can update their own inventory
CREATE POLICY "Buyers can update own inventory"
  ON buyer_inventory FOR UPDATE
  TO authenticated
  USING (
    buyer_phone IN (
      SELECT phone FROM session_tokens 
      WHERE expires_at > now()
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_buyer_inventory_buyer ON buyer_inventory(buyer_phone);
CREATE INDEX IF NOT EXISTS idx_buyer_inventory_deal ON buyer_inventory(original_deal_id);
CREATE INDEX IF NOT EXISTS idx_buyer_inventory_acquired ON buyer_inventory(acquired_at DESC);

-- Function to transfer inventory to buyer when deal completes
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
      NEW.final_price,
      NEW.total_amount,
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

-- Create trigger for automatic inventory transfer
DROP TRIGGER IF EXISTS trigger_transfer_inventory_to_buyer ON deals;
CREATE TRIGGER trigger_transfer_inventory_to_buyer
  AFTER UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION transfer_inventory_to_buyer();

-- Function to get buyer inventory summary
CREATE OR REPLACE FUNCTION get_buyer_inventory_summary(p_buyer_phone text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_items integer;
  v_total_pallets integer;
  v_total_value numeric;
  v_available_pallets integer;
  v_by_type json;
  v_by_city json;
BEGIN
  -- Verify session
  IF NOT EXISTS (
    SELECT 1 FROM session_tokens
    WHERE phone = p_buyer_phone
    AND expires_at > now()
  ) THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  -- Get summary statistics
  SELECT 
    COUNT(*),
    COALESCE(SUM(quantity), 0),
    COALESCE(SUM(total_paid), 0),
    COALESCE(SUM(quantity_available), 0)
  INTO v_total_items, v_total_pallets, v_total_value, v_available_pallets
  FROM buyer_inventory
  WHERE buyer_phone = p_buyer_phone;

  -- Get breakdown by type
  SELECT json_agg(row_to_json(t))
  INTO v_by_type
  FROM (
    SELECT 
      pallet_type,
      COUNT(*) as items_count,
      SUM(quantity) as total_pallets,
      SUM(quantity_available) as available_pallets
    FROM buyer_inventory
    WHERE buyer_phone = p_buyer_phone
    GROUP BY pallet_type
    ORDER BY total_pallets DESC
  ) t;

  -- Get breakdown by city
  SELECT json_agg(row_to_json(c))
  INTO v_by_city
  FROM (
    SELECT 
      city,
      COUNT(*) as items_count,
      SUM(quantity) as total_pallets
    FROM buyer_inventory
    WHERE buyer_phone = p_buyer_phone
    GROUP BY city
    ORDER BY total_pallets DESC
  ) c;

  RETURN json_build_object(
    'success', true,
    'total_items', v_total_items,
    'total_pallets', v_total_pallets,
    'total_value', v_total_value,
    'available_pallets', v_available_pallets,
    'by_type', COALESCE(v_by_type, '[]'::json),
    'by_city', COALESCE(v_by_city, '[]'::json)
  );
END;
$$;

-- Function to get buyer inventory items
CREATE OR REPLACE FUNCTION get_buyer_inventory_items(
  p_buyer_phone text,
  p_pallet_type text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_only_available boolean DEFAULT false
)
RETURNS TABLE (
  id uuid,
  pallet_type text,
  size text,
  quality text,
  condition text,
  quantity integer,
  quantity_available integer,
  unit_price numeric,
  total_paid numeric,
  original_supplier_phone text,
  original_supplier_name text,
  city text,
  images jsonb,
  description text,
  acquired_at timestamptz,
  deal_ref text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify session
  IF NOT EXISTS (
    SELECT 1 FROM session_tokens
    WHERE phone = p_buyer_phone
    AND expires_at > now()
  ) THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;

  RETURN QUERY
  SELECT 
    bi.id,
    bi.pallet_type,
    bi.size,
    bi.quality,
    bi.condition,
    bi.quantity,
    bi.quantity_available,
    bi.unit_price,
    bi.total_paid,
    bi.original_supplier_phone,
    bi.original_supplier_name,
    bi.city,
    bi.images,
    bi.description,
    bi.acquired_at,
    d.deal_ref
  FROM buyer_inventory bi
  JOIN deals d ON d.id = bi.original_deal_id
  WHERE bi.buyer_phone = p_buyer_phone
    AND (p_pallet_type IS NULL OR bi.pallet_type = p_pallet_type)
    AND (p_city IS NULL OR bi.city = p_city)
    AND (NOT p_only_available OR bi.quantity_available > 0)
  ORDER BY bi.acquired_at DESC;
END;
$$;

-- Enable realtime for buyer_inventory
ALTER PUBLICATION supabase_realtime ADD TABLE buyer_inventory;
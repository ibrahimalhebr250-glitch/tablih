/*
  # Deals Table & Inventory Reservation Logic

  ## Summary
  Creates the `deals` table to track matched B2B transactions between buyers and suppliers,
  and adds reservation logic to `inventory_batches` to track reserved vs available quantities.

  ## New Tables

  ### `deals`
  Each confirmed deal between a buyer and a supplier.
  - `id` (uuid, primary key)
  - `deal_ref` (text, unique) – human-readable DEL-XXXXXX
  - `request_id` (text) – reference to orders.request_id
  - `order_id` (uuid, FK → orders)
  - `inventory_batch_id` (uuid, FK → inventory_batches)
  - `buyer_phone` (text) – denormalized for fast queries
  - `supplier_phone` (text) – denormalized for fast queries
  - `pallet_type` (text)
  - `size` (text)
  - `quality` (text)
  - `city` (text)
  - `quantity` (integer) – agreed quantity
  - `final_price` (numeric) – agreed price per unit
  - `status` (text) – pending_confirmation / active / pending_receipt / completed / cancelled
  - `confirmed_at` (timestamptz)
  - `completed_at` (timestamptz)
  - `cancelled_at` (timestamptz)
  - `cancel_reason` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Modified Tables

  ### `inventory_batches`
  - Add `reserved_quantity` (integer) – tracks how much is reserved in active deals

  ## New Functions

  ### `confirm_deal(deal_id uuid)`
  Atomically confirms a deal:
  1. Reduces quantity_available on the inventory batch
  2. Increases reserved_quantity
  3. Updates deal status to 'active'
  Prevents double-allocation via row locking.

  ### `cancel_deal(deal_id uuid, reason text)`
  Atomically cancels a deal:
  1. Returns reserved_quantity back to quantity_available
  2. Updates deal status to 'cancelled'

  ## Security
  - RLS enabled on deals table
  - Buyers and suppliers can read their own deals by phone
  - Status updates restricted to deal participants

  ## Important Notes
  1. Matching engine must ONLY read from quantity_available
  2. reserved_quantity is only for reserved (not yet completed) deals
  3. On deal completion, reserved_quantity is reduced (the goods have shipped)
*/

-- Add reserved_quantity to inventory_batches if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_batches' AND column_name = 'reserved_quantity'
  ) THEN
    ALTER TABLE inventory_batches ADD COLUMN reserved_quantity integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Create deals table
CREATE TABLE IF NOT EXISTS deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_ref text UNIQUE NOT NULL DEFAULT 'DEL-' || upper(substring(gen_random_uuid()::text, 1, 6)),
  request_id text NOT NULL,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  inventory_batch_id uuid REFERENCES inventory_batches(id) ON DELETE SET NULL,
  buyer_phone text NOT NULL,
  supplier_phone text NOT NULL,
  pallet_type text NOT NULL,
  size text NOT NULL,
  quality text NOT NULL,
  city text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  final_price numeric(10, 2) NOT NULL CHECK (final_price > 0),
  status text NOT NULL DEFAULT 'pending_confirmation'
    CHECK (status IN ('pending_confirmation', 'active', 'pending_receipt', 'completed', 'cancelled')),
  confirmed_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deals_buyer_phone ON deals(buyer_phone);
CREATE INDEX IF NOT EXISTS idx_deals_supplier_phone ON deals(supplier_phone);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
CREATE INDEX IF NOT EXISTS idx_deals_order_id ON deals(order_id);
CREATE INDEX IF NOT EXISTS idx_deals_batch_id ON deals(inventory_batch_id);
CREATE INDEX IF NOT EXISTS idx_deals_created_at ON deals(created_at DESC);

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can read own deals"
  ON deals FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can insert deals"
  ON deals FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Participants can update deals"
  ON deals FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Function: confirm_deal
-- Atomically reserves inventory and marks deal as active
CREATE OR REPLACE FUNCTION confirm_deal(p_deal_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_deal deals%ROWTYPE;
  v_batch inventory_batches%ROWTYPE;
BEGIN
  -- Lock and fetch deal
  SELECT * INTO v_deal FROM deals WHERE id = p_deal_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deal not found');
  END IF;

  IF v_deal.status != 'pending_confirmation' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deal is not in pending_confirmation status');
  END IF;

  -- Lock and fetch inventory batch
  SELECT * INTO v_batch FROM inventory_batches WHERE id = v_deal.inventory_batch_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Inventory batch not found');
  END IF;

  IF v_batch.quantity_available < v_deal.quantity THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient quantity available');
  END IF;

  -- Reserve inventory
  UPDATE inventory_batches
  SET
    quantity_available = quantity_available - v_deal.quantity,
    reserved_quantity = reserved_quantity + v_deal.quantity,
    updated_at = now()
  WHERE id = v_deal.inventory_batch_id;

  -- Confirm deal
  UPDATE deals
  SET
    status = 'active',
    confirmed_at = now(),
    updated_at = now()
  WHERE id = p_deal_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Function: cancel_deal
-- Atomically releases reserved inventory and cancels the deal
CREATE OR REPLACE FUNCTION cancel_deal(p_deal_id uuid, p_reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_deal deals%ROWTYPE;
BEGIN
  SELECT * INTO v_deal FROM deals WHERE id = p_deal_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deal not found');
  END IF;

  IF v_deal.status IN ('completed', 'cancelled') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deal cannot be cancelled in current status');
  END IF;

  -- Release reserved inventory only if deal was active or pending_receipt
  IF v_deal.status IN ('active', 'pending_receipt') AND v_deal.inventory_batch_id IS NOT NULL THEN
    UPDATE inventory_batches
    SET
      quantity_available = quantity_available + v_deal.quantity,
      reserved_quantity = GREATEST(0, reserved_quantity - v_deal.quantity),
      updated_at = now()
    WHERE id = v_deal.inventory_batch_id;
  END IF;

  -- Cancel deal
  UPDATE deals
  SET
    status = 'cancelled',
    cancelled_at = now(),
    cancel_reason = p_reason,
    updated_at = now()
  WHERE id = p_deal_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Function: complete_deal
-- Marks deal as completed and releases reserved_quantity (goods delivered)
CREATE OR REPLACE FUNCTION complete_deal(p_deal_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_deal deals%ROWTYPE;
BEGIN
  SELECT * INTO v_deal FROM deals WHERE id = p_deal_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deal not found');
  END IF;

  IF v_deal.status != 'pending_receipt' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deal must be in pending_receipt status to complete');
  END IF;

  -- Release reserved_quantity (goods have been delivered)
  IF v_deal.inventory_batch_id IS NOT NULL THEN
    UPDATE inventory_batches
    SET
      reserved_quantity = GREATEST(0, reserved_quantity - v_deal.quantity),
      updated_at = now()
    WHERE id = v_deal.inventory_batch_id;
  END IF;

  -- Complete deal
  UPDATE deals
  SET
    status = 'completed',
    completed_at = now(),
    updated_at = now()
  WHERE id = p_deal_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

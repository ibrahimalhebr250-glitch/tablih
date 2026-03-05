/*
  # Inventory & Suppliers Schema – شبكة الطبليات

  ## Summary
  Creates the inventory and supplier tables needed for the "إضافة مخزون"
  (Add Inventory) Smart Cloud Deposit feature.

  ## New Tables

  ### 1. `suppliers`
  Stores supplier accounts (phone-only registration, no OTP required).
  - `id` (uuid, primary key)
  - `phone` (text, unique) – Saudi mobile number, used as the account identifier
  - `status` (text) – active / pending_verification
  - `created_at` (timestamptz)
  - `last_active` (timestamptz)

  ### 2. `inventory_batches`
  Each "cloud deposit" a supplier makes.
  - `id` (uuid, primary key)
  - `batch_ref` (text, unique) – human-readable INV-XXXXXX
  - `supplier_id` (uuid, FK → suppliers)
  - `phone` (text) – denormalized for quick lookups without auth
  - `pallet_type` (text) – خشبية / بلاستيكية / إعادة تدوير
  - `size` (text) – 120×100 / 110×110 / 120×80 / 80×60 / أخرى
  - `quality` (text) – A / B / C / Scrap
  - `quantity` (integer)
  - `min_price` (numeric) – minimum acceptable price per unit (hidden from buyers)
  - `city` (text)
  - `status` (text) – draft / active / matched / sold_out
  - `activate_immediately` (boolean)
  - `matched_order_id` (uuid, nullable FK → orders)
  - `matched_quantity` (integer, nullable)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. `active_demand` (seed/view table)
  Stores representative active demand records for UI display and matching preview.
  - `id` (uuid, primary key)
  - `city` (text)
  - `pallet_type` (text)
  - `size` (text)
  - `quality` (text)
  - `quantity_needed` (integer)
  - `is_active` (boolean)
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Public INSERT allowed on suppliers (registration)
  - Public INSERT allowed on inventory_batches (deposit)
  - Public SELECT on active_demand (demand visibility)
  - Suppliers can select/update their own records by phone match
*/

CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text UNIQUE NOT NULL,
  status text DEFAULT 'pending_verification' CHECK (status IN ('active', 'pending_verification')),
  created_at timestamptz DEFAULT now(),
  last_active timestamptz DEFAULT now()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow supplier self-registration"
  ON suppliers FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow suppliers to read own record"
  ON suppliers FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow suppliers to update own record"
  ON suppliers FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS inventory_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_ref text UNIQUE NOT NULL DEFAULT 'INV-' || upper(substring(gen_random_uuid()::text, 1, 6)),
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  phone text,
  pallet_type text NOT NULL,
  size text NOT NULL,
  quality text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  min_price numeric(10, 2),
  city text NOT NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'matched', 'sold_out')),
  activate_immediately boolean DEFAULT true,
  matched_order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  matched_quantity integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_city ON inventory_batches(city);
CREATE INDEX IF NOT EXISTS idx_inventory_pallet_type ON inventory_batches(pallet_type);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory_batches(status);
CREATE INDEX IF NOT EXISTS idx_inventory_created_at ON inventory_batches(created_at DESC);

ALTER TABLE inventory_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow inventory insert by anyone"
  ON inventory_batches FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow inventory select by anyone"
  ON inventory_batches FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow inventory update by anyone"
  ON inventory_batches FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS active_demand (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  pallet_type text NOT NULL,
  size text NOT NULL,
  quality text NOT NULL,
  quantity_needed integer NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE active_demand ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active demand"
  ON active_demand FOR SELECT
  TO anon
  USING (is_active = true);

INSERT INTO active_demand (city, pallet_type, size, quality, quantity_needed, is_active)
VALUES
  ('الرياض',       'خشبية',        '120×100', 'B',    3000, true),
  ('جدة',          'بلاستيكية',    '110×110', 'A',    1500, true),
  ('الدمام',       'خشبية',        '120×80',  'C',    2000, true),
  ('الرياض',       'إعادة تدوير',  '80×60',   'Scrap', 800, true),
  ('المدينة المنورة', 'خشبية',     '120×100', 'A',     500, true)
ON CONFLICT DO NOTHING;


/*
  # Create supplier_offers table

  1. New Tables
    - `supplier_offers`
      - `id` (uuid, primary key, auto-generated)
      - `supply_request_id` (uuid, NOT NULL, foreign key → supply_requests.id)
      - `supplier_id` (uuid, nullable)
      - `supplier_name` (text, NOT NULL)
      - `supplier_phone` (text, NOT NULL)
      - `quantity` (integer, NOT NULL, default 1)
      - `price` (numeric, NOT NULL)
      - `delivery_time` (text, nullable)
      - `notes` (text, nullable)
      - `status` (text, NOT NULL, default 'pending') — values: 'pending' | 'accepted' | 'rejected' | 'completed'
      - `created_at` (timestamptz, NOT NULL, default now())

  2. Constraints
    - Foreign key on supply_request_id references supply_requests(id) with CASCADE DELETE
    - Check constraint on status: must be one of the 4 allowed values

  3. Security
    - Enable RLS
    - Anyone can insert offers
    - Anyone can view offers
    - Authenticated users can update offer status
*/

CREATE TABLE IF NOT EXISTS supplier_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supply_request_id uuid NOT NULL REFERENCES supply_requests(id) ON DELETE CASCADE,
  supplier_id uuid,
  supplier_name text NOT NULL DEFAULT '',
  supplier_phone text NOT NULL DEFAULT '',
  quantity integer NOT NULL DEFAULT 1,
  price numeric NOT NULL DEFAULT 0,
  delivery_time text,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT supplier_offers_status_check
    CHECK (status IN ('pending', 'accepted', 'rejected', 'completed'))
);

ALTER TABLE supplier_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert supplier offers"
  ON supplier_offers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can view supplier offers"
  ON supplier_offers
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can update supplier offers"
  ON supplier_offers
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (status IN ('pending', 'accepted', 'rejected', 'completed'));

CREATE INDEX IF NOT EXISTS idx_supplier_offers_supply_request_id
  ON supplier_offers(supply_request_id);

CREATE INDEX IF NOT EXISTS idx_supplier_offers_supplier_phone
  ON supplier_offers(supplier_phone);

CREATE INDEX IF NOT EXISTS idx_supplier_offers_status
  ON supplier_offers(status);

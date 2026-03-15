
/*
  # Create supply_requests table

  1. New Tables
    - `supply_requests`
      - `id` (uuid, primary key, auto-generated)
      - `buyer_name` (text, NOT NULL)
      - `buyer_phone` (text, NOT NULL)
      - `pallet_type` (text, nullable)
      - `size` (text, nullable)
      - `condition` (text, nullable)
      - `quantity` (integer, NOT NULL, default 1)
      - `city_id` (uuid, nullable, foreign key → cities.id)
      - `target_price` (numeric, nullable)
      - `notes` (text, nullable)
      - `request_type` (text, NOT NULL) — values: 'account' | 'quick'
      - `status` (text, NOT NULL, default 'active') — values: 'active' | 'closed'
      - `created_at` (timestamptz, NOT NULL, default now())

  2. Constraints
    - Foreign key on city_id references cities(id)
    - Check constraint on request_type: must be 'account' or 'quick'
    - Check constraint on status: must be 'active' or 'closed'

  3. Security
    - Enable RLS
    - Public can insert and read active supply requests
    - Authenticated users can update status
*/

CREATE TABLE IF NOT EXISTS supply_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_name text NOT NULL DEFAULT '',
  buyer_phone text NOT NULL DEFAULT '',
  pallet_type text,
  size text,
  condition text,
  quantity integer NOT NULL DEFAULT 1,
  city_id uuid REFERENCES cities(id) ON DELETE SET NULL,
  target_price numeric,
  notes text,
  request_type text NOT NULL DEFAULT 'quick',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT supply_requests_request_type_check
    CHECK (request_type IN ('account', 'quick')),

  CONSTRAINT supply_requests_status_check
    CHECK (status IN ('active', 'closed'))
);

ALTER TABLE supply_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert supply requests"
  ON supply_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can view supply requests"
  ON supply_requests
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can update supply requests"
  ON supply_requests
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (status IN ('active', 'closed'));

CREATE INDEX IF NOT EXISTS idx_supply_requests_buyer_phone
  ON supply_requests(buyer_phone);

CREATE INDEX IF NOT EXISTS idx_supply_requests_status
  ON supply_requests(status);

CREATE INDEX IF NOT EXISTS idx_supply_requests_city_id
  ON supply_requests(city_id);

CREATE INDEX IF NOT EXISTS idx_supply_requests_pallet_type
  ON supply_requests(pallet_type);

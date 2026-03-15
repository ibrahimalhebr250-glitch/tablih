
/*
  # Create transactions table

  1. New Tables
    - `transactions`
      - `id` (uuid, primary key, auto-generated)
      - `listing_id` (uuid, nullable, foreign key → listings.id)
      - `supply_request_id` (uuid, nullable, foreign key → supply_requests.id)
      - `purchase_request_id` (uuid, nullable, foreign key → purchase_requests.id)
      - `supplier_id` (uuid, nullable)
      - `buyer_name` (text)
      - `buyer_phone` (text)
      - `quantity` (integer, default 1)
      - `price` (numeric, default 0) — price per unit
      - `total_amount` (numeric, default 0) — total before commission
      - `commission_amount` (numeric, default 0) — platform commission
      - `status` (text, default 'pending') — values: pending | in_progress | completed | cancelled
      - `created_at` (timestamptz, default now())

  2. Constraints
    - Soft foreign keys on listing_id, supply_request_id, purchase_request_id (SET NULL on delete)
    - Check constraint on status

  3. Indexes
    - On listing_id, supply_request_id, purchase_request_id, buyer_phone, status

  4. Security
    - Enable RLS
    - Anon and authenticated can insert
    - Anon and authenticated can view
    - Authenticated can update status
*/

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES listings(id) ON DELETE SET NULL,
  supply_request_id uuid REFERENCES supply_requests(id) ON DELETE SET NULL,
  purchase_request_id uuid REFERENCES purchase_requests(id) ON DELETE SET NULL,
  supplier_id uuid,
  buyer_name text NOT NULL DEFAULT '',
  buyer_phone text NOT NULL DEFAULT '',
  quantity integer NOT NULL DEFAULT 1,
  price numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  commission_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT transactions_status_check
    CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'))
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert transactions"
  ON transactions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can view transactions"
  ON transactions
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can update transactions"
  ON transactions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_transactions_listing_id
  ON transactions(listing_id);

CREATE INDEX IF NOT EXISTS idx_transactions_supply_request_id
  ON transactions(supply_request_id);

CREATE INDEX IF NOT EXISTS idx_transactions_purchase_request_id
  ON transactions(purchase_request_id);

CREATE INDEX IF NOT EXISTS idx_transactions_buyer_phone
  ON transactions(buyer_phone);

CREATE INDEX IF NOT EXISTS idx_transactions_status
  ON transactions(status);

CREATE INDEX IF NOT EXISTS idx_transactions_created_at
  ON transactions(created_at DESC);

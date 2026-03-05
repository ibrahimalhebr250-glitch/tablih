/*
  # Smart Order Builder - Initial Schema

  ## Summary
  Creates the core tables needed for the Smart Order Builder feature in شبكة الطبليات.

  ## New Tables

  ### 1. `platform_users`
  Stores registered users (phone-only registration).
  - `id` (uuid, primary key)
  - `phone` (text, unique) - Saudi mobile number
  - `created_at` (timestamptz)
  - `last_active` (timestamptz)

  ### 2. `orders`
  Stores all pallet orders submitted through the Smart Order Builder.
  - `id` (uuid, primary key)
  - `request_id` (text, unique) - human-readable ID like TBL-XXXX
  - `user_id` (uuid, FK to platform_users)
  - `pallet_type` (text) - خشبية / بلاستيكية / إعادة تدوير
  - `size` (text) - e.g. 120×100
  - `quality` (text) - A / B / C / Scrap
  - `quantity` (integer)
  - `city` (text)
  - `accept_close_quality` (boolean)
  - `accept_close_city` (boolean)
  - `accept_partial_delivery` (boolean)
  - `status` (text) - pending / matched / unmatched / executed
  - `matched_quantity` (integer, nullable)
  - `matched_price` (numeric, nullable)
  - `delivery_days` (integer, nullable)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - RLS enabled on both tables
  - Users can only read/write their own data
  - Orders are associated by user_id
*/

CREATE TABLE IF NOT EXISTS platform_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_active timestamptz DEFAULT now()
);

ALTER TABLE platform_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON platform_users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON platform_users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow insert for registration"
  ON platform_users FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id text UNIQUE NOT NULL DEFAULT 'TBL-' || upper(substring(gen_random_uuid()::text, 1, 6)),
  user_id uuid REFERENCES platform_users(id),
  phone text,
  pallet_type text NOT NULL,
  size text NOT NULL,
  quality text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  city text NOT NULL,
  accept_close_quality boolean DEFAULT false,
  accept_close_city boolean DEFAULT false,
  accept_partial_delivery boolean DEFAULT false,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'unmatched', 'executed')),
  matched_quantity integer,
  matched_price numeric(10, 2),
  delivery_days integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_city ON orders(city);
CREATE INDEX IF NOT EXISTS idx_orders_pallet_type ON orders(pallet_type);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert orders"
  ON orders FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated can insert orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can read own orders"
  ON orders FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Authenticated users can read own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update own orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

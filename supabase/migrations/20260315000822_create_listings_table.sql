/*
  # Create listings table

  New Tables:
  - `listings` - Supplier pallet listings for the marketplace
    - `id` (uuid, primary key)
    - `supplier_id` (uuid, references platform_users)
    - `pallet_type` (text)
    - `size` (text)
    - `condition` (text)
    - `quantity` (integer, must be >= 0)
    - `price` (numeric, must be >= 0)
    - `city_id` (uuid, references cities)
    - `status` (text, one of: active, paused, sold)
    - `created_at` (timestamptz)

  Security:
  - RLS enabled
  - Suppliers can read their own listings (all statuses)
  - Anyone can read active listings
  - Session-token based auth for write operations
*/

CREATE TABLE IF NOT EXISTS listings (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id  uuid        NOT NULL REFERENCES platform_users(id) ON DELETE CASCADE,
  pallet_type  text        NOT NULL,
  size         text        NOT NULL,
  condition    text        NOT NULL,
  quantity     integer     NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  price        numeric     NOT NULL DEFAULT 0 CHECK (price >= 0),
  city_id      uuid        REFERENCES cities(id) ON DELETE SET NULL,
  status       text        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'sold')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active listings"
  ON listings FOR SELECT
  USING (status = 'active');

CREATE POLICY "Suppliers can read own listings"
  ON listings FOR SELECT
  USING (
    supplier_id IN (
      SELECT pu.id FROM platform_users pu
      JOIN session_tokens st ON st.user_id = pu.id
      WHERE st.access_token = (
        SELECT current_setting('request.headers', true)::json->>'x-session-token'
      )
      AND st.expires_at > now()
    )
  );

CREATE POLICY "Suppliers can insert own listings"
  ON listings FOR INSERT
  WITH CHECK (
    supplier_id IN (
      SELECT pu.id FROM platform_users pu
      JOIN session_tokens st ON st.user_id = pu.id
      WHERE st.access_token = (
        SELECT current_setting('request.headers', true)::json->>'x-session-token'
      )
      AND st.expires_at > now()
    )
  );

CREATE POLICY "Suppliers can update own listings"
  ON listings FOR UPDATE
  USING (
    supplier_id IN (
      SELECT pu.id FROM platform_users pu
      JOIN session_tokens st ON st.user_id = pu.id
      WHERE st.access_token = (
        SELECT current_setting('request.headers', true)::json->>'x-session-token'
      )
      AND st.expires_at > now()
    )
  )
  WITH CHECK (
    supplier_id IN (
      SELECT pu.id FROM platform_users pu
      JOIN session_tokens st ON st.user_id = pu.id
      WHERE st.access_token = (
        SELECT current_setting('request.headers', true)::json->>'x-session-token'
      )
      AND st.expires_at > now()
    )
  );

CREATE POLICY "Suppliers can delete own listings"
  ON listings FOR DELETE
  USING (
    supplier_id IN (
      SELECT pu.id FROM platform_users pu
      JOIN session_tokens st ON st.user_id = pu.id
      WHERE st.access_token = (
        SELECT current_setting('request.headers', true)::json->>'x-session-token'
      )
      AND st.expires_at > now()
    )
  );

CREATE INDEX IF NOT EXISTS listings_supplier_id_idx ON listings(supplier_id);
CREATE INDEX IF NOT EXISTS listings_city_id_idx ON listings(city_id);
CREATE INDEX IF NOT EXISTS listings_status_idx ON listings(status);
CREATE INDEX IF NOT EXISTS listings_created_at_idx ON listings(created_at DESC);

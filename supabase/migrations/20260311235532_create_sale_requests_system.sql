/*
  # Create Sale Requests System

  ## Overview
  New pallet sale flow: Supplier publishes inventory → Buyer sends purchase request →
  Supplier accepts/rejects → WhatsApp contact → Supplier confirms delivery →
  Inventory deducted, buyer inventory updated, commission recorded.

  ## New Table: sale_requests
  - id: UUID primary key
  - inventory_batch_id: FK to inventory_batches
  - supplier_phone, buyer_phone: Parties involved
  - requested_quantity: Pallets requested
  - city, pallet_type, size, quality, price_per_pallet: Snapshot at request time
  - status: pending_supplier → accepted/rejected → in_contact → completed/failed
  - commission_per_pallet: Platform commission
  - supplier_agreed_commission: Checkbox agreement flag
  - created_at, updated_at

  ## RLS
  - Buyers see only their own requests
  - Suppliers see requests for their inventory
  - Both can read via session token
  - Only buyers can insert
  - Only suppliers can update
*/

CREATE TABLE IF NOT EXISTS sale_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_batch_id uuid NOT NULL REFERENCES inventory_batches(id) ON DELETE CASCADE,
  supplier_phone text NOT NULL,
  buyer_phone text NOT NULL,
  requested_quantity integer NOT NULL CHECK (requested_quantity > 0),
  city text NOT NULL DEFAULT '',
  pallet_type text NOT NULL DEFAULT '',
  size text NOT NULL DEFAULT '',
  quality text NOT NULL DEFAULT '',
  price_per_pallet numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending_supplier'
    CHECK (status IN ('pending_supplier','accepted','rejected','in_contact','completed','failed')),
  commission_per_pallet numeric(12,2) NOT NULL DEFAULT 0,
  supplier_agreed_commission boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sale_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view own sale requests"
  ON sale_requests FOR SELECT
  TO anon, authenticated
  USING (
    buyer_phone = (
      SELECT us.phone FROM user_sessions us
      WHERE us.session_token = current_setting('request.headers', true)::json->>'x-session-token'
      AND us.expires_at > now()
      AND us.is_active = true
      LIMIT 1
    )
  );

CREATE POLICY "Suppliers can view requests for their inventory"
  ON sale_requests FOR SELECT
  TO anon, authenticated
  USING (
    supplier_phone = (
      SELECT us.phone FROM user_sessions us
      WHERE us.session_token = current_setting('request.headers', true)::json->>'x-session-token'
      AND us.expires_at > now()
      AND us.is_active = true
      LIMIT 1
    )
  );

CREATE POLICY "Buyers can insert sale requests"
  ON sale_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    buyer_phone = (
      SELECT us.phone FROM user_sessions us
      WHERE us.session_token = current_setting('request.headers', true)::json->>'x-session-token'
      AND us.expires_at > now()
      AND us.is_active = true
      LIMIT 1
    )
    AND buyer_phone <> supplier_phone
  );

CREATE POLICY "Suppliers can update their sale requests"
  ON sale_requests FOR UPDATE
  TO anon, authenticated
  USING (
    supplier_phone = (
      SELECT us.phone FROM user_sessions us
      WHERE us.session_token = current_setting('request.headers', true)::json->>'x-session-token'
      AND us.expires_at > now()
      AND us.is_active = true
      LIMIT 1
    )
  )
  WITH CHECK (
    supplier_phone = (
      SELECT us.phone FROM user_sessions us
      WHERE us.session_token = current_setting('request.headers', true)::json->>'x-session-token'
      AND us.expires_at > now()
      AND us.is_active = true
      LIMIT 1
    )
  );

CREATE INDEX IF NOT EXISTS idx_sale_requests_buyer ON sale_requests(buyer_phone);
CREATE INDEX IF NOT EXISTS idx_sale_requests_supplier ON sale_requests(supplier_phone);
CREATE INDEX IF NOT EXISTS idx_sale_requests_batch ON sale_requests(inventory_batch_id);
CREATE INDEX IF NOT EXISTS idx_sale_requests_status ON sale_requests(status);

ALTER TABLE sale_requests REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'sale_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE sale_requests;
  END IF;
END $$;

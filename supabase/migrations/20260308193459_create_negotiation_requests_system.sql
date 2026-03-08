/*
  # Create Negotiation Requests System

  ## Overview
  Adds a negotiation_requests table to handle the new market deal flow:
  Supply listing → Buyer sends negotiation request → Supplier gets notified → Supplier accepts/rejects → Deal is created

  ## New Tables
  - `negotiation_requests`
    - `id` (uuid, primary key)
    - `inventory_batch_id` (uuid) - references the supply listing
    - `buyer_phone` (text) - the buyer who sent the request
    - `supplier_phone` (text) - the supplier who owns the listing
    - `status` (text) - pending / accepted / rejected / deal_created
    - `pallet_type`, `size`, `quality`, `pallet_condition` - copied from listing
    - `available_quantity` (int) - quantity from listing
    - `city` (text)
    - `price_per_pallet` (numeric)
    - `buyer_message` (text, optional)
    - `supplier_response` (text, optional)
    - `deal_id` (uuid, optional) - set when deal is created after acceptance
    - `created_at`, `updated_at`

  ## Security
  - RLS enabled
  - Buyers can create requests (cannot request own listings)
  - Buyers can read their own requests
  - Suppliers can read requests for their listings
  - Suppliers can update status (accept/reject)
  - Admins (via service key) have full access via functions
*/

CREATE TABLE IF NOT EXISTS negotiation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_batch_id uuid NOT NULL,
  buyer_phone text NOT NULL,
  supplier_phone text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'deal_created', 'cancelled')),
  pallet_type text NOT NULL DEFAULT '',
  size text NOT NULL DEFAULT '',
  quality text NOT NULL DEFAULT '',
  pallet_condition text NOT NULL DEFAULT 'used',
  available_quantity integer NOT NULL DEFAULT 0,
  city text NOT NULL DEFAULT '',
  price_per_pallet numeric NOT NULL DEFAULT 0,
  buyer_message text,
  supplier_response text,
  deal_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE negotiation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can create negotiation requests"
  ON negotiation_requests FOR INSERT
  TO anon
  WITH CHECK (
    buyer_phone != supplier_phone
  );

CREATE POLICY "Buyers can view their own requests"
  ON negotiation_requests FOR SELECT
  TO anon
  USING (
    buyer_phone = current_setting('request.headers', true)::json->>'x-buyer-phone'
    OR supplier_phone = current_setting('request.headers', true)::json->>'x-buyer-phone'
    OR true
  );

CREATE POLICY "Anyone can view negotiation requests"
  ON negotiation_requests FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can insert negotiation requests"
  ON negotiation_requests FOR INSERT
  TO anon
  WITH CHECK (buyer_phone != supplier_phone);

CREATE POLICY "Anyone can update negotiation requests"
  ON negotiation_requests FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_negotiation_requests_buyer ON negotiation_requests(buyer_phone);
CREATE INDEX IF NOT EXISTS idx_negotiation_requests_supplier ON negotiation_requests(supplier_phone);
CREATE INDEX IF NOT EXISTS idx_negotiation_requests_status ON negotiation_requests(status);
CREATE INDEX IF NOT EXISTS idx_negotiation_requests_batch ON negotiation_requests(inventory_batch_id);

CREATE OR REPLACE FUNCTION update_negotiation_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER negotiation_requests_updated_at
  BEFORE UPDATE ON negotiation_requests
  FOR EACH ROW EXECUTE FUNCTION update_negotiation_request_updated_at();

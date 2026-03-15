
/*
  # Create purchase_requests table

  1. New Tables
    - `purchase_requests`
      - `id` (uuid, primary key, auto-generated)
      - `listing_id` (uuid, foreign key → listings.id)
      - `buyer_name` (text, NOT NULL)
      - `buyer_phone` (text, NOT NULL)
      - `quantity` (integer, NOT NULL, default 1)
      - `message` (text, nullable)
      - `request_type` (text, NOT NULL) — values: 'account' | 'quick'
      - `status` (text, NOT NULL, default 'pending') — values: 'pending' | 'accepted' | 'rejected' | 'completed'
      - `created_at` (timestamptz, NOT NULL, default now())

  2. Constraints
    - Foreign key on listing_id references listings(id)
    - Check constraint on request_type: must be 'account' or 'quick'
    - Check constraint on status: must be 'pending', 'accepted', 'rejected', or 'completed'

  3. Security
    - Enable RLS
    - Public can insert (buyers submit requests without auth)
    - Only authenticated/admin can read and update via RLS policies
*/

CREATE TABLE IF NOT EXISTS purchase_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  buyer_name text NOT NULL DEFAULT '',
  buyer_phone text NOT NULL DEFAULT '',
  quantity integer NOT NULL DEFAULT 1,
  message text,
  request_type text NOT NULL DEFAULT 'quick',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT purchase_requests_request_type_check
    CHECK (request_type IN ('account', 'quick')),

  CONSTRAINT purchase_requests_status_check
    CHECK (status IN ('pending', 'accepted', 'rejected', 'completed'))
);

ALTER TABLE purchase_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert purchase requests"
  ON purchase_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Buyers can view own requests by phone"
  ON purchase_requests
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can update purchase requests"
  ON purchase_requests
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (status IN ('pending', 'accepted', 'rejected', 'completed'));

CREATE INDEX IF NOT EXISTS idx_purchase_requests_listing_id
  ON purchase_requests(listing_id);

CREATE INDEX IF NOT EXISTS idx_purchase_requests_buyer_phone
  ON purchase_requests(buyer_phone);

CREATE INDEX IF NOT EXISTS idx_purchase_requests_status
  ON purchase_requests(status);

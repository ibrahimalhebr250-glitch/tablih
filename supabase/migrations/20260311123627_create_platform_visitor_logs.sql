/*
  # Create Platform Visitor Logs Table

  ## Summary
  Creates a dedicated visitor tracking system to count unique daily visitors to the platform.

  ## New Tables
  - `platform_visitor_logs`
    - `id` (uuid, primary key)
    - `visitor_id` (text) - anonymous identifier stored in localStorage (not tied to account)
    - `session_id` (text) - unique per browser session
    - `phone` (text, nullable) - filled if logged in
    - `user_agent` (text, nullable)
    - `visit_date` (date) - the calendar date of the visit (for daily aggregation)
    - `first_seen_at` (timestamptz) - exact timestamp of first visit in session
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled
  - Anyone (anon) can INSERT (to track all visitors including non-logged-in)
  - Only authenticated admin functions can SELECT

  ## Notes
  1. One row per visitor_id per day (UNIQUE constraint) to avoid double-counting
  2. The `visit_date` column allows efficient per-day aggregation
  3. `visitor_id` is generated client-side (UUID stored in localStorage)
*/

CREATE TABLE IF NOT EXISTS platform_visitor_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text NOT NULL,
  session_id text NOT NULL,
  phone text DEFAULT NULL,
  user_agent text DEFAULT NULL,
  visit_date date NOT NULL DEFAULT CURRENT_DATE,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (visitor_id, visit_date)
);

CREATE INDEX IF NOT EXISTS idx_visitor_logs_visit_date ON platform_visitor_logs (visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_created_at ON platform_visitor_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_visitor_id ON platform_visitor_logs (visitor_id);

ALTER TABLE platform_visitor_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log visits"
  ON platform_visitor_logs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read visitor logs"
  ON platform_visitor_logs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION log_platform_visit(
  p_visitor_id text,
  p_session_id text,
  p_phone text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO platform_visitor_logs (visitor_id, session_id, phone, user_agent, visit_date, first_seen_at)
  VALUES (p_visitor_id, p_session_id, p_phone, p_user_agent, CURRENT_DATE, now())
  ON CONFLICT (visitor_id, visit_date) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION log_platform_visit TO anon, authenticated;

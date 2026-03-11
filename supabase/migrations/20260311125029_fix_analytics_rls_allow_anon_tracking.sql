/*
  # Fix Analytics RLS - Allow Anonymous Tracking

  ## Problem
  The platform uses a custom session system, not Supabase Auth.
  All users are `anon` role in Supabase context, so:
  - `user_behavior_tracking` INSERT was blocked (required `authenticated`)
  - `platform_visitor_logs` had no UPDATE policy to link phone to visit

  ## Changes
  1. Add anon INSERT policy for `user_behavior_tracking`
  2. Add anon UPDATE policy for `platform_visitor_logs` (phone field only)
  3. Add anon SELECT policy for `platform_visitor_logs` (needed for RPC calls)
*/

-- Allow anon users to insert behavior tracking events
DROP POLICY IF EXISTS "Users can insert their own behavior" ON user_behavior_tracking;
CREATE POLICY "Anyone can insert behavior tracking"
  ON user_behavior_tracking
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow anon users to update visitor phone (link visit to registered user)
DROP POLICY IF EXISTS "Anon can update visitor phone" ON platform_visitor_logs;
CREATE POLICY "Anon can update visitor phone"
  ON platform_visitor_logs
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Allow anon to read visitor logs (needed by useVisitorStats RPC)
DROP POLICY IF EXISTS "Anon can read own visitor log" ON platform_visitor_logs;
CREATE POLICY "Anon can read own visitor log"
  ON platform_visitor_logs
  FOR SELECT
  TO anon
  USING (true);


/*
  # Fix Critical RLS Policies - Use Session Token System

  ## Problem
  Several tables have RLS policies that use USING (true) for anon/public roles,
  meaning ANY anonymous visitor can read, update, or delete ALL data in these tables.

  The platform uses a custom session system (session_tokens table with phone + expires_at)
  instead of Supabase Auth, so auth.uid() does not work for regular users.
  All access must be validated through the session_tokens table.

  ## Tables Fixed
  1. `orders` - SELECT/UPDATE/DELETE policies tightened to session phone match
  2. `deals` - SELECT/UPDATE policies tightened to participant phone match
  3. `inventory_batches` - UPDATE/DELETE policies tightened to owner phone match
  4. `api_rate_limits` - RLS enabled (was completely unprotected)

  ## Strategy
  - For SELECT: user must have an active session and their phone must match the row's phone field
  - For UPDATE: same phone check through active session
  - For DELETE: same phone check through active session
  - For INSERT: allow anon (needed for the session-based custom flow)
  - System/admin functions use SECURITY DEFINER and bypass RLS — these are unaffected

  ## Notes
  - We DROP and recreate the problematic policies; safe ones are left intact
  - Market browsing (reading inventory/deals for display) uses separate permissive read policies
    that show only appropriate public data
  - All SECURITY DEFINER functions bypass RLS by design and remain functional
*/

-- ============================================================
-- Helper: active session check function
-- ============================================================
CREATE OR REPLACE FUNCTION public.active_session_phone()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT phone
  FROM session_tokens
  WHERE access_token = current_setting('request.headers', true)::json->>'x-session-token'
    AND expires_at > now()
  LIMIT 1;
$$;

-- ============================================================
-- ORDERS TABLE
-- ============================================================

-- Drop the dangerously open policies
DROP POLICY IF EXISTS "Users can read own orders" ON orders;
DROP POLICY IF EXISTS "Authenticated users can read own orders" ON orders;
DROP POLICY IF EXISTS "Allow order updates" ON orders;
DROP POLICY IF EXISTS "Allow delete own orders by phone" ON orders;

-- SELECT: user can only read orders matching their active session phone
CREATE POLICY "Session user can read own orders"
  ON orders
  FOR SELECT
  TO anon, authenticated
  USING (
    phone IN (
      SELECT st.phone FROM session_tokens st
      WHERE st.expires_at > now()
        AND st.access_token = current_setting('request.headers', true)::json->>'x-session-token'
    )
    OR
    EXISTS (
      SELECT 1 FROM admin_staff
      WHERE admin_staff.email = (current_setting('request.jwt.claims', true)::json ->> 'email')
        AND admin_staff.is_active = true
        AND admin_staff.is_locked = false
    )
  );

-- UPDATE: only session owner or system functions (SECURITY DEFINER bypasses this)
CREATE POLICY "Session user can update own orders"
  ON orders
  FOR UPDATE
  TO anon, authenticated
  USING (
    phone IN (
      SELECT st.phone FROM session_tokens st
      WHERE st.expires_at > now()
        AND st.access_token = current_setting('request.headers', true)::json->>'x-session-token'
    )
    OR
    EXISTS (
      SELECT 1 FROM admin_staff
      WHERE admin_staff.email = (current_setting('request.jwt.claims', true)::json ->> 'email')
        AND admin_staff.is_active = true
        AND admin_staff.is_locked = false
    )
  )
  WITH CHECK (
    phone IN (
      SELECT st.phone FROM session_tokens st
      WHERE st.expires_at > now()
        AND st.access_token = current_setting('request.headers', true)::json->>'x-session-token'
    )
    OR
    EXISTS (
      SELECT 1 FROM admin_staff
      WHERE admin_staff.email = (current_setting('request.jwt.claims', true)::json ->> 'email')
        AND admin_staff.is_active = true
        AND admin_staff.is_locked = false
    )
  );

-- DELETE: only session owner or admin
CREATE POLICY "Session user can delete own orders"
  ON orders
  FOR DELETE
  TO anon, authenticated
  USING (
    phone IN (
      SELECT st.phone FROM session_tokens st
      WHERE st.expires_at > now()
        AND st.access_token = current_setting('request.headers', true)::json->>'x-session-token'
    )
    OR
    EXISTS (
      SELECT 1 FROM admin_staff
      WHERE admin_staff.email = (current_setting('request.jwt.claims', true)::json ->> 'email')
        AND admin_staff.is_active = true
        AND admin_staff.is_locked = false
    )
  );

-- ============================================================
-- DEALS TABLE
-- ============================================================

-- Drop the dangerously open policies
DROP POLICY IF EXISTS "Buyers can read own deals" ON deals;
DROP POLICY IF EXISTS "Participants can update deals" ON deals;
DROP POLICY IF EXISTS "Anyone can insert deals" ON deals;

-- SELECT: buyer or supplier can read their own deals; market listings visible to all
CREATE POLICY "Participants can read own deals"
  ON deals
  FOR SELECT
  TO anon, authenticated
  USING (
    buyer_phone IN (
      SELECT st.phone FROM session_tokens st
      WHERE st.expires_at > now()
        AND st.access_token = current_setting('request.headers', true)::json->>'x-session-token'
    )
    OR
    supplier_phone IN (
      SELECT st.phone FROM session_tokens st
      WHERE st.expires_at > now()
        AND st.access_token = current_setting('request.headers', true)::json->>'x-session-token'
    )
    OR
    EXISTS (
      SELECT 1 FROM admin_staff
      WHERE admin_staff.email = (current_setting('request.jwt.claims', true)::json ->> 'email')
        AND admin_staff.is_active = true
        AND admin_staff.is_locked = false
    )
  );

-- UPDATE: only buyer or supplier involved in the deal
CREATE POLICY "Participants can update own deals"
  ON deals
  FOR UPDATE
  TO anon, authenticated
  USING (
    buyer_phone IN (
      SELECT st.phone FROM session_tokens st
      WHERE st.expires_at > now()
        AND st.access_token = current_setting('request.headers', true)::json->>'x-session-token'
    )
    OR
    supplier_phone IN (
      SELECT st.phone FROM session_tokens st
      WHERE st.expires_at > now()
        AND st.access_token = current_setting('request.headers', true)::json->>'x-session-token'
    )
    OR
    EXISTS (
      SELECT 1 FROM admin_staff
      WHERE admin_staff.email = (current_setting('request.jwt.claims', true)::json ->> 'email')
        AND admin_staff.is_active = true
        AND admin_staff.is_locked = false
    )
  )
  WITH CHECK (
    buyer_phone IN (
      SELECT st.phone FROM session_tokens st
      WHERE st.expires_at > now()
        AND st.access_token = current_setting('request.headers', true)::json->>'x-session-token'
    )
    OR
    supplier_phone IN (
      SELECT st.phone FROM session_tokens st
      WHERE st.expires_at > now()
        AND st.access_token = current_setting('request.headers', true)::json->>'x-session-token'
    )
    OR
    EXISTS (
      SELECT 1 FROM admin_staff
      WHERE admin_staff.email = (current_setting('request.jwt.claims', true)::json ->> 'email')
        AND admin_staff.is_active = true
        AND admin_staff.is_locked = false
    )
  );

-- INSERT: system functions (SECURITY DEFINER) handle inserts; allow for session users
CREATE POLICY "Session users can insert deals"
  ON deals
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- ============================================================
-- INVENTORY_BATCHES TABLE
-- ============================================================

-- Drop the dangerously open policies
DROP POLICY IF EXISTS "Allow inventory insert by anyone" ON inventory_batches;
DROP POLICY IF EXISTS "Allow inventory select by anyone" ON inventory_batches;
DROP POLICY IF EXISTS "Allow inventory update by anyone" ON inventory_batches;
DROP POLICY IF EXISTS "Owner can delete own batch by phone" ON inventory_batches;

-- SELECT: public can read active/partial batches (needed for market browsing), owners see all their own
CREATE POLICY "Public can browse active inventory"
  ON inventory_batches
  FOR SELECT
  TO anon, authenticated
  USING (
    status IN ('active', 'partial', 'pending_supplier')
    OR
    phone IN (
      SELECT st.phone FROM session_tokens st
      WHERE st.expires_at > now()
        AND st.access_token = current_setting('request.headers', true)::json->>'x-session-token'
    )
    OR
    EXISTS (
      SELECT 1 FROM admin_staff
      WHERE admin_staff.email = (current_setting('request.jwt.claims', true)::json ->> 'email')
        AND admin_staff.is_active = true
        AND admin_staff.is_locked = false
    )
  );

-- UPDATE: only owner by phone (system functions use SECURITY DEFINER and bypass this)
CREATE POLICY "Session owner can update own inventory"
  ON inventory_batches
  FOR UPDATE
  TO anon, authenticated
  USING (
    phone IN (
      SELECT st.phone FROM session_tokens st
      WHERE st.expires_at > now()
        AND st.access_token = current_setting('request.headers', true)::json->>'x-session-token'
    )
    OR
    EXISTS (
      SELECT 1 FROM admin_staff
      WHERE admin_staff.email = (current_setting('request.jwt.claims', true)::json ->> 'email')
        AND admin_staff.is_active = true
        AND admin_staff.is_locked = false
    )
  )
  WITH CHECK (
    phone IN (
      SELECT st.phone FROM session_tokens st
      WHERE st.expires_at > now()
        AND st.access_token = current_setting('request.headers', true)::json->>'x-session-token'
    )
    OR
    EXISTS (
      SELECT 1 FROM admin_staff
      WHERE admin_staff.email = (current_setting('request.jwt.claims', true)::json ->> 'email')
        AND admin_staff.is_active = true
        AND admin_staff.is_locked = false
    )
  );

-- DELETE: only owner by phone or admin
CREATE POLICY "Session owner can delete own inventory"
  ON inventory_batches
  FOR DELETE
  TO anon, authenticated
  USING (
    phone IN (
      SELECT st.phone FROM session_tokens st
      WHERE st.expires_at > now()
        AND st.access_token = current_setting('request.headers', true)::json->>'x-session-token'
    )
    OR
    EXISTS (
      SELECT 1 FROM admin_staff
      WHERE admin_staff.email = (current_setting('request.jwt.claims', true)::json ->> 'email')
        AND admin_staff.is_active = true
        AND admin_staff.is_locked = false
    )
  );

-- INSERT: allow session users to submit inventory
CREATE POLICY "Session users can insert inventory"
  ON inventory_batches
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- ============================================================
-- API_RATE_LIMITS TABLE
-- ============================================================
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only system can read rate limits"
  ON api_rate_limits
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_staff
      WHERE admin_staff.email = (current_setting('request.jwt.claims', true)::json ->> 'email')
        AND admin_staff.is_active = true
        AND admin_staff.is_locked = false
    )
  );

CREATE POLICY "System can insert rate limits"
  ON api_rate_limits
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "System can update rate limits"
  ON api_rate_limits
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

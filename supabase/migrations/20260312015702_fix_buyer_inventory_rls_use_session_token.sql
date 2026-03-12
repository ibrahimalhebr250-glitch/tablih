/*
  # Fix buyer_inventory RLS policies

  ## Problem
  The SELECT policy on buyer_inventory requires `authenticated` role,
  but the app uses anon key with a custom session token system.
  This causes the query to return empty results silently.

  ## Fix
  Drop the old policies and recreate them using the same session-token
  pattern used by all other tables (inventory_batches, deals, etc.)
*/

-- Drop old policies
DROP POLICY IF EXISTS "Buyers can view own inventory" ON buyer_inventory;
DROP POLICY IF EXISTS "Admins can view all buyer inventory" ON buyer_inventory;
DROP POLICY IF EXISTS "Buyers can update own inventory" ON buyer_inventory;
DROP POLICY IF EXISTS "System can insert buyer inventory" ON buyer_inventory;

-- SELECT: buyer sees own rows via session token (anon + authenticated)
CREATE POLICY "Buyers can view own inventory"
  ON buyer_inventory
  FOR SELECT
  TO anon, authenticated
  USING (
    buyer_phone IN (
      SELECT st.phone FROM session_tokens st
      WHERE st.expires_at > now()
        AND st.access_token = (
          (current_setting('request.headers', true))::json ->> 'x-session-token'
        )
    )
  );

-- SELECT: admins can view all
CREATE POLICY "Admins can view all buyer inventory"
  ON buyer_inventory
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_staff
      WHERE admin_staff.email = (
        (current_setting('request.jwt.claims', true))::json ->> 'email'
      )
      AND admin_staff.is_active = true
      AND admin_staff.is_locked = false
    )
  );

-- INSERT: system functions (SECURITY DEFINER) handle insert, allow service_role
CREATE POLICY "System can insert buyer inventory"
  ON buyer_inventory
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- UPDATE: buyer can update own rows via session token
CREATE POLICY "Buyers can update own inventory"
  ON buyer_inventory
  FOR UPDATE
  TO anon, authenticated
  USING (
    buyer_phone IN (
      SELECT st.phone FROM session_tokens st
      WHERE st.expires_at > now()
        AND st.access_token = (
          (current_setting('request.headers', true))::json ->> 'x-session-token'
        )
    )
  )
  WITH CHECK (
    buyer_phone IN (
      SELECT st.phone FROM session_tokens st
      WHERE st.expires_at > now()
        AND st.access_token = (
          (current_setting('request.headers', true))::json ->> 'x-session-token'
        )
    )
  );

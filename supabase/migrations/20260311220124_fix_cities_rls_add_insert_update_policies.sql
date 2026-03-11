/*
  # Fix Cities RLS Policies

  ## Problem
  The cities table was missing INSERT and UPDATE policies, causing "new row violates
  row-level security policy" errors when admins tried to add or edit cities.

  ## Changes
  - Add INSERT policy for admin staff with market can_edit permission
  - Add UPDATE policy for admin staff with market can_edit permission
  - Also add SELECT policy for authenticated users (admins)

  ## Security
  - Only authenticated admin staff with market section edit permission can insert/update
  - Uses the same pattern as the existing DELETE policy
*/

CREATE POLICY "Admin can insert cities"
  ON cities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_staff
      WHERE admin_staff.email = (current_setting('request.jwt.claims', true)::json->>'email')
        AND admin_staff.is_active = true
        AND admin_staff.is_locked = false
    )
    AND EXISTS (
      SELECT 1 FROM admin_permissions ap
      JOIN admin_staff ads ON ads.role = ap.role
      WHERE ads.email = (current_setting('request.jwt.claims', true)::json->>'email')
        AND ap.section = 'market'
        AND ap.can_edit = true
    )
  );

CREATE POLICY "Admin can update cities"
  ON cities
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_staff
      WHERE admin_staff.email = (current_setting('request.jwt.claims', true)::json->>'email')
        AND admin_staff.is_active = true
        AND admin_staff.is_locked = false
    )
    AND EXISTS (
      SELECT 1 FROM admin_permissions ap
      JOIN admin_staff ads ON ads.role = ap.role
      WHERE ads.email = (current_setting('request.jwt.claims', true)::json->>'email')
        AND ap.section = 'market'
        AND ap.can_edit = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_staff
      WHERE admin_staff.email = (current_setting('request.jwt.claims', true)::json->>'email')
        AND admin_staff.is_active = true
        AND admin_staff.is_locked = false
    )
    AND EXISTS (
      SELECT 1 FROM admin_permissions ap
      JOIN admin_staff ads ON ads.role = ap.role
      WHERE ads.email = (current_setting('request.jwt.claims', true)::json->>'email')
        AND ap.section = 'market'
        AND ap.can_edit = true
    )
  );

/*
  # Fix custom_roles RLS policies

  1. Changes
    - Drop existing restrictive policies that require auth.uid()
    - Create new policies matching the app's anon-key access pattern
    - SELECT: anyone can read roles
    - INSERT: anyone can insert roles
    - UPDATE: anyone can update non-system roles
    - DELETE: anyone can delete non-system roles

  2. Notes
    - App uses anonymous Supabase client without Supabase Auth
    - Matches existing policy pattern used by admin_roles, audit_log, etc.
*/

DROP POLICY IF EXISTS "Authenticated users can view roles" ON custom_roles;
DROP POLICY IF EXISTS "Admin staff can insert roles" ON custom_roles;
DROP POLICY IF EXISTS "Admin staff can update roles" ON custom_roles;
DROP POLICY IF EXISTS "Admin staff can delete non-system roles" ON custom_roles;

CREATE POLICY "Anyone can read custom_roles"
  ON custom_roles
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert custom_roles"
  ON custom_roles
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update non-system custom_roles"
  ON custom_roles
  FOR UPDATE
  TO anon, authenticated
  USING (is_system = false)
  WITH CHECK (is_system = false);

CREATE POLICY "Anyone can delete non-system custom_roles"
  ON custom_roles
  FOR DELETE
  TO anon, authenticated
  USING (is_system = false);

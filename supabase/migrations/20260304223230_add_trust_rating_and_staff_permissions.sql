/*
  # Add Trust Rating and Staff Permissions System

  1. Modified Tables
    - `platform_users`
      - `trust_rating` (integer, 1-5, default 3) - Admin-assigned trust level

  2. Modified Tables
    - `admin_roles`
      - `email` (text) - Staff email address
      - `can_view_analytics` (boolean) - Permission to view analytics
      - `can_manage_staff` (boolean) - Permission to manage staff

  3. Security
    - All existing RLS policies remain intact
    - New columns inherit existing table RLS

  4. Notes
    - Trust rating values: 1=Needs Monitoring, 2=New, 3=Standard, 4=Reliable, 5=Trusted
    - Staff permissions extend the existing admin_roles table
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_users' AND column_name = 'trust_rating'
  ) THEN
    ALTER TABLE platform_users ADD COLUMN trust_rating integer DEFAULT 3;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_roles' AND column_name = 'email'
  ) THEN
    ALTER TABLE admin_roles ADD COLUMN email text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_roles' AND column_name = 'can_view_analytics'
  ) THEN
    ALTER TABLE admin_roles ADD COLUMN can_view_analytics boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_roles' AND column_name = 'can_manage_staff'
  ) THEN
    ALTER TABLE admin_roles ADD COLUMN can_manage_staff boolean DEFAULT false;
  END IF;
END $$;

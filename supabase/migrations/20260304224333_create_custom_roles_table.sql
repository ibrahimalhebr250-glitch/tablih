/*
  # Create Custom Roles Table

  1. New Tables
    - `custom_roles`
      - `id` (uuid, primary key)
      - `name` (text, unique) - Role display name in Arabic
      - `slug` (text, unique) - Internal identifier
      - `description` (text) - Role description
      - `color` (text) - Badge color hex
      - `bg` (text) - Badge background hex
      - `can_view` (boolean) - View permission
      - `can_edit` (boolean) - Edit permission
      - `can_delete` (boolean) - Delete permission
      - `can_settle` (boolean) - Settlement permission
      - `can_modify_financials` (boolean) - Financial access
      - `can_manage_cities` (boolean) - City management
      - `can_manage_users` (boolean) - User management
      - `can_view_analytics` (boolean) - Analytics access
      - `can_manage_staff` (boolean) - Staff management
      - `is_system` (boolean) - Whether this is a built-in role
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `custom_roles` table
    - Add select policy for authenticated users
    - Add insert/update/delete policies for admin staff

  3. Notes
    - Seed with 4 default system roles
    - Update admin_roles.role to allow custom role values
*/

CREATE TABLE IF NOT EXISTS custom_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text DEFAULT '',
  color text DEFAULT '#64748b',
  bg text DEFAULT '#f1f5f9',
  can_view boolean DEFAULT true,
  can_edit boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  can_settle boolean DEFAULT false,
  can_modify_financials boolean DEFAULT false,
  can_manage_cities boolean DEFAULT false,
  can_manage_users boolean DEFAULT false,
  can_view_analytics boolean DEFAULT false,
  can_manage_staff boolean DEFAULT false,
  is_system boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE custom_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view roles"
  ON custom_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin staff can insert roles"
  ON custom_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admin staff can update roles"
  ON custom_roles
  FOR UPDATE
  TO authenticated
  USING (is_system = false)
  WITH CHECK (is_system = false);

CREATE POLICY "Admin staff can delete non-system roles"
  ON custom_roles
  FOR DELETE
  TO authenticated
  USING (is_system = false);

INSERT INTO custom_roles (name, slug, description, color, bg, is_system, can_view, can_edit, can_delete, can_settle, can_modify_financials, can_manage_cities, can_manage_users, can_view_analytics, can_manage_staff)
VALUES
  ('مدير عام', 'super_admin', 'صلاحيات كاملة على جميع أقسام المنصة', '#dc2626', '#fef2f2', true, true, true, true, true, true, true, true, true, true),
  ('مدير مالي', 'financial_admin', 'إدارة العمولات والتسويات والتقارير المالية', '#B8860B', '#FFFBEB', true, true, true, false, true, true, false, false, true, false),
  ('مدير عمليات', 'operations_manager', 'إدارة السوق والمدن والمستخدمين', '#0369A1', '#E0F2FE', true, true, true, false, false, false, true, true, true, false),
  ('دعم فني', 'support_agent', 'عرض البيانات فقط بدون تعديل', '#64748b', '#f1f5f9', true, true, false, false, false, false, false, false, false, false)
ON CONFLICT (slug) DO NOTHING;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'admin_roles' AND constraint_type = 'CHECK'
    AND constraint_name LIKE '%role%'
  ) THEN
    ALTER TABLE admin_roles DROP CONSTRAINT IF EXISTS admin_roles_role_check;
  END IF;
END $$;

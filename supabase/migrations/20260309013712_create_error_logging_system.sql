
/*
  # Create Error Logging System

  ## Summary
  Creates a centralized error logging table and supporting infrastructure
  to track all platform errors in production for debugging and monitoring.

  ## New Tables
  - `error_logs` - Stores all frontend and backend errors with context

  ## Columns
  - `id` - UUID primary key
  - `error_type` - Category: db_error, deal_failure, match_failure, network_error, session_error, ui_error
  - `error_code` - Short machine-readable code
  - `message` - Human-readable error message
  - `stack_trace` - Full stack trace if available
  - `context` - JSONB with extra metadata (user phone, page, action, etc.)
  - `severity` - critical, error, warning, info
  - `user_phone` - Phone of affected user (nullable)
  - `session_token` - Session token reference (nullable)
  - `resolved` - Whether the error has been acknowledged/resolved
  - `created_at` - When the error occurred

  ## Security
  - RLS enabled
  - Anon users can INSERT only (to report errors)
  - Admins can SELECT and UPDATE (to review and resolve)
  - No user can read other users' errors

  ## Notes
  - Errors are retained for 90 days (cleanup via cron or manual)
  - Index on error_type + severity + created_at for fast admin queries
*/

CREATE TABLE IF NOT EXISTS error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type text NOT NULL CHECK (error_type IN (
    'db_error', 'deal_failure', 'match_failure', 
    'network_error', 'session_error', 'ui_error', 'other'
  )),
  error_code text,
  message text NOT NULL,
  stack_trace text,
  context jsonb DEFAULT '{}',
  severity text NOT NULL DEFAULT 'error' CHECK (severity IN ('critical', 'error', 'warning', 'info')),
  user_phone text,
  session_token text,
  resolved boolean NOT NULL DEFAULT false,
  resolved_by text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_error_logs_type_severity 
  ON error_logs (error_type, severity, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_error_logs_user_phone 
  ON error_logs (user_phone, created_at DESC) 
  WHERE user_phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_error_logs_unresolved 
  ON error_logs (resolved, severity, created_at DESC) 
  WHERE resolved = false;

CREATE INDEX IF NOT EXISTS idx_error_logs_created_at 
  ON error_logs (created_at DESC);

CREATE POLICY "Anyone can insert error logs"
  ON error_logs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view all error logs"
  ON error_logs
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

CREATE POLICY "Admins can update error logs"
  ON error_logs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_staff
      WHERE admin_staff.email = (current_setting('request.jwt.claims', true)::json ->> 'email')
        AND admin_staff.is_active = true
        AND admin_staff.is_locked = false
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_staff
      WHERE admin_staff.email = (current_setting('request.jwt.claims', true)::json ->> 'email')
        AND admin_staff.is_active = true
        AND admin_staff.is_locked = false
    )
  );

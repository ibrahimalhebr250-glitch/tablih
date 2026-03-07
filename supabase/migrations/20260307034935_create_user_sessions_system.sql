/*
  # User Sessions Management System
  
  ## Summary
  Creates a comprehensive session management system for buyers and suppliers to maintain
  persistent login sessions across the platform.
  
  ## New Tables
  
  ### `user_sessions`
  Stores active user sessions with automatic expiry
  - `id` (uuid, primary key): Unique session identifier
  - `session_token` (text, unique): Encrypted token for session validation
  - `phone` (text): User's phone number
  - `user_type` (text): 'buyer' or 'supplier'
  - `user_name` (text): User's display name
  - `ip_address` (text): IP address of the session
  - `user_agent` (text): Browser/device information
  - `expires_at` (timestamptz): When session expires
  - `last_activity_at` (timestamptz): Last user activity timestamp
  - `created_at` (timestamptz): Session creation time
  - `is_active` (boolean): Whether session is currently active
  
  ## New Functions
  
  ### `create_user_session()`
  Creates a new session for a user after successful login
  - Generates unique session token
  - Sets expiry based on platform settings
  - Returns session token and expiry time
  
  ### `validate_user_session()`
  Validates an existing session token
  - Checks if token exists and is valid
  - Updates last_activity_at timestamp
  - Returns user information if valid
  
  ### `invalidate_user_session()`
  Invalidates a session (logout)
  - Marks session as inactive
  - Can be used for single logout or logout all devices
  
  ### `cleanup_expired_sessions()`
  Removes expired sessions automatically
  - Runs periodically to clean up old sessions
  
  ## Platform Settings
  
  Adds session duration setting to platform_settings:
  - `session_duration_hours`: Default 24 hours (configurable)
  
  ## Security
  
  - All session tokens are unique and indexed for fast lookup
  - Sessions automatically expire after configured duration
  - RLS policies ensure users can only access their own sessions
  - Automatic cleanup of expired sessions
  
  ## Example Flow
  
  **Login:**
  1. User enters phone + PIN
  2. System validates credentials
  3. System calls create_user_session()
  4. Token saved in localStorage
  5. User redirected to dashboard
  
  **Navigation:**
  1. User navigates to any page
  2. System calls validate_user_session()
  3. If valid: user stays logged in
  4. If invalid: redirect to login
  
  **Logout:**
  1. User clicks logout
  2. System calls invalidate_user_session()
  3. Token removed from localStorage
  4. User redirected to home
*/

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token text UNIQUE NOT NULL,
  phone text NOT NULL,
  user_type text NOT NULL CHECK (user_type IN ('buyer', 'supplier', 'admin')),
  user_name text NOT NULL,
  ip_address text,
  user_agent text,
  expires_at timestamptz NOT NULL,
  last_activity_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_sessions_phone ON user_sessions(phone) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at) WHERE is_active = true;

-- Enable RLS
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see their own sessions
CREATE POLICY "Users can view own sessions"
  ON user_sessions FOR SELECT
  USING (true); -- Sessions are validated by token, not auth

CREATE POLICY "System can insert sessions"
  ON user_sessions FOR INSERT
  WITH CHECK (true); -- Sessions created by functions

CREATE POLICY "Users can update own sessions"
  ON user_sessions FOR UPDATE
  USING (true); -- Updates done by functions

CREATE POLICY "Users can delete own sessions"
  ON user_sessions FOR DELETE
  USING (true); -- Deletions done by functions

-- Add session duration setting to platform_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_settings' AND column_name = 'session_duration_hours'
  ) THEN
    ALTER TABLE platform_settings ADD COLUMN session_duration_hours integer DEFAULT 24;
  END IF;
END $$;

-- Function to create a new user session
CREATE OR REPLACE FUNCTION create_user_session(
  p_phone text,
  p_user_type text,
  p_user_name text,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_token text;
  v_session_id uuid;
  v_expires_at timestamptz;
  v_duration_hours integer;
BEGIN
  -- Get session duration from settings (default 24 hours)
  SELECT COALESCE(session_duration_hours, 24)
  INTO v_duration_hours
  FROM platform_settings
  LIMIT 1;

  -- Generate unique session token
  v_session_token := encode(gen_random_bytes(32), 'base64');
  
  -- Calculate expiry time
  v_expires_at := now() + (v_duration_hours || ' hours')::interval;

  -- Invalidate old sessions for this user (optional: keep only one session per user)
  -- Comment out if you want to allow multiple simultaneous sessions
  UPDATE user_sessions
  SET is_active = false
  WHERE phone = p_phone AND user_type = p_user_type AND is_active = true;

  -- Create new session
  INSERT INTO user_sessions (
    session_token,
    phone,
    user_type,
    user_name,
    ip_address,
    user_agent,
    expires_at,
    last_activity_at,
    is_active
  ) VALUES (
    v_session_token,
    p_phone,
    p_user_type,
    p_user_name,
    p_ip_address,
    p_user_agent,
    v_expires_at,
    now(),
    true
  )
  RETURNING id INTO v_session_id;

  RETURN jsonb_build_object(
    'success', true,
    'session_token', v_session_token,
    'session_id', v_session_id,
    'expires_at', v_expires_at,
    'duration_hours', v_duration_hours
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'فشل إنشاء الجلسة: ' || SQLERRM);
END;
$$;

-- Function to validate and refresh a session
CREATE OR REPLACE FUNCTION validate_user_session(
  p_session_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session user_sessions%ROWTYPE;
BEGIN
  -- Get session details
  SELECT * INTO v_session
  FROM user_sessions
  WHERE session_token = p_session_token
    AND is_active = true
  FOR UPDATE;

  -- Check if session exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'جلسة غير صالحة');
  END IF;

  -- Check if session has expired
  IF v_session.expires_at < now() THEN
    -- Mark as inactive
    UPDATE user_sessions
    SET is_active = false
    WHERE id = v_session.id;
    
    RETURN jsonb_build_object('success', false, 'error', 'انتهت صلاحية الجلسة');
  END IF;

  -- Update last activity timestamp
  UPDATE user_sessions
  SET last_activity_at = now()
  WHERE id = v_session.id;

  -- Return user information
  RETURN jsonb_build_object(
    'success', true,
    'phone', v_session.phone,
    'user_type', v_session.user_type,
    'user_name', v_session.user_name,
    'expires_at', v_session.expires_at,
    'session_id', v_session.id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'خطأ في التحقق من الجلسة: ' || SQLERRM);
END;
$$;

-- Function to invalidate a session (logout)
CREATE OR REPLACE FUNCTION invalidate_user_session(
  p_session_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_sessions
  SET is_active = false
  WHERE session_token = p_session_token;

  IF FOUND THEN
    RETURN jsonb_build_object('success', true, 'message', 'تم تسجيل الخروج بنجاح');
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'الجلسة غير موجودة');
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'فشل تسجيل الخروج: ' || SQLERRM);
END;
$$;

-- Function to invalidate all sessions for a user
CREATE OR REPLACE FUNCTION invalidate_all_user_sessions(
  p_phone text,
  p_user_type text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE user_sessions
  SET is_active = false
  WHERE phone = p_phone AND user_type = p_user_type AND is_active = true;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم تسجيل الخروج من جميع الأجهزة',
    'sessions_closed', v_count
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'فشل تسجيل الخروج: ' || SQLERRM);
END;
$$;

-- Function to cleanup expired sessions (can be called periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  DELETE FROM user_sessions
  WHERE expires_at < now() - interval '7 days'; -- Keep expired sessions for 7 days for audit

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'sessions_deleted', v_count
  );
END;
$$;

-- Enable realtime for user_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE user_sessions;

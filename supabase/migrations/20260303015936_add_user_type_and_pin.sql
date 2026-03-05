/*
  # Add user_type and pin_hash to platform_users

  1. Modified Tables
    - `platform_users`
      - `user_type` (text) - 'company' or 'individual'
      - `pin_hash` (text) - hashed 4-digit PIN for login

  2. Notes
    - user_type allows distinguishing between company and individual accounts
    - pin_hash stores a SHA-256 hash of the 4-digit PIN (never stored in plain text)
    - Both columns are nullable to support existing users
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_users' AND column_name = 'user_type'
  ) THEN
    ALTER TABLE platform_users ADD COLUMN user_type text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_users' AND column_name = 'pin_hash'
  ) THEN
    ALTER TABLE platform_users ADD COLUMN pin_hash text DEFAULT '';
  END IF;
END $$;
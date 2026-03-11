/*
  # Fix Admin Login - Enable pgcrypto extension

  The admin_staff_login function uses crypt() which requires pgcrypto extension.
  This migration enables the extension so bcrypt password verification works correctly.
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA public;

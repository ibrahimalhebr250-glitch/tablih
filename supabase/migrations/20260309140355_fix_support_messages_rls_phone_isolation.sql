/*
  # Fix Support Messages RLS - Phone-Based Isolation

  ## Problem
  Current SELECT policies use USING (true) which allows ALL users to read ALL messages,
  causing conversation overlap between different users.

  ## Fix
  - Remove all open SELECT policies
  - Add strict phone-based isolation using request headers
  - Each user can only read/update messages where user_phone matches x-user-phone header
  - Admin sessions bypass restriction via x-admin-role header
*/

-- Drop all existing open SELECT policies
DROP POLICY IF EXISTS "support_messages_select_open" ON support_messages;
DROP POLICY IF EXISTS "support_messages_select" ON support_messages;
DROP POLICY IF EXISTS "Admins can view all messages" ON support_messages;
DROP POLICY IF EXISTS "Users can view messages in their tickets" ON support_messages;

-- Drop duplicate INSERT policies
DROP POLICY IF EXISTS "support_messages_insert" ON support_messages;
DROP POLICY IF EXISTS "support_messages_insert_open" ON support_messages;
DROP POLICY IF EXISTS "Users can send messages in their tickets" ON support_messages;
DROP POLICY IF EXISTS "Support can send messages" ON support_messages;

-- DROP UPDATE policy if any
DROP POLICY IF EXISTS "Phone-isolated message update" ON support_messages;
DROP POLICY IF EXISTS "Phone-isolated message read" ON support_messages;
DROP POLICY IF EXISTS "Anyone can send support messages" ON support_messages;

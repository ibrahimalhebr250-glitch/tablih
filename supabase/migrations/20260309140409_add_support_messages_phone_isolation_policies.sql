/*
  # Add Phone-Isolated RLS Policies for Support Messages

  ## New Policies
  - SELECT: user_phone must match x-user-phone request header OR x-admin-role=admin
  - INSERT: open (required so anyone can start a conversation)
  - UPDATE: phone-isolated (for marking messages read)
*/

CREATE POLICY "Phone-isolated message read"
  ON support_messages
  FOR SELECT
  TO anon, authenticated
  USING (
    user_phone = current_setting('request.headers', true)::json->>'x-user-phone'
    OR current_setting('request.headers', true)::json->>'x-admin-role' = 'admin'
  );

CREATE POLICY "Anyone can send support messages"
  ON support_messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Phone-isolated message update"
  ON support_messages
  FOR UPDATE
  TO anon, authenticated
  USING (
    user_phone = current_setting('request.headers', true)::json->>'x-user-phone'
    OR current_setting('request.headers', true)::json->>'x-admin-role' = 'admin'
  )
  WITH CHECK (
    user_phone = current_setting('request.headers', true)::json->>'x-user-phone'
    OR current_setting('request.headers', true)::json->>'x-admin-role' = 'admin'
  );

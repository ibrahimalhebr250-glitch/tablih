/*
  # Fix support_messages table schema

  ## Problem
  The existing support_messages table was created by the live support system migration
  and has columns: ticket_id, sender_type, sender_id, sender_name, message, attachments, is_read
  
  The app code expects columns: user_phone, sender, message, image_url, is_read

  ## Solution
  Add the missing columns so both systems can coexist, and add RLS policies
  that allow the phone-based access the app needs.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'support_messages' AND column_name = 'user_phone'
  ) THEN
    ALTER TABLE support_messages ADD COLUMN user_phone text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'support_messages' AND column_name = 'sender'
  ) THEN
    ALTER TABLE support_messages ADD COLUMN sender text CHECK (sender IN ('user', 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'support_messages' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE support_messages ADD COLUMN image_url text;
  END IF;
END $$;

ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'support_messages' AND policyname = 'support_messages_select_open'
  ) THEN
    EXECUTE 'CREATE POLICY "support_messages_select_open" ON support_messages FOR SELECT TO anon, authenticated USING (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'support_messages' AND policyname = 'support_messages_insert_open'
  ) THEN
    EXECUTE 'CREATE POLICY "support_messages_insert_open" ON support_messages FOR INSERT TO anon, authenticated WITH CHECK (true)';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS user_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_phone text NOT NULL,
  display_name text DEFAULT '',
  message text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_suggestions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_suggestions' AND policyname = 'user_suggestions_insert_open'
  ) THEN
    EXECUTE 'CREATE POLICY "user_suggestions_insert_open" ON user_suggestions FOR INSERT TO anon, authenticated WITH CHECK (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_suggestions' AND policyname = 'user_suggestions_select_open'
  ) THEN
    EXECUTE 'CREATE POLICY "user_suggestions_select_open" ON user_suggestions FOR SELECT TO anon, authenticated USING (true)';
  END IF;
END $$;

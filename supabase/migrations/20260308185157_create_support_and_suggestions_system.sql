/*
  # Support Chat and Suggestions System

  ## New Tables

  1. `support_messages`
     - `id` (uuid, PK)
     - `user_phone` (text) - the user's phone
     - `sender` (text) - 'user' or 'admin'
     - `message` (text) - message content
     - `image_url` (text, nullable) - optional image attachment
     - `is_read` (boolean) - whether admin/user has read
     - `created_at` (timestamptz)

  2. `user_suggestions`
     - `id` (uuid, PK)
     - `user_phone` (text) - submitter's phone
     - `display_name` (text) - submitter's name
     - `message` (text) - the suggestion or problem report
     - `status` (text) - 'pending', 'reviewed', 'resolved'
     - `created_at` (timestamptz)

  3. `user_notification_preferences`
     - `user_phone` (text, PK)
     - `deals_notifications` (boolean)
     - `orders_notifications` (boolean)
     - `matching_notifications` (boolean)
     - `updated_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Open policies for phone-based access (no JWT dependency)
*/

CREATE TABLE IF NOT EXISTS support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_phone text NOT NULL,
  sender text NOT NULL CHECK (sender IN ('user', 'admin')),
  message text NOT NULL,
  image_url text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "support_messages_select"
  ON support_messages FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "support_messages_insert"
  ON support_messages FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS user_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_phone text NOT NULL,
  display_name text DEFAULT '',
  message text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_suggestions_insert"
  ON user_suggestions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "user_suggestions_select"
  ON user_suggestions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS user_notification_preferences (
  user_phone text PRIMARY KEY,
  deals_notifications boolean DEFAULT true,
  orders_notifications boolean DEFAULT true,
  matching_notifications boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_prefs_select"
  ON user_notification_preferences FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "notif_prefs_insert"
  ON user_notification_preferences FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "notif_prefs_update"
  ON user_notification_preferences FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

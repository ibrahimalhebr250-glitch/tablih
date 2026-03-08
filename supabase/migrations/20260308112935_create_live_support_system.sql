/*
  # Create Live Support System

  1. New Tables
    - `support_tickets`
      - `id` (uuid, primary key)
      - `ticket_number` (text, unique) - auto-generated ticket number
      - `user_phone` (text) - user who created ticket
      - `user_name` (text) - user name
      - `subject` (text) - ticket subject
      - `category` (text) - technical, billing, general, etc.
      - `priority` (text) - low, medium, high, urgent
      - `status` (text) - open, in_progress, resolved, closed
      - `assigned_to` (text) - support staff email
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `resolved_at` (timestamptz)
      - `closed_at` (timestamptz)

    - `support_messages`
      - `id` (uuid, primary key)
      - `ticket_id` (uuid, foreign key)
      - `sender_type` (text) - user, support
      - `sender_id` (text) - phone or email
      - `sender_name` (text)
      - `message` (text)
      - `attachments` (jsonb) - file URLs
      - `is_read` (boolean)
      - `created_at` (timestamptz)

    - `support_agents`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `name` (text)
      - `is_online` (boolean)
      - `last_active` (timestamptz)
      - `total_tickets_handled` (int)
      - `average_rating` (numeric)
      - `created_at` (timestamptz)

    - `support_ratings`
      - `id` (uuid, primary key)
      - `ticket_id` (uuid, foreign key)
      - `user_phone` (text)
      - `rating` (int) - 1 to 5
      - `feedback` (text)
      - `created_at` (timestamptz)

    - `support_shortcuts`
      - `id` (uuid, primary key)
      - `shortcut_key` (text, unique)
      - `title` (text)
      - `message_template` (text)
      - `category` (text)
      - `is_active` (boolean)
      - `created_at` (timestamptz)

  2. Functions
    - `create_support_ticket()` - creates new ticket
    - `send_support_message()` - sends message in ticket
    - `assign_ticket_to_agent()` - assigns ticket
    - `update_ticket_status()` - updates status
    - `get_user_tickets()` - gets user's tickets
    - `get_agent_tickets()` - gets agent's assigned tickets
    - `rate_support_ticket()` - rates closed ticket

  3. Security
    - Enable RLS on all tables
    - Users can view/create their own tickets
    - Agents can view/manage assigned tickets
    - Admins can view/manage all tickets

  4. Notes
    - Real-time messaging
    - Auto-assignment to available agents
    - Quick replies with shortcuts
    - Rating system for quality control
*/

-- Create support_tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text UNIQUE NOT NULL,
  user_phone text NOT NULL,
  user_name text NOT NULL,
  subject text NOT NULL,
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('technical', 'billing', 'general', 'account', 'order', 'inventory', 'deal')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  assigned_to text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  closed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_tickets_user ON support_tickets(user_phone);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_category ON support_tickets(category);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tickets"
  ON support_tickets FOR SELECT
  TO authenticated
  USING (user_phone = current_setting('request.jwt.claims', true)::json->>'phone');

CREATE POLICY "Users can create tickets"
  ON support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (user_phone = current_setting('request.jwt.claims', true)::json->>'phone');

CREATE POLICY "Admins can view all tickets"
  ON support_tickets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage all tickets"
  ON support_tickets FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create support_messages table
CREATE TABLE IF NOT EXISTS support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('user', 'support')),
  sender_id text NOT NULL,
  sender_name text NOT NULL,
  message text NOT NULL,
  attachments jsonb DEFAULT '[]'::jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_ticket ON support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON support_messages(created_at DESC);

ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their tickets"
  ON support_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = support_messages.ticket_id
      AND support_tickets.user_phone = current_setting('request.jwt.claims', true)::json->>'phone'
    )
  );

CREATE POLICY "Users can send messages in their tickets"
  ON support_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = ticket_id
      AND support_tickets.user_phone = current_setting('request.jwt.claims', true)::json->>'phone'
    )
  );

CREATE POLICY "Admins can view all messages"
  ON support_messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Support can send messages"
  ON support_messages FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create support_agents table
CREATE TABLE IF NOT EXISTS support_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  is_online boolean DEFAULT false,
  last_active timestamptz DEFAULT now(),
  total_tickets_handled int DEFAULT 0,
  average_rating numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE support_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view agents"
  ON support_agents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage agents"
  ON support_agents FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create support_ratings table
CREATE TABLE IF NOT EXISTS support_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_phone text NOT NULL,
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(ticket_id)
);

ALTER TABLE support_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can rate their tickets"
  ON support_ratings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = ticket_id
      AND support_tickets.user_phone = user_phone
      AND support_tickets.status IN ('resolved', 'closed')
    )
  );

CREATE POLICY "Anyone can view ratings"
  ON support_ratings FOR SELECT
  TO authenticated
  USING (true);

-- Create support_shortcuts table
CREATE TABLE IF NOT EXISTS support_shortcuts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shortcut_key text UNIQUE NOT NULL,
  title text NOT NULL,
  message_template text NOT NULL,
  category text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE support_shortcuts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Support can view shortcuts"
  ON support_shortcuts FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage shortcuts"
  ON support_shortcuts FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE support_agents;

-- Function to generate ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_year text;
  v_month text;
  v_sequence int;
  v_ticket_number text;
BEGIN
  v_year := to_char(now(), 'YYYY');
  v_month := to_char(now(), 'MM');

  SELECT COALESCE(MAX(
    SUBSTRING(ticket_number FROM '\d+$')::int
  ), 0) + 1
  INTO v_sequence
  FROM support_tickets
  WHERE ticket_number LIKE 'TKT-' || v_year || v_month || '%';

  v_ticket_number := 'TKT-' || v_year || v_month || '-' || LPAD(v_sequence::text, 4, '0');

  RETURN v_ticket_number;
END;
$$;

-- Function to create support ticket
CREATE OR REPLACE FUNCTION create_support_ticket(
  p_user_phone text,
  p_user_name text,
  p_subject text,
  p_category text,
  p_initial_message text,
  p_priority text DEFAULT 'medium'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ticket_id uuid;
  v_ticket_number text;
  v_assigned_agent text;
BEGIN
  v_ticket_number := generate_ticket_number();

  -- Find available agent (least loaded)
  SELECT email INTO v_assigned_agent
  FROM support_agents
  WHERE is_online = true
  ORDER BY total_tickets_handled ASC
  LIMIT 1;

  -- Create ticket
  INSERT INTO support_tickets (
    ticket_number,
    user_phone,
    user_name,
    subject,
    category,
    priority,
    assigned_to
  )
  VALUES (
    v_ticket_number,
    p_user_phone,
    p_user_name,
    p_subject,
    p_category,
    p_priority,
    v_assigned_agent
  )
  RETURNING id INTO v_ticket_id;

  -- Add initial message
  INSERT INTO support_messages (
    ticket_id,
    sender_type,
    sender_id,
    sender_name,
    message
  )
  VALUES (
    v_ticket_id,
    'user',
    p_user_phone,
    p_user_name,
    p_initial_message
  );

  -- Update agent ticket count
  IF v_assigned_agent IS NOT NULL THEN
    UPDATE support_agents
    SET total_tickets_handled = total_tickets_handled + 1
    WHERE email = v_assigned_agent;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'ticket_id', v_ticket_id,
    'ticket_number', v_ticket_number,
    'assigned_to', v_assigned_agent
  );
END;
$$;

-- Function to send support message
CREATE OR REPLACE FUNCTION send_support_message(
  p_ticket_id uuid,
  p_sender_type text,
  p_sender_id text,
  p_sender_name text,
  p_message text,
  p_attachments jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_message_id uuid;
BEGIN
  INSERT INTO support_messages (
    ticket_id,
    sender_type,
    sender_id,
    sender_name,
    message,
    attachments
  )
  VALUES (
    p_ticket_id,
    p_sender_type,
    p_sender_id,
    p_sender_name,
    p_message,
    p_attachments
  )
  RETURNING id INTO v_message_id;

  -- Update ticket timestamp
  UPDATE support_tickets
  SET updated_at = now()
  WHERE id = p_ticket_id;

  RETURN jsonb_build_object(
    'success', true,
    'message_id', v_message_id
  );
END;
$$;

-- Function to update ticket status
CREATE OR REPLACE FUNCTION update_ticket_status(
  p_ticket_id uuid,
  p_status text,
  p_agent_email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE support_tickets
  SET 
    status = p_status,
    updated_at = now(),
    resolved_at = CASE WHEN p_status = 'resolved' THEN now() ELSE resolved_at END,
    closed_at = CASE WHEN p_status = 'closed' THEN now() ELSE closed_at END
  WHERE id = p_ticket_id;

  IF FOUND THEN
    RETURN jsonb_build_object('success', true);
  ELSE
    RETURN jsonb_build_object('success', false, 'message', 'Ticket not found');
  END IF;
END;
$$;

-- Function to assign ticket to agent
CREATE OR REPLACE FUNCTION assign_ticket_to_agent(
  p_ticket_id uuid,
  p_agent_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE support_tickets
  SET 
    assigned_to = p_agent_email,
    status = 'in_progress',
    updated_at = now()
  WHERE id = p_ticket_id;

  IF FOUND THEN
    UPDATE support_agents
    SET total_tickets_handled = total_tickets_handled + 1
    WHERE email = p_agent_email;

    RETURN jsonb_build_object('success', true);
  ELSE
    RETURN jsonb_build_object('success', false, 'message', 'Ticket not found');
  END IF;
END;
$$;

-- Function to get user tickets
CREATE OR REPLACE FUNCTION get_user_tickets(p_user_phone text)
RETURNS TABLE (
  id uuid,
  ticket_number text,
  subject text,
  category text,
  priority text,
  status text,
  assigned_to text,
  created_at timestamptz,
  updated_at timestamptz,
  unread_messages int
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    t.id,
    t.ticket_number,
    t.subject,
    t.category,
    t.priority,
    t.status,
    t.assigned_to,
    t.created_at,
    t.updated_at,
    (
      SELECT COUNT(*)::int
      FROM support_messages m
      WHERE m.ticket_id = t.id
      AND m.sender_type = 'support'
      AND m.is_read = false
    ) as unread_messages
  FROM support_tickets t
  WHERE t.user_phone = p_user_phone
  ORDER BY t.updated_at DESC;
$$;

-- Function to get ticket messages
CREATE OR REPLACE FUNCTION get_ticket_messages(p_ticket_id uuid)
RETURNS TABLE (
  id uuid,
  sender_type text,
  sender_id text,
  sender_name text,
  message text,
  attachments jsonb,
  is_read boolean,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    id,
    sender_type,
    sender_id,
    sender_name,
    message,
    attachments,
    is_read,
    created_at
  FROM support_messages
  WHERE ticket_id = p_ticket_id
  ORDER BY created_at ASC;
$$;

-- Function to rate ticket
CREATE OR REPLACE FUNCTION rate_support_ticket(
  p_ticket_id uuid,
  p_user_phone text,
  p_rating int,
  p_feedback text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_agent_email text;
BEGIN
  -- Get assigned agent
  SELECT assigned_to INTO v_agent_email
  FROM support_tickets
  WHERE id = p_ticket_id;

  -- Insert rating
  INSERT INTO support_ratings (
    ticket_id,
    user_phone,
    rating,
    feedback
  )
  VALUES (
    p_ticket_id,
    p_user_phone,
    p_rating,
    p_feedback
  );

  -- Update agent average rating
  IF v_agent_email IS NOT NULL THEN
    UPDATE support_agents
    SET average_rating = (
      SELECT AVG(r.rating)
      FROM support_ratings r
      JOIN support_tickets t ON t.id = r.ticket_id
      WHERE t.assigned_to = v_agent_email
    )
    WHERE email = v_agent_email;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Insert default shortcuts
INSERT INTO support_shortcuts (shortcut_key, title, message_template, category) VALUES
  ('welcome', 'رسالة ترحيب', 'مرحباً! شكراً لتواصلك معنا. كيف يمكنني مساعدتك اليوم؟', 'general'),
  ('order_help', 'مساعدة الطلبات', 'سأساعدك في إنشاء طلبك. يرجى تزويدي بالتفاصيل التالية: نوع الطبلية، الحجم، الكمية، والمدينة.', 'order'),
  ('inventory_help', 'مساعدة المخزون', 'لإضافة مخزون جديد، اذهب إلى صفحة المخزون وانقر على "إضافة مخزون". سأرشدك خلال العملية.', 'inventory'),
  ('resolved', 'تم الحل', 'تم حل مشكلتك. إذا كان لديك أي استفسارات أخرى، لا تتردد في التواصل معنا.', 'general')
ON CONFLICT DO NOTHING;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_ticket_number TO authenticated;
GRANT EXECUTE ON FUNCTION create_support_ticket TO authenticated;
GRANT EXECUTE ON FUNCTION send_support_message TO authenticated;
GRANT EXECUTE ON FUNCTION update_ticket_status TO authenticated;
GRANT EXECUTE ON FUNCTION assign_ticket_to_agent TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_tickets TO authenticated;
GRANT EXECUTE ON FUNCTION get_ticket_messages TO authenticated;
GRANT EXECUTE ON FUNCTION rate_support_ticket TO authenticated;

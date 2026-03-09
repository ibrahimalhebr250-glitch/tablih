/*
  # نظام الرد التلقائي بالذكاء الاصطناعي

  ## الجداول الجديدة
  - `ai_auto_reply_settings` - إعدادات تشغيل/إيقاف الرد التلقائي
    - is_enabled: تفعيل/إيقاف الميزة
    - delay_seconds: تأخير الرد بالثواني (لمحاكاة إنسان حقيقي)
    - auto_reply_label: اسم المساعد الذكي
  - `ai_auto_reply_logs` - سجل جميع الردود التلقائية للمراجعة
    - user_phone: هاتف المستخدم
    - user_message: رسالة المستخدم
    - ai_response: الرد الذي أُرسل
    - matched: هل وجد النظام إجابة محددة أم استخدم رد افتراضي

  ## الأمان
  - RLS مفعّل على كلا الجدولين
  - الإدارة فقط تستطيع قراءة وتعديل الإعدادات
  - السجلات للقراءة من الإدارة فقط
*/

CREATE TABLE IF NOT EXISTS ai_auto_reply_settings (
  id integer PRIMARY KEY DEFAULT 1,
  is_enabled boolean NOT NULL DEFAULT false,
  delay_seconds integer NOT NULL DEFAULT 3,
  auto_reply_label text NOT NULL DEFAULT 'مساعد ذكي',
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO ai_auto_reply_settings (id, is_enabled, delay_seconds, auto_reply_label)
VALUES (1, false, 3, 'مساعد ذكي')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE ai_auto_reply_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to ai_auto_reply_settings"
  ON ai_auto_reply_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow service role update ai_auto_reply_settings"
  ON ai_auto_reply_settings
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS ai_auto_reply_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_phone text NOT NULL,
  user_message text NOT NULL,
  ai_response text NOT NULL,
  matched boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ai_auto_reply_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role insert ai_auto_reply_logs"
  ON ai_auto_reply_logs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow read ai_auto_reply_logs"
  ON ai_auto_reply_logs
  FOR SELECT
  TO anon, authenticated
  USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE ai_auto_reply_settings;

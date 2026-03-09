/*
  # إضافة عمود match_source وdunction لعد الاستخدام

  ## التغييرات
  - إضافة عمود `match_source` إلى جدول `ai_auto_reply_logs` لتتبع مصدر الرد
  - إضافة دالة `increment_knowledge_usage` لزيادة عداد استخدام قاعدة المعرفة
  - إضافة عمود `platform_name` لجدول `ai_auto_reply_settings`
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_auto_reply_logs' AND column_name = 'match_source'
  ) THEN
    ALTER TABLE ai_auto_reply_logs ADD COLUMN match_source text DEFAULT 'fallback';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_auto_reply_settings' AND column_name = 'platform_name'
  ) THEN
    ALTER TABLE ai_auto_reply_settings ADD COLUMN platform_name text NOT NULL DEFAULT 'شبكة الطبليات الوطنية';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION increment_knowledge_usage(entry_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE ai_knowledge_base
  SET usage_count = usage_count + 1, updated_at = now()
  WHERE id = entry_id;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_knowledge_usage(uuid) TO anon, authenticated;

/*
  # إصلاح قيود NOT NULL في جدول support_messages

  ## المشكلة
  الجدول يحتوي على أعمدة من نظام الـ tickets القديم (sender_type, sender_id, sender_name)
  بقيود NOT NULL بدون قيم افتراضية، مما يمنع إرسال الرسائل من نظام الدردشة الجديد.

  ## الحل
  إضافة قيم افتراضية لهذه الأعمدة حتى لا يتأثر الكود الجديد البسيط.
*/

ALTER TABLE support_messages
  ALTER COLUMN sender_type SET DEFAULT 'user',
  ALTER COLUMN sender_id SET DEFAULT '',
  ALTER COLUMN sender_name SET DEFAULT '';

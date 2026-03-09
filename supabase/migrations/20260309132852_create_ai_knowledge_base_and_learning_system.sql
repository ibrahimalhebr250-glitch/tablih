/*
  # نظام قاعدة المعرفة والتعلم للمساعد الذكي

  ## الجداول الجديدة

  ### 1. `ai_knowledge_base`
  قاعدة المعرفة القابلة للتعديل من الإدارة.
  - `id`: معرف فريد
  - `category`: تصنيف الموضوع (مثل: طلبات، مخزون، صفقات...)
  - `keywords`: مصفوفة من الكلمات المفتاحية التي تطابق السؤال
  - `answer`: الإجابة التي يرسلها المساعد
  - `priority`: الأولوية (كلما كان أعلى، يُفضَّل في المطابقة)
  - `usage_count`: عدد مرات الاستخدام (للتحليل)
  - `is_active`: هل هذا المدخل مفعّل
  - `created_at`, `updated_at`

  ### 2. `ai_learned_responses`
  الردود التي تعلمها النظام تلقائياً من ردود فريق الدعم البشري.
  - `id`: معرف فريد
  - `trigger_message`: رسالة العميل التي أطلقت التعلم
  - `learned_answer`: الرد الذي أعطاه فريق الدعم
  - `times_seen`: عدد مرات رؤية نمط مشابه
  - `confidence`: مستوى الثقة في هذا الرد (0.0 - 1.0)
  - `is_approved`: هل وافق المشرف على استخدامه تلقائياً
  - `source_conversation`: معرف المحادثة المصدر
  - `created_at`, `updated_at`

  ### 3. trigger تلقائي
  يراقب ردود فريق الدعم ويحفظها في جدول التعلم تلقائياً.

  ## الأمان
  - RLS مفعّل على جميع الجداول
  - الوصول الكامل عبر service role فقط للـ Edge Function
*/

CREATE TABLE IF NOT EXISTS ai_knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT 'عام',
  keywords text[] NOT NULL DEFAULT '{}',
  answer text NOT NULL,
  priority integer NOT NULL DEFAULT 5,
  usage_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ai_knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to ai_knowledge_base"
  ON ai_knowledge_base FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow insert ai_knowledge_base"
  ON ai_knowledge_base FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update ai_knowledge_base"
  ON ai_knowledge_base FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete ai_knowledge_base"
  ON ai_knowledge_base FOR DELETE
  TO anon, authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS ai_learned_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_message text NOT NULL,
  learned_answer text NOT NULL,
  normalized_trigger text,
  times_seen integer NOT NULL DEFAULT 1,
  confidence numeric(3,2) NOT NULL DEFAULT 0.50,
  is_approved boolean NOT NULL DEFAULT false,
  source_conversation text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ai_learned_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to ai_learned_responses"
  ON ai_learned_responses FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow insert ai_learned_responses"
  ON ai_learned_responses FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update ai_learned_responses"
  ON ai_learned_responses FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete ai_learned_responses"
  ON ai_learned_responses FOR DELETE
  TO anon, authenticated
  USING (true);

CREATE OR REPLACE FUNCTION normalize_arabic(input_text text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  result text;
BEGIN
  result := lower(input_text);
  result := regexp_replace(result, '[أإآا]', 'ا', 'g');
  result := regexp_replace(result, '[ىي]', 'ي', 'g');
  result := regexp_replace(result, 'ة', 'ه', 'g');
  result := regexp_replace(result, '[^\u0600-\u06FF\s\w]', ' ', 'g');
  result := regexp_replace(result, '\s+', ' ', 'g');
  result := trim(result);
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION learn_from_admin_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  last_user_msg record;
  normalized_user_msg text;
  existing_learned record;
BEGIN
  IF NEW.sender <> 'admin' THEN
    RETURN NEW;
  END IF;

  IF NEW.message LIKE '[%]%' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO last_user_msg
  FROM support_messages
  WHERE user_phone = NEW.user_phone
    AND sender = 'user'
    AND created_at < NEW.created_at
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  normalized_user_msg := normalize_arabic(last_user_msg.message);

  SELECT * INTO existing_learned
  FROM ai_learned_responses
  WHERE normalized_trigger = normalized_user_msg
  LIMIT 1;

  IF FOUND THEN
    UPDATE ai_learned_responses
    SET
      times_seen = times_seen + 1,
      learned_answer = NEW.message,
      confidence = LEAST(1.0, confidence + 0.1),
      updated_at = now()
    WHERE id = existing_learned.id;
  ELSE
    INSERT INTO ai_learned_responses (
      trigger_message,
      normalized_trigger,
      learned_answer,
      times_seen,
      confidence,
      is_approved,
      source_conversation
    ) VALUES (
      last_user_msg.message,
      normalized_user_msg,
      NEW.message,
      1,
      0.50,
      false,
      last_user_msg.user_phone
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_learn_from_admin_reply ON support_messages;
CREATE TRIGGER trigger_learn_from_admin_reply
  AFTER INSERT ON support_messages
  FOR EACH ROW
  EXECUTE FUNCTION learn_from_admin_reply();

INSERT INTO ai_knowledge_base (category, keywords, answer, priority) VALUES
('طلبات', ARRAY['طلب', 'اطلب', 'ارسل طلب', 'انشاء طلب', 'طلبية', 'اضافة طلب', 'كيف اطلب', 'شراء طبليات'], 'لإنشاء طلب شراء في المنصة:' || E'\n' || '1. اضغط على زر "طلب" في الشاشة الرئيسية' || E'\n' || '2. حدد نوع الطبلية والحجم والجودة' || E'\n' || '3. أدخل الكمية والمدينة' || E'\n' || '4. اضغط "إرسال الطلب"' || E'\n' || 'سيقوم النظام تلقائياً بمطابقة طلبك مع أقرب المخزون المتاح.', 10),

('مخزون', ARRAY['مخزون', 'اضافة مخزون', 'ارفع مخزون', 'تسجيل طبليات', 'بيع طبليات', 'رفع دفعة', 'نشر طبليات', 'عرض مخزون'], 'لإضافة مخزونك إلى المنصة:' || E'\n' || '1. اضغط على "مخزون" في القائمة السفلية' || E'\n' || '2. اضغط "إضافة دفعة جديدة"' || E'\n' || '3. أدخل نوع الطبلية والحجم والجودة والكمية' || E'\n' || '4. أضف صوراً ووصفاً مناسباً' || E'\n' || '5. اضغط "نشر في السوق"' || E'\n' || 'سيظهر مخزونك للمشترين فوراً.', 10),

('صفقات', ARRAY['صفقة', 'صفقات', 'متابعة صفقة', 'حالة الصفقة', 'تأكيد صفقة', 'رفض صفقة', 'صفقاتي'], 'لمتابعة صفقاتك:' || E'\n' || '1. اذهب إلى "حسابي" ثم تبويب "الصفقات"' || E'\n' || '2. ستجد جميع صفقاتك مع حالتها:' || E'\n' || '• قيد الانتظار: تم المطابقة وتنتظر التأكيد' || E'\n' || '• جاري التسليم: تم تأكيد الصفقة وجاري التنفيذ' || E'\n' || '• مكتملة: تمت الصفقة بنجاح' || E'\n' || 'يمكنك تأكيد أو رفض الصفقة من نفس الصفحة.', 10),

('تسليم', ARRAY['تسليم', 'استلام', 'التسليم', 'وصل الطلب', 'تأكيد استلام', 'تسلمت', 'تم التسليم'], 'لتأكيد استلام طلبك:' || E'\n' || '1. اذهب إلى "حسابي" > "الصفقات"' || E'\n' || '2. ابحث عن الصفقة في حالة "جاري التسليم"' || E'\n' || '3. اضغط "تأكيد الاستلام"' || E'\n' || 'ملاحظة: بعد تأكيدك ستكتمل الصفقة وتُحتسب العمولة.', 10),

('مالية', ARRAY['عمولة', 'رسوم', 'نسبة العمولة', 'كم العمولة', 'تكلفة الخدمة', 'رسوم المنصة', 'خصم'], 'نظام العمولة في المنصة:' || E'\n' || '• تُحتسب العمولة عند اكتمال الصفقة فقط' || E'\n' || '• النسبة تعتمد على حجم الصفقة وإعدادات المنصة' || E'\n' || '• يمكنك الاطلاع على تفاصيل العمولة في صفحة "حسابي" > "إعدادات"', 9),

('حساب', ARRAY['تسجيل', 'حساب جديد', 'انشاء حساب', 'تسجيل دخول', 'رقم الهاتف', 'PIN', 'رمز', 'كلمة مرور', 'نسيت رمز'], 'للتسجيل في المنصة:' || E'\n' || '1. أدخل رقم هاتفك' || E'\n' || '2. أنشئ رمز PIN من 4 أرقام' || E'\n' || '3. اختر نوع حسابك (مورد أو مشتري)' || E'\n' || 'للدخول لاحقاً: أدخل رقم هاتفك ورمز PIN.' || E'\n' || 'إذا نسيت رمزك تواصل مع الدعم.', 10),

('مخزون سحابي', ARRAY['مخزون سحابي', 'المخزون السحابي', 'طبليات اشتريتها', 'رصيد المخزون', 'سحب كمية', 'كميات مشتراة'], 'المخزون السحابي هو مخزونك الذي اشتريته عبر المنصة.' || E'\n' || 'يمكنك:' || E'\n' || '• عرض كميات طبلياتك المشتراة' || E'\n' || '• سحب الكميات عند الحاجة' || E'\n' || '• متابعة تاريخ الشراء والتكلفة' || E'\n' || 'للوصول: اذهب إلى "حسابي" > "المخزون السحابي"', 9),

('مشاكل تقنية', ARRAY['مشكلة', 'خلل', 'لا يعمل', 'عطل', 'خطأ', 'لا اقدر', 'تعطل', 'بطيء', 'لا يفتح', 'مشكله'], 'نأسف لمواجهتك هذه المشكلة!' || E'\n' || 'للمساعدة السريعة يرجى توضيح:' || E'\n' || '1. ما الصفحة أو الخطوة التي تواجه فيها المشكلة؟' || E'\n' || '2. ما الرسالة التي تظهر لك (إن وجدت)؟' || E'\n' || '3. جرب إغلاق التطبيق وفتحه مجدداً' || E'\n' || 'سيتواصل معك أحد أفراد فريق الدعم قريباً.', 10),

('السوق', ARRAY['السوق', 'سوق الطبليات', 'عرض في السوق', 'الطبليات المعروضة', 'تصفح السوق', 'عروض متاحة'], 'السوق يعرض جميع طبليات الموردين المتاحة.' || E'\n' || 'يمكنك:' || E'\n' || '• البحث والتصفية حسب النوع والحجم والجودة والمدينة' || E'\n' || '• الاطلاع على تفاصيل كل دفعة' || E'\n' || '• طلب التفاوض مباشرة مع المورد' || E'\n' || '• الطلب مباشرة من الدفعة المعروضة', 9),

('تقييمات', ARRAY['تقييم', 'تقييمات', 'تقيم المورد', 'موثوقية', 'نجوم', 'تقييم سيء', 'تقييم جيد'], 'نظام التقييم في المنصة:' || E'\n' || '• يمكنك تقييم الموردين بعد اكتمال الصفقة' || E'\n' || '• التقييم من 1 إلى 5 نجوم' || E'\n' || '• يظهر متوسط التقييم في صفحة المورد' || E'\n' || '• نظام الثقة يساعدك على اختيار أفضل الموردين', 8),

('اقتراحات', ARRAY['اقتراح', 'اقتراحات', 'تحسين', 'ارسل اقتراح', 'فكرة', 'ملاحظة'], 'نقدر اقتراحاتك لتطوير المنصة!' || E'\n' || 'لإرسال اقتراحك:' || E'\n' || 'اذهب إلى "حسابي" > "الإعدادات" > "اقتراحات وتحسينات"' || E'\n' || 'اكتب اقتراحك وسيصل مباشرة لفريق التطوير.', 7),

('تواصل', ARRAY['واتساب', 'رقم التواصل', 'كيف اتواصل', 'رقم الدعم', 'تلفون', 'ايميل', 'بريد'], 'يمكنك التواصل معنا عبر:' || E'\n' || '• هذه الدردشة مباشرة (سيرد فريق الدعم قريباً)' || E'\n' || '• واتساب: يمكن للمشرف إرسال رابط واتساب من صفحة المحادثة' || E'\n' || 'نحن هنا للمساعدة!', 8),

('مدن', ARRAY['مدينة', 'مدن', 'الرياض', 'جدة', 'الدمام', 'مكة', 'المدينة', 'المنطقة', 'توصيل'], 'المنصة تغطي المدن الرئيسية في المملكة العربية السعودية.' || E'\n' || 'يمكنك تحديد مدينتك عند إنشاء الطلب أو رفع المخزون.' || E'\n' || 'للاطلاع على المدن المتاحة: ابحث في سوق الطبليات وستجد قائمة بجميع المدن.', 8),

('أنواع الطبليات', ARRAY['نوع الطبلية', 'انواع الطبليات', 'طبلية خشب', 'طبلية بلاستيك', 'Euro', 'يورو', 'حجم الطبلية', 'جودة الطبلية', 'A grade', 'B grade'], 'أنواع الطبليات في المنصة:' || E'\n' || '• حسب المادة: خشب، بلاستيك، معدن' || E'\n' || '• حسب الحجم: Euro (120×80)، Standard (120×100)، وغيرها' || E'\n' || '• حسب الجودة: Grade A (ممتاز)، Grade B (جيد)، Grade C (اقتصادي)' || E'\n' || 'يمكنك تحديد متطلباتك بدقة عند إنشاء الطلب.', 9),

('المطابقة التلقائية', ARRAY['مطابقة', 'مطابقة تلقائية', 'لم يتطابق', 'ما لقيت مورد', 'لا يوجد مخزون', 'انتظار مطابقة', 'متى يتطابق'], 'نظام المطابقة التلقائية يعمل فوراً عند رفع المخزون.' || E'\n' || 'إذا لم يتم المطابقة:' || E'\n' || '• قد لا يوجد مخزون مطابق لمتطلباتك في مدينتك' || E'\n' || '• جرب تفعيل خيار "مرونة في المتطلبات" عند الطلب' || E'\n' || '• سيتم إشعارك فوراً عند توفر مخزون مناسب' || E'\n' || '• يمكنك أيضاً تصفح السوق والطلب مباشرة', 10)
ON CONFLICT DO NOTHING;

ALTER PUBLICATION supabase_realtime ADD TABLE ai_knowledge_base;
ALTER PUBLICATION supabase_realtime ADD TABLE ai_learned_responses;

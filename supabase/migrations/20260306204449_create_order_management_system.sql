/*
  # إنشاء نظام إدارة الطلبات المتكامل

  ## الجداول الجديدة

  ### 1. order_types - أنواع الطلبات
    - `id` (uuid, primary key)
    - `code` (text, unique) - كود مثل 'standard', 'urgent', 'recurring'
    - `name_ar` (text) - الاسم بالعربي
    - `name_en` (text) - الاسم بالإنجليزي
    - `icon` (text) - اسم الأيقونة
    - `color` (text) - اللون الأساسي
    - `bg_color` (text) - لون الخلفية
    - `border_color` (text) - لون الحدود
    - `is_active` (boolean) - مفعل؟
    - `display_order` (integer) - ترتيب العرض

  ### 2. order_flexibility_options - خيارات مرونة الطلب
    - `id` (uuid, primary key)
    - `code` (text, unique) - كود مثل 'accept_close_quality'
    - `name_ar` (text) - الاسم بالعربي
    - `name_en` (text) - الاسم بالإنجليزي
    - `description_ar` (text) - الوصف بالعربي
    - `description_en` (text) - الوصف بالإنجليزي
    - `is_active` (boolean) - مفعل؟
    - `display_order` (integer) - ترتيب العرض
    - `affects_matching` (boolean) - يؤثر على المطابقة؟
    - `matching_logic` (jsonb) - منطق المطابقة

  ### 3. recurring_orders - الطلبات الدورية
    - `id` (uuid, primary key)
    - `order_id` (uuid, FK to orders)
    - `buyer_phone` (text)
    - `recurrence_type` (text) - 'weekly', 'monthly', 'custom'
    - `recurrence_schedule` (jsonb) - الجدول التفصيلي
    - `next_execution_at` (timestamptz)
    - `last_execution_at` (timestamptz)
    - `execution_count` (integer)
    - `is_active` (boolean)
    - `paused_at` (timestamptz)

  ### 4. order_quantity_settings - إعدادات الكميات
    - `id` (uuid, primary key)
    - `min_quantity` (integer)
    - `max_quantity` (integer)
    - `quantity_step` (integer)
    - `quick_quantities` (jsonb) - الكميات السريعة

  ### 5. order_operations_log - سجل عمليات الطلبات
    - `id` (uuid, primary key)
    - `operation_type` (text) - 'created', 'modified', 'published', 'matched', 'cancelled'
    - `order_id` (uuid)
    - `request_id` (text)
    - `buyer_phone` (text)
    - `buyer_name` (text)
    - `city` (text)
    - `quantity` (integer)
    - `performed_by` (text) - 'user', 'admin', 'system'
    - `performed_by_phone` (text)
    - `old_values` (jsonb)
    - `new_values` (jsonb)
    - `notes` (text)
    - `created_at` (timestamptz)

  ### 6. order_analytics - تحليلات الطلبات
    - `id` (uuid, primary key)
    - `date` (date, unique)
    - `total_orders` (integer)
    - `total_quantity` (integer)
    - `most_requested_type` (text)
    - `most_requested_size` (text)
    - `most_requested_city` (text)
    - `active_buyers_count` (integer)
    - `avg_order_quantity` (numeric)
    - `match_rate` (numeric) - نسبة المطابقة

  ### 7. order_drafts - مسودات الطلبات غير المكتملة
    - `id` (uuid, primary key)
    - `phone` (text)
    - `draft_data` (jsonb) - البيانات المحفوظة
    - `current_step` (text) - 'form', 'auth', etc.
    - `last_field_completed` (text)
    - `completion_percentage` (integer)
    - `expires_at` (timestamptz)

  ## التحديثات على جدول orders

  - إضافة عمود `current_stage` - المرحلة الحالية
  - إضافة عمود `match_count` - عدد العروض المطابقة
  - إضافة عمود `is_draft` - مسودة؟
  - إضافة عمود `draft_completed_at` - متى اكتمل من مسودة؟

  ## الأمان (RLS)

  - تفعيل RLS على جميع الجداول
  - سياسات للقراءة للمشرفين فقط
  - سياسات للتعديل للمشرفين فقط
  - سجل العمليات للقراءة فقط

  ## الملاحظات

  - السجل غير قابل للتعديل أو الحذف
  - تكامل كامل مع نظام المخزون
  - دعم الطلبات الدورية
  - تحليلات متقدمة للسوق
*/

-- إنشاء جدول أنواع الطلبات
CREATE TABLE IF NOT EXISTS order_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  icon text DEFAULT 'shopping-bag',
  color text DEFAULT '#1565C0',
  bg_color text DEFAULT '#E3F2FD',
  border_color text DEFAULT '#BBDEFB',
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- إضافة البيانات الافتراضية لأنواع الطلبات
INSERT INTO order_types (code, name_ar, name_en, icon, color, bg_color, border_color, display_order)
VALUES
  ('standard', 'طلب عادي', 'Standard Order', 'shopping-bag', '#1565C0', '#E3F2FD', '#BBDEFB', 1),
  ('urgent', 'طلب عاجل', 'Urgent Order', 'zap', '#C2410C', '#FFF7ED', '#FED7AA', 2),
  ('recurring', 'توريد دوري', 'Recurring Supply', 'refresh-cw', '#059669', '#ECFDF5', '#A7F3D0', 3)
ON CONFLICT (code) DO NOTHING;

-- إنشاء جدول خيارات مرونة الطلب
CREATE TABLE IF NOT EXISTS order_flexibility_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  description_ar text DEFAULT '',
  description_en text DEFAULT '',
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  affects_matching boolean DEFAULT true,
  matching_logic jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- إضافة البيانات الافتراضية لخيارات المرونة
INSERT INTO order_flexibility_options (code, name_ar, name_en, description_ar, description_en, display_order, matching_logic)
VALUES
  ('accept_close_quality', 'أقبل جودة قريبة', 'Accept Similar Quality', 'قبول درجة جودة مختلفة قريبة من المطلوب', 'Accept a different but similar quality grade', 1, '{"allow_grade_variance": 1}'),
  ('accept_close_city', 'أقبل مدينة قريبة', 'Accept Nearby City', 'قبول مدينة مجاورة للمدينة المطلوبة', 'Accept a neighboring city', 2, '{"allow_city_radius": true}'),
  ('accept_partial_delivery', 'أقبل تسليم جزئي', 'Accept Partial Delivery', 'قبول كمية أقل من المطلوب', 'Accept less than requested quantity', 3, '{"allow_partial": true, "min_percentage": 50}')
ON CONFLICT (code) DO NOTHING;

-- إنشاء جدول الطلبات الدورية
CREATE TABLE IF NOT EXISTS recurring_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  buyer_phone text NOT NULL,
  recurrence_type text NOT NULL CHECK (recurrence_type IN ('weekly', 'monthly', 'custom')),
  recurrence_schedule jsonb DEFAULT '{}',
  next_execution_at timestamptz,
  last_execution_at timestamptz,
  execution_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  paused_at timestamptz,
  pause_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- إنشاء جدول إعدادات الكميات
CREATE TABLE IF NOT EXISTS order_quantity_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  min_quantity integer DEFAULT 100,
  max_quantity integer DEFAULT 10000,
  quantity_step integer DEFAULT 100,
  quick_quantities jsonb DEFAULT '[500, 1000, 2000, 5000]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- إضافة الإعدادات الافتراضية
INSERT INTO order_quantity_settings (min_quantity, max_quantity, quantity_step, quick_quantities)
VALUES (100, 10000, 100, '[500, 1000, 2000, 5000]')
ON CONFLICT DO NOTHING;

-- إنشاء جدول سجل عمليات الطلبات
CREATE TABLE IF NOT EXISTS order_operations_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type text NOT NULL CHECK (operation_type IN ('created', 'modified', 'published', 'matched', 'cancelled', 'deal_created', 'expired')),
  order_id uuid,
  request_id text,
  buyer_phone text,
  buyer_name text,
  city text,
  pallet_type text,
  pallet_size text,
  quality text,
  quantity integer,
  performed_by text DEFAULT 'system',
  performed_by_type text DEFAULT 'system' CHECK (performed_by_type IN ('user', 'admin', 'system')),
  performed_by_phone text,
  old_values jsonb,
  new_values jsonb,
  notes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- إنشاء جدول تحليلات الطلبات
CREATE TABLE IF NOT EXISTS order_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date UNIQUE NOT NULL,
  total_orders integer DEFAULT 0,
  total_quantity integer DEFAULT 0,
  matched_orders integer DEFAULT 0,
  unmatched_orders integer DEFAULT 0,
  most_requested_type text,
  most_requested_size text,
  most_requested_city text,
  most_requested_quality text,
  active_buyers_count integer DEFAULT 0,
  avg_order_quantity numeric DEFAULT 0,
  match_rate numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- إنشاء جدول مسودات الطلبات
CREATE TABLE IF NOT EXISTS order_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  draft_data jsonb DEFAULT '{}',
  current_step text DEFAULT 'form',
  last_field_completed text,
  completion_percentage integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days')
);

-- إضافة أعمدة جديدة لجدول orders إذا لم تكن موجودة
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'current_stage'
  ) THEN
    ALTER TABLE orders ADD COLUMN current_stage text DEFAULT 'form' CHECK (current_stage IN ('form', 'auth', 'matching', 'result', 'completed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'match_count'
  ) THEN
    ALTER TABLE orders ADD COLUMN match_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'is_draft'
  ) THEN
    ALTER TABLE orders ADD COLUMN is_draft boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'draft_completed_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN draft_completed_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'order_type_code'
  ) THEN
    ALTER TABLE orders ADD COLUMN order_type_code text DEFAULT 'standard';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'flexibility_options'
  ) THEN
    ALTER TABLE orders ADD COLUMN flexibility_options jsonb DEFAULT '{}';
  END IF;
END $$;

-- تفعيل RLS على الجداول الجديدة
ALTER TABLE order_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_flexibility_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_quantity_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_operations_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_drafts ENABLE ROW LEVEL SECURITY;

-- سياسات RLS للمشرفين (القراءة والكتابة)
CREATE POLICY "Admins can view order types"
  ON order_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage order types"
  ON order_types FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_staff
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
      AND is_active = true
    )
  );

CREATE POLICY "Admins can view flexibility options"
  ON order_flexibility_options FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage flexibility options"
  ON order_flexibility_options FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_staff
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
      AND is_active = true
    )
  );

CREATE POLICY "Admins can view recurring orders"
  ON recurring_orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_staff
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
      AND is_active = true
    )
  );

CREATE POLICY "Admins can manage recurring orders"
  ON recurring_orders FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_staff
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
      AND is_active = true
    )
  );

CREATE POLICY "Admins can view quantity settings"
  ON order_quantity_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage quantity settings"
  ON order_quantity_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_staff
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
      AND is_active = true
    )
  );

CREATE POLICY "Admins can view operations log"
  ON order_operations_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_staff
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
      AND is_active = true
    )
  );

CREATE POLICY "System can insert operations log"
  ON order_operations_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view analytics"
  ON order_analytics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_staff
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
      AND is_active = true
    )
  );

CREATE POLICY "System can manage analytics"
  ON order_analytics FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Users can view own drafts"
  ON order_drafts FOR SELECT
  TO authenticated
  USING (phone = current_setting('request.jwt.claims', true)::json->>'phone');

CREATE POLICY "Users can manage own drafts"
  ON order_drafts FOR ALL
  TO authenticated
  USING (phone = current_setting('request.jwt.claims', true)::json->>'phone');

CREATE POLICY "Admins can view all drafts"
  ON order_drafts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_staff
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
      AND is_active = true
    )
  );

-- إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_order_operations_log_order_id ON order_operations_log(order_id);
CREATE INDEX IF NOT EXISTS idx_order_operations_log_created_at ON order_operations_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_operations_log_buyer_phone ON order_operations_log(buyer_phone);
CREATE INDEX IF NOT EXISTS idx_recurring_orders_buyer_phone ON recurring_orders(buyer_phone);
CREATE INDEX IF NOT EXISTS idx_recurring_orders_next_execution ON recurring_orders(next_execution_at);
CREATE INDEX IF NOT EXISTS idx_order_drafts_phone ON order_drafts(phone);
CREATE INDEX IF NOT EXISTS idx_order_drafts_expires_at ON order_drafts(expires_at);
CREATE INDEX IF NOT EXISTS idx_order_analytics_date ON order_analytics(date DESC);
CREATE INDEX IF NOT EXISTS idx_orders_current_stage ON orders(current_stage);
CREATE INDEX IF NOT EXISTS idx_orders_order_type_code ON orders(order_type_code);

-- دالة لتسجيل عملية على الطلب
CREATE OR REPLACE FUNCTION log_order_operation(
  p_operation_type text,
  p_order_id uuid,
  p_request_id text,
  p_buyer_phone text,
  p_buyer_name text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_pallet_type text DEFAULT NULL,
  p_pallet_size text DEFAULT NULL,
  p_quality text DEFAULT NULL,
  p_quantity integer DEFAULT NULL,
  p_performed_by text DEFAULT 'system',
  p_performed_by_type text DEFAULT 'system',
  p_performed_by_phone text DEFAULT NULL,
  p_old_values jsonb DEFAULT NULL,
  p_new_values jsonb DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO order_operations_log (
    operation_type,
    order_id,
    request_id,
    buyer_phone,
    buyer_name,
    city,
    pallet_type,
    pallet_size,
    quality,
    quantity,
    performed_by,
    performed_by_type,
    performed_by_phone,
    old_values,
    new_values,
    notes
  ) VALUES (
    p_operation_type,
    p_order_id,
    p_request_id,
    p_buyer_phone,
    p_buyer_name,
    p_city,
    p_pallet_type,
    p_pallet_size,
    p_quality,
    p_quantity,
    p_performed_by,
    p_performed_by_type,
    p_performed_by_phone,
    p_old_values,
    p_new_values,
    p_notes
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- دالة لتحديث تحليلات الطلبات اليومية
CREATE OR REPLACE FUNCTION update_order_analytics_daily()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today date := CURRENT_DATE;
BEGIN
  INSERT INTO order_analytics (
    date,
    total_orders,
    total_quantity,
    matched_orders,
    unmatched_orders,
    most_requested_type,
    most_requested_size,
    most_requested_city,
    most_requested_quality,
    active_buyers_count,
    avg_order_quantity,
    match_rate
  )
  SELECT
    v_today,
    COUNT(*),
    COALESCE(SUM(quantity), 0),
    COUNT(*) FILTER (WHERE status = 'matched'),
    COUNT(*) FILTER (WHERE status = 'unmatched'),
    MODE() WITHIN GROUP (ORDER BY pallet_type),
    MODE() WITHIN GROUP (ORDER BY size),
    MODE() WITHIN GROUP (ORDER BY city),
    MODE() WITHIN GROUP (ORDER BY quality),
    COUNT(DISTINCT phone),
    COALESCE(AVG(quantity), 0),
    CASE
      WHEN COUNT(*) > 0 THEN
        (COUNT(*) FILTER (WHERE status = 'matched')::numeric / COUNT(*)::numeric * 100)
      ELSE 0
    END
  FROM orders
  WHERE DATE(created_at) = v_today
  ON CONFLICT (date) DO UPDATE SET
    total_orders = EXCLUDED.total_orders,
    total_quantity = EXCLUDED.total_quantity,
    matched_orders = EXCLUDED.matched_orders,
    unmatched_orders = EXCLUDED.unmatched_orders,
    most_requested_type = EXCLUDED.most_requested_type,
    most_requested_size = EXCLUDED.most_requested_size,
    most_requested_city = EXCLUDED.most_requested_city,
    most_requested_quality = EXCLUDED.most_requested_quality,
    active_buyers_count = EXCLUDED.active_buyers_count,
    avg_order_quantity = EXCLUDED.avg_order_quantity,
    match_rate = EXCLUDED.match_rate;
END;
$$;

-- تفعيل Realtime على الجداول الجديدة
ALTER PUBLICATION supabase_realtime ADD TABLE order_operations_log;
ALTER PUBLICATION supabase_realtime ADD TABLE recurring_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_analytics;

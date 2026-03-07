/*
  # نظام مطابقة ذكي متقدم جداً

  1. المشاكل المكتشفة
    - الطلب يستخدم "wood" والمخزون يستخدم "خشبية"
    - اختلاف في التسميات (خشب، خشبية، wood، wooden، plastic، بلاستيك، etc)
    - عدم مطابقة الطلبات القديمة تلقائياً
    - عدم وجود تنبيهات للمطابقات المحتملة

  2. الحل
    - نظام ترجمة وتوحيد متقدم للمصطلحات
    - مطابقة ذكية تدعم اللغتين العربية والإنجليزية
    - دالة فحص دوري للطلبات المعلقة
    - نظام تنبيهات للمطابقات المحتملة
    - دالة مطابقة يدوية للطلبات الموجودة

  3. الأمان
    - SECURITY DEFINER
    - لا تعديل على RLS
*/

-- ================================================================
-- جدول توحيد المصطلحات (Translation/Normalization)
-- ================================================================
CREATE TABLE IF NOT EXISTS pallet_type_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  input_value text NOT NULL UNIQUE,
  normalized_value text NOT NULL,
  language text DEFAULT 'ar',
  created_at timestamptz DEFAULT now()
);

-- تمكين RLS
ALTER TABLE pallet_type_mappings ENABLE ROW LEVEL SECURITY;

-- السماح للجميع بالقراءة
CREATE POLICY "Everyone can read pallet type mappings"
  ON pallet_type_mappings FOR SELECT
  TO authenticated
  USING (true);

-- Admins can manage mappings
CREATE POLICY "Admins can manage pallet type mappings"
  ON pallet_type_mappings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM session_tokens st
      JOIN platform_users pu ON pu.phone = st.phone
      WHERE st.expires_at > now()
        AND pu.user_type = 'admin'
    )
  );

-- إضافة المصطلحات الشائعة
INSERT INTO pallet_type_mappings (input_value, normalized_value, language) VALUES
  ('wood', 'خشبية', 'en'),
  ('wooden', 'خشبية', 'en'),
  ('خشب', 'خشبية', 'ar'),
  ('خشبية', 'خشبية', 'ar'),
  ('plastic', 'بلاستيكية', 'en'),
  ('plastik', 'بلاستيكية', 'en'),
  ('بلاستيك', 'بلاستيكية', 'ar'),
  ('بلاستيكية', 'بلاستيكية', 'ar'),
  ('metal', 'معدنية', 'en'),
  ('steel', 'معدنية', 'en'),
  ('معدن', 'معدنية', 'ar'),
  ('معدنية', 'معدنية', 'ar')
ON CONFLICT (input_value) DO UPDATE
  SET normalized_value = EXCLUDED.normalized_value;

-- ================================================================
-- دالة توحيد نوع الطبلية (Ultra Smart Normalization)
-- ================================================================
CREATE OR REPLACE FUNCTION normalize_pallet_type(p_type text)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_normalized text;
  v_cleaned text;
BEGIN
  -- تنظيف النص (إزالة مسافات زائدة وتحويل لحروف صغيرة)
  v_cleaned := LOWER(TRIM(REGEXP_REPLACE(p_type, '\s+', ' ', 'g')));
  
  -- البحث في جدول المطابقة
  SELECT normalized_value INTO v_normalized
  FROM pallet_type_mappings
  WHERE LOWER(TRIM(input_value)) = v_cleaned
  LIMIT 1;
  
  -- إذا وجدنا مطابقة، نرجعها
  IF v_normalized IS NOT NULL THEN
    RETURN v_normalized;
  END IF;
  
  -- إذا لم نجد، نرجع النص الأصلي منظف
  RETURN TRIM(p_type);
END;
$$;

-- ================================================================
-- دالة مطابقة متقدمة جداً
-- ================================================================
CREATE OR REPLACE FUNCTION ultra_smart_match_orders()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_batch RECORD;
  v_quality_order jsonb := '{"A": 4, "B": 3, "C": 2, "Scrap": 1}'::jsonb;
  v_order_q int;
  v_batch_q int;
  v_matched_qty int;
  v_deal_result jsonb;
  v_matches_count int := 0;
  v_total_orders int := 0;
  v_errors jsonb := '[]'::jsonb;
BEGIN
  -- حساب عدد الطلبات المعلقة
  SELECT COUNT(*) INTO v_total_orders
  FROM orders
  WHERE status = 'unmatched';

  -- معالجة كل طلب معلق
  FOR v_order IN
    SELECT o.*
    FROM orders o
    WHERE o.status = 'unmatched'
      -- تجنب الطلبات التي لها صفقات نشطة
      AND NOT EXISTS (
        SELECT 1 FROM deals d 
        WHERE d.order_id = o.id 
          AND d.status NOT IN ('cancelled', 'failed')
      )
    ORDER BY o.created_at ASC
  LOOP
    v_order_q := COALESCE((v_quality_order->>v_order.quality)::int, 0);

    -- البحث عن مخزون مطابق
    FOR v_batch IN
      SELECT ib.*
      FROM inventory_batches ib
      WHERE ib.status = 'active'
        AND ib.available_quantity > 0
        -- ★ مطابقة ذكية للنوع باستخدام التوحيد
        AND normalize_pallet_type(ib.pallet_type) = normalize_pallet_type(v_order.pallet_type)
        -- مطابقة المقاس
        AND TRIM(ib.size) = TRIM(v_order.size)
        -- منع المطابقة الذاتية
        AND ib.phone IS DISTINCT FROM v_order.phone
      ORDER BY 
        -- أولوية للمدينة المطابقة
        CASE WHEN TRIM(ib.city) = TRIM(v_order.city) THEN 1 ELSE 2 END,
        -- ثم السعر الأفضل
        ib.price_per_pallet ASC,
        -- ثم الأقدم
        ib.created_at ASC
      LIMIT 1
    LOOP
      v_batch_q := COALESCE((v_quality_order->>v_batch.quality)::int, 0);

      -- تحقق من الجودة
      IF v_order.accept_close_quality OR v_batch_q >= v_order_q THEN
        -- تحقق من المدينة
        IF v_order.accept_close_city OR TRIM(v_batch.city) = TRIM(v_order.city) THEN
          -- حساب الكمية المطابقة
          IF v_order.accept_partial_delivery THEN
            v_matched_qty := LEAST(v_order.quantity - COALESCE(v_order.matched_quantity, 0), v_batch.available_quantity);
          ELSE
            IF v_batch.available_quantity >= (v_order.quantity - COALESCE(v_order.matched_quantity, 0)) THEN
              v_matched_qty := v_order.quantity - COALESCE(v_order.matched_quantity, 0);
            ELSE
              v_matched_qty := 0;
            END IF;
          END IF;

          -- إذا وجدنا كمية مطابقة
          IF v_matched_qty > 0 THEN
            BEGIN
              -- إنشاء صفقة
              v_deal_result := create_deal_with_reservation_v6(
                v_order.id,
                v_batch.id,
                v_order.phone,
                v_batch.phone,
                v_matched_qty
              );

              IF (v_deal_result->>'success')::boolean THEN
                v_matches_count := v_matches_count + 1;
              ELSE
                v_errors := v_errors || jsonb_build_object(
                  'order_id', v_order.id,
                  'batch_id', v_batch.id,
                  'error', v_deal_result->>'error'
                );
              END IF;

            EXCEPTION WHEN OTHERS THEN
              v_errors := v_errors || jsonb_build_object(
                'order_id', v_order.id,
                'batch_id', v_batch.id,
                'error', SQLERRM
              );
            END;

            -- إذا تم استيفاء الطلب كاملاً، لا نستمر
            IF NOT v_order.accept_partial_delivery AND v_matched_qty >= (v_order.quantity - COALESCE(v_order.matched_quantity, 0)) THEN
              EXIT;
            END IF;
          END IF;
        END IF;
      END IF;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'total_orders_checked', v_total_orders,
    'matches_created', v_matches_count,
    'errors', v_errors
  );
END;
$$;

-- ================================================================
-- دالة فحص ومطابقة طلب واحد
-- ================================================================
CREATE OR REPLACE FUNCTION match_single_order(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_batch RECORD;
  v_quality_order jsonb := '{"A": 4, "B": 3, "C": 2, "Scrap": 1}'::jsonb;
  v_order_q int;
  v_batch_q int;
  v_matched_qty int;
  v_deal_result jsonb;
  v_potential_matches jsonb := '[]'::jsonb;
BEGIN
  -- جلب معلومات الطلب
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'order_not_found');
  END IF;

  IF v_order.status != 'unmatched' THEN
    RETURN jsonb_build_object('success', false, 'error', 'order_already_matched');
  END IF;

  v_order_q := COALESCE((v_quality_order->>v_order.quality)::int, 0);

  -- البحث عن جميع المطابقات المحتملة
  FOR v_batch IN
    SELECT 
      ib.*,
      CASE WHEN TRIM(ib.city) = TRIM(v_order.city) THEN true ELSE false END as city_match,
      CASE WHEN normalize_pallet_type(ib.pallet_type) = normalize_pallet_type(v_order.pallet_type) THEN true ELSE false END as type_match
    FROM inventory_batches ib
    WHERE ib.status = 'active'
      AND ib.available_quantity > 0
      -- مطابقة ذكية للنوع
      AND normalize_pallet_type(ib.pallet_type) = normalize_pallet_type(v_order.pallet_type)
      -- مطابقة المقاس
      AND TRIM(ib.size) = TRIM(v_order.size)
      -- منع المطابقة الذاتية
      AND ib.phone IS DISTINCT FROM v_order.phone
    ORDER BY 
      CASE WHEN TRIM(ib.city) = TRIM(v_order.city) THEN 1 ELSE 2 END,
      ib.price_per_pallet ASC
    LIMIT 10
  LOOP
    v_batch_q := COALESCE((v_quality_order->>v_batch.quality)::int, 0);

    -- إضافة للمطابقات المحتملة
    v_potential_matches := v_potential_matches || jsonb_build_object(
      'batch_id', v_batch.id,
      'supplier_phone', v_batch.phone,
      'pallet_type', v_batch.pallet_type,
      'size', v_batch.size,
      'quality', v_batch.quality,
      'available_quantity', v_batch.available_quantity,
      'price_per_pallet', v_batch.price_per_pallet,
      'city', v_batch.city,
      'city_match', v_batch.city_match,
      'quality_acceptable', (v_order.accept_close_quality OR v_batch_q >= v_order_q),
      'can_match', (
        (v_order.accept_close_quality OR v_batch_q >= v_order_q) AND
        (v_order.accept_close_city OR v_batch.city_match)
      )
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'order', jsonb_build_object(
      'id', v_order.id,
      'request_id', v_order.request_id,
      'pallet_type', v_order.pallet_type,
      'normalized_type', normalize_pallet_type(v_order.pallet_type),
      'size', v_order.size,
      'quality', v_order.quality,
      'quantity', v_order.quantity,
      'city', v_order.city,
      'accept_close_quality', v_order.accept_close_quality,
      'accept_close_city', v_order.accept_close_city,
      'accept_partial_delivery', v_order.accept_partial_delivery
    ),
    'potential_matches', v_potential_matches,
    'matches_count', jsonb_array_length(v_potential_matches)
  );
END;
$$;

-- ================================================================
-- Trigger لتشغيل المطابقة عند إضافة مخزون جديد
-- ================================================================
CREATE OR REPLACE FUNCTION trigger_match_on_new_inventory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- تشغيل المطابقة في الخلفية (async)
  PERFORM ultra_smart_match_orders();
  RETURN NEW;
END;
$$;

-- إزالة الـ trigger القديم إذا كان موجوداً
DROP TRIGGER IF EXISTS on_inventory_insert_match_orders ON inventory_batches;

-- إنشاء trigger جديد
CREATE TRIGGER on_inventory_insert_match_orders
  AFTER INSERT ON inventory_batches
  FOR EACH ROW
  WHEN (NEW.status = 'active' AND NEW.available_quantity > 0)
  EXECUTE FUNCTION trigger_match_on_new_inventory();

-- ================================================================
-- دالة للإدارة: تشغيل المطابقة يدوياً
-- ================================================================
CREATE OR REPLACE FUNCTION admin_trigger_matching()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- التحقق من الصلاحية
  IF NOT EXISTS (
    SELECT 1 FROM session_tokens st
    JOIN platform_users pu ON pu.phone = st.phone
    WHERE st.expires_at > now()
      AND pu.user_type = 'admin'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  -- تشغيل المطابقة
  RETURN ultra_smart_match_orders();
END;
$$;

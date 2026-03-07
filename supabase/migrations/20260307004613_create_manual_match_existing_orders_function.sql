/*
  # إنشاء وظيفة للبحث عن التطابقات الحالية وتنفيذها

  1. الوظيفة الجديدة
    - `match_all_existing_orders()` - تبحث عن جميع الطلبات غير المطابقة وتحاول مطابقتها مع المخزون المتاح
    - تعمل على البيانات الموجودة حالياً (ليس فقط عند إضافة مخزون جديد)
    - تقوم بمطابقة متعددة في جولة واحدة

  2. الأهمية
    - يحل مشكلة الطلبات التي كانت موجودة قبل إضافة المخزون
    - يمكن استدعاؤها يدوياً من لوحة الإدارة
    - مفيدة بعد تصحيح البيانات أو توحيد التسميات

  3. الاستخدام
    - SELECT match_all_existing_orders();
    - تعيد عدد التطابقات الناجحة
*/

CREATE OR REPLACE FUNCTION match_all_existing_orders()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_batch RECORD;
  v_result jsonb;
  v_total_matches int := 0;
  v_results jsonb[] := '{}';
BEGIN
  -- المرور على كل دفعة مخزون نشطة ومتاحة
  FOR v_batch IN
    SELECT id, batch_id, pallet_type, size, quality, available_quantity, city
    FROM inventory_batches
    WHERE status = 'active' 
      AND available_quantity > 0
    ORDER BY created_at ASC
  LOOP
    -- محاولة مطابقة الطلبات غير المطابقة مع هذه الدفعة
    v_result := auto_match_unmatched_orders(v_batch.id);
    
    IF (v_result->>'success')::boolean AND (v_result->>'matches')::int > 0 THEN
      v_total_matches := v_total_matches + (v_result->>'matches')::int;
      v_results := v_results || jsonb_build_object(
        'batch_id', v_batch.batch_id,
        'pallet_type', v_batch.pallet_type,
        'size', v_batch.size,
        'quality', v_batch.quality,
        'city', v_batch.city,
        'matches', v_result->>'matches'
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'total_matches', v_total_matches,
    'details', v_results
  );
END;
$$;

-- منح صلاحيات التنفيذ
GRANT EXECUTE ON FUNCTION match_all_existing_orders() TO authenticated;
GRANT EXECUTE ON FUNCTION match_all_existing_orders() TO anon;

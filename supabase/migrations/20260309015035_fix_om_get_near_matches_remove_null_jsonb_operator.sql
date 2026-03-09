
/*
  # Fix om_get_near_matches - Remove Invalid jsonb - jsonb Operator

  The function uses `jsonb_build_array(...) - 'null'::jsonb` to filter nulls,
  but PostgreSQL has no subtraction operator for jsonb types.
  
  Fix: Use a subquery + jsonb_array_elements to filter null elements from the blockers array.
*/

CREATE OR REPLACE FUNCTION public.om_get_near_matches(p_limit integer DEFAULT 50)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
DECLARE
v_results jsonb;
BEGIN
SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.match_score DESC), '[]'::jsonb)
INTO v_results
FROM (
SELECT
o.id as order_id,
o.request_id,
o.phone as order_phone,
o.pallet_type as order_pallet_type,
o.size as order_size,
o.quality as order_quality,
o.city as order_city,
o.quantity as order_quantity,
ib.id as batch_id,
ib.batch_id as batch_ref,
ib.phone as batch_phone,
ib.pallet_type as batch_pallet_type,
ib.size as batch_size,
ib.quality as batch_quality,
ib.city as batch_city,
ib.available_quantity as batch_available,
(sr ->> 'total')::numeric as match_score,
(sr ->> 'type')::numeric as score_type,
(sr ->> 'size')::numeric as score_size,
(sr ->> 'quality')::numeric as score_quality,
(sr ->> 'city')::numeric as score_city,
(sr ->> 'quantity')::numeric as score_quantity,
sr ->> 'norm_order_type' as norm_order_type,
sr ->> 'norm_batch_type' as norm_batch_type,
sr ->> 'norm_order_size' as norm_order_size,
sr ->> 'norm_batch_size' as norm_batch_size,
sr ->> 'norm_order_quality' as norm_order_quality,
sr ->> 'norm_batch_quality' as norm_batch_quality,
CASE WHEN o.phone = ib.phone THEN true ELSE false END as same_owner,
CASE
WHEN (sr ->> 'type')::numeric = 0 THEN 'نوع الطبلية مختلف'
WHEN (sr ->> 'size')::numeric = 0 THEN 'المقاس مختلف'
WHEN (sr ->> 'quality')::numeric < 50 THEN 'فرق كبير في الجودة'
WHEN (sr ->> 'quantity')::numeric < 50 THEN 'الكمية المتاحة غير كافية'
WHEN (sr ->> 'city')::numeric < 100 THEN 'المدينة مختلفة'
WHEN o.phone = ib.phone THEN 'نفس المالك'
ELSE 'لا يوجد سبب محدد'
END as primary_blocker,
(
  SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
  FROM jsonb_array_elements(
    jsonb_build_array(
      CASE WHEN (sr ->> 'type')::numeric = 0 THEN
        jsonb_build_object('factor', 'نوع الطبلية', 'order_val', o.pallet_type, 'batch_val', ib.pallet_type, 'norm_order', sr ->> 'norm_order_type', 'norm_batch', sr ->> 'norm_batch_type', 'score', 0)
      ELSE NULL END,
      CASE WHEN (sr ->> 'size')::numeric = 0 THEN
        jsonb_build_object('factor', 'المقاس', 'order_val', o.size, 'batch_val', ib.size, 'norm_order', sr ->> 'norm_order_size', 'norm_batch', sr ->> 'norm_batch_size', 'score', 0)
      ELSE NULL END,
      CASE WHEN (sr ->> 'quality')::numeric < 100 THEN
        jsonb_build_object('factor', 'الجودة', 'order_val', o.quality, 'batch_val', ib.quality, 'norm_order', sr ->> 'norm_order_quality', 'norm_batch', sr ->> 'norm_batch_quality', 'score', (sr ->> 'quality')::numeric)
      ELSE NULL END,
      CASE WHEN (sr ->> 'city')::numeric < 100 THEN
        jsonb_build_object('factor', 'المدينة', 'order_val', o.city, 'batch_val', ib.city, 'score', (sr ->> 'city')::numeric)
      ELSE NULL END,
      CASE WHEN (sr ->> 'quantity')::numeric < 100 THEN
        jsonb_build_object('factor', 'الكمية', 'order_val', o.quantity, 'batch_val', ib.available_quantity, 'score', (sr ->> 'quantity')::numeric)
      ELSE NULL END
    )
  ) AS elem
  WHERE elem != 'null'::jsonb
) as blockers
FROM orders o
CROSS JOIN inventory_batches ib
CROSS JOIN LATERAL om_compute_match_score(
o.pallet_type, o.size, o.quality, o.city, o.quantity,
ib.pallet_type, ib.size, ib.quality, ib.city, ib.available_quantity
) sr
WHERE o.status IN ('pending', 'unmatched')
AND ib.status = 'active'
AND ib.available_quantity > 0
AND ib.publish_to_market = true
AND (sr ->> 'total')::numeric < 90
AND (sr ->> 'total')::numeric >= 1
AND o.phone IS DISTINCT FROM ib.phone
ORDER BY (sr ->> 'total')::numeric DESC
LIMIT p_limit
) t;

RETURN v_results;
END;
$function$;

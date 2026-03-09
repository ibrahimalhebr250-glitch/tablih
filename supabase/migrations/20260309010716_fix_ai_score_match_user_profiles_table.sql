/*
  # Fix ai_score_match - Replace user_profiles with platform_users

  Same bug as v4_compute_score - references non-existent table "user_profiles".
  Fixed to use the correct table "platform_users".
*/

CREATE OR REPLACE FUNCTION public.ai_score_match(p_order record, p_batch record)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
type_score numeric := 0;
size_score numeric := 0;
quality_score numeric := 0;
city_score numeric := 0;
condition_score numeric := 0;
quantity_score numeric := 0;
freshness_score numeric := 0;
supplier_score numeric := 0;

w_type numeric := 25;
w_size numeric := 20;
w_quality numeric := 15;
w_city numeric := 15;
w_condition numeric := 8;
w_quantity numeric := 7;
w_freshness numeric := 5;
w_supplier numeric := 5;

total_score numeric := 0;
is_eligible boolean := true;

v_normalized_order_type text;
v_normalized_batch_type text;
v_quality_grades text[] := ARRAY['A+', 'A', 'B+', 'B', 'C', 'scrap'];
v_order_quality_idx integer;
v_batch_quality_idx integer;
v_quality_distance integer;
v_supplier_rating numeric;
v_batch_age_hours numeric;
v_qty_ratio numeric;
BEGIN
v_normalized_order_type := lower(trim(COALESCE(p_order.pallet_type, '')));
v_normalized_batch_type := lower(trim(COALESCE(p_batch.pallet_type, '')));

IF v_normalized_order_type IN ('خشب', 'خشبي', 'خشبية', 'wood', 'wooden') THEN
v_normalized_order_type := 'wood';
ELSIF v_normalized_order_type IN ('بلاستيك', 'بلاستيكي', 'بلاستيكية', 'plastic') THEN
v_normalized_order_type := 'plastic';
END IF;

IF v_normalized_batch_type IN ('خشب', 'خشبي', 'خشبية', 'wood', 'wooden') THEN
v_normalized_batch_type := 'wood';
ELSIF v_normalized_batch_type IN ('بلاستيك', 'بلاستيكي', 'بلاستيكية', 'plastic') THEN
v_normalized_batch_type := 'plastic';
END IF;

IF v_normalized_order_type = v_normalized_batch_type THEN
type_score := 100;
ELSIF p_order.pallet_type = p_batch.pallet_type THEN
type_score := 100;
ELSE
is_eligible := false;
type_score := 0;
END IF;

IF lower(trim(p_order.size)) = lower(trim(p_batch.size)) THEN
size_score := 100;
ELSE
is_eligible := false;
size_score := 0;
END IF;

v_order_quality_idx := array_position(v_quality_grades, lower(trim(p_order.quality)));
v_batch_quality_idx := array_position(v_quality_grades, lower(trim(p_batch.quality)));

IF v_order_quality_idx IS NULL THEN
v_order_quality_idx := array_position(v_quality_grades, p_order.quality);
END IF;
IF v_batch_quality_idx IS NULL THEN
v_batch_quality_idx := array_position(v_quality_grades, p_batch.quality);
END IF;

IF lower(trim(p_order.quality)) = lower(trim(p_batch.quality))
OR p_order.quality = p_batch.quality THEN
quality_score := 100;
ELSIF v_order_quality_idx IS NOT NULL AND v_batch_quality_idx IS NOT NULL THEN
v_quality_distance := abs(v_order_quality_idx - v_batch_quality_idx);
IF v_quality_distance = 1 AND COALESCE(p_order.accept_close_quality, false) THEN
quality_score := 75;
ELSIF v_quality_distance = 1 THEN
quality_score := 40;
ELSIF v_quality_distance = 2 AND COALESCE(p_order.accept_close_quality, false) THEN
quality_score := 50;
ELSE
is_eligible := false;
quality_score := 0;
END IF;
ELSE
IF p_order.quality = p_batch.quality THEN
quality_score := 100;
ELSE
is_eligible := false;
quality_score := 0;
END IF;
END IF;

IF lower(trim(COALESCE(p_order.city, ''))) = lower(trim(COALESCE(p_batch.city, '')))
OR p_order.city = p_batch.city THEN
city_score := 100;
ELSIF COALESCE(p_order.accept_close_city, false) THEN
city_score := 50;
ELSE
is_eligible := false;
city_score := 0;
END IF;

IF p_order.pallet_condition IS NULL OR p_order.pallet_condition = '' THEN
condition_score := 80;
ELSIF lower(trim(p_order.pallet_condition)) = lower(trim(COALESCE(p_batch.pallet_condition, '')))
OR p_order.pallet_condition = p_batch.pallet_condition THEN
condition_score := 100;
ELSE
condition_score := 30;
END IF;

IF p_batch.available_quantity >= p_order.quantity THEN
quantity_score := 100;
ELSIF COALESCE(p_order.accept_partial_delivery, false) THEN
v_qty_ratio := p_batch.available_quantity::numeric / GREATEST(p_order.quantity, 1)::numeric;
quantity_score := GREATEST(30, v_qty_ratio * 100);
ELSE
IF p_batch.available_quantity < p_order.quantity THEN
quantity_score := 20;
END IF;
END IF;

v_batch_age_hours := EXTRACT(EPOCH FROM (now() - p_batch.created_at)) / 3600.0;
IF v_batch_age_hours <= 6 THEN
freshness_score := 100;
ELSIF v_batch_age_hours <= 24 THEN
freshness_score := 85;
ELSIF v_batch_age_hours <= 72 THEN
freshness_score := 65;
ELSIF v_batch_age_hours <= 168 THEN
freshness_score := 45;
ELSE
freshness_score := 25;
END IF;

-- Fixed: use platform_users instead of user_profiles
SELECT COALESCE(trust_rating, 3.0)
INTO v_supplier_rating
FROM platform_users
WHERE phone = p_batch.phone
LIMIT 1;

IF NOT FOUND THEN
v_supplier_rating := 3.0;
END IF;

supplier_score := LEAST(100, (v_supplier_rating / 5.0) * 100);

IF NOT is_eligible THEN
total_score := 0;
ELSE
total_score := (
type_score * w_type +
size_score * w_size +
quality_score * w_quality +
city_score * w_city +
condition_score * w_condition +
quantity_score * w_quantity +
freshness_score * w_freshness +
supplier_score * w_supplier
) / 100.0;
END IF;

RETURN jsonb_build_object(
'total_score', round(total_score, 2),
'is_eligible', is_eligible,
'breakdown', jsonb_build_object(
'type', jsonb_build_object('score', type_score, 'weight', w_type),
'size', jsonb_build_object('score', size_score, 'weight', w_size),
'quality', jsonb_build_object('score', quality_score, 'weight', w_quality),
'city', jsonb_build_object('score', city_score, 'weight', w_city),
'condition', jsonb_build_object('score', condition_score, 'weight', w_condition),
'quantity', jsonb_build_object('score', quantity_score, 'weight', w_quantity),
'freshness', jsonb_build_object('score', freshness_score, 'weight', w_freshness),
'supplier', jsonb_build_object('score', supplier_score, 'weight', w_supplier)
),
'flexibility_used', jsonb_build_object(
'close_quality', (quality_score > 0 AND quality_score < 100),
'close_city', (city_score > 0 AND city_score < 100),
'partial_delivery', (quantity_score > 0 AND quantity_score < 100 AND p_batch.available_quantity < p_order.quantity)
)
);
END;
$function$;

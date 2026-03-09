/*
  # Fix v4_compute_score - Replace user_profiles with platform_users

  The function v4_compute_score references a table called "user_profiles" 
  which does not exist. The correct table is "platform_users".
  This caused ALL inventory INSERT operations to fail silently,
  preventing any new inventory from being saved to the database.
*/

CREATE OR REPLACE FUNCTION public.v4_compute_score(p_order record, p_batch record)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
s_type numeric := 0;
s_size numeric := 0;
s_quality numeric := 0;
s_city numeric := 0;
s_condition numeric := 0;
s_quantity numeric := 0;
s_freshness numeric := 0;
s_supplier numeric := 0;

w_type numeric := 25;
w_size numeric := 20;
w_quality numeric := 15;
w_city numeric := 15;
w_condition numeric := 8;
w_quantity numeric := 7;
w_freshness numeric := 5;
w_supplier numeric := 5;

total numeric := 0;
eligible boolean := true;

nt_order text;
nt_batch text;
grades text[] := ARRAY['a+','a','b+','b','c','scrap'];
qi integer;
bi integer;
qdist integer;
sup_rating numeric;
age_h numeric;

v_matching_level text;
v_city_mode text;
v_quality_mode text;
BEGIN
SELECT COALESCE(setting_value #>> '{}', 'flexible') INTO v_matching_level
FROM platform_settings WHERE group_key='matching_engine' AND setting_key='matching_level';
SELECT COALESCE(setting_value #>> '{}', 'same_city') INTO v_city_mode
FROM platform_settings WHERE group_key='matching_engine' AND setting_key='city_matching';
SELECT COALESCE(setting_value #>> '{}', 'allow_lower') INTO v_quality_mode
FROM platform_settings WHERE group_key='matching_engine' AND setting_key='quality_matching';

IF v_matching_level = 'strict' THEN
w_type := 30; w_size := 25; w_quality := 20; w_city := 15; w_condition := 5; w_quantity := 3; w_freshness := 1; w_supplier := 1;
ELSIF v_matching_level = 'open' THEN
w_type := 20; w_size := 15; w_quality := 10; w_city := 10; w_condition := 10; w_quantity := 15; w_freshness := 10; w_supplier := 10;
END IF;

nt_order := lower(trim(COALESCE(p_order.pallet_type,'')));
nt_batch := lower(trim(COALESCE(p_batch.pallet_type,'')));
IF nt_order IN ('خشب','خشبي','خشبية','wood','wooden') THEN nt_order:='wood'; END IF;
IF nt_order IN ('بلاستيك','بلاستيكي','بلاستيكية','plastic') THEN nt_order:='plastic'; END IF;
IF nt_batch IN ('خشب','خشبي','خشبية','wood','wooden') THEN nt_batch:='wood'; END IF;
IF nt_batch IN ('بلاستيك','بلاستيكي','بلاستيكية','plastic') THEN nt_batch:='plastic'; END IF;

IF nt_order = nt_batch OR p_order.pallet_type = p_batch.pallet_type THEN s_type := 100;
ELSE eligible := false; END IF;

IF lower(trim(p_order.size)) = lower(trim(p_batch.size)) THEN s_size := 100;
ELSE eligible := false; END IF;

qi := array_position(grades, lower(trim(p_order.quality)));
bi := array_position(grades, lower(trim(p_batch.quality)));
IF qi IS NULL THEN qi := array_position(grades, p_order.quality); END IF;
IF bi IS NULL THEN bi := array_position(grades, p_batch.quality); END IF;

IF lower(trim(p_order.quality))=lower(trim(p_batch.quality)) OR p_order.quality=p_batch.quality THEN
s_quality := 100;
ELSIF qi IS NOT NULL AND bi IS NOT NULL THEN
qdist := abs(qi - bi);
IF qdist = 1 THEN
IF COALESCE(p_order.accept_close_quality,false) OR v_quality_mode='allow_lower' THEN s_quality := 75;
ELSIF v_matching_level='open' THEN s_quality := 60;
ELSE eligible := false; END IF;
ELSIF qdist = 2 AND (COALESCE(p_order.accept_close_quality,false) OR v_matching_level='open') THEN
s_quality := 45;
ELSE eligible := false; END IF;
ELSE
IF p_order.quality = p_batch.quality THEN s_quality := 100;
ELSE eligible := false; END IF;
END IF;

IF lower(trim(COALESCE(p_order.city,'')))=lower(trim(COALESCE(p_batch.city,''))) OR p_order.city=p_batch.city THEN
s_city := 100;
ELSIF COALESCE(p_order.accept_close_city,false) OR v_city_mode='any_city' OR v_matching_level='open' THEN
s_city := 45;
ELSE eligible := false; END IF;

IF p_order.pallet_condition IS NULL OR p_order.pallet_condition='' THEN s_condition := 80;
ELSIF lower(trim(p_order.pallet_condition))=lower(trim(COALESCE(p_batch.pallet_condition,''))) THEN s_condition := 100;
ELSE s_condition := 30; END IF;

IF p_batch.available_quantity >= (p_order.quantity - COALESCE(p_order.matched_quantity,0)) THEN
s_quantity := 100;
ELSIF COALESCE(p_order.accept_partial_delivery,false) THEN
s_quantity := GREATEST(30, (p_batch.available_quantity::numeric / GREATEST(p_order.quantity - COALESCE(p_order.matched_quantity,0),1)) * 100);
ELSE
s_quantity := 15;
END IF;

age_h := EXTRACT(EPOCH FROM (now()-p_batch.created_at))/3600.0;
s_freshness := CASE
WHEN age_h<=6 THEN 100 WHEN age_h<=24 THEN 85 WHEN age_h<=72 THEN 65
WHEN age_h<=168 THEN 45 ELSE 25 END;

-- Fixed: use platform_users instead of user_profiles
SELECT COALESCE(trust_rating, 3.0) INTO sup_rating
FROM platform_users WHERE phone = p_batch.phone LIMIT 1;
IF NOT FOUND THEN sup_rating := 3.0; END IF;
s_supplier := LEAST(100,(sup_rating/5.0)*100);

IF NOT eligible THEN total := 0;
ELSE total := (s_type*w_type + s_size*w_size + s_quality*w_quality + s_city*w_city + s_condition*w_condition + s_quantity*w_quantity + s_freshness*w_freshness + s_supplier*w_supplier)/100.0;
END IF;

RETURN jsonb_build_object(
'total', round(total,2), 'eligible', eligible,
'breakdown', jsonb_build_object(
'type', jsonb_build_object('s',s_type,'w',w_type),
'size', jsonb_build_object('s',s_size,'w',w_size),
'quality', jsonb_build_object('s',s_quality,'w',w_quality),
'city', jsonb_build_object('s',s_city,'w',w_city),
'condition', jsonb_build_object('s',s_condition,'w',w_condition),
'quantity', jsonb_build_object('s',s_quantity,'w',w_quantity),
'freshness', jsonb_build_object('s',s_freshness,'w',w_freshness),
'supplier', jsonb_build_object('s',s_supplier,'w',w_supplier)
),
'flex', jsonb_build_object(
'quality', s_quality > 0 AND s_quality < 100,
'city', s_city > 0 AND s_city < 100,
'partial', s_quantity > 0 AND s_quantity < 100 AND p_batch.available_quantity < (p_order.quantity - COALESCE(p_order.matched_quantity,0))
),
'level', v_matching_level
);
END;
$function$;

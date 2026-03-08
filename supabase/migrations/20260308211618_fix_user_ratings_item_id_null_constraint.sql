/*
  # Fix user_ratings item_id null constraint error

  1. Problem
    - When a supplier rates a buyer, the function sets item_id = deal.order_id
    - But order_id can be NULL on deals created from market offers or negotiations
    - The item_id column has a NOT NULL constraint, causing the insert to fail

  2. Changes
    - Make item_id column nullable since it's not always available
    - Update both overloads of create_user_rating to use deal_id as fallback when order_id is null
*/

ALTER TABLE user_ratings ALTER COLUMN item_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION create_user_rating(
  p_deal_id uuid,
  p_rated_phone text,
  p_rating integer,
  p_comment text DEFAULT NULL
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_rater_phone text;
  v_deal_record deals;
  v_rating_id uuid;
  v_existing_rating_id uuid;
  v_item_type text;
  v_item_id uuid;
BEGIN
  v_rater_phone := current_setting('request.jwt.claims', true)::json->>'phone';

  IF v_rater_phone IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  IF p_rating < 1 OR p_rating > 5 THEN
    RETURN json_build_object('success', false, 'error', 'التقييم يجب أن يكون بين 1 و 5');
  END IF;

  SELECT * INTO v_deal_record FROM deals WHERE id = p_deal_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'الصفقة غير موجودة');
  END IF;

  IF v_deal_record.status != 'completed' THEN
    RETURN json_build_object('success', false, 'error', 'يمكن التقييم فقط للصفقات المكتملة');
  END IF;

  IF v_rater_phone != v_deal_record.buyer_phone AND v_rater_phone != v_deal_record.supplier_phone THEN
    RETURN json_build_object('success', false, 'error', 'يمكنك تقييم الصفقات التي أنت طرف فيها فقط');
  END IF;

  IF p_rated_phone != v_deal_record.buyer_phone AND p_rated_phone != v_deal_record.supplier_phone THEN
    RETURN json_build_object('success', false, 'error', 'المستخدم المحدد ليس طرفاً في الصفقة');
  END IF;

  IF v_rater_phone = p_rated_phone THEN
    RETURN json_build_object('success', false, 'error', 'لا يمكنك تقييم نفسك');
  END IF;

  IF v_rater_phone = v_deal_record.buyer_phone THEN
    v_item_type := 'supply';
    v_item_id := v_deal_record.inventory_batch_id;
  ELSE
    v_item_type := 'demand';
    v_item_id := COALESCE(v_deal_record.order_id, p_deal_id);
  END IF;

  SELECT id INTO v_existing_rating_id
  FROM user_ratings
  WHERE deal_id = p_deal_id AND rater_phone = v_rater_phone AND rated_phone = p_rated_phone;

  IF FOUND THEN
    RETURN json_build_object('success', false, 'error', 'لقد قمت بتقييم هذه الصفقة مسبقاً');
  END IF;

  INSERT INTO user_ratings (rater_phone, rated_phone, rating, comment, deal_id, item_type, item_id, is_confirmed)
  VALUES (v_rater_phone, p_rated_phone, p_rating, p_comment, p_deal_id, v_item_type, v_item_id, false)
  RETURNING id INTO v_rating_id;

  RETURN json_build_object('success', true, 'rating_id', v_rating_id, 'message', 'تم إضافة التقييم بنجاح - سيظهر بعد مراجعة الإدارة');
END;
$$;

CREATE OR REPLACE FUNCTION create_user_rating(
  p_rater_phone text,
  p_deal_id uuid,
  p_rated_phone text,
  p_rating integer,
  p_comment text DEFAULT NULL
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_deal_record deals;
  v_rating_id uuid;
  v_existing_rating_id uuid;
  v_item_type text;
  v_item_id uuid;
  v_session_valid boolean;
BEGIN
  IF p_rater_phone IS NULL OR p_rater_phone = '' THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM session_tokens WHERE phone = p_rater_phone AND expires_at > now()
  ) INTO v_session_valid;

  IF NOT v_session_valid THEN
    RETURN json_build_object('success', false, 'error', 'الجلسة منتهية - يرجى تسجيل الدخول مجدداً');
  END IF;

  IF p_rating < 1 OR p_rating > 5 THEN
    RETURN json_build_object('success', false, 'error', 'التقييم يجب أن يكون بين 1 و 5');
  END IF;

  SELECT * INTO v_deal_record FROM deals WHERE id = p_deal_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'الصفقة غير موجودة');
  END IF;

  IF v_deal_record.status != 'completed' THEN
    RETURN json_build_object('success', false, 'error', 'يمكن التقييم فقط للصفقات المكتملة');
  END IF;

  IF p_rater_phone != v_deal_record.buyer_phone AND p_rater_phone != v_deal_record.supplier_phone THEN
    RETURN json_build_object('success', false, 'error', 'يمكنك تقييم الصفقات التي أنت طرف فيها فقط');
  END IF;

  IF p_rated_phone != v_deal_record.buyer_phone AND p_rated_phone != v_deal_record.supplier_phone THEN
    RETURN json_build_object('success', false, 'error', 'المستخدم المحدد ليس طرفاً في الصفقة');
  END IF;

  IF p_rater_phone = p_rated_phone THEN
    RETURN json_build_object('success', false, 'error', 'لا يمكنك تقييم نفسك');
  END IF;

  IF p_rater_phone = v_deal_record.buyer_phone THEN
    v_item_type := 'supply';
    v_item_id := v_deal_record.inventory_batch_id;
  ELSE
    v_item_type := 'demand';
    v_item_id := COALESCE(v_deal_record.order_id, p_deal_id);
  END IF;

  SELECT id INTO v_existing_rating_id
  FROM user_ratings
  WHERE deal_id = p_deal_id AND rater_phone = p_rater_phone AND rated_phone = p_rated_phone;

  IF FOUND THEN
    RETURN json_build_object('success', false, 'error', 'لقد قمت بتقييم هذه الصفقة مسبقاً');
  END IF;

  INSERT INTO user_ratings (rater_phone, rated_phone, rating, comment, deal_id, item_type, item_id, is_confirmed)
  VALUES (p_rater_phone, p_rated_phone, p_rating, p_comment, p_deal_id, v_item_type, v_item_id, false)
  RETURNING id INTO v_rating_id;

  RETURN json_build_object('success', true, 'rating_id', v_rating_id, 'message', 'تم إضافة التقييم بنجاح - سيظهر بعد مراجعة الإدارة');
END;
$$;

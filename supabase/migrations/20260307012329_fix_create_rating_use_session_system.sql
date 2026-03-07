/*
  # Fix Rating System to Work with Session-Based Auth

  1. Changes
    - Update `create_user_rating` to accept rater_phone as parameter
    - Validate session from session_tokens table instead of JWT
    - Remove JWT dependency

  2. Security
    - Verify session is active and not expired
    - Maintain all existing validations
*/

-- Drop and recreate the function with session-based authentication
CREATE OR REPLACE FUNCTION create_user_rating(
  p_rater_phone text,
  p_deal_id uuid,
  p_rated_phone text,
  p_rating integer,
  p_comment text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deal_record deals;
  v_rating_id uuid;
  v_existing_rating_id uuid;
  v_rated_user_type text;
  v_item_type text;
  v_item_id uuid;
  v_session_valid boolean;
BEGIN
  -- Validate rater phone is provided
  IF p_rater_phone IS NULL OR p_rater_phone = '' THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  -- Verify session exists and is valid
  SELECT EXISTS(
    SELECT 1 FROM session_tokens
    WHERE phone = p_rater_phone
    AND expires_at > now()
  ) INTO v_session_valid;

  IF NOT v_session_valid THEN
    RETURN json_build_object('success', false, 'error', 'الجلسة منتهية - يرجى تسجيل الدخول مجدداً');
  END IF;

  -- Validate rating value
  IF p_rating < 1 OR p_rating > 5 THEN
    RETURN json_build_object('success', false, 'error', 'التقييم يجب أن يكون بين 1 و 5');
  END IF;

  -- Get deal details
  SELECT * INTO v_deal_record
  FROM deals
  WHERE id = p_deal_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'الصفقة غير موجودة');
  END IF;

  -- Check if deal is completed
  IF v_deal_record.status != 'completed' THEN
    RETURN json_build_object('success', false, 'error', 'يمكن التقييم فقط للصفقات المكتملة');
  END IF;

  -- Verify rater is part of the deal
  IF p_rater_phone != v_deal_record.buyer_phone AND p_rater_phone != v_deal_record.supplier_phone THEN
    RETURN json_build_object('success', false, 'error', 'يمكنك تقييم الصفقات التي أنت طرف فيها فقط');
  END IF;

  -- Verify rated user is the other party
  IF p_rated_phone != v_deal_record.buyer_phone AND p_rated_phone != v_deal_record.supplier_phone THEN
    RETURN json_build_object('success', false, 'error', 'المستخدم المحدد ليس طرفاً في الصفقة');
  END IF;

  -- Can't rate yourself
  IF p_rater_phone = p_rated_phone THEN
    RETURN json_build_object('success', false, 'error', 'لا يمكنك تقييم نفسك');
  END IF;

  -- Determine item type and ID
  IF p_rater_phone = v_deal_record.buyer_phone THEN
    v_item_type := 'supply';
    v_item_id := v_deal_record.inventory_batch_id;
  ELSE
    v_item_type := 'demand';
    v_item_id := v_deal_record.order_id;
  END IF;

  -- Check for existing rating
  SELECT id INTO v_existing_rating_id
  FROM user_ratings
  WHERE deal_id = p_deal_id
    AND rater_phone = p_rater_phone
    AND rated_phone = p_rated_phone;

  IF FOUND THEN
    RETURN json_build_object('success', false, 'error', 'لقد قمت بتقييم هذه الصفقة مسبقاً');
  END IF;

  -- Insert rating
  INSERT INTO user_ratings (
    rater_phone,
    rated_phone,
    rating,
    comment,
    deal_id,
    item_type,
    item_id,
    is_confirmed
  ) VALUES (
    p_rater_phone,
    p_rated_phone,
    p_rating,
    p_comment,
    p_deal_id,
    v_item_type,
    v_item_id,
    false
  )
  RETURNING id INTO v_rating_id;

  RETURN json_build_object(
    'success', true,
    'rating_id', v_rating_id,
    'message', 'تم إضافة التقييم بنجاح - سيظهر بعد مراجعة الإدارة'
  );
END;
$$;
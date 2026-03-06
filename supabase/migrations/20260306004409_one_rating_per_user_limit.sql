/*
  # One Rating Per User System

  ## Changes
  This migration updates the visitor rating system to allow only ONE rating per user (rater)
  for each rated user, regardless of how many items (supply/demand) they have.

  ## Updated Logic
  - Previous: User could rate each item (supply/demand) separately
  - New: User can only rate another user ONCE in total
  - Check is based on: rater_phone + rated_phone combination

  ## Updated Functions
  - `create_visitor_rating` - Now checks for existing rating for the same rated user

  ## Important Notes
  1. This prevents rating spam and makes ratings more meaningful
  2. One user can only give one rating to another user across all their items
  3. Makes the trust rating system more reliable
*/

-- Update create_visitor_rating to allow only one rating per rated user
CREATE OR REPLACE FUNCTION create_visitor_rating(
  p_rated_phone text,
  p_item_type text,
  p_item_id uuid,
  p_rating integer,
  p_comment text DEFAULT NULL,
  p_visitor_phone text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rater_phone text;
  v_rating_id uuid;
  v_existing_rating_id uuid;
  v_visitor_identifier text;
BEGIN
  -- Get authenticated user phone if exists
  v_rater_phone := current_setting('request.jwt.claims', true)::json->>'phone';
  
  -- If no authenticated user, use visitor phone (can be any identifier)
  IF v_rater_phone IS NULL THEN
    IF p_visitor_phone IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'يجب تقديم معرف للزائر');
    END IF;
    v_rater_phone := p_visitor_phone;
    v_visitor_identifier := p_visitor_phone;
  ELSE
    v_visitor_identifier := v_rater_phone;
  END IF;

  -- Validate rating value
  IF p_rating < 1 OR p_rating > 5 THEN
    RETURN json_build_object('success', false, 'error', 'التقييم يجب أن يكون بين 1 و 5');
  END IF;

  -- Validate item type
  IF p_item_type NOT IN ('supply', 'demand') THEN
    RETURN json_build_object('success', false, 'error', 'نوع العنصر غير صحيح');
  END IF;

  -- Can't rate yourself
  IF v_rater_phone = p_rated_phone THEN
    RETURN json_build_object('success', false, 'error', 'لا يمكنك تقييم نفسك');
  END IF;

  -- Check for existing rating for this rated user (ONE rating per rated user)
  SELECT id INTO v_existing_rating_id
  FROM user_ratings
  WHERE rating_type = 'visitor'
    AND rated_phone = p_rated_phone
    AND (rater_phone = v_visitor_identifier OR visitor_phone = v_visitor_identifier);

  IF FOUND THEN
    RETURN json_build_object('success', false, 'error', 'لقد قمت بتقييم هذا المستخدم مسبقاً');
  END IF;

  -- Insert rating
  INSERT INTO user_ratings (
    rater_phone,
    rated_phone,
    rating,
    comment,
    item_type,
    item_id,
    rating_type,
    visitor_phone,
    is_confirmed
  ) VALUES (
    v_rater_phone,
    p_rated_phone,
    p_rating,
    p_comment,
    p_item_type,
    p_item_id,
    'visitor',
    v_visitor_identifier,
    true
  )
  RETURNING id INTO v_rating_id;

  -- If comment provided, create entry in ratings_comments table
  IF p_comment IS NOT NULL AND char_length(trim(p_comment)) > 0 THEN
    INSERT INTO ratings_comments (
      rating_id,
      commenter_phone,
      comment_text,
      is_visible,
      moderation_status,
      moderated_by,
      moderated_at
    ) VALUES (
      v_rating_id,
      v_rater_phone,
      trim(p_comment),
      true,
      'approved',
      'system',
      now()
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'rating_id', v_rating_id,
    'message', 'تم إضافة التقييم بنجاح'
  );
END;
$$;

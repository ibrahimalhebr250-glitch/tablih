/*
  # Add Visitor Ratings System

  1. Changes to Tables
    - Update `user_ratings` to support visitor ratings
    - Add `rating_type` column to distinguish between deal and visitor ratings
    - Add `visitor_phone` column for anonymous visitor identification

  2. New Functions
    - `create_visitor_rating` - Create a visitor rating for supply/demand
    - `get_visitor_ratings_summary` - Get all visitor ratings for a user

  3. Security
    - Visitors can rate without authentication
    - One rating per visitor per item
    - Admin approval required

  4. Notes
    - Visitor ratings are separate from deal ratings
    - Help build trust before first deal
*/

-- Add new columns to user_ratings if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_ratings' AND column_name = 'rating_type'
  ) THEN
    ALTER TABLE user_ratings ADD COLUMN rating_type text DEFAULT 'deal' CHECK (rating_type IN ('deal', 'visitor'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_ratings' AND column_name = 'visitor_phone'
  ) THEN
    ALTER TABLE user_ratings ADD COLUMN visitor_phone text;
  END IF;
END $$;

-- Update RLS policies to allow visitor ratings
DROP POLICY IF EXISTS "Visitors can create ratings" ON user_ratings;

CREATE POLICY "Visitors can create ratings"
  ON user_ratings FOR INSERT
  TO authenticated
  WITH CHECK (
    rating_type = 'visitor' OR
    (rating_type = 'deal' AND rater_phone = current_setting('request.jwt.claims', true)::json->>'phone')
  );

-- Function to create a visitor rating
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

  -- Check for existing rating
  SELECT id INTO v_existing_rating_id
  FROM user_ratings
  WHERE rating_type = 'visitor'
    AND item_type = p_item_type
    AND item_id = p_item_id
    AND (rater_phone = v_visitor_identifier OR visitor_phone = v_visitor_identifier);

  IF FOUND THEN
    RETURN json_build_object('success', false, 'error', 'لقد قمت بتقييم هذا العرض مسبقاً');
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

-- Function to get visitor ratings for a user
CREATE OR REPLACE FUNCTION get_visitor_ratings_summary(p_user_phone text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_avg_rating numeric;
  v_total_ratings integer;
  v_confirmed_ratings integer;
  v_pending_ratings integer;
  v_rating_breakdown json;
BEGIN
  -- Get average rating (only confirmed visitor ratings)
  SELECT 
    COALESCE(AVG(rating), 0),
    COUNT(*),
    COUNT(*) FILTER (WHERE is_confirmed = true),
    COUNT(*) FILTER (WHERE is_confirmed = false)
  INTO v_avg_rating, v_total_ratings, v_confirmed_ratings, v_pending_ratings
  FROM user_ratings
  WHERE rated_phone = p_user_phone
    AND rating_type = 'visitor'
    AND is_confirmed = true;

  -- Get rating breakdown
  SELECT json_object_agg(rating, count)
  INTO v_rating_breakdown
  FROM (
    SELECT rating, COUNT(*) as count
    FROM user_ratings
    WHERE rated_phone = p_user_phone
      AND rating_type = 'visitor'
      AND is_confirmed = true
    GROUP BY rating
  ) sub;

  RETURN json_build_object(
    'average_rating', ROUND(v_avg_rating, 2),
    'total_ratings', v_total_ratings,
    'confirmed_ratings', v_confirmed_ratings,
    'pending_ratings', v_pending_ratings,
    'rating_breakdown', COALESCE(v_rating_breakdown, '{}'::json)
  );
END;
$$;

-- Drop and recreate get_pending_ratings_for_admin with new columns
DROP FUNCTION IF EXISTS get_pending_ratings_for_admin();

CREATE OR REPLACE FUNCTION get_pending_ratings_for_admin()
RETURNS TABLE (
  id uuid,
  deal_id uuid,
  deal_ref text,
  rater_phone text,
  rated_phone text,
  rating integer,
  comment text,
  rating_type text,
  item_type text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_phone text;
  v_is_admin boolean;
BEGIN
  v_caller_phone := current_setting('request.jwt.claims', true)::json->>'phone';
  
  SELECT user_type = 'admin' INTO v_is_admin
  FROM platform_users
  WHERE phone = v_caller_phone;

  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'غير مصرح - مسموح للإدارة فقط';
  END IF;

  RETURN QUERY
  SELECT 
    ur.id,
    ur.deal_id,
    COALESCE(d.deal_ref, '') as deal_ref,
    ur.rater_phone,
    ur.rated_phone,
    ur.rating,
    ur.comment,
    ur.rating_type,
    ur.item_type,
    ur.created_at
  FROM user_ratings ur
  LEFT JOIN deals d ON d.id = ur.deal_id
  WHERE ur.is_confirmed = false
  ORDER BY ur.created_at DESC;
END;
$$;

-- Create index for visitor ratings
CREATE INDEX IF NOT EXISTS idx_user_ratings_visitor ON user_ratings(rating_type, item_id) WHERE rating_type = 'visitor';
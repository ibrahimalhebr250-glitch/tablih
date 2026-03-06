/*
  # Update Ratings System with Confirmation

  1. Changes to Tables
    - Add `is_confirmed` to user_ratings table
    - Add `admin_reviewed_at` timestamp
    - Add `admin_reviewed_by` phone
    - Update RLS policies for better security

  2. New Functions
    - `create_user_rating` - Create a rating with validations
    - `get_user_ratings_summary` - Get average rating and count for a user
    - `get_pending_ratings_for_admin` - Admin function to get unconfirmed ratings
    - `admin_confirm_rating` - Admin function to confirm/reject ratings

  3. Security
    - Users can only rate completed deals they're part of
    - Only one rating per user per deal
    - Admins can review and confirm ratings

  4. Notes
    - Only completed deals can be rated
    - Ratings affect trust_rating display
*/

-- Add new columns to user_ratings if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_ratings' AND column_name = 'is_confirmed'
  ) THEN
    ALTER TABLE user_ratings ADD COLUMN is_confirmed boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_ratings' AND column_name = 'admin_reviewed_at'
  ) THEN
    ALTER TABLE user_ratings ADD COLUMN admin_reviewed_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_ratings' AND column_name = 'admin_reviewed_by'
  ) THEN
    ALTER TABLE user_ratings ADD COLUMN admin_reviewed_by text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_ratings' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE user_ratings ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Update RLS policies
DROP POLICY IF EXISTS "Users can view ratings" ON user_ratings;
DROP POLICY IF EXISTS "Admins can view all ratings" ON user_ratings;
DROP POLICY IF EXISTS "Users can create ratings" ON user_ratings;

-- Users can view their own ratings (given or received)
CREATE POLICY "Users can view own ratings"
  ON user_ratings FOR SELECT
  TO authenticated
  USING (
    rater_phone = current_setting('request.jwt.claims', true)::json->>'phone'
    OR rated_phone = current_setting('request.jwt.claims', true)::json->>'phone'
  );

-- Admins can view all ratings
CREATE POLICY "Admins can view all ratings"
  ON user_ratings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_users
      WHERE phone = current_setting('request.jwt.claims', true)::json->>'phone'
      AND user_type = 'admin'
    )
  );

-- Function to create a user rating
CREATE OR REPLACE FUNCTION create_user_rating(
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
  v_rater_phone text;
  v_deal_record deals;
  v_rating_id uuid;
  v_existing_rating_id uuid;
  v_rated_user_type text;
  v_item_type text;
  v_item_id uuid;
BEGIN
  v_rater_phone := current_setting('request.jwt.claims', true)::json->>'phone';
  
  IF v_rater_phone IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح');
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
  IF v_rater_phone != v_deal_record.buyer_phone AND v_rater_phone != v_deal_record.supplier_phone THEN
    RETURN json_build_object('success', false, 'error', 'يمكنك تقييم الصفقات التي أنت طرف فيها فقط');
  END IF;

  -- Verify rated user is the other party
  IF p_rated_phone != v_deal_record.buyer_phone AND p_rated_phone != v_deal_record.supplier_phone THEN
    RETURN json_build_object('success', false, 'error', 'المستخدم المحدد ليس طرفاً في الصفقة');
  END IF;

  -- Can't rate yourself
  IF v_rater_phone = p_rated_phone THEN
    RETURN json_build_object('success', false, 'error', 'لا يمكنك تقييم نفسك');
  END IF;

  -- Determine item type and ID
  IF v_rater_phone = v_deal_record.buyer_phone THEN
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
    AND rater_phone = v_rater_phone
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
    v_rater_phone,
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

-- Function to get user ratings summary
CREATE OR REPLACE FUNCTION get_user_ratings_summary(p_user_phone text)
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
  -- Get average rating (only confirmed)
  SELECT 
    COALESCE(AVG(rating), 0),
    COUNT(*),
    COUNT(*) FILTER (WHERE is_confirmed = true),
    COUNT(*) FILTER (WHERE is_confirmed = false)
  INTO v_avg_rating, v_total_ratings, v_confirmed_ratings, v_pending_ratings
  FROM user_ratings
  WHERE rated_phone = p_user_phone
    AND is_confirmed = true;

  -- Get rating breakdown
  SELECT json_object_agg(rating, count)
  INTO v_rating_breakdown
  FROM (
    SELECT rating, COUNT(*) as count
    FROM user_ratings
    WHERE rated_phone = p_user_phone
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

-- Function to get pending ratings (admin only)
CREATE OR REPLACE FUNCTION get_pending_ratings_for_admin()
RETURNS TABLE (
  id uuid,
  deal_id uuid,
  deal_ref text,
  rater_phone text,
  rated_phone text,
  rating integer,
  comment text,
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
    d.deal_ref,
    ur.rater_phone,
    ur.rated_phone,
    ur.rating,
    ur.comment,
    ur.created_at
  FROM user_ratings ur
  JOIN deals d ON d.id = ur.deal_id
  WHERE ur.is_confirmed = false
  ORDER BY ur.created_at DESC;
END;
$$;

-- Function to confirm/reject rating (admin only)
CREATE OR REPLACE FUNCTION admin_confirm_rating(
  p_rating_id uuid,
  p_is_confirmed boolean
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_phone text;
  v_is_admin boolean;
BEGIN
  v_admin_phone := current_setting('request.jwt.claims', true)::json->>'phone';
  
  SELECT user_type = 'admin' INTO v_is_admin
  FROM platform_users
  WHERE phone = v_admin_phone;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح - مسموح للإدارة فقط');
  END IF;

  UPDATE user_ratings
  SET 
    is_confirmed = p_is_confirmed,
    admin_reviewed_at = now(),
    admin_reviewed_by = v_admin_phone,
    updated_at = now()
  WHERE id = p_rating_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'التقييم غير موجود');
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', CASE 
      WHEN p_is_confirmed THEN 'تم تأكيد التقييم'
      ELSE 'تم رفض التقييم'
    END
  );
END;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_ratings_rated_phone ON user_ratings(rated_phone, is_confirmed);
CREATE INDEX IF NOT EXISTS idx_user_ratings_deal ON user_ratings(deal_id);
CREATE INDEX IF NOT EXISTS idx_user_ratings_pending ON user_ratings(is_confirmed) WHERE is_confirmed = false;
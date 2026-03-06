/*
  # Auto Update Trust Rating on Visitor Rating

  ## Changes
  This migration creates a trigger to automatically update the `trust_rating` in the
  `platform_users` table whenever a new confirmed visitor rating is added or updated.

  ## Updated Logic
  - When a visitor rating is confirmed (is_confirmed = true), recalculate trust_rating
  - trust_rating = average of all confirmed visitor ratings for that user
  - Updates happen automatically via trigger

  ## Important Notes
  1. This ensures real-time updates to trust ratings displayed on cards
  2. Only confirmed ratings affect trust_rating
  3. Trigger fires on INSERT and UPDATE of user_ratings table
*/

-- Function to recalculate and update trust rating
CREATE OR REPLACE FUNCTION update_trust_rating_from_visitor_ratings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_avg_rating numeric;
BEGIN
  -- Calculate average rating from confirmed visitor ratings
  SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 3.0)
  INTO v_avg_rating
  FROM user_ratings
  WHERE rated_phone = NEW.rated_phone
    AND rating_type = 'visitor'
    AND is_confirmed = true;

  -- Update the user's trust rating
  UPDATE platform_users
  SET trust_rating = v_avg_rating
  WHERE phone = NEW.rated_phone;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_update_trust_rating ON user_ratings;

-- Create trigger for INSERT and UPDATE
CREATE TRIGGER trigger_update_trust_rating
  AFTER INSERT OR UPDATE OF rating, is_confirmed
  ON user_ratings
  FOR EACH ROW
  WHEN (NEW.rating_type = 'visitor' AND NEW.is_confirmed = true)
  EXECUTE FUNCTION update_trust_rating_from_visitor_ratings();

-- Also recalculate for all existing confirmed visitor ratings
DO $$
DECLARE
  v_user_phone text;
  v_avg_rating numeric;
BEGIN
  FOR v_user_phone IN 
    SELECT DISTINCT rated_phone 
    FROM user_ratings 
    WHERE rating_type = 'visitor' AND is_confirmed = true
  LOOP
    SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 3.0)
    INTO v_avg_rating
    FROM user_ratings
    WHERE rated_phone = v_user_phone
      AND rating_type = 'visitor'
      AND is_confirmed = true;

    UPDATE platform_users
    SET trust_rating = v_avg_rating
    WHERE phone = v_user_phone;
  END LOOP;
END $$;

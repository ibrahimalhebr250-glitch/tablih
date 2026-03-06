/*
  # Add Ratings Comments System with Content Moderation

  ## Overview
  This migration adds a comprehensive comments system for ratings with content moderation capabilities.
  
  ## New Tables
  
  ### `ratings_comments`
  Stores detailed text comments associated with ratings between users.
  - `id` (uuid, primary key) - Unique comment identifier
  - `rating_id` (uuid, foreign key) - Links to user_ratings table
  - `commenter_phone` (text) - Phone of user leaving comment
  - `comment_text` (text) - The actual comment content (max 500 chars)
  - `is_visible` (boolean) - Whether comment is visible (for soft delete)
  - `moderation_status` (text) - Status: 'pending', 'approved', 'rejected', 'flagged'
  - `flagged_reason` (text, nullable) - Reason if flagged or rejected
  - `moderated_by` (text, nullable) - Phone of admin who moderated
  - `moderated_at` (timestamptz, nullable) - When moderation action was taken
  - `created_at` (timestamptz) - When comment was created
  - `updated_at` (timestamptz) - Last update timestamp
  
  ## Security Features
  - RLS enabled on all tables
  - Users can delete their own comments
  - Rated users can hide comments about them
  - Admins can moderate all comments
  - Automatic approval for now (can be changed to pending)
  
  ## Important Notes
  1. Comments are linked to ratings (one comment per rating)
  2. Moderation system allows admin oversight
  3. Soft delete keeps comment data for audit
  4. Owner of listing can request deletion
*/

-- Create ratings_comments table
CREATE TABLE IF NOT EXISTS ratings_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rating_id uuid NOT NULL REFERENCES user_ratings(id) ON DELETE CASCADE,
  commenter_phone text NOT NULL,
  comment_text text NOT NULL CHECK (char_length(comment_text) > 0 AND char_length(comment_text) <= 500),
  is_visible boolean DEFAULT true,
  moderation_status text DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'flagged')),
  flagged_reason text,
  moderated_by text,
  moderated_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(rating_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_ratings_comments_rating_id ON ratings_comments(rating_id);
CREATE INDEX IF NOT EXISTS idx_ratings_comments_moderation_status ON ratings_comments(moderation_status);
CREATE INDEX IF NOT EXISTS idx_ratings_comments_visible ON ratings_comments(is_visible);

-- Enable RLS
ALTER TABLE ratings_comments ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view approved and visible comments
CREATE POLICY "Anyone can view approved visible comments"
  ON ratings_comments FOR SELECT
  USING (is_visible = true AND moderation_status = 'approved');

-- Policy: Authenticated users can insert comments
CREATE POLICY "Authenticated users can add comments"
  ON ratings_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    commenter_phone = current_setting('request.jwt.claims', true)::json->>'phone'
    AND EXISTS (SELECT 1 FROM user_ratings WHERE id = rating_id AND rater_phone = commenter_phone)
  );

-- Policy: Users can delete their own comments
CREATE POLICY "Users can delete own comments"
  ON ratings_comments FOR DELETE
  TO authenticated
  USING (
    commenter_phone = current_setting('request.jwt.claims', true)::json->>'phone'
  );

-- Policy: Admins can view all comments
CREATE POLICY "Admins can view all comments"
  ON ratings_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_users 
      WHERE phone = current_setting('request.jwt.claims', true)::json->>'phone'
      AND user_type = 'admin'
    )
  );

-- Policy: Admins can update any comment
CREATE POLICY "Admins can moderate comments"
  ON ratings_comments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_users 
      WHERE phone = current_setting('request.jwt.claims', true)::json->>'phone'
      AND user_type = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_users 
      WHERE phone = current_setting('request.jwt.claims', true)::json->>'phone'
      AND user_type = 'admin'
    )
  );

-- Policy: Admins can delete any comment
CREATE POLICY "Admins can delete any comment"
  ON ratings_comments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_users 
      WHERE phone = current_setting('request.jwt.claims', true)::json->>'phone'
      AND user_type = 'admin'
    )
  );

-- Function: Hide comment (soft delete by owner of rated entity)
CREATE OR REPLACE FUNCTION hide_comment_by_owner(
  p_comment_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_phone text;
  v_rated_phone text;
  v_result json;
BEGIN
  -- Get caller's phone
  v_user_phone := current_setting('request.jwt.claims', true)::json->>'phone';

  IF v_user_phone IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Get the rated user's phone from the comment
  SELECT r.rated_phone INTO v_rated_phone
  FROM ratings_comments rc
  JOIN user_ratings r ON r.id = rc.rating_id
  WHERE rc.id = p_comment_id;

  -- Check if caller is the rated user
  IF v_rated_phone != v_user_phone THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Hide the comment
  UPDATE ratings_comments
  SET 
    is_visible = false,
    moderation_status = 'flagged',
    flagged_reason = COALESCE(p_reason, 'Hidden by listing owner'),
    updated_at = now()
  WHERE id = p_comment_id;

  RETURN json_build_object('success', true, 'message', 'Comment hidden successfully');
END;
$$;

-- Function: Moderate comment (admin action)
CREATE OR REPLACE FUNCTION moderate_comment(
  p_comment_id uuid,
  p_action text,
  p_reason text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_phone text;
  v_is_admin boolean;
  v_result json;
BEGIN
  -- Get caller's phone and check if admin
  v_user_phone := current_setting('request.jwt.claims', true)::json->>'phone';
  
  SELECT user_type = 'admin' INTO v_is_admin
  FROM platform_users 
  WHERE phone = v_user_phone;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN json_build_object('success', false, 'error', 'Admin access required');
  END IF;

  -- Perform action
  IF p_action = 'delete' THEN
    DELETE FROM ratings_comments WHERE id = p_comment_id;
    RETURN json_build_object('success', true, 'message', 'Comment deleted permanently');
  
  ELSIF p_action = 'approve' THEN
    UPDATE ratings_comments
    SET 
      moderation_status = 'approved',
      is_visible = true,
      moderated_by = v_user_phone,
      moderated_at = now(),
      updated_at = now()
    WHERE id = p_comment_id;
    RETURN json_build_object('success', true, 'message', 'Comment approved');
  
  ELSIF p_action = 'reject' THEN
    UPDATE ratings_comments
    SET 
      moderation_status = 'rejected',
      is_visible = false,
      flagged_reason = COALESCE(p_reason, 'Rejected by admin'),
      moderated_by = v_user_phone,
      moderated_at = now(),
      updated_at = now()
    WHERE id = p_comment_id;
    RETURN json_build_object('success', true, 'message', 'Comment rejected');
  
  ELSIF p_action = 'flag' THEN
    UPDATE ratings_comments
    SET 
      moderation_status = 'flagged',
      flagged_reason = COALESCE(p_reason, 'Flagged for review'),
      moderated_by = v_user_phone,
      moderated_at = now(),
      updated_at = now()
    WHERE id = p_comment_id;
    RETURN json_build_object('success', true, 'message', 'Comment flagged');
  
  ELSE
    RETURN json_build_object('success', false, 'error', 'Invalid action');
  END IF;
END;
$$;

-- Function: Get comments for a user (with privacy)
CREATE OR REPLACE FUNCTION get_user_comments(
  p_user_phone text,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  comment_id uuid,
  rating_id uuid,
  commenter_city text,
  commenter_type text,
  rating_value integer,
  comment_text text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rc.id as comment_id,
    rc.rating_id,
    u.city as commenter_city,
    u.user_type as commenter_type,
    r.rating as rating_value,
    rc.comment_text,
    rc.created_at
  FROM ratings_comments rc
  JOIN user_ratings r ON r.id = rc.rating_id
  JOIN platform_users u ON u.phone = rc.commenter_phone
  WHERE r.rated_phone = p_user_phone
    AND rc.is_visible = true
    AND rc.moderation_status = 'approved'
    AND r.is_confirmed = true
  ORDER BY rc.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Function: Get flagged comments for admin review
CREATE OR REPLACE FUNCTION get_flagged_comments()
RETURNS TABLE (
  comment_id uuid,
  rating_id uuid,
  commenter_phone text,
  commenter_name text,
  rated_phone text,
  rated_name text,
  comment_text text,
  moderation_status text,
  flagged_reason text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin boolean;
  v_caller_phone text;
BEGIN
  -- Check if caller is admin
  v_caller_phone := current_setting('request.jwt.claims', true)::json->>'phone';
  
  SELECT user_type = 'admin' INTO v_is_admin
  FROM platform_users WHERE phone = v_caller_phone;

  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  SELECT 
    rc.id as comment_id,
    rc.rating_id,
    rc.commenter_phone,
    u1.display_name as commenter_name,
    r.rated_phone,
    u2.display_name as rated_name,
    rc.comment_text,
    rc.moderation_status,
    rc.flagged_reason,
    rc.created_at
  FROM ratings_comments rc
  JOIN user_ratings r ON r.id = rc.rating_id
  JOIN platform_users u1 ON u1.phone = rc.commenter_phone
  JOIN platform_users u2 ON u2.phone = r.rated_phone
  WHERE rc.moderation_status IN ('flagged', 'pending')
  ORDER BY rc.created_at DESC;
END;
$$;
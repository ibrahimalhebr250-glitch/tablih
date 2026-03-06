/*
  # Fix Column Ambiguity in Admin Functions

  ## Problem
  Column name `rating_id` conflicts with the output column name.

  ## Solution
  Use fully qualified column names in subquery.
*/

CREATE OR REPLACE FUNCTION admin_get_all_ratings(
  p_caller_phone text,
  p_filter_type text DEFAULT 'all',
  p_filter_status text DEFAULT 'all',
  p_rating_type text DEFAULT 'all',
  p_search_phone text DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  rating_id uuid,
  deal_id uuid,
  deal_ref text,
  rater_phone text,
  rater_name text,
  rated_phone text,
  rated_name text,
  rating_value integer,
  comment_text text,
  rating_type text,
  item_type text,
  is_confirmed boolean,
  admin_reviewed_by text,
  admin_reviewed_at timestamptz,
  created_at timestamptz,
  has_comment boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  SELECT user_type = 'admin' INTO v_is_admin
  FROM platform_users WHERE phone = p_caller_phone;

  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'غير مصرح - مسموح للإدارة فقط';
  END IF;

  RETURN QUERY
  SELECT 
    r.id,
    r.deal_id,
    d.deal_ref,
    r.rater_phone,
    COALESCE(u1.display_name, r.rater_phone) as rater_name,
    r.rated_phone,
    COALESCE(u2.display_name, r.rated_phone) as rated_name,
    r.rating,
    r.comment,
    COALESCE(r.rating_type, 'deal'),
    r.item_type,
    COALESCE(r.is_confirmed, false),
    r.admin_reviewed_by,
    r.admin_reviewed_at,
    r.created_at,
    EXISTS(SELECT 1 FROM ratings_comments rc WHERE rc.rating_id = r.id)
  FROM user_ratings r
  LEFT JOIN deals d ON d.id = r.deal_id
  LEFT JOIN platform_users u1 ON u1.phone = r.rater_phone
  LEFT JOIN platform_users u2 ON u2.phone = r.rated_phone
  WHERE 
    (p_filter_type = 'all' OR r.item_type = p_filter_type)
    AND (p_filter_status = 'all' OR 
      (p_filter_status = 'confirmed' AND COALESCE(r.is_confirmed, false) = true) OR
      (p_filter_status = 'pending' AND COALESCE(r.is_confirmed, false) = false))
    AND (p_rating_type = 'all' OR COALESCE(r.rating_type, 'deal') = p_rating_type)
    AND (p_search_phone IS NULL OR 
      r.rater_phone LIKE '%' || p_search_phone || '%' OR
      r.rated_phone LIKE '%' || p_search_phone || '%')
  ORDER BY r.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
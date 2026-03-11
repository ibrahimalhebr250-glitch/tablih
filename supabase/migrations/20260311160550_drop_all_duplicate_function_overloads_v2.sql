/*
  # Drop All Duplicate Function Overloads (v2)

  ## Problem
  Multiple functions have two overloads causing PostgREST PGRST203 errors.
  The log_order_operation() with no args is a trigger function - it must be kept.

  ## Fix
  Drop legacy overloads for all 19 remaining duplicate functions.
*/

-- 1. admin_bulk_moderate_comments: drop old version without p_caller_phone
DROP FUNCTION IF EXISTS admin_bulk_moderate_comments(p_comment_ids uuid[], p_action text, p_reason text);

-- 2. admin_confirm_payment: drop old version without p_admin_phone
DROP FUNCTION IF EXISTS admin_confirm_payment(p_deal_id uuid);

-- 3. admin_delete_comment: drop old version without p_caller_email
DROP FUNCTION IF EXISTS admin_delete_comment(p_comment_id uuid);

-- 4. admin_delete_inventory_batch: drop old version without p_reason
DROP FUNCTION IF EXISTS admin_delete_inventory_batch(p_admin_email text, p_batch_id uuid);

-- 5. admin_delete_order: drop old version without p_admin_email
DROP FUNCTION IF EXISTS admin_delete_order(p_order_id uuid);

-- 6. admin_delete_rating: drop old version without p_caller_email
DROP FUNCTION IF EXISTS admin_delete_rating(p_rating_id uuid);

-- 7. admin_get_all_comments: drop old version with p_filter_visibility
DROP FUNCTION IF EXISTS admin_get_all_comments(p_caller_email text, p_filter_status text, p_filter_visibility text, p_search_text text, p_limit integer, p_offset integer);

-- 8. admin_get_comments_analytics: drop old version without p_caller_email
DROP FUNCTION IF EXISTS admin_get_comments_analytics();

-- 9. admin_restore_comment: drop old version without p_caller_phone
DROP FUNCTION IF EXISTS admin_restore_comment(p_comment_id uuid);

-- 10. admin_settle_supplier: drop old version without p_admin_phone
DROP FUNCTION IF EXISTS admin_settle_supplier(p_deal_id uuid);

-- 11. admin_update_comment: drop old version without p_caller_phone
DROP FUNCTION IF EXISTS admin_update_comment(p_comment_id uuid, p_comment_text text, p_moderation_status text, p_is_visible boolean, p_flagged_reason text);

-- 12. admin_update_rating: drop old version without p_caller_email
DROP FUNCTION IF EXISTS admin_update_rating(p_rating_id uuid, p_rating_value integer, p_comment text, p_is_confirmed boolean);

-- 13. create_match_notification: drop old version with fewer params
DROP FUNCTION IF EXISTS create_match_notification(p_user_phone text, p_notification_type text, p_order_id uuid, p_batch_id uuid, p_match_score numeric, p_metadata jsonb);

-- 14. create_user_rating: drop old version without p_rater_phone
DROP FUNCTION IF EXISTS create_user_rating(p_deal_id uuid, p_rated_phone text, p_rating integer, p_comment text);

-- 15. get_revenue_timeline: drop old version with p_admin_email
DROP FUNCTION IF EXISTS get_revenue_timeline(p_admin_email text, p_period text, p_limit integer);

-- 16. get_user_notifications: drop old version with p_phone param name
DROP FUNCTION IF EXISTS get_user_notifications(p_phone text, p_limit integer, p_unread_only boolean);

-- 17. log_platform_visit: drop old version with uuid types
DROP FUNCTION IF EXISTS log_platform_visit(p_visitor_id uuid, p_session_id uuid, p_phone text, p_user_agent text);

-- 18. manual_match_existing_orders: drop empty-args version
DROP FUNCTION IF EXISTS manual_match_existing_orders();

-- 19. mark_notification_read: drop old version without p_user_phone
DROP FUNCTION IF EXISTS mark_notification_read(p_notification_id uuid);

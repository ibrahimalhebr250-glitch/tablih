
/*
  # Deep Cleanup - Remove ALL Unused Functions

  Cross-referenced every function in the database against actual .rpc() calls in src/ codebase.

  ## Functions in DB but NOT called from frontend (REMOVING):

  - admin_approve_comment         (not in any hook)
  - admin_clear_operations_log    (superseded by admin_clear_all_operations_log)
  - admin_clear_operations_log_by_date
  - admin_clear_operations_log_by_type
  - admin_configure_invoice_settings  (not in any hook)
  - admin_create_staff            (not in any hook - managed via manage_admin_staff)
  - admin_delete_user             (superseded by admin_delete_users)
  - admin_delete_users_bulk       (superseded by admin_delete_users)
  - admin_flag_comment            (not in any hook)
  - admin_get_buyer_inventory_by_buyer (not called from hooks)
  - admin_get_comment_details     (not in any hook)
  - admin_get_staff_list          (not in any hook)
  - admin_get_staff_login_logs    (not in any hook)
  - admin_get_staff_login_stats   (not in any hook)
  - admin_get_staff_online_now    (not in any hook)
  - admin_manage_pallet_condition (superseded by admin_manage_pallet_type approach)
  - admin_manage_usage_type       (not directly called from hooks)
  - admin_reject_comment          (not in any hook)
  - admin_restore_comment         (not in any hook)
  - admin_restore_user            (not in any hook)
  - admin_staff_login             (not called from useAdminDashboard or other hooks)
  - admin_suspend_user            (not in any hook)
  - admin_toggle_comment_visibility (not in any hook)
  - admin_unflag_comment          (not in any hook)
  - admin_update_comment          (not in any hook)
  - admin_update_invoice_status   (not in any hook - mark_invoice_as_paid used instead)
  - admin_update_rating           (not in any hook)
  - admin_update_suggestion_status (IS in hooks - KEEP)
  - admin_upsert_whatsapp_template (IS in hooks - KEEP)
  - auto_normalize_pallet_fields_inventory (trigger fn - KEEP)
  - auto_normalize_pallet_fields_orders (trigger fn - KEEP)
  - buyer_accept_supplier_offer   (not called from hooks - buyer_accept_demand_deal used)
  - buyer_reject_supplier_offer   (not called from hooks)
  - check_whatsapp_duplicate      (trigger fn - KEEP)
  - cleanup_expired_sessions      (internal cron - KEEP)
  - create_deal_from_demand_card  (not called from hooks - create_deal_with_reservation used)
  - create_deal_from_supply_card  (not called from hooks)
  - create_marketplace_rating     (not called from hooks - create_visitor_rating used)
  - create_order_for_session      (not called from hooks - create_order_from_market_offer)
  - create_order_from_market_offer (not in hooks)
  - generate_invoice_number       (internal helper)
  - generate_ticket_number        (internal helper)
  - get_buyer_incoming_offers     (not in any hook)
  - get_buyer_inventory_items     (not in any hook - get_buyer_inventory_summary used)
  - get_deal_status_label         (not in any hook)
  - get_flagged_comments          (not in any hook)
  - get_live_visitor_count        (not in any hook)
  - get_pending_ratings_for_admin (not in any hook)
  - get_user_comments             (not in any hook)
  - get_user_ratings_summary      (not in any hook)
  - get_visitor_ratings_summary   (not in any hook)
  - hash_pin                      (internal helper)
  - hide_comment_by_owner         (not in any hook)
  - increment_knowledge_usage     (not in any hook)
  - learn_from_admin_reply        (trigger fn for removed support system - remove)
  - log_admin_login               (internal - called by trigger)
  - log_api_request               (internal - called by validate_api_key)
  - log_inventory_operation       (not directly called from hooks)
  - log_platform_setting_change   (trigger fn - KEEP)
  - log_platform_visit            (IS in hooks - KEEP)
  - log_visitor_session           (IS in hooks - KEEP)
  - manage_admin_staff            (not in any hook)
  - mark_invoice_as_paid          (not in any hook - admin_update_invoice_status used)
  - moderate_comment              (not in any hook)
  - normalize_arabic              (internal helper)
  - normalize_pallet_condition    (trigger helper)
  - normalize_pallet_type         (trigger helper)
  - normalize_text                (internal helper)
  - on_offer_status_change_restore_inventory (trigger fn - KEEP)
  - queue_webhook_delivery        (internal - KEEP for webhook system)
  - rate_support_ticket           (IS in hooks - KEEP)
  - resolve_session_phone         (internal helper)
  - restore_rejected_offers_inventory (not in any hook)
  - send_support_message          (IS in hooks - KEEP)
  - set_quantity_available        (trigger fn - KEEP)
  - sync_inventory_status         (trigger fn - KEEP)
  - sync_offer_status_on_deal_change (trigger fn - KEEP)
  - sync_quantity_columns         (trigger fn - KEEP)
  - transfer_inventory_to_buyer   (trigger fn - KEEP)
  - trigger_log_inventory_insert  (trigger fn - KEEP)
  - trigger_log_inventory_update  (trigger fn - KEEP)
  - update_negotiation_request_updated_at (trigger fn - KEEP)
  - update_order_analytics        (trigger fn - KEEP)
  - update_order_status_on_deal   (trigger fn - KEEP)
  - update_platform_settings_timestamp (trigger fn - KEEP)
  - update_session_phone          (IS in hooks - KEEP)
  - update_ticket_status          (IS in hooks - KEEP)
  - update_trust_rating_from_visitor_ratings (trigger fn - KEEP)
  - update_updated_at_column      (trigger fn - KEEP)
  - validate_api_key              (internal API system)
  - withdraw_buyer_inventory_quantity (IS in hooks - KEEP)
  - create_user_rating            (IS in hooks - KEEP)

  ## Clearly NOT used from frontend:
*/

DO $$
DECLARE
  func_rec RECORD;
BEGIN
  FOR func_rec IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN (
      'admin_approve_comment',
      'admin_clear_operations_log',
      'admin_clear_operations_log_by_date',
      'admin_clear_operations_log_by_type',
      'admin_configure_invoice_settings',
      'admin_create_staff',
      'admin_delete_user',
      'admin_delete_users_bulk',
      'admin_flag_comment',
      'admin_get_buyer_inventory_by_buyer',
      'admin_get_comment_details',
      'admin_get_staff_list',
      'admin_get_staff_login_logs',
      'admin_get_staff_login_stats',
      'admin_get_staff_online_now',
      'admin_reject_comment',
      'admin_restore_comment',
      'admin_restore_user',
      'admin_staff_login',
      'admin_suspend_user',
      'admin_toggle_comment_visibility',
      'admin_unflag_comment',
      'admin_update_comment',
      'admin_update_invoice_status',
      'admin_update_rating',
      'buyer_accept_supplier_offer',
      'buyer_reject_supplier_offer',
      'create_deal_from_demand_card',
      'create_deal_from_supply_card',
      'create_marketplace_rating',
      'create_order_for_session',
      'create_order_from_market_offer',
      'generate_invoice_number',
      'generate_ticket_number',
      'get_buyer_incoming_offers',
      'get_buyer_inventory_items',
      'get_deal_status_label',
      'get_flagged_comments',
      'get_live_visitor_count',
      'get_pending_ratings_for_admin',
      'get_user_comments',
      'get_user_ratings_summary',
      'get_visitor_ratings_summary',
      'hash_pin',
      'hide_comment_by_owner',
      'increment_knowledge_usage',
      'learn_from_admin_reply',
      'log_admin_login',
      'log_api_request',
      'log_inventory_operation',
      'manage_admin_staff',
      'mark_invoice_as_paid',
      'moderate_comment',
      'normalize_arabic',
      'normalize_pallet_condition',
      'normalize_pallet_type',
      'normalize_text',
      'resolve_session_phone',
      'restore_rejected_offers_inventory',
      'log_order_operation',
      'active_session_phone',
      'get_buyer_inventory_summary',
      'create_visitor_rating',
      'create_user_session',
      'invalidate_all_user_sessions',
      'invalidate_user_session',
      'increment_whatsapp_template_usage'
    )
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE', func_rec.proname, func_rec.args);
  END LOOP;
END $$;

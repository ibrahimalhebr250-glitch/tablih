
/*
  # Database Cleanup - Phase 5: Remove Remaining Unused Functions

  Dropping remaining functions that were not removed due to different signatures,
  and any remaining dead code from old matching/analytics systems.

  Using CASCADE-safe approach with IF EXISTS.
*/

-- Drop all remaining old matching engine functions (various signatures)
DO $$
DECLARE
  func_rec RECORD;
BEGIN
  FOR func_rec IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN (
      'ai_log_deal_creation', 'ai_match_engine', 'ai_order_priority', 'ai_score_match',
      'apply_matching_rules', 'auto_match_unmatched_orders', 'calculate_match_score',
      'check_matching_blacklist', 'create_match_notification', 'get_best_matches_for_order',
      'get_matching_analytics', 'get_matching_performance_metrics', 'get_matching_performance_timeline',
      'get_pending_orders_with_potential_matches', 'instant_match_engine', 'instant_match_engine_v2',
      'log_matching_attempt', 'manual_match_existing_orders', 'match_all_existing_orders',
      'match_all_pending_orders', 'match_single_order', 'multi_batch_matching',
      'notify_potential_matches', 'om_admin_create_deal_from_candidate', 'om_auto_create_deal',
      'om_compute_match_score', 'om_get_candidates_board', 'om_get_market_analysis',
      'om_get_market_opportunities', 'om_get_near_matches', 'om_normalize_pallet_type',
      'om_normalize_quality', 'om_normalize_size', 'om_refresh_market_snapshot',
      'om_rescan_all_active', 'om_scan_candidates_for_batch', 'om_scan_candidates_for_order',
      'process_pending_orders_batch', 'process_pending_orders_batch_v2',
      'smart_auto_match_orders', 'trigger_auto_match_on_inventory',
      'trigger_instant_match_on_new_batch', 'trigger_instant_match_on_new_batch_v2',
      'trigger_instant_match_on_new_order', 'trigger_instant_match_on_new_order_v2',
      'trigger_match_on_new_inventory', 'trigger_smart_auto_match',
      'ultra_smart_match_order', 'ultra_smart_match_orders',
      'ultra_smart_match_orders_with_notifications', 'update_matching_performance',
      'v4_bulk_match', 'v4_compute_score', 'v4_match_engine', 'v4_preview_candidates',
      'admin_block_match', 'admin_force_match', 'admin_run_comprehensive_matching',
      'admin_trigger_matching'
    )
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE', func_rec.proname, func_rec.args);
  END LOOP;
END $$;

-- Drop all remaining A/B testing functions
DO $$
DECLARE
  func_rec RECORD;
BEGIN
  FOR func_rec IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN (
      'assign_ab_test_variant', 'create_ab_test', 'get_ab_test_results', 'track_ab_test_conversion'
    )
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE', func_rec.proname, func_rec.args);
  END LOOP;
END $$;

-- Drop remaining risk/revenue/backup/behavior functions
DO $$
DECLARE
  func_rec RECORD;
BEGIN
  FOR func_rec IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN (
      'generate_risk_alerts', 'get_revenue_timeline', 'get_finance_predictions',
      'get_executive_summary', 'admin_configure_backup_schedule', 'admin_create_backup',
      'admin_delete_backup', 'admin_get_backup_details', 'admin_get_backup_schedules',
      'admin_get_backup_statistics', 'admin_list_backups', 'admin_log_restoration',
      'get_user_behavior_analytics', 'track_user_behavior', 'admin_get_behavior_summary',
      'admin_get_live_behavior_feed', 'advance_deal_status', 'calculate_dynamic_price',
      'cancel_deal', 'complete_deal', 'create_ledger_entries_for_deal', 'generate_finance_report',
      'get_city_financial_breakdown', 'get_reengagement_candidates', 'get_silent_deals',
      'get_supplier_credit_score', 'get_supplier_matching_inventory',
      'get_supplier_operations_summary', 'get_supplier_performance_metrics',
      'get_payment_alerts', 'update_order_analytics_daily', 'admin_resolve_alert',
      'admin_get_financial_snapshot', 'admin_bulk_delete_orders', 'admin_bulk_approve_ratings',
      'admin_bulk_delete_ratings', 'admin_bulk_moderate_comments', 'admin_confirm_payment',
      'admin_freeze_batch', 'admin_modify_deal_fee', 'buyer_confirm_deal_with_deadline_v4',
      'get_batch_timeline', 'get_supplier_active_batches', 'write_audit_log',
      'submit_payment_proof', 'assign_ticket_to_agent', 'refresh_template_performance_stats',
      'admin_confirm_marketplace_rating', 'get_pending_marketplace_ratings',
      'get_settings_changelog', 'log_deal_creation_analytics', 'mark_admin_contacted_user',
      'admin_force_status', 'admin_get_executive_metrics', 'admin_confirm_rating',
      'expire_reservations', 'generate_api_key', 'get_financial_summary',
      'delete_all_inventory_operations', 'delete_inventory_operations',
      'mark_notification_read', 'get_user_notifications',
      'admin_update_city', 'admin_create_pallet_type', 'admin_delete_pallet_type',
      'admin_update_pallet_type', 'admin_update_pallet_type_sort', 'admin_get_pallet_types',
      'admin_check_permission', 'get_admin_permissions', 'get_admin_role_permissions',
      'get_all_roles_permissions', 'verify_admin_permission', 'admin_settle_supplier',
      'admin_cancel_deal', 'admin_cancel_deal_v3', 'admin_delete_deal_v3',
      'buyer_confirm_deal', 'buyer_confirm_deal_v3', 'supplier_confirm_deal_v3',
      'supplier_complete_deal', 'supplier_complete_deal_v3', 'supplier_cancel_deal',
      'supplier_cancel_deal_v3', 'admin_get_deal_metrics_v3',
      'supplier_complete_deal_v4', 'admin_send_stall_reminder_v4'
    )
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE', func_rec.proname, func_rec.args);
  END LOOP;
END $$;

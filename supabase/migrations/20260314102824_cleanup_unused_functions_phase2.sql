
/*
  # Database Cleanup - Phase 2: Remove Unused/Duplicate Functions

  Removes RPC functions that are:
  1. Old versioned duplicates (v3 versions superseded by v4)
  2. Never called from the frontend codebase
  3. Internal helper functions for removed systems (matching engine)
  4. Duplicate matching engine implementations

  ## Functions being removed:

  ### Old Versioned Duplicates (v3 - superseded by v4)
  - buyer_confirm_deal_v3
  - supplier_confirm_deal_v3
  - supplier_complete_deal_v3
  - supplier_cancel_deal_v3
  - admin_cancel_deal_v3
  - admin_delete_deal_v3
  - supplier_complete_deal_v4        (kept supplier_confirm_delivery_v4 instead)

  ### Old Matching Engine (completely removed system)
  - ai_bulk_match_all_pending
  - ai_log_deal_creation
  - ai_match_engine
  - ai_match_on_inventory_insert
  - ai_match_on_order_insert
  - ai_order_priority
  - ai_preview_matches
  - ai_score_match
  - analyze_matching_patterns
  - apply_matching_rules
  - auto_match_order_on_inventory_insert
  - auto_match_unmatched_orders
  - calculate_match_score
  - check_matching_blacklist
  - get_best_matches_for_order
  - get_matching_analytics
  - get_matching_hub_stats
  - get_matching_performance_metrics
  - get_matching_performance_timeline
  - get_matching_statistics
  - get_pending_orders_with_potential_matches
  - instant_match_engine
  - instant_match_engine_v2
  - log_matching_attempt
  - manual_match_existing_orders
  - match_all_existing_orders
  - match_all_pending_orders
  - match_single_order
  - multi_batch_matching
  - notify_potential_matches
  - om_admin_create_deal_from_candidate
  - om_auto_create_deal
  - om_compute_match_score
  - om_get_candidates_board
  - om_get_market_analysis
  - om_get_market_opportunities
  - om_get_near_matches
  - om_normalize_pallet_type
  - om_normalize_quality
  - om_normalize_size
  - om_refresh_market_snapshot
  - om_rescan_all_active
  - om_scan_candidates_for_batch
  - om_scan_candidates_for_order
  - process_pending_orders_batch
  - process_pending_orders_batch_v2
  - smart_auto_match_orders
  - trigger_auto_match_on_inventory
  - trigger_instant_match_on_new_batch
  - trigger_instant_match_on_new_batch_v2
  - trigger_instant_match_on_new_order
  - trigger_instant_match_on_new_order_v2
  - trigger_match_on_new_inventory
  - trigger_smart_auto_match
  - ultra_smart_match_order
  - ultra_smart_match_orders
  - ultra_smart_match_orders_with_notifications
  - update_matching_performance
  - v4_bulk_match
  - v4_compute_score
  - v4_match_engine
  - v4_preview_candidates
  - admin_block_match
  - admin_force_match
  - admin_run_comprehensive_matching
  - admin_trigger_matching
  - create_match_notification

  ### A/B Testing functions (tables removed)
  - assign_ab_test_variant
  - create_ab_test
  - get_ab_test_results
  - track_ab_test_conversion

  ### Risk/Revenue functions (tables removed)
  - generate_risk_alerts
  - get_revenue_timeline
  - get_finance_predictions
  - get_executive_summary

  ### Backup system (tables removed, not in frontend)
  - admin_configure_backup_schedule
  - admin_create_backup
  - admin_delete_backup
  - admin_get_backup_details
  - admin_get_backup_schedules
  - admin_get_backup_statistics
  - admin_list_backups
  - admin_log_restoration

  ### User behavior (table removed)
  - get_user_behavior_analytics
  - track_user_behavior
  - admin_get_behavior_summary
  - admin_get_live_behavior_feed

  ### Unused internal/duplicate functions
  - advance_deal_status           (not called from frontend)
  - calculate_dynamic_price       (not called from frontend)
  - cancel_deal                   (superseded by admin/supplier cancel)
  - complete_deal                 (internal use only)
  - create_ledger_entries_for_deal (table removed)
  - generate_finance_report       (not in frontend)
  - get_city_financial_breakdown  (not in frontend)
  - get_reengagement_candidates   (not in frontend)
  - get_silent_deals              (not in frontend)
  - get_supplier_credit_score     (not in frontend)
  - get_supplier_matching_inventory (not in frontend)
  - get_supplier_operations_summary (not in frontend)
  - get_supplier_performance_metrics (not in frontend)
  - get_payment_alerts            (not in frontend)
  - update_order_analytics_daily  (internal)
  - admin_resolve_alert           (table removed)
  - admin_get_financial_snapshot  (superseded by get_finance_dashboard_metrics)
  - admin_bulk_delete_orders      (not in frontend hooks)
  - admin_bulk_approve_ratings    (not in frontend hooks)
  - admin_bulk_delete_ratings     (not in frontend hooks)
  - admin_get_deal_metrics_v3     (superseded by v4)
  - admin_bulk_moderate_comments  (not in frontend hooks)
  - admin_confirm_payment         (not in frontend)
  - admin_freeze_batch            (not in frontend)
  - admin_modify_deal_fee         (not in frontend)
  - buyer_confirm_deal_with_deadline_v4 (superseded)
  - get_batch_timeline            (not in frontend)
  - get_supplier_active_batches   (not in frontend)
  - write_audit_log               (not in frontend)
  - submit_payment_proof          (not in frontend)
  - assign_ticket_to_agent        (not in frontend)
  - refresh_template_performance_stats (not in frontend)
*/

-- Old v3 versioned duplicates
DROP FUNCTION IF EXISTS buyer_confirm_deal_v3(text, text) CASCADE;
DROP FUNCTION IF EXISTS supplier_confirm_deal_v3(text, text) CASCADE;
DROP FUNCTION IF EXISTS supplier_complete_deal_v3(text, text) CASCADE;
DROP FUNCTION IF EXISTS supplier_cancel_deal_v3(text, text) CASCADE;
DROP FUNCTION IF EXISTS admin_cancel_deal_v3(text, text) CASCADE;
DROP FUNCTION IF EXISTS admin_delete_deal_v3(text, text) CASCADE;
DROP FUNCTION IF EXISTS admin_get_deal_metrics_v3() CASCADE;
DROP FUNCTION IF EXISTS admin_send_stall_reminder_v4(text, uuid, text) CASCADE;

-- Old matching engine functions
DROP FUNCTION IF EXISTS ai_bulk_match_all_pending() CASCADE;
DROP FUNCTION IF EXISTS ai_log_deal_creation(uuid, uuid, uuid, numeric) CASCADE;
DROP FUNCTION IF EXISTS ai_match_engine(uuid) CASCADE;
DROP FUNCTION IF EXISTS ai_match_on_inventory_insert() CASCADE;
DROP FUNCTION IF EXISTS ai_match_on_order_insert() CASCADE;
DROP FUNCTION IF EXISTS ai_order_priority(uuid) CASCADE;
DROP FUNCTION IF EXISTS ai_preview_matches(uuid) CASCADE;
DROP FUNCTION IF EXISTS ai_score_match(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS analyze_matching_patterns() CASCADE;
DROP FUNCTION IF EXISTS apply_matching_rules(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS auto_match_order_on_inventory_insert() CASCADE;
DROP FUNCTION IF EXISTS auto_match_unmatched_orders() CASCADE;
DROP FUNCTION IF EXISTS calculate_match_score(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS check_matching_blacklist(text, text) CASCADE;
DROP FUNCTION IF EXISTS get_best_matches_for_order(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_matching_analytics() CASCADE;
DROP FUNCTION IF EXISTS get_matching_hub_stats() CASCADE;
DROP FUNCTION IF EXISTS get_matching_performance_metrics() CASCADE;
DROP FUNCTION IF EXISTS get_matching_performance_timeline(integer) CASCADE;
DROP FUNCTION IF EXISTS get_matching_statistics() CASCADE;
DROP FUNCTION IF EXISTS get_pending_orders_with_potential_matches() CASCADE;
DROP FUNCTION IF EXISTS instant_match_engine(uuid) CASCADE;
DROP FUNCTION IF EXISTS instant_match_engine_v2(uuid) CASCADE;
DROP FUNCTION IF EXISTS log_matching_attempt(uuid, uuid, boolean, text) CASCADE;
DROP FUNCTION IF EXISTS manual_match_existing_orders() CASCADE;
DROP FUNCTION IF EXISTS match_all_existing_orders() CASCADE;
DROP FUNCTION IF EXISTS match_all_pending_orders() CASCADE;
DROP FUNCTION IF EXISTS match_single_order(uuid) CASCADE;
DROP FUNCTION IF EXISTS multi_batch_matching(uuid) CASCADE;
DROP FUNCTION IF EXISTS notify_potential_matches(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS om_admin_create_deal_from_candidate(uuid, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS om_auto_create_deal(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS om_compute_match_score(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS om_get_candidates_board() CASCADE;
DROP FUNCTION IF EXISTS om_get_market_analysis() CASCADE;
DROP FUNCTION IF EXISTS om_get_market_opportunities() CASCADE;
DROP FUNCTION IF EXISTS om_get_near_matches(uuid) CASCADE;
DROP FUNCTION IF EXISTS om_normalize_pallet_type(text) CASCADE;
DROP FUNCTION IF EXISTS om_normalize_quality(text) CASCADE;
DROP FUNCTION IF EXISTS om_normalize_size(text) CASCADE;
DROP FUNCTION IF EXISTS om_refresh_market_snapshot() CASCADE;
DROP FUNCTION IF EXISTS om_rescan_all_active() CASCADE;
DROP FUNCTION IF EXISTS om_scan_candidates_for_batch(uuid) CASCADE;
DROP FUNCTION IF EXISTS om_scan_candidates_for_order(uuid) CASCADE;
DROP FUNCTION IF EXISTS process_pending_orders_batch() CASCADE;
DROP FUNCTION IF EXISTS process_pending_orders_batch_v2() CASCADE;
DROP FUNCTION IF EXISTS smart_auto_match_orders() CASCADE;
DROP FUNCTION IF EXISTS trigger_auto_match_on_inventory() CASCADE;
DROP FUNCTION IF EXISTS trigger_instant_match_on_new_batch() CASCADE;
DROP FUNCTION IF EXISTS trigger_instant_match_on_new_batch_v2() CASCADE;
DROP FUNCTION IF EXISTS trigger_instant_match_on_new_order() CASCADE;
DROP FUNCTION IF EXISTS trigger_instant_match_on_new_order_v2() CASCADE;
DROP FUNCTION IF EXISTS trigger_match_on_new_inventory() CASCADE;
DROP FUNCTION IF EXISTS trigger_smart_auto_match() CASCADE;
DROP FUNCTION IF EXISTS ultra_smart_match_order(uuid) CASCADE;
DROP FUNCTION IF EXISTS ultra_smart_match_orders() CASCADE;
DROP FUNCTION IF EXISTS ultra_smart_match_orders_with_notifications() CASCADE;
DROP FUNCTION IF EXISTS update_matching_performance() CASCADE;
DROP FUNCTION IF EXISTS v4_bulk_match() CASCADE;
DROP FUNCTION IF EXISTS v4_compute_score(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS v4_match_engine(uuid) CASCADE;
DROP FUNCTION IF EXISTS v4_preview_candidates(uuid) CASCADE;
DROP FUNCTION IF EXISTS admin_block_match(uuid) CASCADE;
DROP FUNCTION IF EXISTS admin_force_match(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS admin_run_comprehensive_matching() CASCADE;
DROP FUNCTION IF EXISTS admin_trigger_matching() CASCADE;
DROP FUNCTION IF EXISTS create_match_notification(uuid, uuid, text) CASCADE;

-- A/B testing functions
DROP FUNCTION IF EXISTS assign_ab_test_variant(text, text) CASCADE;
DROP FUNCTION IF EXISTS create_ab_test(text, text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS get_ab_test_results(text) CASCADE;
DROP FUNCTION IF EXISTS track_ab_test_conversion(text, text) CASCADE;

-- Risk/revenue functions (tables removed)
DROP FUNCTION IF EXISTS generate_risk_alerts() CASCADE;
DROP FUNCTION IF EXISTS get_revenue_timeline(integer) CASCADE;
DROP FUNCTION IF EXISTS get_finance_predictions() CASCADE;
DROP FUNCTION IF EXISTS get_executive_summary() CASCADE;

-- Backup functions (not in frontend)
DROP FUNCTION IF EXISTS admin_configure_backup_schedule(jsonb) CASCADE;
DROP FUNCTION IF EXISTS admin_create_backup(text) CASCADE;
DROP FUNCTION IF EXISTS admin_delete_backup(uuid) CASCADE;
DROP FUNCTION IF EXISTS admin_get_backup_details(uuid) CASCADE;
DROP FUNCTION IF EXISTS admin_get_backup_schedules() CASCADE;
DROP FUNCTION IF EXISTS admin_get_backup_statistics() CASCADE;
DROP FUNCTION IF EXISTS admin_list_backups() CASCADE;
DROP FUNCTION IF EXISTS admin_log_restoration(uuid, text, text) CASCADE;

-- User behavior functions (table removed)
DROP FUNCTION IF EXISTS get_user_behavior_analytics(text) CASCADE;
DROP FUNCTION IF EXISTS track_user_behavior(text, text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS admin_get_behavior_summary() CASCADE;
DROP FUNCTION IF EXISTS admin_get_live_behavior_feed() CASCADE;

-- Unused internal/duplicate functions
DROP FUNCTION IF EXISTS advance_deal_status(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS calculate_dynamic_price(uuid) CASCADE;
DROP FUNCTION IF EXISTS cancel_deal(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS complete_deal(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS create_ledger_entries_for_deal(uuid) CASCADE;
DROP FUNCTION IF EXISTS generate_finance_report(text, text) CASCADE;
DROP FUNCTION IF EXISTS get_city_financial_breakdown() CASCADE;
DROP FUNCTION IF EXISTS get_reengagement_candidates() CASCADE;
DROP FUNCTION IF EXISTS get_silent_deals() CASCADE;
DROP FUNCTION IF EXISTS get_supplier_credit_score(text) CASCADE;
DROP FUNCTION IF EXISTS get_supplier_matching_inventory(text) CASCADE;
DROP FUNCTION IF EXISTS get_supplier_operations_summary(text) CASCADE;
DROP FUNCTION IF EXISTS get_supplier_performance_metrics(text) CASCADE;
DROP FUNCTION IF EXISTS get_payment_alerts() CASCADE;
DROP FUNCTION IF EXISTS update_order_analytics_daily() CASCADE;
DROP FUNCTION IF EXISTS admin_resolve_alert(uuid) CASCADE;
DROP FUNCTION IF EXISTS admin_get_financial_snapshot() CASCADE;
DROP FUNCTION IF EXISTS admin_bulk_delete_orders(uuid[]) CASCADE;
DROP FUNCTION IF EXISTS admin_bulk_approve_ratings(uuid[]) CASCADE;
DROP FUNCTION IF EXISTS admin_bulk_delete_ratings(uuid[]) CASCADE;
DROP FUNCTION IF EXISTS admin_bulk_moderate_comments(uuid[], text) CASCADE;
DROP FUNCTION IF EXISTS admin_confirm_payment(uuid) CASCADE;
DROP FUNCTION IF EXISTS admin_freeze_batch(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS admin_modify_deal_fee(uuid, numeric) CASCADE;
DROP FUNCTION IF EXISTS buyer_confirm_deal_with_deadline_v4(text, uuid) CASCADE;
DROP FUNCTION IF EXISTS get_batch_timeline(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_supplier_active_batches(text) CASCADE;
DROP FUNCTION IF EXISTS write_audit_log(text, text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS submit_payment_proof(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS assign_ticket_to_agent(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS refresh_template_performance_stats() CASCADE;
DROP FUNCTION IF EXISTS admin_confirm_marketplace_rating(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS get_pending_marketplace_ratings() CASCADE;
DROP FUNCTION IF EXISTS get_settings_changelog() CASCADE;
DROP FUNCTION IF EXISTS admin_send_stall_reminder_v4(text, uuid) CASCADE;
DROP FUNCTION IF EXISTS log_deal_creation_analytics(uuid, text, text) CASCADE;
DROP FUNCTION IF EXISTS trigger_auto_generate_invoices() CASCADE;
DROP FUNCTION IF EXISTS mark_admin_contacted_user(text) CASCADE;
DROP FUNCTION IF EXISTS admin_force_status(uuid, text, text) CASCADE;

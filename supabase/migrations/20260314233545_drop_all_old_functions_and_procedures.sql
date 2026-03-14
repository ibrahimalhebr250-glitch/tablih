/*
  # Drop All Old RPC Functions and Stored Procedures

  Removes all stored functions from the old system including:
  - Deal management functions
  - Order management functions
  - Inventory management functions
  - Finance/commission functions
  - Support/AI functions
  - Analytics/tracking functions
  - Admin management functions
  - Matching engine functions
*/

-- Deal functions
DROP FUNCTION IF EXISTS create_deal_with_reservation CASCADE;
DROP FUNCTION IF EXISTS supplier_confirm_deal CASCADE;
DROP FUNCTION IF EXISTS buyer_confirm_deal CASCADE;
DROP FUNCTION IF EXISTS admin_confirm_deal CASCADE;
DROP FUNCTION IF EXISTS fail_delivery CASCADE;
DROP FUNCTION IF EXISTS supplier_confirm_delivery CASCADE;
DROP FUNCTION IF EXISTS complete_deal CASCADE;
DROP FUNCTION IF EXISTS cancel_deal CASCADE;
DROP FUNCTION IF EXISTS get_deals_for_user CASCADE;
DROP FUNCTION IF EXISTS get_deal_details CASCADE;
DROP FUNCTION IF EXISTS admin_get_deals CASCADE;
DROP FUNCTION IF EXISTS admin_update_deal_status CASCADE;
DROP FUNCTION IF EXISTS admin_delete_deal CASCADE;
DROP FUNCTION IF EXISTS create_deal_from_supply_card CASCADE;
DROP FUNCTION IF EXISTS create_deal_from_demand_card CASCADE;
DROP FUNCTION IF EXISTS get_buyer_incoming_offers CASCADE;

-- Order functions
DROP FUNCTION IF EXISTS create_order CASCADE;
DROP FUNCTION IF EXISTS get_orders_for_user CASCADE;
DROP FUNCTION IF EXISTS admin_get_orders CASCADE;
DROP FUNCTION IF EXISTS admin_delete_order CASCADE;
DROP FUNCTION IF EXISTS get_order_analytics CASCADE;
DROP FUNCTION IF EXISTS get_order_operations_log CASCADE;
DROP FUNCTION IF EXISTS admin_delete_order_log_entry CASCADE;
DROP FUNCTION IF EXISTS update_order_status CASCADE;
DROP FUNCTION IF EXISTS check_order_matches CASCADE;
DROP FUNCTION IF EXISTS manual_match_existing_orders CASCADE;
DROP FUNCTION IF EXISTS create_order_from_market_offer CASCADE;

-- Inventory functions
DROP FUNCTION IF EXISTS add_inventory_batch CASCADE;
DROP FUNCTION IF EXISTS update_inventory_batch CASCADE;
DROP FUNCTION IF EXISTS delete_inventory_batch CASCADE;
DROP FUNCTION IF EXISTS admin_get_inventory_batches CASCADE;
DROP FUNCTION IF EXISTS admin_update_inventory_batch CASCADE;
DROP FUNCTION IF EXISTS admin_delete_inventory_batch CASCADE;
DROP FUNCTION IF EXISTS get_supplier_inventory CASCADE;
DROP FUNCTION IF EXISTS get_market_inventory CASCADE;
DROP FUNCTION IF EXISTS get_pallet_types CASCADE;
DROP FUNCTION IF EXISTS get_pallet_sizes CASCADE;
DROP FUNCTION IF EXISTS get_quality_grades CASCADE;
DROP FUNCTION IF EXISTS get_pallet_conditions CASCADE;
DROP FUNCTION IF EXISTS admin_add_pallet_type CASCADE;
DROP FUNCTION IF EXISTS admin_update_pallet_type CASCADE;
DROP FUNCTION IF EXISTS admin_delete_pallet_type CASCADE;
DROP FUNCTION IF EXISTS admin_add_pallet_size CASCADE;
DROP FUNCTION IF EXISTS admin_update_pallet_size CASCADE;
DROP FUNCTION IF EXISTS admin_delete_pallet_size CASCADE;
DROP FUNCTION IF EXISTS admin_add_quality_grade CASCADE;
DROP FUNCTION IF EXISTS admin_update_quality_grade CASCADE;
DROP FUNCTION IF EXISTS admin_delete_quality_grade CASCADE;
DROP FUNCTION IF EXISTS admin_add_pallet_condition CASCADE;
DROP FUNCTION IF EXISTS admin_update_pallet_condition CASCADE;
DROP FUNCTION IF EXISTS admin_delete_pallet_condition CASCADE;
DROP FUNCTION IF EXISTS get_inventory_settings CASCADE;
DROP FUNCTION IF EXISTS update_inventory_settings CASCADE;
DROP FUNCTION IF EXISTS transfer_inventory_to_buyer CASCADE;

-- Buyer inventory functions
DROP FUNCTION IF EXISTS get_buyer_inventory CASCADE;
DROP FUNCTION IF EXISTS admin_get_buyer_inventory CASCADE;
DROP FUNCTION IF EXISTS buyer_inventory_withdraw_quantity CASCADE;

-- Finance/commission functions
DROP FUNCTION IF EXISTS get_finance_metrics CASCADE;
DROP FUNCTION IF EXISTS get_commission_settlements CASCADE;
DROP FUNCTION IF EXISTS settle_commission CASCADE;
DROP FUNCTION IF EXISTS settle_by_settlement_id CASCADE;
DROP FUNCTION IF EXISTS get_supplier_financial_profile CASCADE;
DROP FUNCTION IF EXISTS get_market_statistics CASCADE;
DROP FUNCTION IF EXISTS create_invoice_for_deal CASCADE;
DROP FUNCTION IF EXISTS get_invoices CASCADE;
DROP FUNCTION IF EXISTS admin_configure_invoice_settings CASCADE;
DROP FUNCTION IF EXISTS get_invoice_settings CASCADE;

-- Sale requests functions
DROP FUNCTION IF EXISTS create_sale_request CASCADE;
DROP FUNCTION IF EXISTS get_buyer_sale_requests CASCADE;
DROP FUNCTION IF EXISTS get_supplier_sale_requests CASCADE;
DROP FUNCTION IF EXISTS supplier_complete_sale_request CASCADE;
DROP FUNCTION IF EXISTS admin_get_sale_requests CASCADE;

-- Negotiation functions
DROP FUNCTION IF EXISTS create_negotiation_request CASCADE;
DROP FUNCTION IF EXISTS accept_negotiation_and_create_deal CASCADE;
DROP FUNCTION IF EXISTS reject_negotiation_request CASCADE;
DROP FUNCTION IF EXISTS get_negotiation_requests CASCADE;
DROP FUNCTION IF EXISTS admin_get_negotiation_requests CASCADE;

-- Supplier offer functions
DROP FUNCTION IF EXISTS create_supplier_offer CASCADE;
DROP FUNCTION IF EXISTS buyer_accept_offer CASCADE;
DROP FUNCTION IF EXISTS buyer_reject_offer CASCADE;
DROP FUNCTION IF EXISTS admin_get_supplier_offers CASCADE;

-- Support functions
DROP FUNCTION IF EXISTS send_support_message CASCADE;
DROP FUNCTION IF EXISTS get_support_messages CASCADE;
DROP FUNCTION IF EXISTS admin_get_support_conversations CASCADE;
DROP FUNCTION IF EXISTS admin_reply_support_message CASCADE;
DROP FUNCTION IF EXISTS admin_close_support_ticket CASCADE;
DROP FUNCTION IF EXISTS create_support_ticket CASCADE;
DROP FUNCTION IF EXISTS get_user_support_messages CASCADE;
DROP FUNCTION IF EXISTS send_user_support_message CASCADE;
DROP FUNCTION IF EXISTS create_user_suggestion CASCADE;

-- AI functions
DROP FUNCTION IF EXISTS ai_get_auto_reply CASCADE;
DROP FUNCTION IF EXISTS ai_log_response CASCADE;
DROP FUNCTION IF EXISTS admin_get_ai_settings CASCADE;
DROP FUNCTION IF EXISTS admin_update_ai_settings CASCADE;
DROP FUNCTION IF EXISTS admin_get_knowledge_base CASCADE;
DROP FUNCTION IF EXISTS admin_add_knowledge_entry CASCADE;
DROP FUNCTION IF EXISTS admin_update_knowledge_entry CASCADE;
DROP FUNCTION IF EXISTS admin_delete_knowledge_entry CASCADE;
DROP FUNCTION IF EXISTS match_knowledge_base CASCADE;

-- Analytics/tracking functions
DROP FUNCTION IF EXISTS log_visitor_session CASCADE;
DROP FUNCTION IF EXISTS log_platform_visit CASCADE;
DROP FUNCTION IF EXISTS get_visitor_stats CASCADE;
DROP FUNCTION IF EXISTS admin_get_live_sessions CASCADE;
DROP FUNCTION IF EXISTS get_behavior_analytics CASCADE;
DROP FUNCTION IF EXISTS get_platform_analytics CASCADE;
DROP FUNCTION IF EXISTS track_page_view CASCADE;

-- Rating functions
DROP FUNCTION IF EXISTS create_rating CASCADE;
DROP FUNCTION IF EXISTS get_ratings CASCADE;
DROP FUNCTION IF EXISTS admin_get_ratings CASCADE;
DROP FUNCTION IF EXISTS admin_delete_rating CASCADE;
DROP FUNCTION IF EXISTS admin_get_comments CASCADE;
DROP FUNCTION IF EXISTS admin_delete_comment CASCADE;
DROP FUNCTION IF EXISTS admin_approve_comment CASCADE;
DROP FUNCTION IF EXISTS update_trust_rating CASCADE;

-- Admin user functions
DROP FUNCTION IF EXISTS admin_get_users CASCADE;
DROP FUNCTION IF EXISTS admin_delete_user CASCADE;
DROP FUNCTION IF EXISTS admin_update_user CASCADE;
DROP FUNCTION IF EXISTS get_admin_dashboard_metrics CASCADE;

-- Admin settings functions
DROP FUNCTION IF EXISTS get_platform_settings CASCADE;
DROP FUNCTION IF EXISTS update_platform_settings CASCADE;
DROP FUNCTION IF EXISTS admin_get_settings CASCADE;
DROP FUNCTION IF EXISTS admin_update_settings CASCADE;
DROP FUNCTION IF EXISTS admin_configure_order_settings CASCADE;
DROP FUNCTION IF EXISTS admin_get_order_settings CASCADE;

-- Admin market/city functions
DROP FUNCTION IF EXISTS admin_add_city CASCADE;
DROP FUNCTION IF EXISTS admin_update_city CASCADE;
DROP FUNCTION IF EXISTS admin_delete_city CASCADE;
DROP FUNCTION IF EXISTS admin_get_cities CASCADE;
DROP FUNCTION IF EXISTS admin_delete_market_item CASCADE;

-- Matching engine functions
DROP FUNCTION IF EXISTS run_smart_matching CASCADE;
DROP FUNCTION IF EXISTS auto_match_order CASCADE;
DROP FUNCTION IF EXISTS compute_match_score CASCADE;
DROP FUNCTION IF EXISTS get_match_candidates CASCADE;
DROP FUNCTION IF EXISTS om_get_near_matches CASCADE;
DROP FUNCTION IF EXISTS instant_match_order CASCADE;
DROP FUNCTION IF EXISTS multi_batch_match_order CASCADE;
DROP FUNCTION IF EXISTS run_ultra_smart_matching CASCADE;

-- Admin login
DROP FUNCTION IF EXISTS admin_login CASCADE;
DROP FUNCTION IF EXISTS admin_verify_token CASCADE;

-- WhatsApp functions
DROP FUNCTION IF EXISTS get_whatsapp_templates CASCADE;
DROP FUNCTION IF EXISTS save_whatsapp_template CASCADE;
DROP FUNCTION IF EXISTS get_outreach_list CASCADE;
DROP FUNCTION IF EXISTS get_silent_deals CASCADE;
DROP FUNCTION IF EXISTS log_whatsapp_contact CASCADE;

-- API/webhook functions
DROP FUNCTION IF EXISTS validate_api_key CASCADE;
DROP FUNCTION IF EXISTS log_api_request CASCADE;
DROP FUNCTION IF EXISTS trigger_webhook CASCADE;
DROP FUNCTION IF EXISTS create_api_key CASCADE;

-- Backup/restore functions
DROP FUNCTION IF EXISTS create_backup CASCADE;
DROP FUNCTION IF EXISTS restore_backup CASCADE;

-- Session functions
DROP FUNCTION IF EXISTS create_session_token CASCADE;
DROP FUNCTION IF EXISTS validate_session_token CASCADE;
DROP FUNCTION IF EXISTS invalidate_session_token CASCADE;
DROP FUNCTION IF EXISTS get_session_by_token CASCADE;

-- Staff/roles functions
DROP FUNCTION IF EXISTS admin_add_staff CASCADE;
DROP FUNCTION IF EXISTS admin_update_staff CASCADE;
DROP FUNCTION IF EXISTS admin_delete_staff CASCADE;
DROP FUNCTION IF EXISTS admin_get_staff CASCADE;
DROP FUNCTION IF EXISTS get_custom_roles CASCADE;
DROP FUNCTION IF EXISTS create_custom_role CASCADE;
DROP FUNCTION IF EXISTS update_custom_role CASCADE;
DROP FUNCTION IF EXISTS delete_custom_role CASCADE;

-- Notification functions
DROP FUNCTION IF EXISTS get_notifications CASCADE;
DROP FUNCTION IF EXISTS mark_notification_read CASCADE;
DROP FUNCTION IF EXISTS create_notification CASCADE;

-- Misc helper functions
DROP FUNCTION IF EXISTS get_platform_fee CASCADE;
DROP FUNCTION IF EXISTS calculate_commission CASCADE;
DROP FUNCTION IF EXISTS normalize_pallet_type CASCADE;
DROP FUNCTION IF EXISTS normalize_pallet_size CASCADE;
DROP FUNCTION IF EXISTS expire_reservations CASCADE;
DROP FUNCTION IF EXISTS set_updated_at CASCADE;
DROP FUNCTION IF EXISTS admin_suggestions_management CASCADE;
DROP FUNCTION IF EXISTS admin_get_suggestions CASCADE;
DROP FUNCTION IF EXISTS admin_support_management CASCADE;

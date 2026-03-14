/*
  # Full System Cleanup - Drop All Old Tables, Functions, Triggers, and Views

  Drops every table, function, trigger, view, and related infrastructure
  from the old system. Only the following essential tables are kept:
  - platform_users (user accounts)
  - session_tokens (auth sessions)
  - platform_settings (platform config)
  - admin_staff (admin logins)
  - admin_roles (admin permissions)
  - cities (reference data)

  All other tables related to orders, deals, inventory, market, finance,
  support, analytics, whatsapp, and ratings are dropped entirely.
*/

-- ── 1. Drop all triggers first ──────────────────────────────────────────────
DROP TRIGGER IF EXISTS trigger_auto_match_on_inventory ON inventory_batches CASCADE;
DROP TRIGGER IF EXISTS trigger_transfer_to_buyer ON deals CASCADE;
DROP TRIGGER IF EXISTS trigger_update_order_status_on_deal ON deals CASCADE;
DROP TRIGGER IF EXISTS trigger_normalize_pallet_data ON inventory_batches CASCADE;
DROP TRIGGER IF EXISTS normalize_order_pallet_data ON orders CASCADE;
DROP TRIGGER IF EXISTS update_trust_rating_trigger ON user_ratings CASCADE;
DROP TRIGGER IF EXISTS update_visitor_rating_trigger ON marketplace_ratings CASCADE;
DROP TRIGGER IF EXISTS trg_update_order_status_deal_created ON deals CASCADE;
DROP TRIGGER IF EXISTS update_offer_status_on_deal ON deals CASCADE;
DROP TRIGGER IF EXISTS update_inventory_status_trigger ON deals CASCADE;
DROP TRIGGER IF EXISTS set_updated_at ON deals CASCADE;
DROP TRIGGER IF EXISTS set_updated_at ON orders CASCADE;
DROP TRIGGER IF EXISTS set_updated_at ON negotiation_requests CASCADE;
DROP TRIGGER IF EXISTS set_updated_at ON sale_requests CASCADE;
DROP TRIGGER IF EXISTS set_updated_at ON supplier_demand_offers CASCADE;

-- ── 2. Drop all views ────────────────────────────────────────────────────────
DROP VIEW IF EXISTS active_deals_view CASCADE;
DROP VIEW IF EXISTS market_inventory_view CASCADE;
DROP VIEW IF EXISTS user_stats_view CASCADE;

-- ── 3. Drop all old tables ───────────────────────────────────────────────────
DROP TABLE IF EXISTS deals CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS order_drafts CASCADE;
DROP TABLE IF EXISTS order_analytics CASCADE;
DROP TABLE IF EXISTS order_operations_log CASCADE;
DROP TABLE IF EXISTS order_flexibility_options CASCADE;
DROP TABLE IF EXISTS order_quantity_settings CASCADE;
DROP TABLE IF EXISTS order_types CASCADE;
DROP TABLE IF EXISTS recurring_orders CASCADE;
DROP TABLE IF EXISTS flexibility_options_settings CASCADE;

DROP TABLE IF EXISTS inventory_batches CASCADE;
DROP TABLE IF EXISTS inventory_images CASCADE;
DROP TABLE IF EXISTS inventory_operations_log CASCADE;
DROP TABLE IF EXISTS inventory_pallet_conditions CASCADE;
DROP TABLE IF EXISTS inventory_pallet_sizes CASCADE;
DROP TABLE IF EXISTS inventory_pallet_types CASCADE;
DROP TABLE IF EXISTS inventory_quality_grades CASCADE;
DROP TABLE IF EXISTS inventory_settings CASCADE;
DROP TABLE IF EXISTS inventory_usage_types CASCADE;
DROP TABLE IF EXISTS pallet_types_master CASCADE;

DROP TABLE IF EXISTS buyer_inventory CASCADE;
DROP TABLE IF EXISTS commission_settlements CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS invoice_settings CASCADE;

DROP TABLE IF EXISTS negotiation_requests CASCADE;
DROP TABLE IF EXISTS sale_requests CASCADE;
DROP TABLE IF EXISTS supplier_demand_offers CASCADE;

DROP TABLE IF EXISTS marketplace_ratings CASCADE;
DROP TABLE IF EXISTS user_ratings CASCADE;

DROP TABLE IF EXISTS support_messages CASCADE;
DROP TABLE IF EXISTS support_tickets CASCADE;
DROP TABLE IF EXISTS user_suggestions CASCADE;
DROP TABLE IF EXISTS user_notification_preferences CASCADE;

DROP TABLE IF EXISTS ai_auto_reply_logs CASCADE;
DROP TABLE IF EXISTS ai_auto_reply_settings CASCADE;
DROP TABLE IF EXISTS ai_knowledge_base CASCADE;
DROP TABLE IF EXISTS ai_learned_responses CASCADE;

DROP TABLE IF EXISTS whatsapp_contact_logs CASCADE;
DROP TABLE IF EXISTS whatsapp_templates CASCADE;

DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS api_rate_limits CASCADE;
DROP TABLE IF EXISTS api_requests_log CASCADE;
DROP TABLE IF EXISTS webhooks CASCADE;
DROP TABLE IF EXISTS webhook_deliveries CASCADE;

DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS error_logs CASCADE;
DROP TABLE IF EXISTS platform_visitor_logs CASCADE;
DROP TABLE IF EXISTS visitor_sessions CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;

DROP TABLE IF EXISTS custom_roles CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS admin_login_logs CASCADE;

DROP TABLE IF EXISTS hero_slides CASCADE;

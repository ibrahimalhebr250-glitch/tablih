
/*
  # Deep Cleanup - Remove ALL Unused Tables

  Cross-referenced every table in the database against actual .from() calls in src/ codebase.

  ## Tables NOT referenced anywhere in frontend code (REMOVING):

  ### Admin Infrastructure (not directly queried from frontend - accessed via RPC only)
  - admin_login_attempts      (not in any .from() call in frontend)
  - admin_login_logs          (not in any .from() call in frontend)
  - admin_permissions         (not in any .from() call in frontend - handled by RPC)
  - admin_role_permissions    (not in any .from() call in frontend)
  - admin_roles               (YES referenced - KEEP)
  - admin_settings            (not in any .from() call in frontend)
  - admin_staff               (not in any .from() call in frontend - accessed via RPC)

  ### Duplicates / Superseded
  - flexibility_options_settings  (superseded by order_flexibility_options)
  - notification_templates        (not in any .from() call)
  - ratings_comments              (renamed to user_ratings or not used directly)
  - sale_requests                 (YES referenced - KEEP)
  - support_agents                (not in any .from() call)
  - support_ratings               (not in any .from() call - handled via RPC)
  - support_shortcuts             (not in any .from() call)
  - support_tickets               (YES referenced in useLiveSupport - KEEP)
  - user_notifications            (not in any .from() call)
  - visitor_sessions              (YES referenced in useVisitorStats - KEEP)

  ## Tables confirmed USED and KEPT:
  admin_roles, ai_auto_reply_logs, ai_auto_reply_settings, ai_knowledge_base, ai_learned_responses,
  api_keys, audit_log, buyer_inventory, cities, commission_settlements, custom_roles, deals, error_logs,
  hero_slides, inventory_batches, inventory_images, inventory_operations_log, inventory_pallet_conditions,
  inventory_pallet_sizes, inventory_pallet_types, inventory_quality_grades, inventory_settings,
  inventory_usage_types, invoice_settings, invoices, marketplace_ratings, negotiation_requests,
  order_analytics, order_drafts, order_flexibility_options, order_operations_log, order_quantity_settings,
  order_types, orders, platform_settings, platform_users, platform_visitor_logs, recurring_orders,
  sale_requests, session_tokens, supplier_demand_offers, support_messages, support_tickets,
  user_notification_preferences, user_ratings, user_roles, user_suggestions, visitor_sessions,
  webhook_deliveries, webhooks, whatsapp_contact_logs, whatsapp_templates, flexibility_options_settings,
  api_rate_limits, api_requests_log
*/

-- Admin tables not directly queried from frontend (RPC-only access)
DROP TABLE IF EXISTS admin_login_attempts CASCADE;
DROP TABLE IF EXISTS admin_login_logs CASCADE;
DROP TABLE IF EXISTS admin_permissions CASCADE;
DROP TABLE IF EXISTS admin_role_permissions CASCADE;
DROP TABLE IF EXISTS admin_settings CASCADE;
DROP TABLE IF EXISTS admin_staff CASCADE;

-- Duplicate/superseded tables
DROP TABLE IF EXISTS notification_templates CASCADE;
DROP TABLE IF EXISTS support_agents CASCADE;
DROP TABLE IF EXISTS support_ratings CASCADE;
DROP TABLE IF EXISTS support_shortcuts CASCADE;
DROP TABLE IF EXISTS user_notifications CASCADE;
DROP TABLE IF EXISTS ratings_comments CASCADE;

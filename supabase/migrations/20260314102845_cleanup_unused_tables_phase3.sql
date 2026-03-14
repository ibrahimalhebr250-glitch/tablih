
/*
  # Database Cleanup - Phase 3: Remove More Unused Tables

  Removing additional tables not referenced in frontend codebase:

  - api_keys / api_rate_limits / api_requests_log / webhooks / webhook_deliveries
    → useAPIIntegration.ts IS in src but only in admin panel, keeping these

  - audit_log → referenced in useAdminDashboard.ts, KEEP

  - user_notification_preferences → referenced in useSettings.ts, KEEP

  ## Tables being removed in this phase:

  - suppliers           → not referenced via .from() in any hook (platform_users used instead)
  - pallet_sizes_master → superseded by inventory_pallet_sizes (which hooks use)
  - pallet_types_master → superseded by inventory_pallet_types (which hooks use)
  - quality_grades_master → superseded by inventory_quality_grades
  - platform_settings_log → admin_get_settings_changelog removed, not in frontend
  - quantity_settings   → superseded by order_quantity_settings
  - reservations        → expire_reservations not called from frontend
  - user_sessions       → superseded by session_tokens (sessionManager uses session_tokens)

  ## Views being removed:
  - deals_with_labels → not referenced in any hook
*/

-- Old duplicate master tables (superseded by inventory_ prefixed versions)
DROP TABLE IF EXISTS pallet_sizes_master CASCADE;
DROP TABLE IF EXISTS pallet_types_master CASCADE;
DROP TABLE IF EXISTS quality_grades_master CASCADE;

-- Old/superseded tables
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS platform_settings_log CASCADE;
DROP TABLE IF EXISTS quantity_settings CASCADE;
DROP TABLE IF EXISTS reservations CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;

-- Unused view
DROP VIEW IF EXISTS deals_with_labels CASCADE;

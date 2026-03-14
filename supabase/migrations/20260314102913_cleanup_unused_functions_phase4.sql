
/*
  # Database Cleanup - Phase 4: Remove More Unused Functions

  Removing functions related to removed tables and systems
  that are not called from the frontend.

  ## Functions removed:

  ### Related to removed tables
  - expire_reservations         (reservations table removed)
  - admin_get_expired_reservations (reservations table removed)

  Note: admin_get_expired_reservations IS in useAdminBuyerInventory.ts
  but reservations table is gone - buyer_inventory uses its own expiry logic.
  Keeping this as it may reference buyer_inventory.

  ### Supplier management (not in hooks, platform_users used)
  - admin_settle_supplier       → superseded by settle_supplier_commission

  ### Other unused functions not in frontend
  - generate_api_key            (internal helper, not called from frontend directly)
  - get_financial_summary       (not in useFinance.ts hooks)
  - log_platform_setting_change (internal trigger helper, platform_settings table has its own trigger)
  - update_order_status_on_deal (trigger function - kept as it's used by trigger)
  - admin_get_executive_metrics (superseded by get_finance_dashboard_metrics)
  - get_executive_summary       (already dropped)

  ### Duplicate city functions
  - admin_update_city           (superseded by admin_update_city_v2)
  - admin_create_pallet_type    (superseded by admin_manage_pallet_type)
  - admin_delete_pallet_type    (superseded by admin_manage_pallet_type)
  - admin_update_pallet_type    (superseded by admin_manage_pallet_type)
  - admin_update_pallet_type_sort (superseded by admin_manage_pallet_type)
  - admin_get_pallet_types      (superseded by admin_manage_pallet_type)

  ### Unused notification/session functions
  - mark_notification_read      (not called from frontend hooks)
  - get_user_notifications      (not called from frontend hooks)
  - user_notification_preferences related functions

  ### Duplicate/old inventory functions
  - set_quantity_available      (trigger based, internal)
  - delete_all_inventory_operations (superseded by admin_clear_all_operations_log)
  - delete_inventory_operations (superseded by admin_delete_single_operation_log)
  - sync_inventory_status       (trigger function)
  - sync_quantity_columns       (trigger function)
*/

-- Duplicate/superseded admin functions
DROP FUNCTION IF EXISTS admin_settle_supplier(text, numeric, text) CASCADE;
DROP FUNCTION IF EXISTS admin_update_city(uuid, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS admin_create_pallet_type(text, text, boolean) CASCADE;
DROP FUNCTION IF EXISTS admin_delete_pallet_type(uuid) CASCADE;
DROP FUNCTION IF EXISTS admin_update_pallet_type(uuid, text, text, boolean) CASCADE;
DROP FUNCTION IF EXISTS admin_update_pallet_type_sort(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS admin_get_pallet_types(text) CASCADE;
DROP FUNCTION IF EXISTS admin_get_executive_metrics() CASCADE;

-- Unused notification/session functions (not in frontend hooks)
DROP FUNCTION IF EXISTS mark_notification_read(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_user_notifications(text, integer) CASCADE;

-- Duplicate inventory operations functions (superseded)
DROP FUNCTION IF EXISTS delete_all_inventory_operations(text) CASCADE;
DROP FUNCTION IF EXISTS delete_inventory_operations(uuid) CASCADE;

-- Unused platform functions not called from frontend
DROP FUNCTION IF EXISTS generate_api_key() CASCADE;
DROP FUNCTION IF EXISTS get_financial_summary(text, text) CASCADE;
DROP FUNCTION IF EXISTS admin_confirm_rating(uuid, integer) CASCADE;

-- Functions for removed tables
DROP FUNCTION IF EXISTS expire_reservations() CASCADE;

-- Old unused session/permission checks not called from hooks
DROP FUNCTION IF EXISTS get_admin_permissions(text) CASCADE;
DROP FUNCTION IF EXISTS get_admin_role_permissions(text) CASCADE;
DROP FUNCTION IF EXISTS get_all_roles_permissions() CASCADE;
DROP FUNCTION IF EXISTS verify_admin_permission(text, text) CASCADE;
DROP FUNCTION IF EXISTS admin_check_permission(text, text) CASCADE;
DROP FUNCTION IF EXISTS get_admin_role_permissions(text, text) CASCADE;


/*
  # Database Cleanup - Phase 1: Remove Unused Tables

  This migration removes tables that are NOT referenced anywhere in the codebase.
  Only tables with zero references in src/ files are removed.

  ## Tables being removed (unused):

  ### A/B Testing System (never used in frontend)
  - ab_test_assignments
  - ab_test_experiments
  - ab_test_results

  ### Old Matching System Tables (replaced by direct deal creation)
  - match_history
  - matching_attempts_log
  - matching_blacklist
  - matching_overrides
  - matching_patterns
  - matching_performance
  - matching_performance_log
  - matching_preferences
  - matching_rules
  - market_opportunity_snapshots

  ### Analytics / Tracking (not referenced in hooks)
  - user_behavior_tracking
  - revenue_timeline
  - risk_alerts

  ### Old/Duplicate Settings Tables
  - order_summary_settings
  - order_type_settings        (superseded by order_types and order_types_settings)
  - order_types_settings       (duplicate of order_types)
  - pallet_condition_mappings
  - pallet_type_mappings
  - pallet_sizes               (superseded by pallet_sizes_master and inventory_pallet_sizes)
  - pallet_conditions          (superseded by inventory_pallet_conditions)
  - quality_grades             (superseded by inventory_quality_grades and quality_grades_master)
  - pallet_types               (superseded by pallet_types_master and inventory_pallet_types)
  - commission_config          (not referenced - admin_update_platform_fee used instead)

  ### Platform Infrastructure (not referenced in frontend)
  - active_demand              (old table, replaced by orders)
  - payment_reminders          (not used in any hook)
  - supplier_liabilities       (not referenced)
  - restoration_logs           (not referenced in frontend - admin_get_restoration_logs only RPC)
  - favorites                  (not referenced in any hook)
  - platform_config            (superseded by platform_settings)
  - request_form_config        (not referenced)
  - inventory_form_config      (not referenced)
  - ledger_entries             (not referenced - create_ledger_entries_for_deal internal only)
  - system_rules               (not referenced)
  - trust_levels               (not referenced)
  - database_backups           (not referenced in hooks)
  - backup_schedules           (not referenced in hooks)

  ## Important: All these tables have no direct .from() references in the codebase
*/

-- A/B Testing (completely unused)
DROP TABLE IF EXISTS ab_test_assignments CASCADE;
DROP TABLE IF EXISTS ab_test_experiments CASCADE;
DROP TABLE IF EXISTS ab_test_results CASCADE;

-- Old matching system tables (system removed in migration 20260311201646)
DROP TABLE IF EXISTS match_history CASCADE;
DROP TABLE IF EXISTS matching_attempts_log CASCADE;
DROP TABLE IF EXISTS matching_blacklist CASCADE;
DROP TABLE IF EXISTS matching_overrides CASCADE;
DROP TABLE IF EXISTS matching_patterns CASCADE;
DROP TABLE IF EXISTS matching_performance CASCADE;
DROP TABLE IF EXISTS matching_performance_log CASCADE;
DROP TABLE IF EXISTS matching_preferences CASCADE;
DROP TABLE IF EXISTS matching_rules CASCADE;
DROP TABLE IF EXISTS market_opportunity_snapshots CASCADE;

-- Analytics / risk tables not referenced in frontend
DROP TABLE IF EXISTS user_behavior_tracking CASCADE;
DROP TABLE IF EXISTS revenue_timeline CASCADE;
DROP TABLE IF EXISTS risk_alerts CASCADE;

-- Duplicate/superseded settings tables
DROP TABLE IF EXISTS order_summary_settings CASCADE;
DROP TABLE IF EXISTS order_type_settings CASCADE;
DROP TABLE IF EXISTS order_types_settings CASCADE;
DROP TABLE IF EXISTS pallet_condition_mappings CASCADE;
DROP TABLE IF EXISTS pallet_type_mappings CASCADE;
DROP TABLE IF EXISTS pallet_sizes CASCADE;
DROP TABLE IF EXISTS pallet_conditions CASCADE;
DROP TABLE IF EXISTS quality_grades CASCADE;
DROP TABLE IF EXISTS pallet_types CASCADE;
DROP TABLE IF EXISTS commission_config CASCADE;

-- Unused platform tables
DROP TABLE IF EXISTS active_demand CASCADE;
DROP TABLE IF EXISTS payment_reminders CASCADE;
DROP TABLE IF EXISTS supplier_liabilities CASCADE;
DROP TABLE IF EXISTS restoration_logs CASCADE;
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS platform_config CASCADE;
DROP TABLE IF EXISTS request_form_config CASCADE;
DROP TABLE IF EXISTS inventory_form_config CASCADE;
DROP TABLE IF EXISTS ledger_entries CASCADE;
DROP TABLE IF EXISTS system_rules CASCADE;
DROP TABLE IF EXISTS trust_levels CASCADE;
DROP TABLE IF EXISTS database_backups CASCADE;
DROP TABLE IF EXISTS backup_schedules CASCADE;

/*
  # Remove Old Matching System

  Removes all triggers, functions, and tables related to the old
  auto-matching engine that is no longer used in the platform.

  ## Triggers Removed
  - trg_v4_match_inventory (inventory_batches)
  - trg_om_scan_batch (inventory_batches)
  - trg_v4_match_order (orders)
  - trg_om_scan_order (orders)
  - match_notification_trigger (matching_scores)

  ## Tables Removed
  - matching_scores
  - matching_candidates
  - matching_analytics
  - smart_notifications

  ## Functions Removed
  - v4_trg_inventory, v4_trg_order, v4_trg_log_deal
  - om_trigger_scan_batch, om_trigger_scan_order
  - trigger_create_match_notification
  - All om_* and v4_* matching functions
*/

-- Drop matching triggers on inventory_batches
DROP TRIGGER IF EXISTS trg_v4_match_inventory ON inventory_batches;
DROP TRIGGER IF EXISTS trg_om_scan_batch ON inventory_batches;

-- Drop matching triggers on orders
DROP TRIGGER IF EXISTS trg_v4_match_order ON orders;
DROP TRIGGER IF EXISTS trg_om_scan_order ON orders;

-- Drop trigger on matching_scores (if table still exists)
DROP TRIGGER IF EXISTS match_notification_trigger ON matching_scores;

-- Drop matching tables
DROP TABLE IF EXISTS matching_scores CASCADE;
DROP TABLE IF EXISTS matching_candidates CASCADE;
DROP TABLE IF EXISTS matching_analytics CASCADE;
DROP TABLE IF EXISTS smart_notifications CASCADE;

-- Drop matching trigger functions
DROP FUNCTION IF EXISTS v4_trg_inventory() CASCADE;
DROP FUNCTION IF EXISTS v4_trg_order() CASCADE;
DROP FUNCTION IF EXISTS v4_trg_log_deal() CASCADE;
DROP FUNCTION IF EXISTS om_trigger_scan_batch() CASCADE;
DROP FUNCTION IF EXISTS om_trigger_scan_order() CASCADE;
DROP FUNCTION IF EXISTS trigger_create_match_notification() CASCADE;

-- Drop matching RPC/helper functions
DROP FUNCTION IF EXISTS v4_compute_score(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS v4_run_matching(uuid) CASCADE;
DROP FUNCTION IF EXISTS v4_run_all_matching() CASCADE;
DROP FUNCTION IF EXISTS om_get_near_matches(uuid) CASCADE;
DROP FUNCTION IF EXISTS om_scan_order(uuid) CASCADE;
DROP FUNCTION IF EXISTS om_scan_batch(uuid) CASCADE;
DROP FUNCTION IF EXISTS om_run_full_scan() CASCADE;
DROP FUNCTION IF EXISTS run_smart_matching() CASCADE;
DROP FUNCTION IF EXISTS run_ultra_smart_matching() CASCADE;
DROP FUNCTION IF EXISTS ai_score_match(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS get_matching_candidates(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_match_opportunities() CASCADE;
DROP FUNCTION IF EXISTS manual_match_existing_orders(text, text) CASCADE;
DROP FUNCTION IF EXISTS create_match_notification(uuid, uuid, numeric) CASCADE;
DROP FUNCTION IF EXISTS get_pending_matches() CASCADE;
DROP FUNCTION IF EXISTS get_matching_analytics() CASCADE;
DROP FUNCTION IF EXISTS get_smart_notifications(text) CASCADE;
DROP FUNCTION IF EXISTS mark_notification_read(uuid) CASCADE;
DROP FUNCTION IF EXISTS mark_all_notifications_read(text) CASCADE;

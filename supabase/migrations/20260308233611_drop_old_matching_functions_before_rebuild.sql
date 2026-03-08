/*
  # حذف الدوال القديمة قبل إعادة البناء

  حذف الدوال التي تحتاج تغيير في نوع الإرجاع
  لأن PostgreSQL لا يسمح بتغيير نوع الإرجاع بدون حذف أولاً
*/

DROP FUNCTION IF EXISTS get_pending_orders_with_potential_matches(text);
DROP FUNCTION IF EXISTS manual_match_existing_orders(uuid);
DROP FUNCTION IF EXISTS get_matching_hub_stats();
DROP FUNCTION IF EXISTS get_matching_analytics(text);

/*
  # Enable Realtime for All Critical Tables
  
  1. Overview
    - Enables realtime subscriptions on all critical platform tables
    - Ensures admin panel receives instant updates
    - Allows users to see real-time changes to orders, deals, inventory
  
  2. Tables with Realtime Enabled
    - inventory_batches: Live inventory updates
    - orders: Live order status changes
    - deals: Live deal progress tracking
    - user_ratings: Live rating updates
    - ratings_comments: Live comment moderation
    - platform_users: Live user status changes
    - commission_settlements: Live financial tracking
    - cities: Live city status updates
  
  3. Security
    - RLS policies still apply to realtime subscriptions
    - Users only receive updates for data they can access
*/

ALTER PUBLICATION supabase_realtime ADD TABLE inventory_batches;
ALTER PUBLICATION supabase_realtime ADD TABLE platform_users;
ALTER PUBLICATION supabase_realtime ADD TABLE commission_settlements;
ALTER PUBLICATION supabase_realtime ADD TABLE cities;
ALTER PUBLICATION supabase_realtime ADD TABLE user_ratings;
ALTER PUBLICATION supabase_realtime ADD TABLE ratings_comments;

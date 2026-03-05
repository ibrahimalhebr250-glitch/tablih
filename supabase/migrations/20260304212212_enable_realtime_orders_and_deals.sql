/*
  # Enable Realtime for Orders and Deals tables

  1. Changes
    - Adds `orders` table to the Supabase realtime publication
    - Adds `deals` table to the Supabase realtime publication
  
  2. Purpose
    - Allows the frontend to subscribe to real-time changes on orders
    - When the auto-match trigger updates an order from 'unmatched' to 'matched', 
      the buyer's dashboard refreshes automatically
    - When a new deal is created targeting a buyer, their dashboard updates
*/

ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE deals;

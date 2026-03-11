/*
  # Set visitor_sessions replica identity to FULL
  
  This enables Supabase Realtime to broadcast UPDATE events
  with full row data (before and after), not just the primary key.
  Required for real-time visitor tracking on page revisits.
*/

ALTER TABLE visitor_sessions REPLICA IDENTITY FULL;

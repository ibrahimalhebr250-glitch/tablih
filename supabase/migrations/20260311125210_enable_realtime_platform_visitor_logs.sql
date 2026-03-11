/*
  # Enable Realtime for platform_visitor_logs

  Adds platform_visitor_logs to the supabase_realtime publication
  so the analytics dashboard receives instant updates when a new
  visitor arrives without any polling.
*/

ALTER PUBLICATION supabase_realtime ADD TABLE platform_visitor_logs;

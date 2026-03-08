/*
  # Cleanup Negotiation Requests Policies

  Remove duplicate/conflicting policies from the negotiation_requests table
  and keep only the clean permissive ones needed for the anon session-based system.

  ## Changes
  - Drop duplicate policies
  - Keep clean policies for the session-based auth system
*/

DROP POLICY IF EXISTS "Buyers can create negotiation requests" ON negotiation_requests;
DROP POLICY IF EXISTS "Buyers can view their own requests" ON negotiation_requests;

/*
  # Add requested_quantity to negotiation_requests

  ## Changes
  - Adds `requested_quantity` column (integer, default 1) to `negotiation_requests` table
  - This column was referenced by the frontend but missing from the schema

  ## Notes
  - Uses IF NOT EXISTS pattern for safety
  - Default value of 1 ensures existing rows remain valid
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'negotiation_requests' AND column_name = 'requested_quantity'
  ) THEN
    ALTER TABLE negotiation_requests ADD COLUMN requested_quantity integer NOT NULL DEFAULT 1;
  END IF;
END $$;

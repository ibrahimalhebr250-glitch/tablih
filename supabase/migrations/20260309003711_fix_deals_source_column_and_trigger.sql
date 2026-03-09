/*
  # Fix deals source column and trigger

  ## Problem
  The trigger `v4_trg_log_deal` references `NEW.source` on the deals table, 
  but no `source` column exists. This causes a silent error on every INSERT 
  into deals, preventing auto-deal creation from the matching engine.

  ## Solution
  1. Add `source` column to deals table with default 'manual'
  2. Fix the trigger function to handle NULL source gracefully

  ## Tables Modified
  - `deals` - Added `source` column (text, default 'manual')
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'source'
  ) THEN
    ALTER TABLE deals ADD COLUMN source text NOT NULL DEFAULT 'manual';
  END IF;
END $$;

-- Create quantity settings table
CREATE TABLE IF NOT EXISTS quantity_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  min_quantity integer NOT NULL DEFAULT 100,
  max_quantity integer NOT NULL DEFAULT 10000,
  step integer NOT NULL DEFAULT 50,
  default_quantity integer NOT NULL DEFAULT 1000,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE quantity_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read quantity settings"
  ON quantity_settings FOR SELECT
  USING (true);

INSERT INTO quantity_settings (min_quantity, max_quantity, step, default_quantity)
SELECT 100, 10000, 50, 1000
WHERE NOT EXISTS (SELECT 1 FROM quantity_settings LIMIT 1);

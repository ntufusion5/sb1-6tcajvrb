/*
  # Add updated_at column to leads table

  1. Changes
    - Add updated_at column to leads table
    - Add trigger to automatically update the updated_at timestamp
*/

-- Add updated_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE leads ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create trigger function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at'
  ) THEN
    CREATE TRIGGER set_updated_at
      BEFORE UPDATE ON leads
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
/*
  # Add Annual Revenue Column to Leads Table

  1. Changes
    - Add annual_revenue column to leads table
    - Make it numeric to store precise currency values
    - Allow null values for cases where revenue is unknown

  2. Security
    - Maintain existing RLS policies
*/

-- Add annual_revenue column to leads table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'annual_revenue'
  ) THEN
    ALTER TABLE leads ADD COLUMN annual_revenue numeric;
  END IF;
END $$;
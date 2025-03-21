/*
  # Create Leads Management System

  1. New Tables
    - `leads`
      - `id` (uuid, primary key)
      - `company_name` (text)
      - `employee_count` (integer)
      - `annual_revenue` (numeric)
      - `industry` (text)
      - `ai_readiness` (text)
      - `lead_score` (integer)
      - `status` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `leads` table
    - Add policies for authenticated users to:
      - Read all leads
      - Create new leads
      - Update existing leads
*/

-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  employee_count integer,
  annual_revenue numeric,
  industry text,
  ai_readiness text,
  lead_score integer DEFAULT 0,
  status text DEFAULT 'New',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow authenticated users to read leads"
  ON leads
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to create leads"
  ON leads
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update leads"
  ON leads
  FOR UPDATE
  TO authenticated
  USING (true);
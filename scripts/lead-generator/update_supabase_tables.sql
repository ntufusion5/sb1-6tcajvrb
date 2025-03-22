-- SQL script to update Supabase tables for the lead generation system

-- 1. Drop the columns that are no longer needed
ALTER TABLE leads 
  DROP COLUMN IF EXISTS company_size,
  DROP COLUMN IF EXISTS founded,
  DROP COLUMN IF EXISTS ai_readiness_score,
  DROP COLUMN IF EXISTS ai_readiness_category,
  DROP COLUMN IF EXISTS company_type;

-- 2. Ensure all required columns exist
ALTER TABLE leads 
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS employee_count integer,
  ADD COLUMN IF NOT EXISTS is_sme boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS about text,
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS ai_readiness text,
  ADD COLUMN IF NOT EXISTS lead_source text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS lead_score integer DEFAULT 0;

-- 3. Ensure the lead_generation_jobs table exists
CREATE TABLE IF NOT EXISTS lead_generation_jobs (
  job_id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Add indexes for better performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_lead_generation_jobs_status ON lead_generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_lead_generation_jobs_created_at ON lead_generation_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_company_name ON leads(company_name);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_ai_readiness ON leads(ai_readiness);
CREATE INDEX IF NOT EXISTS idx_leads_is_sme ON leads(is_sme);

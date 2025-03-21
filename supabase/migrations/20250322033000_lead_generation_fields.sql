/*
  # Add Lead Generation Fields

  1. New Columns
    - `company_size` (text) - Number of employees from LinkedIn
    - `founded` (text) - Year founded from LinkedIn
    - `website` (text) - Company website URL from LinkedIn
    - `source_url` (text) - LinkedIn URL
    - `ai_readiness_score` (text) - Numeric score from OpenAI analysis
    - `ai_readiness_category` (text) - AI Unaware/AI Aware/AI Ready/AI Competent
    - `company_type` (text) - SME/Startup/MNC
*/

-- Add new columns to leads table
ALTER TABLE leads 
  ADD COLUMN IF NOT EXISTS company_size text,
  ADD COLUMN IF NOT EXISTS founded text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS ai_readiness_score text,
  ADD COLUMN IF NOT EXISTS ai_readiness_category text,
  ADD COLUMN IF NOT EXISTS company_type text;

-- Update the database.types.ts file will be done separately

/*
  # Remove Duplicate Leads

  1. Changes
    - Remove duplicate leads based on company name and email
    - Keep the most recently updated record
    - Update lead scores after cleanup
    - Add unique constraint to prevent future duplicates

  2. Strategy
    - Use CTEs to identify duplicates
    - Keep record with highest lead score or most recent update
    - Add constraints to prevent future duplicates
*/

-- First, identify and remove duplicates, keeping the most relevant record
WITH duplicates AS (
  SELECT 
    id,
    company_name,
    email,
    lead_score,
    updated_at,
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(TRIM(company_name)), LOWER(TRIM(email))
      ORDER BY 
        lead_score DESC,
        updated_at DESC,
        id DESC
    ) as row_num
  FROM leads
)
DELETE FROM leads
WHERE id IN (
  SELECT id 
  FROM duplicates 
  WHERE row_num > 1
);

-- Add unique constraints to prevent future duplicates
ALTER TABLE leads
  ADD CONSTRAINT unique_company_email 
  UNIQUE (company_name, email);

-- Create function to normalize company names
CREATE OR REPLACE FUNCTION normalize_company_name(name text)
RETURNS text AS $$
BEGIN
  -- Remove common suffixes and normalize spacing
  RETURN REGEXP_REPLACE(
    REGEXP_REPLACE(
      LOWER(TRIM(name)),
      '\s+(inc\.?|ltd\.?|llc\.?|corp\.?|limited|corporation)$',
      '',
      'i'
    ),
    '\s+',
    ' '
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create index using normalized company names
CREATE INDEX idx_normalized_company_name 
ON leads (normalize_company_name(company_name));

-- Trigger to normalize company names before insert/update
CREATE OR REPLACE FUNCTION normalize_company_name_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW.company_name := INITCAP(TRIM(NEW.company_name));
  NEW.email := LOWER(TRIM(NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER normalize_company_name_trigger
  BEFORE INSERT OR UPDATE OF company_name, email
  ON leads
  FOR EACH ROW
  EXECUTE FUNCTION normalize_company_name_trigger();

-- Update lead scores after cleanup
UPDATE leads
SET 
  lead_score = calculate_lead_score(
    is_sme,
    annual_revenue,
    employee_count,
    ai_readiness,
    response_time
  ),
  updated_at = NOW();

-- Log score updates
INSERT INTO lead_score_logs (
  lead_id,
  score_breakdown,
  calculated_at
)
SELECT 
  id,
  json_build_object(
    'smeScore', CASE WHEN is_sme THEN 25 ELSE 0 END,
    'revenueScore', 
      CASE 
        WHEN annual_revenue BETWEEN 10000000 AND 20000000 THEN 25
        WHEN annual_revenue BETWEEN 8000000 AND 9999999 THEN 19
        WHEN annual_revenue BETWEEN 20000001 AND 25000000 THEN 15
        ELSE 0
      END,
    'employeeScore',
      CASE 
        WHEN employee_count BETWEEN 10 AND 50 THEN 25
        WHEN employee_count BETWEEN 5 AND 9 THEN 19
        WHEN employee_count BETWEEN 51 AND 60 THEN 15
        ELSE 0
      END,
    'aiReadinessScore',
      CASE ai_readiness
        WHEN 'AI Competent' THEN 25
        WHEN 'AI Ready' THEN 20
        WHEN 'AI Aware' THEN 15
        WHEN 'AI Unaware' THEN 5
        ELSE 0
      END,
    'responseTimeMultiplier',
      CASE
        WHEN response_time <= 24 THEN 1.3
        WHEN response_time <= 48 THEN 1.2
        WHEN response_time <= 72 THEN 1.1
        ELSE 1.0
      END,
    'total', lead_score
  ),
  NOW()
FROM leads;
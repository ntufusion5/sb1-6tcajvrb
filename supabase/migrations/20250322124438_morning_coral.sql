/*
  # Add Response Time and Update Lead Scoring

  1. Changes
    - Add response_time column
    - Update scoring system with AI readiness and response time
    - Add functions and triggers for automatic score calculation

  2. Scoring
    - SME Status: 25 points
    - Annual Revenue: 25 points
    - Employee Count: 25 points
    - AI Readiness: 25 points
    - Response Time: 1.0-1.3x multiplier
*/

-- Add response_time column (in hours)
ALTER TABLE leads 
  ADD COLUMN IF NOT EXISTS response_time numeric;

-- Update the lead score calculation function
CREATE OR REPLACE FUNCTION calculate_lead_score(
  is_sme boolean,
  annual_revenue numeric,
  employee_count integer,
  ai_readiness text,
  response_time numeric
) RETURNS integer AS $$
DECLARE
  sme_score integer := 0;
  revenue_score integer := 0;
  employee_score integer := 0;
  ai_score integer := 0;
  response_multiplier numeric := 1.0;
  total_score integer;
BEGIN
  -- SME Status (25 points)
  IF is_sme THEN
    sme_score := 25;
  END IF;

  -- Annual Revenue (25 points)
  IF annual_revenue IS NOT NULL THEN
    IF annual_revenue BETWEEN 10000000 AND 20000000 THEN
      revenue_score := 25;
    ELSIF annual_revenue BETWEEN 8000000 AND 9999999 THEN
      revenue_score := 19; -- 75% of max score
    ELSIF annual_revenue BETWEEN 20000001 AND 25000000 THEN
      revenue_score := 15; -- 60% of max score
    END IF;
  END IF;

  -- Employee Count (25 points)
  IF employee_count IS NOT NULL THEN
    IF employee_count BETWEEN 10 AND 50 THEN
      employee_score := 25;
    ELSIF employee_count BETWEEN 5 AND 9 THEN
      employee_score := 19; -- 75% of max score
    ELSIF employee_count BETWEEN 51 AND 60 THEN
      employee_score := 15; -- 60% of max score
    END IF;
  END IF;

  -- AI Readiness (25 points)
  IF ai_readiness IS NOT NULL THEN
    IF ai_readiness = 'AI Competent' THEN
      ai_score := 25;
    ELSIF ai_readiness = 'AI Ready' THEN
      ai_score := 20;
    ELSIF ai_readiness = 'AI Aware' THEN
      ai_score := 15;
    ELSIF ai_readiness = 'AI Unaware' THEN
      ai_score := 5;
    END IF;
  END IF;

  -- Response Time Multiplier (1.0 - 1.3)
  IF response_time IS NOT NULL THEN
    IF response_time <= 24 THEN -- Within 24 hours
      response_multiplier := 1.3;
    ELSIF response_time <= 48 THEN -- Within 48 hours
      response_multiplier := 1.2;
    ELSIF response_time <= 72 THEN -- Within 72 hours
      response_multiplier := 1.1;
    END IF;
  END IF;

  -- Calculate total score (capped at 100)
  total_score := LEAST(100, (sme_score + revenue_score + employee_score + ai_score)::numeric * response_multiplier)::integer;
  
  RETURN total_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate response time
CREATE OR REPLACE FUNCTION calculate_response_time(
  last_contact timestamptz,
  created_at timestamptz
) RETURNS numeric AS $$
BEGIN
  IF last_contact IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN EXTRACT(EPOCH FROM (last_contact - created_at)) / 3600.0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update trigger function for lead score updates
CREATE OR REPLACE FUNCTION update_lead_score()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate response time if last_contacted is set
  IF NEW.last_contacted IS NOT NULL AND (OLD IS NULL OR OLD.last_contacted IS NULL) THEN
    NEW.response_time := calculate_response_time(NEW.last_contacted, NEW.created_at);
  END IF;

  -- Update lead score
  NEW.lead_score := calculate_lead_score(
    NEW.is_sme,
    NEW.annual_revenue,
    NEW.employee_count,
    NEW.ai_readiness,
    NEW.response_time
  );
  
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger
DROP TRIGGER IF EXISTS update_lead_score_trigger ON leads;

-- Create new trigger
CREATE TRIGGER update_lead_score_trigger
  BEFORE INSERT OR UPDATE OF is_sme, annual_revenue, employee_count, ai_readiness, last_contacted
  ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_score();

-- Update existing leads with response times and new scores
DO $$ 
BEGIN
  -- Calculate response times for existing leads
  UPDATE leads
  SET response_time = calculate_response_time(last_contacted, created_at)
  WHERE last_contacted IS NOT NULL;

  -- Update all lead scores with new weights
  UPDATE leads
  SET lead_score = calculate_lead_score(
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
      'total', calculate_lead_score(is_sme, annual_revenue, employee_count, ai_readiness, response_time)
    ),
    NOW()
  FROM leads;
END $$;
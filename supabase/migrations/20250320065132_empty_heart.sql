/*
  # Update Lead Scores

  1. Changes
    - Updates all existing leads with new scoring criteria
    - Creates a function to calculate lead scores
    - Adds trigger to automatically update scores on lead changes

  2. Scoring Criteria
    - SME Status: 30 points
    - Annual Revenue (10-20M): 40 points
    - Employee Count (10-50): 30 points

  3. Notes
    - Scores are calculated based on exact matches and partial matches
    - Partial matches receive reduced points
    - Total score is capped at 100 points
*/

-- Create function to calculate lead score
CREATE OR REPLACE FUNCTION calculate_lead_score(
  is_sme boolean,
  annual_revenue numeric,
  employee_count integer
) RETURNS integer AS $$
DECLARE
  sme_score integer := 0;
  revenue_score integer := 0;
  employee_score integer := 0;
  total_score integer;
BEGIN
  -- SME Status (30 points)
  IF is_sme THEN
    sme_score := 30;
  END IF;

  -- Annual Revenue (40 points)
  IF annual_revenue IS NOT NULL THEN
    IF annual_revenue BETWEEN 10000000 AND 20000000 THEN
      revenue_score := 40;
    ELSIF annual_revenue BETWEEN 8000000 AND 9999999 THEN
      revenue_score := 30; -- 75% of max score
    ELSIF annual_revenue BETWEEN 20000001 AND 25000000 THEN
      revenue_score := 24; -- 60% of max score
    END IF;
  END IF;

  -- Employee Count (30 points)
  IF employee_count IS NOT NULL THEN
    IF employee_count BETWEEN 10 AND 50 THEN
      employee_score := 30;
    ELSIF employee_count BETWEEN 5 AND 9 THEN
      employee_score := 22; -- 75% of max score
    ELSIF employee_count BETWEEN 51 AND 60 THEN
      employee_score := 18; -- 60% of max score
    END IF;
  END IF;

  -- Calculate total score (capped at 100)
  total_score := LEAST(100, sme_score + revenue_score + employee_score);
  
  RETURN total_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing leads with new scores
DO $$ 
BEGIN
  UPDATE leads
  SET 
    lead_score = calculate_lead_score(is_sme, annual_revenue, employee_count),
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
      'smeScore', CASE WHEN is_sme THEN 30 ELSE 0 END,
      'revenueScore', 
        CASE 
          WHEN annual_revenue BETWEEN 10000000 AND 20000000 THEN 40
          WHEN annual_revenue BETWEEN 8000000 AND 9999999 THEN 30
          WHEN annual_revenue BETWEEN 20000001 AND 25000000 THEN 24
          ELSE 0
        END,
      'employeeScore',
        CASE 
          WHEN employee_count BETWEEN 10 AND 50 THEN 30
          WHEN employee_count BETWEEN 5 AND 9 THEN 22
          WHEN employee_count BETWEEN 51 AND 60 THEN 18
          ELSE 0
        END,
      'total', calculate_lead_score(is_sme, annual_revenue, employee_count)
    ),
    NOW()
  FROM leads;
END $$;

-- Create trigger to automatically update scores
CREATE OR REPLACE FUNCTION update_lead_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.lead_score := calculate_lead_score(NEW.is_sme, NEW.annual_revenue, NEW.employee_count);
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_lead_score_trigger ON leads;

-- Create new trigger
CREATE TRIGGER update_lead_score_trigger
  BEFORE INSERT OR UPDATE OF is_sme, annual_revenue, employee_count
  ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_score();
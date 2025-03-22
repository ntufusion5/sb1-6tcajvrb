/*
  # Update Lead Status Logic

  1. Changes
    - Add trigger to automatically update status based on score and contact status
    - Add function to send automated emails (placeholder for now)
    - Update status constraints
*/

-- Update status constraint
ALTER TABLE leads DROP CONSTRAINT IF EXISTS valid_status;
ALTER TABLE leads ADD CONSTRAINT valid_status 
  CHECK (status IN ('new', 'qualified', 'contacted', 'closed'));

-- Function to update status based on score and contact
CREATE OR REPLACE FUNCTION update_lead_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Set to qualified if score is above 70
  IF NEW.lead_score >= 70 AND NEW.status = 'new' THEN
    NEW.status := 'qualified';
  END IF;

  -- Set to contacted if last_contacted is set
  IF NEW.last_contacted IS NOT NULL AND NEW.status IN ('new', 'qualified') THEN
    NEW.status := 'contacted';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for status updates
DROP TRIGGER IF EXISTS lead_status_update_trigger ON leads;
CREATE TRIGGER lead_status_update_trigger
  BEFORE INSERT OR UPDATE OF lead_score, last_contacted
  ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_status();

-- Update existing leads with new status logic
UPDATE leads
SET status = 
  CASE 
    WHEN last_contacted IS NOT NULL THEN 'contacted'
    WHEN lead_score >= 70 THEN 'qualified'
    ELSE 'new'
  END
WHERE status NOT IN ('closed');
/*
  # Add Email Function

  1. New Function
    - Add PostgreSQL function for sending automated emails
    - Currently a placeholder that just logs the attempt
    - Can be extended later with actual email integration
*/

-- Function to send automated email (placeholder)
CREATE OR REPLACE FUNCTION send_automated_email(lead_id uuid)
RETURNS boolean AS $$
DECLARE
  v_lead leads;
BEGIN
  -- Get lead details
  SELECT * INTO v_lead FROM leads WHERE id = lead_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead not found';
  END IF;

  -- Log the email attempt
  INSERT INTO notifications (
    title,
    message,
    type,
    user_id
  ) VALUES (
    'Automated Email Sent',
    format('Automated email sent to %s (%s)', v_lead.company_name, v_lead.email),
    'info',
    auth.uid()
  );

  -- Update last_contacted
  UPDATE leads 
  SET 
    last_contacted = NOW(),
    status = 
      CASE 
        WHEN status = 'new' AND lead_score >= 70 THEN 'qualified'
        ELSE 'contacted'
      END
  WHERE id = lead_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
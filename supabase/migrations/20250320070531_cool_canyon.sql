/*
  # Add notification triggers for lead events

  1. Changes
    - Add trigger for lead status changes
    - Add trigger for high-value leads
    - Add trigger for lead score changes
    - Add trigger for new leads

  2. Security
    - All triggers run with security definer to ensure proper access
*/

-- Function to notify on lead status changes
CREATE OR REPLACE FUNCTION notify_lead_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != NEW.status THEN
    INSERT INTO notifications (
      title,
      message,
      type,
      user_id
    ) VALUES (
      'Lead Status Updated',
      format('Lead %s status changed from %s to %s', NEW.company_name, OLD.status, NEW.status),
      CASE 
        WHEN NEW.status IN ('qualified', 'proposal') THEN 'success'
        WHEN NEW.status = 'closed' THEN 'info'
        WHEN NEW.status = 'rejected' THEN 'error'
        ELSE 'info'
      END,
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify on lead score changes
CREATE OR REPLACE FUNCTION notify_lead_score_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.lead_score IS NULL AND NEW.lead_score >= 70) OR 
     (OLD.lead_score IS NOT NULL AND NEW.lead_score > OLD.lead_score AND NEW.lead_score >= 70) THEN
    INSERT INTO notifications (
      title,
      message,
      type,
      user_id
    ) VALUES (
      'High Lead Score Alert',
      format('Lead %s has achieved a score of %s', NEW.company_name, NEW.lead_score),
      'success',
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify on new leads
CREATE OR REPLACE FUNCTION notify_new_lead()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (
    title,
    message,
    type,
    user_id
  ) VALUES (
    'New Lead Added',
    format('New lead added: %s', NEW.company_name),
    'info',
    auth.uid()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS lead_status_change_notification ON leads;
DROP TRIGGER IF EXISTS lead_score_change_notification ON leads;
DROP TRIGGER IF EXISTS new_lead_notification ON leads;

-- Create triggers
CREATE TRIGGER lead_status_change_notification
  AFTER UPDATE OF status
  ON leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_lead_status_change();

CREATE TRIGGER lead_score_change_notification
  AFTER UPDATE OF lead_score
  ON leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_lead_score_change();

CREATE TRIGGER new_lead_notification
  AFTER INSERT
  ON leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_lead();
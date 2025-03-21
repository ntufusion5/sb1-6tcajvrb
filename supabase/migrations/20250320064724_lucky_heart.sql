/*
  # Add lead score logging

  1. New Tables
    - `lead_score_logs`
      - `id` (uuid, primary key)
      - `lead_id` (uuid, references leads)
      - `score_breakdown` (jsonb)
      - `calculated_at` (timestamp)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `lead_score_logs` table
    - Add policies for authenticated users
*/

CREATE TABLE IF NOT EXISTS lead_score_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  score_breakdown jsonb NOT NULL,
  calculated_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS lead_score_logs_lead_id_idx ON lead_score_logs(lead_id);
CREATE INDEX IF NOT EXISTS lead_score_logs_calculated_at_idx ON lead_score_logs(calculated_at);

-- Enable RLS
ALTER TABLE lead_score_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can insert lead score logs"
  ON lead_score_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view lead score logs"
  ON lead_score_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Create function to notify on high scores
CREATE OR REPLACE FUNCTION notify_high_scoring_lead()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lead_score >= 80 AND (OLD IS NULL OR NEW.lead_score > OLD.lead_score) THEN
    INSERT INTO notifications (
      title,
      message,
      type,
      user_id
    ) VALUES (
      'High Scoring Lead Alert',
      format('Lead %s has achieved a high score of %s', NEW.company_name, NEW.lead_score),
      'success',
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for high scoring leads
DROP TRIGGER IF EXISTS high_scoring_lead_notification ON leads;
CREATE TRIGGER high_scoring_lead_notification
  AFTER INSERT OR UPDATE OF lead_score
  ON leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_high_scoring_lead();
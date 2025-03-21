/*
  # Create Notifications System

  1. New Tables
    - `notifications`
      - `id` (uuid, primary key)
      - `title` (text)
      - `message` (text)
      - `type` (text)
      - `read` (boolean)
      - `created_at` (timestamp)
      - `user_id` (uuid, foreign key to auth.users)

  2. Security
    - Enable RLS on notifications table
    - Add policies for authenticated users to:
      - Read their own notifications
      - Update read status of their own notifications
*/

CREATE TABLE notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    message text NOT NULL,
    type text NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
    read boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT valid_notification_type CHECK (type IN ('info', 'success', 'warning', 'error'))
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read their own notifications"
    ON notifications
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
    ON notifications
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX notifications_user_id_idx ON notifications(user_id);
CREATE INDEX notifications_created_at_idx ON notifications(created_at DESC);
CREATE INDEX notifications_read_idx ON notifications(read);

-- Create function to create notifications
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id uuid,
    p_title text,
    p_message text,
    p_type text DEFAULT 'info'
)
RETURNS notifications AS $$
DECLARE
    v_notification notifications;
BEGIN
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (p_user_id, p_title, p_message, p_type)
    RETURNING * INTO v_notification;
    
    RETURN v_notification;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function for lead status changes
CREATE OR REPLACE FUNCTION notify_lead_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status != OLD.status THEN
        PERFORM create_notification(
            auth.uid(),
            'Lead Status Updated',
            format('Lead %s status changed from %s to %s', 
                   NEW.company_name, OLD.status, NEW.status),
            CASE
                WHEN NEW.status = 'qualified' THEN 'success'
                WHEN NEW.status = 'rejected' THEN 'error'
                ELSE 'info'
            END
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for lead status changes
CREATE TRIGGER lead_status_change_notification
    AFTER UPDATE OF status ON leads
    FOR EACH ROW
    EXECUTE FUNCTION notify_lead_status_change();

-- Create trigger function for high-scoring leads
CREATE OR REPLACE FUNCTION notify_high_scoring_lead()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.lead_score >= 80 THEN
        PERFORM create_notification(
            auth.uid(),
            'High-Potential Lead Detected',
            format('New lead %s has a high score of %s', 
                   NEW.company_name, NEW.lead_score),
            'success'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for high-scoring leads
CREATE TRIGGER high_scoring_lead_notification
    AFTER INSERT OR UPDATE OF lead_score ON leads
    FOR EACH ROW
    EXECUTE FUNCTION notify_high_scoring_lead();
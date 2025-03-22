/*
  # Add Demo User Account

  1. Changes
    - Add demo user account with email and password
    - Set up initial user settings
    - Add welcome notification
*/

-- First, check if the demo user already exists
DO $$
DECLARE
  demo_user_id uuid;
BEGIN
  -- Try to get existing demo user
  SELECT id INTO demo_user_id
  FROM auth.users
  WHERE email = 'demo@leadgenius.com';

  -- If demo user doesn't exist, create it
  IF demo_user_id IS NULL THEN
    -- Insert demo user into auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'demo@leadgenius.com',
      crypt('demo123', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Demo User"}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    ) RETURNING id INTO demo_user_id;

    -- Add default user settings
    INSERT INTO user_settings (
      user_id,
      settings
    ) VALUES (
      demo_user_id,
      '{
        "leadScoring": {
          "smePoints": 25,
          "revenueRanges": [
            {"min": 10000000, "max": 20000000, "points": 25},
            {"min": 8000000, "max": 9999999, "points": 19},
            {"min": 20000001, "max": 25000000, "points": 15}
          ],
          "employeeRanges": [
            {"min": 10, "max": 50, "points": 25},
            {"min": 5, "max": 9, "points": 19},
            {"min": 51, "max": 60, "points": 15}
          ],
          "aiReadinessPoints": {
            "competent": 25,
            "ready": 20,
            "aware": 15,
            "unaware": 5
          },
          "responseTimeMultipliers": {
            "within24h": 1.3,
            "within48h": 1.2,
            "within72h": 1.1
          },
          "qualificationThreshold": 70
        },
        "notifications": {
          "emailEnabled": true,
          "scoreAlerts": true,
          "scoreThreshold": 70
        }
      }'::jsonb
    );

    -- Add welcome notification
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      read
    ) VALUES (
      demo_user_id,
      'Welcome to LeadGenius!',
      'This is a demo account with full access to all features. Feel free to explore the platform.',
      'info',
      false
    );
  END IF;
END $$;
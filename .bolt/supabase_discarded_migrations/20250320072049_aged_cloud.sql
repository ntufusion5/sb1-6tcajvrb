/*
  # Marketing Campaigns Table and Sample Data

  1. New Tables
    - `marketing_campaigns`
      - `id` (uuid, primary key)
      - `date` (date)
      - `campaign_name` (text)
      - `channel` (text)
      - `impressions` (integer)
      - `clicks` (integer)
      - `conversions` (integer)
      - `revenue` (numeric)
      - `cost` (numeric)
      - `region` (text)
      - `device_type` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `marketing_campaigns` table
    - Add policies for authenticated users to read data

  3. Sample Data
    - 100 realistic campaign records
    - Seasonal trends and patterns
    - Realistic conversion rates and metrics
*/

-- Create marketing_campaigns table
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  campaign_name text NOT NULL,
  channel text NOT NULL,
  impressions integer NOT NULL,
  clicks integer NOT NULL,
  conversions integer NOT NULL,
  revenue numeric(10,2) NOT NULL,
  cost numeric(10,2) NOT NULL,
  region text NOT NULL,
  device_type text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read data
CREATE POLICY "Users can read marketing campaigns"
  ON marketing_campaigns
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert sample data
WITH RECURSIVE dates AS (
  SELECT '2024-01-01'::date as date
  UNION ALL
  SELECT date + interval '3 days'
  FROM dates
  WHERE date < '2025-03-20'
),
campaign_names AS (
  SELECT 
    date,
    CASE 
      WHEN EXTRACT(MONTH FROM date) IN (12,1,2) THEN 
        (array['Winter_Holiday_Promo', 'New_Year_Special', 'Winter_Clearance_Sale'])[floor(random() * 3 + 1)]
      WHEN EXTRACT(MONTH FROM date) IN (3,4,5) THEN 
        (array['Spring_Newsletter', 'Easter_Campaign', 'Spring_Collection_Launch'])[floor(random() * 3 + 1)]
      WHEN EXTRACT(MONTH FROM date) IN (6,7,8) THEN 
        (array['Summer_Sale_Email', 'Vacation_Season_Deals', 'Back_to_School_Promo'])[floor(random() * 3 + 1)]
      ELSE 
        (array['Fall_Fashion_Campaign', 'Black_Friday_Preview', 'Holiday_Gift_Guide'])[floor(random() * 3 + 1)]
    END || '_' || 
    CASE floor(random() * 4 + 1)
      WHEN 1 THEN 'Email'
      WHEN 2 THEN 'Social'
      WHEN 3 THEN 'Display'
      WHEN 4 THEN 'PPC'
    END || '_' || date_part('year', date) as campaign_name,
    (array['Email', 'Social Media', 'PPC', 'Display Ads'])[floor(random() * 4 + 1)] as channel,
    CASE 
      WHEN EXTRACT(MONTH FROM date) IN (11,12) THEN
        floor(random() * 50000 + 50000)
      ELSE 
        floor(random() * 49000 + 1000)
    END as impressions,
    (array['North', 'South', 'East', 'West'])[floor(random() * 4 + 1)] as region,
    (array['Mobile', 'Desktop', 'Tablet'])[floor(random() * 3 + 1)] as device_type
  FROM dates
),
campaign_metrics AS (
  SELECT 
    *,
    floor(impressions * (random() * 0.045 + 0.005)) as clicks,
    floor(floor(impressions * (random() * 0.045 + 0.005)) * (random() * 0.09 + 0.01)) as conversions,
    CASE 
      WHEN EXTRACT(MONTH FROM date) IN (11,12) THEN
        floor(random() * 30000 + 20000)
      ELSE 
        floor(random() * 49500 + 500)
    END as revenue,
    CASE 
      WHEN EXTRACT(MONTH FROM date) IN (11,12) THEN
        floor(random() * 6000 + 4000)
      ELSE 
        floor(random() * 9900 + 100)
    END as cost
  FROM campaign_names
  LIMIT 100
)
INSERT INTO marketing_campaigns (
  date,
  campaign_name,
  channel,
  impressions,
  clicks,
  conversions,
  revenue,
  cost,
  region,
  device_type
)
SELECT 
  date,
  campaign_name,
  channel,
  impressions,
  clicks,
  conversions,
  revenue,
  cost,
  region,
  device_type
FROM campaign_metrics;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS marketing_campaigns_date_idx ON marketing_campaigns(date);
CREATE INDEX IF NOT EXISTS marketing_campaigns_channel_idx ON marketing_campaigns(channel);
CREATE INDEX IF NOT EXISTS marketing_campaigns_region_idx ON marketing_campaigns(region);

-- Add constraints for data validation
ALTER TABLE marketing_campaigns
  ADD CONSTRAINT valid_channel 
    CHECK (channel IN ('Email', 'Social Media', 'PPC', 'Display Ads')),
  ADD CONSTRAINT valid_region
    CHECK (region IN ('North', 'South', 'East', 'West')),
  ADD CONSTRAINT valid_device_type
    CHECK (device_type IN ('Mobile', 'Desktop', 'Tablet')),
  ADD CONSTRAINT positive_metrics
    CHECK (
      impressions > 0 AND
      clicks >= 0 AND
      conversions >= 0 AND
      revenue >= 0 AND
      cost >= 0
    );
/*
  # Create Lead Generation Jobs Table

  1. New Table
    - `lead_generation_jobs`
      - `job_id` (text, primary key)
      - `status` (text)
      - `message` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Indexes
    - Index on status for faster filtering
    - Index on created_at for sorting and filtering
*/

-- Create lead generation jobs table
CREATE TABLE IF NOT EXISTS lead_generation_jobs (
  job_id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_lead_generation_jobs_status ON lead_generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_lead_generation_jobs_created_at ON lead_generation_jobs(created_at);

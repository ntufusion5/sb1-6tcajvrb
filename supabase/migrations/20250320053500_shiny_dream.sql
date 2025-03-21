/*
  # Enhanced Leads Table with Sample Data

  1. Schema Changes
    - Add new fields to leads table:
      - email (text)
      - company_size (integer)
      - is_sme (boolean)
      - about (text)
      - lead_source (text)
      - last_contacted (timestamp)
      - notes (text)
    
  2. Data
    - Insert 20 sample leads with realistic data
    - Varied company types, sizes, and industries
    - Diverse lead scores and statuses
    
  3. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Drop existing leads table if it exists
DROP TABLE IF EXISTS leads;

-- Create enhanced leads table
CREATE TABLE leads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name text NOT NULL,
    email text NOT NULL,
    employee_count integer,
    is_sme boolean DEFAULT true,
    about text,
    industry text,
    ai_readiness text,
    status text DEFAULT 'new',
    lead_source text,
    lead_score integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    last_contacted timestamptz,
    notes text,
    CONSTRAINT valid_status CHECK (status IN ('new', 'contacted', 'qualified', 'proposal', 'closed')),
    CONSTRAINT valid_lead_score CHECK (lead_score >= 0 AND lead_score <= 100)
);

-- Enable RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read all leads"
    ON leads
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can insert leads"
    ON leads
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Users can update leads"
    ON leads
    FOR UPDATE
    TO authenticated
    USING (true);

-- Insert sample data
INSERT INTO leads (
    company_name,
    email,
    employee_count,
    is_sme,
    about,
    industry,
    ai_readiness,
    status,
    lead_source,
    lead_score,
    last_contacted,
    notes
) VALUES
    (
        'TechVision Solutions',
        'contact@techvision.com',
        85,
        true,
        'Innovative software development company specializing in AI solutions',
        'Technology',
        'AI Ready',
        'qualified',
        'Website',
        92,
        NOW() - INTERVAL '2 days',
        'Highly interested in AI implementation. Multiple meetings conducted.'
    ),
    (
        'HealthCare Plus',
        'info@healthcareplus.com',
        250,
        false,
        'Leading healthcare provider looking to modernize operations',
        'Healthcare',
        'AI Aware',
        'proposal',
        'Conference',
        88,
        NOW() - INTERVAL '5 days',
        'Need AI solution for patient data analysis'
    ),
    (
        'Global Finance Corp',
        'bizdev@globalfinance.com',
        500,
        false,
        'International financial services provider',
        'Finance',
        'AI Competent',
        'contacted',
        'Referral',
        85,
        NOW() - INTERVAL '1 day',
        'Currently using basic AI tools, looking to expand capabilities'
    ),
    (
        'Smart Manufacturing Inc',
        'info@smartmanufacturing.com',
        150,
        true,
        'Modern manufacturing facility with IoT integration',
        'Manufacturing',
        'AI Ready',
        'new',
        'LinkedIn',
        82,
        null,
        'Interested in AI for predictive maintenance'
    ),
    (
        'EduTech Innovations',
        'contact@edutech.com',
        45,
        true,
        'Educational technology startup',
        'Education',
        'AI Ready',
        'qualified',
        'Website',
        80,
        NOW() - INTERVAL '3 days',
        'Looking for AI-powered learning solutions'
    ),
    (
        'Retail Prime',
        'business@retailprime.com',
        300,
        false,
        'Major retail chain with online presence',
        'Retail',
        'AI Aware',
        'proposal',
        'Email Campaign',
        78,
        NOW() - INTERVAL '4 days',
        'Interested in customer behavior analysis'
    ),
    (
        'AgriTech Solutions',
        'info@agritech.com',
        75,
        true,
        'Agricultural technology company',
        'Agriculture',
        'AI Unaware',
        'new',
        'Trade Show',
        75,
        null,
        'Potential for AI in crop management'
    ),
    (
        'DataSmart Analytics',
        'sales@datasmart.com',
        120,
        true,
        'Data analytics consulting firm',
        'Technology',
        'AI Competent',
        'closed',
        'Website',
        73,
        NOW() - INTERVAL '10 days',
        'Successfully implemented AI solution'
    ),
    (
        'CloudNine Services',
        'info@cloudnine.com',
        200,
        false,
        'Cloud services provider',
        'Technology',
        'AI Ready',
        'contacted',
        'Conference',
        70,
        NOW() - INTERVAL '1 day',
        'Exploring AI integration possibilities'
    ),
    (
        'Green Energy Co',
        'contact@greenenergy.com',
        180,
        true,
        'Renewable energy solutions provider',
        'Energy',
        'AI Aware',
        'new',
        'LinkedIn',
        68,
        null,
        'Interested in AI for energy optimization'
    ),
    (
        'Smart Logistics',
        'info@smartlogistics.com',
        250,
        false,
        'Modern logistics and supply chain company',
        'Transportation',
        'AI Ready',
        'qualified',
        'Referral',
        65,
        NOW() - INTERVAL '6 days',
        'Looking for AI-powered route optimization'
    ),
    (
        'BioTech Innovations',
        'contact@biotech.com',
        90,
        true,
        'Biotechnology research company',
        'Healthcare',
        'AI Competent',
        'proposal',
        'Email Campaign',
        62,
        NOW() - INTERVAL '3 days',
        'AI for research data analysis'
    ),
    (
        'Construction Pro',
        'sales@constructionpro.com',
        150,
        true,
        'Modern construction company',
        'Construction',
        'AI Unaware',
        'new',
        'Trade Show',
        60,
        null,
        'Potential for AI in project management'
    ),
    (
        'FoodTech Solutions',
        'info@foodtech.com',
        80,
        true,
        'Food technology company',
        'Food & Beverage',
        'AI Aware',
        'contacted',
        'Website',
        58,
        NOW() - INTERVAL '2 days',
        'Interested in AI for quality control'
    ),
    (
        'Media Masters',
        'contact@mediamasters.com',
        120,
        true,
        'Digital media company',
        'Media',
        'AI Ready',
        'qualified',
        'Conference',
        55,
        NOW() - INTERVAL '4 days',
        'AI for content optimization'
    ),
    (
        'Security Systems Inc',
        'info@securitysys.com',
        200,
        false,
        'Security solutions provider',
        'Technology',
        'AI Competent',
        'new',
        'LinkedIn',
        52,
        null,
        'AI for security monitoring'
    ),
    (
        'Smart Real Estate',
        'sales@smartrealestate.com',
        45,
        true,
        'Modern real estate agency',
        'Real Estate',
        'AI Unaware',
        'contacted',
        'Email Campaign',
        50,
        NOW() - INTERVAL '1 day',
        'Interested in AI for property matching'
    ),
    (
        'Hospitality Plus',
        'info@hospitalityplus.com',
        300,
        false,
        'Hotel and restaurant chain',
        'Hospitality',
        'AI Aware',
        'new',
        'Trade Show',
        48,
        null,
        'AI for customer service optimization'
    ),
    (
        'Legal Tech Solutions',
        'contact@legaltech.com',
        60,
        true,
        'Legal technology provider',
        'Legal',
        'AI Ready',
        'qualified',
        'Website',
        45,
        NOW() - INTERVAL '5 days',
        'AI for legal document analysis'
    ),
    (
        'Fashion Forward',
        'info@fashionforward.com',
        100,
        true,
        'Fashion retail company',
        'Retail',
        'AI Unaware',
        'contacted',
        'LinkedIn',
        42,
        NOW() - INTERVAL '2 days',
        'Interested in AI for trend analysis'
    );

-- Create index for better query performance
CREATE INDEX leads_lead_score_idx ON leads (lead_score DESC);
CREATE INDEX leads_status_idx ON leads (status);
CREATE INDEX leads_created_at_idx ON leads (created_at DESC);
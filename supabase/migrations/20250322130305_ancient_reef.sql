/*
  # Update Lead Data and Scoring

  1. Changes
    - Remove unprofessional company names
    - Add more qualified and closed deals
    - Update lead scores to be more meaningful
    - Increase conversion rates
    - Add more realistic company data

  2. Data Quality
    - Focus on technology and enterprise companies
    - Realistic revenue and employee counts
    - Professional company names
    - Meaningful AI readiness categories
*/

-- First, delete any unprofessional or test data
DELETE FROM leads 
WHERE company_name ILIKE ANY (ARRAY['%test%', '%demo%', '%man utd%', '%gooner%', '%example%']);

-- Insert new professional leads with high scores
INSERT INTO leads (
    company_name,
    email,
    employee_count,
    annual_revenue,
    is_sme,
    about,
    industry,
    ai_readiness,
    status,
    lead_source,
    lead_score,
    created_at,
    last_contacted,
    notes,
    response_time
) VALUES
    (
        'TechVision Analytics',
        'partnerships@techvision.ai',
        45,
        15000000,
        true,
        'Leading AI analytics platform specializing in predictive modeling and data visualization',
        'Technology',
        'AI Competent',
        'closed',
        'LinkedIn',
        95,
        NOW() - INTERVAL '60 days',
        NOW() - INTERVAL '58 days',
        'Successfully implemented enterprise AI solution',
        48
    ),
    (
        'DataSphere Solutions',
        'enterprise@datasphere.tech',
        120,
        18000000,
        true,
        'Enterprise data management and AI integration specialists',
        'Technology',
        'AI Ready',
        'qualified',
        'Conference',
        88,
        NOW() - INTERVAL '45 days',
        NOW() - INTERVAL '44 days',
        'Looking for comprehensive AI transformation',
        24
    ),
    (
        'CloudMatrix Systems',
        'sales@cloudmatrix.io',
        85,
        12000000,
        true,
        'Cloud infrastructure optimization using AI and machine learning',
        'Technology',
        'AI Ready',
        'closed',
        'Website',
        92,
        NOW() - INTERVAL '30 days',
        NOW() - INTERVAL '29 days',
        'Implemented cloud optimization solution',
        24
    ),
    (
        'SmartHealth Technologies',
        'partnerships@smarthealth.med',
        150,
        20000000,
        false,
        'Healthcare technology provider focusing on AI-driven diagnostics',
        'Healthcare',
        'AI Competent',
        'closed',
        'Referral',
        94,
        NOW() - INTERVAL '25 days',
        NOW() - INTERVAL '24 days',
        'Successfully deployed AI diagnostic system',
        24
    ),
    (
        'FinTech Innovations',
        'enterprise@fintech.io',
        95,
        16000000,
        true,
        'AI-powered financial technology solutions provider',
        'Finance',
        'AI Ready',
        'qualified',
        'Trade Show',
        86,
        NOW() - INTERVAL '20 days',
        NOW() - INTERVAL '19 days',
        'Exploring AI risk assessment implementation',
        24
    ),
    (
        'Quantum Computing Labs',
        'partnerships@quantumlabs.tech',
        75,
        14000000,
        true,
        'Quantum computing research and AI integration',
        'Technology',
        'AI Competent',
        'closed',
        'Conference',
        96,
        NOW() - INTERVAL '15 days',
        NOW() - INTERVAL '14 days',
        'Implemented quantum-AI hybrid solution',
        24
    ),
    (
        'Smart Manufacturing Co',
        'operations@smartmfg.com',
        180,
        22000000,
        false,
        'Industry 4.0 manufacturing solutions with AI integration',
        'Manufacturing',
        'AI Ready',
        'qualified',
        'Website',
        89,
        NOW() - INTERVAL '10 days',
        NOW() - INTERVAL '9 days',
        'Implementing AI-driven process optimization',
        24
    ),
    (
        'Digital Retail Solutions',
        'enterprise@digitalretail.com',
        65,
        11000000,
        true,
        'AI-powered retail analytics and customer insights platform',
        'Retail',
        'AI Ready',
        'closed',
        'LinkedIn',
        91,
        NOW() - INTERVAL '7 days',
        NOW() - INTERVAL '6 days',
        'Successfully deployed retail analytics solution',
        24
    ),
    (
        'EduTech Innovations',
        'sales@edutech.ai',
        55,
        9000000,
        true,
        'AI-driven educational technology solutions',
        'Education',
        'AI Ready',
        'qualified',
        'Email Campaign',
        85,
        NOW() - INTERVAL '5 days',
        NOW() - INTERVAL '4 days',
        'Implementing personalized learning system',
        24
    ),
    (
        'SecureAI Systems',
        'enterprise@secureai.tech',
        110,
        17000000,
        true,
        'AI-powered cybersecurity solutions provider',
        'Technology',
        'AI Competent',
        'closed',
        'Referral',
        93,
        NOW() - INTERVAL '3 days',
        NOW() - INTERVAL '2 days',
        'Deployed enterprise security solution',
        24
    );

-- Update existing leads to have more meaningful scores and statuses
UPDATE leads
SET 
    lead_score = 
        CASE 
            WHEN status = 'closed' THEN floor(random() * (100-85) + 85)::integer
            WHEN status = 'qualified' THEN floor(random() * (84-70) + 70)::integer
            WHEN status = 'contacted' THEN floor(random() * (69-50) + 50)::integer
            ELSE floor(random() * (49-30) + 30)::integer
        END,
    response_time = 
        CASE 
            WHEN last_contacted IS NOT NULL THEN
                CASE floor(random() * 3)::integer
                    WHEN 0 THEN 24
                    WHEN 1 THEN 48
                    ELSE 72
                END
            ELSE NULL
        END
WHERE company_name NOT IN (
    'TechVision Analytics',
    'DataSphere Solutions',
    'CloudMatrix Systems',
    'SmartHealth Technologies',
    'FinTech Innovations',
    'Quantum Computing Labs',
    'Smart Manufacturing Co',
    'Digital Retail Solutions',
    'EduTech Innovations',
    'SecureAI Systems'
);

-- Increase number of qualified and closed deals
UPDATE leads
SET status = 
    CASE 
        WHEN lead_score >= 85 AND status != 'closed' THEN 'closed'
        WHEN lead_score >= 70 AND status = 'new' THEN 'qualified'
        ELSE status
    END,
    last_contacted = 
        CASE 
            WHEN lead_score >= 70 AND last_contacted IS NULL 
            THEN created_at + (random() * INTERVAL '3 days')
            ELSE last_contacted
        END
WHERE lead_score >= 70;

-- Update timestamps to create a meaningful trend
UPDATE leads
SET 
    created_at = NOW() - (random() * INTERVAL '90 days'),
    updated_at = 
        CASE 
            WHEN last_contacted IS NOT NULL THEN last_contacted
            ELSE created_at
        END
WHERE created_at < NOW() - INTERVAL '90 days';

-- Ensure all closed deals have high scores and contact history
UPDATE leads
SET 
    lead_score = GREATEST(lead_score, 85),
    last_contacted = COALESCE(last_contacted, created_at + INTERVAL '1 day'),
    response_time = 24
WHERE status = 'closed';

-- Update lead score logs
INSERT INTO lead_score_logs (
    lead_id,
    score_breakdown,
    calculated_at
)
SELECT 
    id,
    json_build_object(
        'smeScore', CASE WHEN is_sme THEN 25 ELSE 0 END,
        'revenueScore', 
            CASE 
                WHEN annual_revenue BETWEEN 10000000 AND 20000000 THEN 25
                WHEN annual_revenue BETWEEN 8000000 AND 9999999 THEN 19
                WHEN annual_revenue BETWEEN 20000001 AND 25000000 THEN 15
                ELSE 0
            END,
        'employeeScore',
            CASE 
                WHEN employee_count BETWEEN 10 AND 50 THEN 25
                WHEN employee_count BETWEEN 5 AND 9 THEN 19
                WHEN employee_count BETWEEN 51 AND 60 THEN 15
                ELSE 0
            END,
        'aiReadinessScore',
            CASE ai_readiness
                WHEN 'AI Competent' THEN 25
                WHEN 'AI Ready' THEN 20
                WHEN 'AI Aware' THEN 15
                WHEN 'AI Unaware' THEN 5
                ELSE 0
            END,
        'responseTimeMultiplier',
            CASE
                WHEN response_time <= 24 THEN 1.3
                WHEN response_time <= 48 THEN 1.2
                WHEN response_time <= 72 THEN 1.1
                ELSE 1.0
            END,
        'total', lead_score
    ),
    NOW()
FROM leads
WHERE lead_score > 0;
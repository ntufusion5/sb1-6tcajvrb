/*
  # Update Leads Data

  1. Changes
    - Remove unprofessional leads
    - Add high-priority leads
    - Ensure proper qualification status
    - Update lead scores
    - Add response times

  2. Data Quality
    - Focus on technology and enterprise companies
    - Realistic revenue and employee counts
    - Professional company names
    - Meaningful AI readiness categories
*/

-- First, delete unprofessional leads
DELETE FROM leads 
WHERE company_name ILIKE ANY (ARRAY[
  '%man united%', '%manchester united%', '%chelsea%', '%arsenal%',
  '%test%', '%demo%', '%example%', '%gooner%'
]);

-- Insert new high-priority leads (score >= 70, not contacted)
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
    notes
) VALUES
    (
        'InnovateAI Solutions',
        'contact@innovateai.tech',
        45,
        12000000,
        true,
        'Cutting-edge AI solutions provider specializing in enterprise automation',
        'Technology',
        'AI Competent',
        'new',
        'Website',
        92,
        NOW() - INTERVAL '2 days',
        'High potential lead, extensive AI expertise'
    ),
    (
        'DataFlow Analytics',
        'info@dataflow.ai',
        75,
        15000000,
        true,
        'Data analytics platform with advanced machine learning capabilities',
        'Technology',
        'AI Ready',
        'new',
        'LinkedIn',
        88,
        NOW() - INTERVAL '3 days',
        'Actively seeking AI integration solutions'
    ),
    (
        'MedTech Innovations',
        'partnerships@medtech.health',
        120,
        18000000,
        true,
        'Healthcare technology company focusing on AI-driven diagnostics',
        'Healthcare',
        'AI Ready',
        'new',
        'Conference',
        85,
        NOW() - INTERVAL '4 days',
        'Looking for AI diagnostic solutions'
    ),
    (
        'SmartFactory Systems',
        'enterprise@smartfactory.io',
        150,
        20000000,
        false,
        'Industry 4.0 solutions provider with focus on manufacturing automation',
        'Manufacturing',
        'AI Ready',
        'new',
        'Trade Show',
        82,
        NOW() - INTERVAL '5 days',
        'Interested in AI for process optimization'
    ),
    (
        'FinanceAI Corp',
        'sales@financeai.com',
        90,
        16000000,
        true,
        'Financial technology company specializing in AI-driven risk assessment',
        'Finance',
        'AI Competent',
        'new',
        'Referral',
        87,
        NOW() - INTERVAL '6 days',
        'Ready for AI implementation'
    );

-- Update existing leads to ensure proper qualification
UPDATE leads
SET 
    status = 
        CASE 
            WHEN lead_score >= 70 AND status = 'new' THEN 'qualified'
            ELSE status
        END,
    updated_at = NOW()
WHERE lead_score >= 70;

-- Ensure a good mix of qualified leads
UPDATE leads
SET 
    status = 'qualified',
    updated_at = NOW()
WHERE lead_score >= 70 
  AND status = 'new' 
  AND id IN (
    SELECT id 
    FROM leads 
    WHERE lead_score >= 70 
    AND status = 'new' 
    ORDER BY lead_score DESC 
    LIMIT (
      SELECT COUNT(*) / 3 
      FROM leads 
      WHERE lead_score >= 70 
      AND status = 'new'
    )
  );

-- Update lead score logs for new and modified leads
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
WHERE lead_score >= 70;
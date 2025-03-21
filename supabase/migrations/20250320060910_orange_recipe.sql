/*
  # Add Test Leads Dataset

  1. Purpose
    - Generate test leads with diverse characteristics
    - Test notification system functionality
    - Validate lead scoring system
    - Provide realistic data for testing

  2. Data Characteristics
    - Various industries and company sizes
    - Different AI readiness levels
    - Range of lead scores
    - Multiple lead sources
    - Temporal distribution
*/

-- Insert test leads
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
    created_at,
    last_contacted,
    notes
) VALUES
    (
        'Quantum Analytics Ltd',
        'sarah.chen@quantumanalytics.tech',
        120,
        true,
        'AI-driven analytics startup looking for advanced ML solutions',
        'Technology',
        'AI Ready',
        'qualified',
        'LinkedIn',
        95,
        NOW() - INTERVAL '2 days',
        NOW() - INTERVAL '1 day',
        'Highly promising lead. Multiple technical discussions completed.'
    ),
    (
        'MediTech Solutions',
        'dr.james.wilson@meditech.health',
        450,
        false,
        'Healthcare provider seeking AI diagnostics integration',
        'Healthcare',
        'AI Aware',
        'proposal',
        'Conference',
        88,
        NOW() - INTERVAL '5 days',
        NOW() - INTERVAL '2 days',
        'Interested in AI diagnostic tools. Budget approved.'
    ),
    (
        'EcoSmart Manufacturing',
        'operations.head@ecosmart.com',
        750,
        false,
        'Sustainable manufacturing company interested in AI optimization',
        'Manufacturing',
        'AI Ready',
        'new',
        'Website',
        82,
        NOW() - INTERVAL '1 day',
        null,
        'Looking for AI-powered waste reduction solutions'
    ),
    (
        'FinCore Systems',
        'cto@fincore.finance',
        280,
        false,
        'Financial services firm seeking AI risk assessment',
        'Finance',
        'AI Competent',
        'contacted',
        'Referral',
        85,
        NOW() - INTERVAL '7 days',
        NOW() - INTERVAL '3 days',
        'Currently using basic ML models, wants to expand'
    ),
    (
        'RetailPro AI',
        'innovation@retailpro.com',
        90,
        true,
        'Retail analytics company looking for AI partnership',
        'Retail',
        'AI Ready',
        'qualified',
        'Trade Show',
        90,
        NOW() - INTERVAL '10 days',
        NOW() - INTERVAL '5 days',
        'Strong technical background, ready for implementation'
    ),
    (
        'SmartEdu Technologies',
        'partnerships@smartedu.co',
        45,
        true,
        'EdTech startup developing AI-powered learning platforms',
        'Education',
        'AI Ready',
        'proposal',
        'Email Campaign',
        87,
        NOW() - INTERVAL '15 days',
        NOW() - INTERVAL '7 days',
        'Looking for AI content generation and assessment tools'
    ),
    (
        'AgriTech Innovations',
        'tech.lead@agritech.farm',
        150,
        true,
        'Agricultural technology company seeking crop analysis AI',
        'Agriculture',
        'AI Aware',
        'new',
        'Website',
        78,
        NOW() - INTERVAL '3 days',
        null,
        'Interested in computer vision for crop health'
    ),
    (
        'LogisticsPro AI',
        'operations@logisticspro.com',
        320,
        false,
        'Logistics company looking for route optimization',
        'Transportation',
        'AI Ready',
        'contacted',
        'LinkedIn',
        83,
        NOW() - INTERVAL '8 days',
        NOW() - INTERVAL '4 days',
        'Need AI for fleet management and routing'
    ),
    (
        'SecureAI Systems',
        'security.head@secureai.tech',
        180,
        true,
        'Cybersecurity firm developing AI threat detection',
        'Technology',
        'AI Competent',
        'qualified',
        'Conference',
        92,
        NOW() - INTERVAL '12 days',
        NOW() - INTERVAL '6 days',
        'Looking to enhance existing AI capabilities'
    ),
    (
        'BioTech AI Labs',
        'research.director@biotechai.bio',
        230,
        false,
        'Biotech company seeking AI for drug discovery',
        'Healthcare',
        'AI Ready',
        'proposal',
        'Referral',
        94,
        NOW() - INTERVAL '20 days',
        NOW() - INTERVAL '10 days',
        'High-priority lead with significant potential'
    ),
    (
        'Local Retail Solutions',
        'manager@localretail.store',
        15,
        true,
        'Small retail chain interested in basic analytics',
        'Retail',
        'AI Unaware',
        'new',
        'Website',
        45,
        NOW() - INTERVAL '1 day',
        null,
        'Needs education on AI benefits'
    ),
    (
        'SmallBiz Consulting',
        'owner@smallbiz.consulting',
        5,
        true,
        'Consulting firm exploring AI tools',
        'Professional Services',
        'AI Aware',
        'contacted',
        'Email Campaign',
        55,
        NOW() - INTERVAL '4 days',
        NOW() - INTERVAL '2 days',
        'Limited budget but interested'
    ),
    (
        'AI Research Institute',
        'director@airesearch.org',
        500,
        false,
        'Research organization seeking collaboration',
        'Research',
        'AI Ready',
        'qualified',
        'Conference',
        98,
        NOW() - INTERVAL '25 days',
        NOW() - INTERVAL '12 days',
        'Potential strategic partnership opportunity'
    );

-- Create notifications for high-scoring leads
DO $$
DECLARE
    lead_record RECORD;
BEGIN
    FOR lead_record IN SELECT * FROM leads WHERE lead_score >= 80 LOOP
        PERFORM create_notification(
            auth.uid(),
            'High-Potential Lead Detected',
            format('New lead %s has a high score of %s', 
                   lead_record.company_name, lead_record.lead_score),
            'success'
        );
    END LOOP;
END $$;

-- Create some initial status change notifications
DO $$
BEGIN
    UPDATE leads 
    SET 
        status = 'contacted',
        last_contacted = NOW()
    WHERE 
        status = 'new' 
        AND lead_score > 70 
        AND created_at < NOW() - INTERVAL '2 days';
END $$;
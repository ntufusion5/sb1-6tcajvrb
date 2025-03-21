import { Database } from './database.types';
import { supabase } from './supabase';

type Lead = Database['public']['Tables']['leads']['Row'];
type LeadScoreBreakdown = {
  smeScore: number;
  revenueScore: number;
  employeeScore: number;
  aiReadinessScore: number;
  companyTypeScore: number;
  total: number;
};

const DEFAULT_WEIGHTS = {
  sme: 20,
  revenue: 25,
  employees: 20,
  aiReadiness: 20,
  companyType: 15,
};

export async function calculateLeadScore(lead: Partial<Lead>): Promise<LeadScoreBreakdown> {
  try {
    let smeScore = 0;
    let revenueScore = 0;
    let employeeScore = 0;
    let aiReadinessScore = 0;
    let companyTypeScore = 0;

    // 1. SME Status (20 points)
    if (lead.is_sme) {
      smeScore = DEFAULT_WEIGHTS.sme;
    }

    // 2. Annual Revenue (25 points)
    if (lead.annual_revenue) {
      const revenue = Number(lead.annual_revenue);
      if (revenue >= 10000000 && revenue <= 20000000) {
        revenueScore = DEFAULT_WEIGHTS.revenue;
      } else if (revenue >= 8000000 && revenue < 10000000) {
        revenueScore = Math.floor(DEFAULT_WEIGHTS.revenue * 0.75); // 75% of max score
      } else if (revenue > 20000000 && revenue <= 25000000) {
        revenueScore = Math.floor(DEFAULT_WEIGHTS.revenue * 0.6); // 60% of max score
      }
    }

    // 3. Employee Count (20 points)
    // Check both employee_count and company_size fields
    if (lead.employee_count) {
      const employees = lead.employee_count;
      if (employees >= 10 && employees <= 50) {
        employeeScore = DEFAULT_WEIGHTS.employees;
      } else if (employees >= 5 && employees < 10) {
        employeeScore = Math.floor(DEFAULT_WEIGHTS.employees * 0.75); // 75% of max score
      } else if (employees > 50 && employees <= 60) {
        employeeScore = Math.floor(DEFAULT_WEIGHTS.employees * 0.6); // 60% of max score
      }
    } else if (lead.company_size) {
      // Try to extract number from company size text (e.g. "10-50 employees" -> 10-50)
      const sizeMatch = lead.company_size.match(/(\d+)[-\s]*(\d+)?/);
      if (sizeMatch) {
        const minSize = parseInt(sizeMatch[1]);
        const maxSize = sizeMatch[2] ? parseInt(sizeMatch[2]) : minSize;
        const avgSize = (minSize + maxSize) / 2;
        
        if (avgSize >= 10 && avgSize <= 50) {
          employeeScore = DEFAULT_WEIGHTS.employees;
        } else if (avgSize >= 5 && avgSize < 10) {
          employeeScore = Math.floor(DEFAULT_WEIGHTS.employees * 0.75);
        } else if (avgSize > 50 && avgSize <= 60) {
          employeeScore = Math.floor(DEFAULT_WEIGHTS.employees * 0.6);
        }
      }
    }

    // 4. AI Readiness (20 points)
    if (lead.ai_readiness_score) {
      const aiScore = parseFloat(lead.ai_readiness_score);
      if (aiScore >= 4.5) { // AI Competent
        aiReadinessScore = DEFAULT_WEIGHTS.aiReadiness;
      } else if (aiScore >= 3.5) { // AI Ready
        aiReadinessScore = Math.floor(DEFAULT_WEIGHTS.aiReadiness * 0.8);
      } else if (aiScore >= 2.5) { // AI Aware
        aiReadinessScore = Math.floor(DEFAULT_WEIGHTS.aiReadiness * 0.5);
      } else { // AI Unaware
        aiReadinessScore = Math.floor(DEFAULT_WEIGHTS.aiReadiness * 0.2);
      }
    } else if (lead.ai_readiness) {
      // Use existing ai_readiness field if available
      const readiness = lead.ai_readiness.toLowerCase();
      if (readiness.includes('high') || readiness.includes('advanced')) {
        aiReadinessScore = DEFAULT_WEIGHTS.aiReadiness;
      } else if (readiness.includes('medium') || readiness.includes('moderate')) {
        aiReadinessScore = Math.floor(DEFAULT_WEIGHTS.aiReadiness * 0.6);
      } else if (readiness.includes('low') || readiness.includes('basic')) {
        aiReadinessScore = Math.floor(DEFAULT_WEIGHTS.aiReadiness * 0.3);
      }
    }

    // 5. Company Type (15 points)
    if (lead.company_type) {
      const companyType = lead.company_type.toLowerCase();
      if (companyType.includes('sme')) {
        companyTypeScore = DEFAULT_WEIGHTS.companyType; // Full score for SMEs
      } else if (companyType.includes('startup')) {
        companyTypeScore = Math.floor(DEFAULT_WEIGHTS.companyType * 0.8); // 80% for startups
      } else if (companyType.includes('mnc')) {
        companyTypeScore = Math.floor(DEFAULT_WEIGHTS.companyType * 0.4); // 40% for MNCs
      }
    }

    const total = Math.min(100, smeScore + revenueScore + employeeScore + aiReadinessScore + companyTypeScore);

    // Log score calculation if we have a lead ID
    if (lead.id) {
      await logScoreCalculation(lead.id, {
        smeScore,
        revenueScore,
        employeeScore,
        aiReadinessScore,
        companyTypeScore,
        total
      });
    }

    return {
      smeScore,
      revenueScore,
      employeeScore,
      aiReadinessScore,
      companyTypeScore,
      total
    };
  } catch (error) {
    console.error('Error calculating lead score:', error);
    throw error;
  }
}

async function logScoreCalculation(leadId: string, breakdown: LeadScoreBreakdown) {
  try {
    await supabase.from('lead_score_logs').insert({
      lead_id: leadId,
      score_breakdown: breakdown,
      calculated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error logging score calculation:', error);
  }
}

export async function updateLeadScore(leadId: string): Promise<LeadScoreBreakdown> {
  try {
    // Get lead data
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError) throw leadError;

    // Calculate new score
    const scoreBreakdown = await calculateLeadScore(lead);

    // Update lead with new score
    const { error: updateError } = await supabase
      .from('leads')
      .update({ 
        lead_score: scoreBreakdown.total,
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId);

    if (updateError) throw updateError;

    return scoreBreakdown;
  } catch (error) {
    console.error('Error updating lead score:', error);
    throw error;
  }
}

// Event listeners for real-time updates
supabase
  .channel('lead-changes')
  .on('postgres_changes', 
    { 
      event: '*', 
      schema: 'public', 
      table: 'leads' 
    }, 
    async (payload: any) => {
      if (payload.new && (
          payload.type === 'INSERT' || 
          (payload.type === 'UPDATE' && 
           (payload.old.employee_count !== payload.new.employee_count ||
            payload.old.annual_revenue !== payload.new.annual_revenue ||
            payload.old.is_sme !== payload.new.is_sme)
          )
        )) {
        await updateLeadScore(payload.new.id);
      }
    }
  )
  .subscribe();

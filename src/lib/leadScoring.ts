import { Database } from './database.types';
import { supabase } from './supabase';

type Lead = Database['public']['Tables']['leads']['Row'];
type LeadScoreBreakdown = {
  smeScore: number;
  revenueScore: number;
  employeeScore: number;
  aiReadinessScore: number;
  responseTimeMultiplier: number;
  total: number;
};

const DEFAULT_WEIGHTS = {
  sme: 25,
  revenue: 25,
  employees: 25,
  aiReadiness: 25
};

export async function calculateLeadScore(lead: Partial<Lead>): Promise<LeadScoreBreakdown> {
  try {
    let smeScore = 0;
    let revenueScore = 0;
    let employeeScore = 0;
    let aiReadinessScore = 0;
    let responseTimeMultiplier = 1.0;

    // 1. SME Status (25 points)
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

    // 3. Employee Count (25 points)
    if (lead.employee_count) {
      const employees = lead.employee_count;
      if (employees >= 10 && employees <= 50) {
        employeeScore = DEFAULT_WEIGHTS.employees;
      } else if (employees >= 5 && employees < 10) {
        employeeScore = Math.floor(DEFAULT_WEIGHTS.employees * 0.75); // 75% of max score
      } else if (employees > 50 && employees <= 60) {
        employeeScore = Math.floor(DEFAULT_WEIGHTS.employees * 0.6); // 60% of max score
      }
    }

    // 4. AI Readiness (25 points)
    if (lead.ai_readiness) {
      switch (lead.ai_readiness) {
        case 'AI Competent':
          aiReadinessScore = DEFAULT_WEIGHTS.aiReadiness;
          break;
        case 'AI Ready':
          aiReadinessScore = Math.floor(DEFAULT_WEIGHTS.aiReadiness * 0.8); // 20 points
          break;
        case 'AI Aware':
          aiReadinessScore = Math.floor(DEFAULT_WEIGHTS.aiReadiness * 0.6); // 15 points
          break;
        case 'AI Unaware':
          aiReadinessScore = Math.floor(DEFAULT_WEIGHTS.aiReadiness * 0.2); // 5 points
          break;
      }
    }

    // 5. Response Time Multiplier (1.0 - 1.3)
    if (lead.response_time) {
      const responseTime = Number(lead.response_time);
      if (responseTime <= 24) {
        responseTimeMultiplier = 1.3;
      } else if (responseTime <= 48) {
        responseTimeMultiplier = 1.2;
      } else if (responseTime <= 72) {
        responseTimeMultiplier = 1.1;
      }
    }

    const baseScore = smeScore + revenueScore + employeeScore + aiReadinessScore;
    const total = Math.min(100, Math.round(baseScore * responseTimeMultiplier));

    const breakdown = {
      smeScore,
      revenueScore,
      employeeScore,
      aiReadinessScore,
      responseTimeMultiplier,
      total
    };

    // Log score calculation if we have a lead ID
    if (lead.id) {
      await logScoreCalculation(lead.id, breakdown);
    }

    return breakdown;
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
    async (payload) => {
      if (payload.new && (
          payload.type === 'INSERT' || 
          (payload.type === 'UPDATE' && 
           (payload.old.employee_count !== payload.new.employee_count ||
            payload.old.annual_revenue !== payload.new.annual_revenue ||
            payload.old.is_sme !== payload.new.is_sme ||
            payload.old.ai_readiness !== payload.new.ai_readiness ||
            payload.old.last_contacted !== payload.new.last_contacted)
          )
        )) {
        await updateLeadScore(payload.new.id);
      }
    }
  )
  .subscribe();
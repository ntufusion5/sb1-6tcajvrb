import { Database } from './database.types';
import { supabase } from './supabase';

type Lead = Database['public']['Tables']['leads']['Row'];
type LeadScoreBreakdown = {
  smeScore: number;
  revenueScore: number;
  employeeScore: number;
  total: number;
};

const DEFAULT_WEIGHTS = {
  sme: 30,
  revenue: 40,
  employees: 30,
};

export async function calculateLeadScore(lead: Partial<Lead>): Promise<LeadScoreBreakdown> {
  try {
    let smeScore = 0;
    let revenueScore = 0;
    let employeeScore = 0;

    // 1. SME Status (30 points)
    if (lead.is_sme) {
      smeScore = DEFAULT_WEIGHTS.sme;
    }

    // 2. Annual Revenue (40 points)
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

    // 3. Employee Count (30 points)
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

    const total = Math.min(100, smeScore + revenueScore + employeeScore);

    // Log score calculation if we have a lead ID
    if (lead.id) {
      await logScoreCalculation(lead.id, {
        smeScore,
        revenueScore,
        employeeScore,
        total
      });
    }

    return {
      smeScore,
      revenueScore,
      employeeScore,
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
    async (payload) => {
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
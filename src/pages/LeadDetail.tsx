import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { calculateLeadScore } from '../lib/leadScoring';
import { LeadStatus } from '../lib/types';
import LeadScoreDisplay from '../components/LeadScoreDisplay';

const INDUSTRY_OPTIONS = [
  'Technology',
  'Healthcare',
  'Finance',
  'Manufacturing',
  'Retail',
  'Education',
  'Other'
];

const AI_READINESS_OPTIONS = [
  'AI Aware',
  'AI Ready',
  'AI Unaware',
  'AI Competent'
];

const STATUS_OPTIONS: LeadStatus[] = [
  'new',
  'contacted',
  'qualified',
  'proposal',
  'closed'
];

type Lead = {
  id: string;
  company_name: string;
  email: string;
  employee_count: number | null;
  annual_revenue: number | null;
  is_sme: boolean;
  about: string | null;
  industry: string | null;
  ai_readiness: string | null;
  lead_score: number;
  status: LeadStatus;
  lead_source: string | null;
  created_at: string;
  updated_at: string;
  last_contacted: string | null;
  notes: string | null;
};

type ScoreBreakdown = {
  smeScore: number;
  revenueScore: number;
  employeeScore: number;
  total: number;
};

function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [scoreBreakdown, setScoreBreakdown] = useState<ScoreBreakdown | null>(null);

  useEffect(() => {
    fetchLead();
  }, [id]);

  useEffect(() => {
    if (lead) {
      updateScoreBreakdown();
    }
  }, [lead?.is_sme, lead?.annual_revenue, lead?.employee_count]);

  async function fetchLead() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setLead(data);
      
      // Calculate initial score breakdown
      if (data) {
        const breakdown = await calculateLeadScore(data);
        setScoreBreakdown(breakdown);
      }
    } catch (error) {
      console.error('Error fetching lead:', error);
      navigate('/leads');
    } finally {
      setLoading(false);
    }
  }

  async function updateScoreBreakdown() {
    if (!lead) return;
    try {
      const breakdown = await calculateLeadScore(lead);
      setScoreBreakdown(breakdown);
    } catch (error) {
      console.error('Error calculating score breakdown:', error);
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (!lead) return;
    
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    setLead(prev => {
      if (!prev) return prev;
      return { ...prev, [name]: newValue };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;

    setSaving(true);
    setSaveSuccess(false);
    try {
      const breakdown = await calculateLeadScore(lead);
      
      const updatedLead = {
        ...lead,
        employee_count: lead.employee_count ? parseInt(String(lead.employee_count)) : null,
        annual_revenue: lead.annual_revenue ? parseFloat(String(lead.annual_revenue)) : null,
        lead_score: breakdown.total,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('leads')
        .update(updatedLead)
        .eq('id', lead.id);

      if (error) throw error;
      
      setLead(updatedLead);
      setScoreBreakdown(breakdown);
      setSaveSuccess(true);
      
      // Reset success state after 2 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Error updating lead:', error);
      alert('Failed to update lead. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-red-800 text-lg font-semibold">Lead Not Found</h2>
          <p className="text-red-600 mt-2">
            The requested lead could not be found. Please return to the leads list.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/leads')}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Leads
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white shadow-md rounded-lg p-6">
            <div className="flex justify-between items-start mb-6">
              <h1 className="text-2xl font-bold text-gray-900">{lead.company_name}</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Company Name
                  </label>
                  <input
                    type="text"
                    name="company_name"
                    value={lead.company_name}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Industry
                  </label>
                  <select
                    name="industry"
                    value={lead.industry || ''}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="">Select Industry</option>
                    {INDUSTRY_OPTIONS.map(industry => (
                      <option key={industry} value={industry}>{industry}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Employee Count
                  </label>
                  <input
                    type="number"
                    name="employee_count"
                    value={lead.employee_count || ''}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Annual Revenue
                  </label>
                  <input
                    type="number"
                    name="annual_revenue"
                    value={lead.annual_revenue || ''}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    AI Readiness
                  </label>
                  <select
                    name="ai_readiness"
                    value={lead.ai_readiness || ''}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="">Select AI Readiness</option>
                    {AI_READINESS_OPTIONS.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <select
                    name="status"
                    value={lead.status}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    {STATUS_OPTIONS.map(status => (
                      <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_sme"
                    name="is_sme"
                    checked={lead.is_sme}
                    onChange={handleChange}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_sme" className="text-sm font-medium text-gray-700">
                    This is a Small/Medium Enterprise (SME)
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  name="notes"
                  rows={4}
                  value={lead.notes || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="Add any additional notes about this lead..."
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors duration-200"
                >
                  {saving ? (
                    <>
                      <Save className="h-5 w-5 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : saveSuccess ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      Saved!
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="lg:col-span-1">
          {scoreBreakdown && <LeadScoreDisplay scoreBreakdown={scoreBreakdown} />}
          
          <div className="mt-6 bg-white shadow-md rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Details</h3>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(lead.created_at).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(lead.updated_at).toLocaleDateString()}
                </dd>
              </div>
              {lead.last_contacted && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Last Contacted</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(lead.last_contacted).toLocaleDateString()}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LeadDetail;
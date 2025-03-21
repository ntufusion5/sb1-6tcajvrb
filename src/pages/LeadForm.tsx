import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { calculateLeadScore } from '../lib/leadScoring';

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

const LEAD_SOURCE_OPTIONS = [
  'Website',
  'LinkedIn',
  'Conference',
  'Referral',
  'Email Campaign',
  'Trade Show',
  'Other'
];

type FormErrors = {
  [key: string]: string;
};

function LeadForm() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState({
    company_name: '',
    email: '',
    employee_count: '',
    annual_revenue: '',
    is_sme: true,
    about: '',
    industry: '',
    ai_readiness: '',
    status: 'new',
    lead_source: '',
    notes: ''
  });

  const validateForm = () => {
    const newErrors: FormErrors = {};

    if (!formData.company_name.trim()) {
      newErrors.company_name = 'Company name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.employee_count && Number(formData.employee_count) < 0) {
      newErrors.employee_count = 'Employee count cannot be negative';
    }

    if (formData.annual_revenue && Number(formData.annual_revenue) < 0) {
      newErrors.annual_revenue = 'Annual revenue cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      // Calculate initial score
      const scoreBreakdown = await calculateLeadScore({
        is_sme: formData.is_sme,
        employee_count: formData.employee_count ? parseInt(formData.employee_count) : null,
        annual_revenue: formData.annual_revenue ? parseFloat(formData.annual_revenue) : null
      });

      const leadData = {
        ...formData,
        employee_count: formData.employee_count ? parseInt(formData.employee_count) : null,
        annual_revenue: formData.annual_revenue ? parseFloat(formData.annual_revenue) : null,
        lead_score: scoreBreakdown.total
      };

      const { error } = await supabase
        .from('leads')
        .insert([leadData]);

      if (error) throw error;
      navigate('/leads');
    } catch (error) {
      console.error('Error creating lead:', error);
      setErrors({ submit: 'Failed to create lead. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const finalValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    setFormData(prev => ({ ...prev, [name]: finalValue }));
    
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/leads')}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Leads
        </button>
      </div>

      <div className="bg-white shadow-md rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Add New Lead</h1>

        {errors.submit && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4 flex items-start">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-2" />
            <p className="text-red-700">{errors.submit}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {/* Company Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Company Name *
                </label>
                <input
                  type="text"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md shadow-sm ${
                    errors.company_name
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                  }`}
                />
                {errors.company_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.company_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md shadow-sm ${
                    errors.email
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                  }`}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>
            </div>

            {/* Company Size and Revenue */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Employee Count
                </label>
                <input
                  type="number"
                  name="employee_count"
                  value={formData.employee_count}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md shadow-sm ${
                    errors.employee_count
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                  }`}
                />
                {errors.employee_count && (
                  <p className="mt-1 text-sm text-red-600">{errors.employee_count}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Annual Revenue
                </label>
                <input
                  type="number"
                  name="annual_revenue"
                  value={formData.annual_revenue}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md shadow-sm ${
                    errors.annual_revenue
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                  }`}
                  placeholder="Annual revenue in USD"
                />
                {errors.annual_revenue && (
                  <p className="mt-1 text-sm text-red-600">{errors.annual_revenue}</p>
                )}
              </div>
            </div>

            {/* Company Type */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_sme"
                name="is_sme"
                checked={formData.is_sme}
                onChange={handleChange}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="is_sme" className="text-sm font-medium text-gray-700">
                This is a Small/Medium Enterprise (SME)
              </label>
            </div>

            {/* Industry and AI Readiness */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Industry
                </label>
                <select
                  name="industry"
                  value={formData.industry}
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
                  AI Readiness
                </label>
                <select
                  name="ai_readiness"
                  value={formData.ai_readiness}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">Select AI Readiness</option>
                  {AI_READINESS_OPTIONS.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Lead Source */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Lead Source
              </label>
              <select
                name="lead_source"
                value={formData.lead_source}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="">Select Lead Source</option>
                {LEAD_SOURCE_OPTIONS.map(source => (
                  <option key={source} value={source}>{source}</option>
                ))}
              </select>
            </div>

            {/* About */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                About
              </label>
              <textarea
                name="about"
                rows={3}
                value={formData.about}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Brief description of the company and their needs..."
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Notes
              </label>
              <textarea
                name="notes"
                rows={4}
                value={formData.notes}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Add any additional notes about this lead..."
              />
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/leads')}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              <Save className="h-5 w-5 mr-2" />
              {saving ? 'Saving...' : 'Create Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LeadForm;
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Mail, Send, ExternalLink, Users, Download, Filter, Search, ChevronDown, Trash2, Edit, AlertCircle, RefreshCw, Eye, Clock } from 'lucide-react';
import Papa from 'papaparse';

type Lead = {
  id: string;
  company_name: string;
  email: string;
  employee_count: number | null;
  industry: string | null;
  ai_readiness: string | null;
  lead_score: number;
  status: string;
  created_at: string;
  last_contacted: string | null;
};

type FilterOptions = {
  status: string;
  industry: string;
  scoreRange: string;
  sortBy: 'recent' | 'score' | 'company' | 'status';
};

function LeadsList() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const statusFromUrl = queryParams.get('status');

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({
    status: statusFromUrl || '',
    industry: '',
    scoreRange: '',
    sortBy: 'recent'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    if (statusFromUrl) {
      setFilters(prev => ({ ...prev, status: statusFromUrl }));
    }
  }, [statusFromUrl]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (filters.status) {
      params.set('status', filters.status);
    } else {
      params.delete('status');
    }
    const newSearch = params.toString();
    const newPath = `${location.pathname}${newSearch ? `?${newSearch}` : ''}`;
    if (location.search !== `?${newSearch}`) {
      navigate(newPath, { replace: true });
    }
  }, [filters.status, navigate, location]);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
    if (session) {
      fetchLeads();
    }
  }

  async function fetchLeads() {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        setError('No leads found. This could mean either no leads exist in the system or you don\'t have permission to view them.');
      }

      setLeads(data || []);
    } catch (err: any) {
      console.error('Error fetching leads:', err);
      setError(err.message || 'Failed to load leads. Please check your connection and permissions.');
    } finally {
      setLoading(false);
    }
  }

  const handleRefresh = () => {
    fetchLeads();
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      industry: '',
      scoreRange: '',
      sortBy: 'recent'
    });
    setSearchTerm('');
    navigate('/leads', { replace: true });
  };

  const handleExport = () => {
    const exportData = leads.map(lead => ({
      Company: lead.company_name,
      Email: lead.email,
      Industry: lead.industry || '',
      'Employee Count': lead.employee_count || '',
      'AI Readiness': lead.ai_readiness || '',
      'Lead Score': lead.lead_score,
      Status: lead.status,
      'Created At': new Date(lead.created_at).toLocaleDateString(),
      'Last Contacted': lead.last_contacted ? new Date(lead.last_contacted).toLocaleDateString() : ''
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `leads_export_${new Date().toISOString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;

    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setLeads(leads.filter(lead => lead.id !== id));
    } catch (error) {
      console.error('Error deleting lead:', error);
      alert('Failed to delete lead. Please try again.');
    }
  };

  const handleViewLead = (id: string) => {
    navigate(`/leads/${id}`);
  };

  const handleSendAutomatedEmail = async (lead: Lead) => {
    try {
      const { error: emailError } = await supabase.rpc('send_automated_email', { 
        lead_id: lead.id 
      });

      if (emailError) throw emailError;

      await fetchLeads();
    } catch (error) {
      console.error('Error sending automated email:', error);
      alert('Failed to send automated email. Please try again.');
    }
  };

  const sortLeads = (leads: Lead[]) => {
    switch (filters.sortBy) {
      case 'recent':
        return [...leads].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      case 'score':
        return [...leads].sort((a, b) => b.lead_score - a.lead_score);
      case 'company':
        return [...leads].sort((a, b) => 
          a.company_name.localeCompare(b.company_name)
        );
      case 'status':
        return [...leads].sort((a, b) => 
          a.status.localeCompare(b.status)
        );
      default:
        return leads;
    }
  };

  const filteredLeads = sortLeads(leads.filter(lead => {
    const matchesSearch = 
      lead.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.industry?.toLowerCase() || '').includes(searchTerm.toLowerCase());

    const matchesStatus = !filters.status || lead.status === filters.status;
    const matchesIndustry = !filters.industry || lead.industry === filters.industry;
    
    let matchesScore = true;
    if (filters.scoreRange) {
      const [min, max] = filters.scoreRange.split('-').map(Number);
      matchesScore = lead.lead_score >= min && lead.lead_score <= max;
    }

    return matchesSearch && matchesStatus && matchesIndustry && matchesScore;
  }));

  if (isAuthenticated === null) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (isAuthenticated === false) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-red-800 text-lg font-semibold">Authentication Required</h2>
          <p className="text-red-600 mt-2">
            Please log in to view leads.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  const industries = Array.from(new Set(leads.map(lead => lead.industry).filter(Boolean)));
  const statuses = Array.from(new Set(leads.map(lead => lead.status)));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="mt-1 text-sm text-gray-500">
            {leads.length} total leads • {filteredLeads.length} matching current filters
          </p>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={() => navigate('/leads/new')}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            <Users className="h-5 w-5 mr-2" />
            Add Lead
          </button>
          <button
            onClick={handleExport}
            className="flex items-center px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Download className="h-5 w-5 mr-2" />
            Export
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Attention needed</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <div className="flex space-x-4">
                  <button
                    onClick={handleRefresh}
                    className="flex items-center text-sm font-medium text-yellow-800 hover:text-yellow-900"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Data
                  </button>
                  <button
                    onClick={clearFilters}
                    className="flex items-center text-sm font-medium text-yellow-800 hover:text-yellow-900"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="relative">
              <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 w-full sm:w-64"
              />
            </div>
            <div className="flex space-x-4">
              <button
                onClick={clearFilters}
                className="text-gray-600 hover:text-gray-900"
              >
                Clear filters
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <Filter className="h-5 w-5 mr-2" />
                Filters
                <ChevronDown className={`h-4 w-4 ml-2 transform ${showFilters ? 'rotate-180' : ''} transition-transform`} />
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-4">
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="border border-gray-300 rounded-md p-2"
              >
                <option value="">All Statuses</option>
                {statuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <select
                value={filters.industry}
                onChange={(e) => setFilters({ ...filters, industry: e.target.value })}
                className="border border-gray-300 rounded-md p-2"
              >
                <option value="">All Industries</option>
                {industries.map(industry => (
                  <option key={industry} value={industry}>{industry}</option>
                ))}
              </select>
              <select
                value={filters.scoreRange}
                onChange={(e) => setFilters({ ...filters, scoreRange: e.target.value })}
                className="border border-gray-300 rounded-md p-2"
              >
                <option value="">All Scores</option>
                <option value="0-25">0-25</option>
                <option value="26-50">26-50</option>
                <option value="51-75">51-75</option>
                <option value="76-100">76-100</option>
              </select>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as FilterOptions['sortBy'] })}
                className="border border-gray-300 rounded-md p-2"
              >
                <option value="recent">Most Recent</option>
                <option value="score">Highest Score</option>
                <option value="company">Company Name</option>
                <option value="status">Status</option>
              </select>
            </div>
          )}
        </div>

        {filteredLeads.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No leads found</p>
            <p className="text-gray-400 mt-2">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Industry
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLeads.map((lead) => (
                  <tr 
                    key={lead.id} 
                    className="hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                    onClick={() => handleViewLead(lead.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {lead.company_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {lead.employee_count ? `${lead.employee_count} employees` : 'Unknown size'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{lead.email}</div>
                      <div className="text-sm text-gray-500">
                        {lead.last_contacted 
                          ? `Last contacted: ${new Date(lead.last_contacted).toLocaleDateString()}`
                          : 'Never contacted'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{lead.industry || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{lead.ai_readiness || 'Unknown readiness'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{lead.lead_score}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        lead.status === 'new' ? 'bg-green-100 text-green-800' :
                        lead.status === 'contacted' ? 'bg-blue-100 text-blue-800' :
                        lead.status === 'qualified' ? 'bg-purple-100 text-purple-800' :
                        lead.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleViewLead(lead.id)}
                          className="text-indigo-600 hover:text-indigo-900 p-1 rounded-md hover:bg-indigo-50"
                          title="View Lead"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => navigate(`/leads/${lead.id}`)}
                          className="text-indigo-600 hover:text-indigo-900 p-1 rounded-md hover:bg-indigo-50"
                          title="Edit Lead"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <div className="relative group">
                          <button
                            className="text-indigo-600 hover:text-indigo-900 p-1 rounded-md hover:bg-indigo-50"
                            title="Contact Options"
                          >
                            <Mail className="h-5 w-5" />
                          </button>
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 hidden group-hover:block">
                            <button
                              onClick={() => handleSendAutomatedEmail(lead)}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 flex items-center"
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Send Automated Email
                            </button>
                            <a
                              href={`mailto:${lead.email}`}
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 flex items-center"
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Open in Mail App
                            </a>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(lead.id)}
                          className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-50"
                          title="Delete Lead"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default LeadsList;
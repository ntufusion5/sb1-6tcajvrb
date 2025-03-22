import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  BarChart as BarChartIcon, Users, TrendingUp, ArrowUp, 
  ArrowDown, Filter, Calendar, Download, AlertCircle,
  Mail, ExternalLink, Send
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, AreaChart, Area
} from 'recharts';

type DashboardStats = {
  totalLeads: number;
  averageScore: number;
  recentLeads: any[];
  monthlyGrowth: number;
  leadsByStatus: { name: string; value: number }[];
  leadScoreHistory: { date: string; score: number }[];
  conversionData: { month: string; leads: number; conversions: number }[];
  highPriorityLeads: any[];
  newLeads: any[];
};

type TimeFilter = '7d' | '30d' | '90d' | 'all';

function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    averageScore: 0,
    recentLeads: [],
    monthlyGrowth: 0,
    leadsByStatus: [],
    leadScoreHistory: [],
    conversionData: [],
    highPriorityLeads: [],
    newLeads: []
  });
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingLeads, setGeneratingLeads] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, [timeFilter]);
  
  async function generateLeads() {
    try {
      setGeneratingLeads(true);
      setJobStatus('starting');
      
      // Render.com deployed API URL
      const apiUrl = 'https://lead-generator-api-m68v.onrender.com';
      
      const response = await fetch(`${apiUrl}/api/generate-leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ count: 5 }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setJobId(data.jobId);
        setJobStatus('processing');
        // Start polling for job status
        pollJobStatus(data.jobId);
      } else {
        setJobStatus('error');
        console.error('Failed to start lead generation:', data.message);
      }
    } catch (error) {
      setJobStatus('error');
      console.error('Error generating leads:', error);
    }
  }
  
  async function pollJobStatus(id: string) {
    try {
      // Render.com deployed API URL
      const apiUrl = 'https://lead-generator-api-m68v.onrender.com';
      
      const response = await fetch(`${apiUrl}/api/check-status/${id}`);
      const data = await response.json();
      
      setJobStatus(data.status);
      
      if (data.status === 'processing') {
        // Continue polling every 5 seconds
        setTimeout(() => pollJobStatus(id), 5000);
      } else if (data.status === 'complete') {
        setGeneratingLeads(false);
        // Refresh dashboard data
        fetchStats();
      } else {
        setGeneratingLeads(false);
      }
    } catch (error) {
      console.error('Error checking job status:', error);
      setJobStatus('error');
      setGeneratingLeads(false);
    }
  }

  async function fetchStats() {
    try {
      setLoading(true);
      setError(null);
      const now = new Date();
      const startDate = new Date();
      
      switch (timeFilter) {
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(now.getDate() - 90);
          break;
        default:
          startDate.setFullYear(now.getFullYear() - 1);
      }

      // Fetch all leads within the time range
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (leadsError) throw leadsError;

      const leads = leadsData || [];
      const totalLeads = leads.length;
      const averageScore = totalLeads > 0
        ? Math.round(leads.reduce((acc, lead) => acc + (lead.lead_score || 0), 0) / totalLeads)
        : 0;

      // Get high priority leads (score >= 70 and not contacted)
      const highPriorityLeads = leads.filter(lead => 
        lead.lead_score >= 70 && lead.status === 'qualified'
      ).sort((a, b) => b.lead_score - a.lead_score);

      // Get new leads from the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const newLeads = leads.filter(lead => 
        new Date(lead.created_at) >= sevenDaysAgo && lead.status === 'new'
      );

      // Calculate leads by status
      const statusCounts = leads.reduce((acc: { [key: string]: number }, lead) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1;
        return acc;
      }, {});

      const leadsByStatus = Object.entries(statusCounts).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value
      }));

      // Calculate lead score history (average score by day)
      const scoresByDay = leads
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .reduce((acc: { [key: string]: { total: number; count: number } }, lead) => {
          const date = new Date(lead.created_at).toLocaleDateString();
          if (!acc[date]) {
            acc[date] = { total: 0, count: 0 };
          }
          acc[date].total += lead.lead_score;
          acc[date].count += 1;
          return acc;
        }, {});

      const scoreHistory = Object.entries(scoresByDay).map(([date, data]) => ({
        date,
        score: Math.round(data.total / data.count)
      }));

      // Calculate conversion data (monthly)
      const monthlyData = leads.reduce((acc: { [key: string]: { leads: number; conversions: number } }, lead) => {
        const month = new Date(lead.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        if (!acc[month]) {
          acc[month] = { leads: 0, conversions: 0 };
        }
        acc[month].leads++;
        if (lead.status === 'closed') {
          acc[month].conversions++;
        }
        return acc;
      }, {});

      const conversionData = Object.entries(monthlyData).map(([month, data]) => ({
        month,
        ...data
      }));

      // Calculate monthly growth
      const previousPeriodLeads = leads.filter(lead => {
        const createdAt = new Date(lead.created_at);
        return createdAt >= new Date(now.getTime() - 2 * getTimeFilterDays(timeFilter) * 24 * 60 * 60 * 1000) &&
               createdAt < new Date(now.getTime() - getTimeFilterDays(timeFilter) * 24 * 60 * 60 * 1000);
      }).length;

      const currentPeriodLeads = leads.filter(lead => {
        const createdAt = new Date(lead.created_at);
        return createdAt >= new Date(now.getTime() - getTimeFilterDays(timeFilter) * 24 * 60 * 60 * 1000);
      }).length;

      const monthlyGrowth = previousPeriodLeads === 0 ? 100 :
        Math.round(((currentPeriodLeads - previousPeriodLeads) / previousPeriodLeads) * 100);

      setStats({
        totalLeads,
        averageScore,
        recentLeads: leads.slice(0, 5),
        monthlyGrowth,
        leadsByStatus,
        leadScoreHistory: scoreHistory,
        conversionData,
        highPriorityLeads,
        newLeads
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setError('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  }

  const handleSendAutomatedEmail = async (leadId: string) => {
    try {
      const { error } = await supabase.rpc('send_automated_email', { lead_id: leadId });
      if (error) throw error;
      fetchStats(); // Refresh data
    } catch (error) {
      console.error('Error sending automated email:', error);
      alert('Failed to send automated email');
    }
  };

  function getTimeFilterDays(filter: TimeFilter): number {
    switch (filter) {
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      default: return 365;
    }
  }

  const LeadCard = ({ lead, priority = false }: { lead: any; priority?: boolean }) => (
    <div className="p-4 hover:bg-gray-50 transition-colors duration-200 border-b border-gray-200 last:border-0">
      <div className="flex items-center justify-between">
        <div>
          <Link 
            to={`/leads/${lead.id}`}
            className="font-medium text-gray-900 hover:text-indigo-600"
          >
            {lead.company_name}
          </Link>
          <p className="text-sm text-gray-500 mt-1">
            {lead.industry || 'No industry specified'}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">
              Score: {lead.lead_score}
            </p>
            <p className="text-sm text-gray-500">
              {new Date(lead.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
              lead.status === 'new' ? 'bg-green-100 text-green-800' :
              lead.status === 'contacted' ? 'bg-blue-100 text-blue-800' :
              lead.status === 'qualified' ? 'bg-purple-100 text-purple-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
            </span>
            <div className="relative group">
              <button
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                title="Contact Options"
              >
                <Mail className="h-5 w-5" />
              </button>
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 hidden group-hover:block">
                <button
                  onClick={() => handleSendAutomatedEmail(lead.id)}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Automated Email
                </button>
                <a
                  href={`mailto:${lead.email}`}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in Mail App
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
      {priority && lead.about && (
        <p className="mt-2 text-sm text-gray-600 line-clamp-2">{lead.about}</p>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
        <div className="h-96 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Track your lead generation performance and key metrics
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-white rounded-lg shadow-sm border border-gray-200 p-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
              className="text-sm border-0 focus:ring-0"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>
          </div>
          
          {/* Generate Leads Button */}
          <button 
            className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${generatingLeads ? 'opacity-75 cursor-not-allowed' : ''}`}
            onClick={generateLeads}
            disabled={generatingLeads}
          >
            {generatingLeads ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {jobStatus === 'processing' ? 'Generating...' : 'Starting...'}
              </>
            ) : (
              <>
                <Users className="h-5 w-5 mr-2" />
                Generate 5 Leads
              </>
            )}
          </button>
          
          <button className="btn-secondary">
            <Download className="h-5 w-5 mr-2" />
            Export
          </button>
        </div>
      </div>
      
      {/* Job Status Message */}
      {jobStatus && jobStatus !== 'complete' && (
        <div className={`mt-4 p-4 rounded-md ${
          jobStatus === 'error' ? 'bg-red-50 text-red-800' : 
          jobStatus === 'processing' ? 'bg-blue-50 text-blue-800' : 
          'bg-gray-50 text-gray-800'
        }`}>
          {jobStatus === 'error' ? 'Error generating leads. Please try again.' :
           jobStatus === 'processing' ? 'Generating leads. This may take a few minutes...' :
           'Starting lead generation...'}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Leads"
          value={stats.totalLeads}
          icon={Users}
          trend
          trendValue={stats.monthlyGrowth}
        />
        <StatCard
          title="Average Lead Score"
          value={stats.averageScore}
          icon={BarChartIcon}
        />
        <StatCard
          title="Conversion Rate"
          value={`${Math.round((stats.leadsByStatus.find(s => s.name === 'Closed')?.value || 0) / stats.totalLeads * 100)}%`}
          icon={TrendingUp}
          trend
          trendValue={2.1}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* High Priority Leads */}
        <div className="card">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">High Priority Leads</h2>
              <p className="text-sm text-gray-500 mt-1">Leads with score ≥ 70 requiring attention</p>
            </div>
            {stats.highPriorityLeads.length > 0 && (
              <Link to="/leads" className="text-sm text-indigo-600 hover:text-indigo-900 font-medium">
                View all
              </Link>
            )}
          </div>
          
          {stats.highPriorityLeads.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">No high priority leads</p>
              <p className="mt-1">All high-scoring leads are being handled</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {stats.highPriorityLeads.slice(0, 5).map((lead) => (
                <LeadCard key={lead.id} lead={lead} priority />
              ))}
            </div>
          )}
        </div>

        {/* New Leads */}
        <div className="card">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">New Leads</h2>
              <p className="text-sm text-gray-500 mt-1">Leads from the last 7 days</p>
            </div>
            {stats.newLeads.length > 0 && (
              <Link to="/leads" className="text-sm text-indigo-600 hover:text-indigo-900 font-medium">
                View all
              </Link>
            )}
          </div>
          
          {stats.newLeads.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">No new leads</p>
              <p className="mt-1">No leads have been added in the last 7 days</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {stats.newLeads.slice(0, 5).map((lead) => (
                <LeadCard key={lead.id} lead={lead} />
              ))}
            </div>
          )}
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Lead Score Trends</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.leadScoreHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis 
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#4F46E5"
                  strokeWidth={2}
                  dot={false}
                  name="Lead Score"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Leads by Status</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.leadsByStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="value" 
                  fill="#4F46E5"
                  radius={[4, 4, 0, 0]}
                  name="Leads"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Lead Conversion Overview</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.conversionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="leads"
                  stackId="1"
                  stroke="#4F46E5"
                  fill="#4F46E5"
                  fillOpacity={0.2}
                  name="Total Leads"
                />
                <Area
                  type="monotone"
                  dataKey="conversions"
                  stackId="2"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.2}
                  name="Conversions"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

const StatCard = ({ title, value, icon: Icon, trend, trendValue }: any) => (
  <div className="card p-6 hover:shadow-md transition-all duration-300">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-semibold text-gray-900 mt-2">{value}</p>
        {trend && (
          <div className="flex items-center mt-2">
            {trendValue >= 0 ? (
              <ArrowUp className="h-4 w-4 text-green-500" />
            ) : (
              <ArrowDown className="h-4 w-4 text-red-500" />
            )}
            <span className={`text-sm font-medium ${
              trendValue >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {Math.abs(trendValue)}%
            </span>
          </div>
        )}
      </div>
      <div className="p-3 bg-indigo-50 rounded-lg">
        <Icon className="h-6 w-6 text-indigo-600" />
      </div>
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-200">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default Dashboard;
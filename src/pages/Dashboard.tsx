import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  BarChart as BarChartIcon, Users, TrendingUp, ArrowUp, 
  ArrowDown, Filter, Calendar, Download 
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
    conversionData: []
  });
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('30d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [timeFilter]);

  async function fetchStats() {
    try {
      setLoading(true);
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

      // Calculate leads by status
      const statusCounts = leads.reduce((acc: { [key: string]: number }, lead) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1;
        return acc;
      }, {});

      const leadsByStatus = Object.entries(statusCounts).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value
      }));

      // Calculate lead score history
      const scoreHistory = leads
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .map(lead => ({
          date: new Date(lead.created_at).toLocaleDateString(),
          score: lead.lead_score
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
        conversionData
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  }

  function getTimeFilterDays(filter: TimeFilter): number {
    switch (filter) {
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      default: return 365;
    }
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
          <button className="btn-secondary">
            <Download className="h-5 w-5 mr-2" />
            Export
          </button>
        </div>
      </div>

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

      <div className="card">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Leads</h2>
          <Link to="/leads" className="text-sm text-indigo-600 hover:text-indigo-900 font-medium">
            View all
          </Link>
        </div>
        
        {stats.recentLeads.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {stats.recentLeads.map((lead) => (
              <div key={lead.id} className="p-6 hover:bg-gray-50 transition-colors duration-200">
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
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      lead.status === 'new' ? 'bg-green-100 text-green-800' :
                      lead.status === 'contacted' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium">No leads yet</p>
            <p className="mt-1">Start by adding your first lead</p>
            <Link
              to="/leads/new"
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Add Lead
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;